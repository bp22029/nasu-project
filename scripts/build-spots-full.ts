/**
 * 本番用スポットマスタ生成スクリプト
 *
 * data/nasu_spot_v1.csv（約200件の調査データ）と既存の data/spots.json（13件）を
 * マージして data/spots-full.json を生成する。
 *
 * - 既存13件と同じ施設は既存レコードを優先（id・補正済み座標・placeId を維持。
 *   DB の spot_id が既存 id を参照しているため id は変えない）。CSV のジャンルは tags に取り込む
 * - 新規スポットの id は名前の md5 先頭8桁（`s-xxxxxxxx`）。名前から決まるので
 *   CSV の並び替えでも変わらない（公開後の id は変更しない運用）
 * - placeId は Google Places Text Search（FieldMask=places.id のみ = 無料の IDs Only SKU）
 *   で取得。CSV の座標を locationBias にして同名店の誤マッチを防ぐ
 * - 座標は CSV の値をそのまま使う（再ジオコーディングしない）
 *
 * 実行: npx tsx scripts/build-spots-full.ts
 */

import crypto from "crypto";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config({ path: ".env.local" });

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
if (!GOOGLE_PLACES_API_KEY) {
  console.error("GOOGLE_PLACES_API_KEY が .env.local に設定されていません");
  process.exit(1);
}

interface Spot {
  id: string;
  name: string;
  lat: number;
  lng: number;
  placeId: string;
  tags: string[];
  description: string;
}

// 表記ゆれで自動マッチしない既存スポットへの手動対応表（CSV名 → 既存id）
const MANUAL_ALIAS: Record<string, string> = {
  "那須高原南が丘牧場": "minamigaoka", // 既存は「南ヶ丘牧場」（ヶ/が）
  "GOOD NEWS NEIGHBORS": "good-news", // 既存は複合施設「GOOD NEWS」として登録
};

/** 名前照合用の正規化（NFKC + 空白除去 + 小文字化） */
function normalizeName(s: string): string {
  return s.normalize("NFKC").replace(/\s+/g, "").toLowerCase();
}

/** RFC4180 風の最小CSVパーサ（ダブルクォート対応・BOM除去） */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field); field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((f) => f !== "")) rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  row.push(field);
  if (row.some((f) => f !== "")) rows.push(row);
  return rows;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** placeId のみ取得（IDs Only SKU = 無料）。CSV座標を locationBias にする */
async function fetchPlaceId(
  query: string,
  bias: { lat: number; lng: number },
  retries = 4
): Promise<string | null> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY!,
        "X-Goog-FieldMask": "places.id",
      },
      body: JSON.stringify({
        textQuery: query,
        languageCode: "ja",
        locationBias: {
          circle: { center: { latitude: bias.lat, longitude: bias.lng }, radius: 5000 },
        },
      }),
    });

    if (res.ok) {
      const data = (await res.json()) as { places?: Array<{ id: string }> };
      return data.places?.[0]?.id ?? null;
    }
    if ((res.status === 403 || res.status === 429) && attempt < retries) {
      console.warn(`  Places API ${res.status} (attempt ${attempt}/${retries}) → 5秒後にリトライ`);
      await sleep(5000);
    } else {
      console.warn(`  Places API HTTP error: ${res.status}`);
      return null;
    }
  }
  return null;
}

async function main() {
  const root = process.cwd();
  const existing = JSON.parse(
    fs.readFileSync(path.join(root, "data", "spots.json"), "utf-8")
  ) as Spot[];
  const csvRows = parseCsv(fs.readFileSync(path.join(root, "data", "nasu_spot_v1.csv"), "utf-8"));

  const header = csvRows[0];
  const col = (name: string) => header.indexOf(name);
  const iName = col("場所"), iCat = col("カテゴリー"),
    iG1 = col("ジャンル1"), iG2 = col("ジャンル2"), iCoord = col("座標");
  if ([iName, iCat, iG1, iG2, iCoord].includes(-1)) {
    throw new Error(`CSVの列名が想定と違います: ${header.join(", ")}`);
  }

  // 既存スポットを正規化名で引けるようにする
  const existingByName = new Map(existing.map((s) => [normalizeName(s.name), s]));
  const existingById = new Map(existing.map((s) => [s.id, s]));
  const mergedTags = new Map<string, string[]>(); // 既存id → CSV由来のtags

  const newSpots: Spot[] = [];
  const seenIds = new Set(existing.map((s) => s.id));
  let dupCount = 0;

  for (const row of csvRows.slice(1)) {
    const name = row[iName].trim();
    if (!name) continue;

    const tags = [
      ...row[iCat].split(/[、,，]/),
      row[iG1],
      row[iG2],
    ].map((t) => t.trim()).filter(Boolean);
    const uniqueTags = Array.from(new Set(tags));

    // 既存13件との重複は既存レコードを優先し、tags だけ取り込む
    // （既存側の座標・placeId を使うので、CSVの座標が不正でも統合できる）
    const matchedId = MANUAL_ALIAS[name] ?? existingByName.get(normalizeName(name))?.id;
    if (matchedId && existingById.has(matchedId)) {
      mergedTags.set(matchedId, uniqueTags);
      dupCount++;
      console.log(`= 既存に統合: ${name} → ${matchedId}`);
      continue;
    }

    const coordParts = row[iCoord].split(",").map((s) => parseFloat(s.trim()));
    if (coordParts.length !== 2 || coordParts.some((n) => !Number.isFinite(n))) {
      console.warn(`⚠ 座標が不正のためスキップ: ${name}`);
      continue;
    }
    const [lat, lng] = coordParts;

    const id = `s-${crypto.createHash("md5").update(name).digest("hex").slice(0, 8)}`;
    if (seenIds.has(id)) {
      console.warn(`⚠ id 衝突のためスキップ: ${name} (${id})`);
      continue;
    }
    seenIds.add(id);

    const genre = [row[iG1].trim(), row[iG2].trim()].filter(Boolean).join("・");

    console.log(`▶ ${name}`);
    const placeId = await fetchPlaceId(`${name} 那須`, { lat, lng });
    console.log(placeId ? `  ✓ placeId: ${placeId}` : "  ⚠ placeId: 取得できず（空文字で続行）");
    await sleep(120); // レート制限への配慮

    newSpots.push({
      id,
      name,
      lat,
      lng,
      placeId: placeId ?? "",
      tags: uniqueTags,
      description: genre || "那須のスポット",
    });
  }

  // 既存13件（tags をマージ）+ 新規。既存を先頭に置く
  const full: Spot[] = [
    ...existing.map((s) => ({
      ...s,
      tags: mergedTags.get(s.id) ?? s.tags,
    })),
    ...newSpots,
  ];

  const outputPath = path.join(root, "data", "spots-full.json");
  fs.writeFileSync(outputPath, JSON.stringify(full, null, 2) + "\n", "utf-8");

  const noPlace = full.filter((s) => !s.placeId).length;
  console.log(`\n✅ ${full.length}件を ${outputPath} に保存（既存統合 ${dupCount}件 / placeId未取得 ${noPlace}件）`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
