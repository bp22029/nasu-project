/**
 * 観光地マスタ生成スクリプト（一回限り実行）
 *
 * - 緯度経度: OSM Nominatim でジオコーディング（Google由来にしない）
 * - place_id: Google Places Text Search から place_id のみ保存
 *   （他のフィールドは保存しない。CLAUDE.md セクション5参照）
 *
 * 実行: npx tsx scripts/fetch-spots.ts
 */

import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config({ path: ".env.local" });

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
if (!GOOGLE_PLACES_API_KEY) {
  console.error("GOOGLE_PLACES_API_KEY が .env.local に設定されていません");
  process.exit(1);
}

// 入力スポット定義
interface SpotInput {
  id: string;
  name: string;
  /** Nominatim 検索クエリ（日本語OK） */
  nominatimQuery: string;
  /** Google Places Text Search クエリ */
  placeQuery: string;
  description: string;
  /** Nominatim で見つからない場合のフォールバック座標 */
  fallbackCoords?: { lat: number; lng: number };
}

// 出力型（CLAUDE.md セクション6のスキーマ）
interface Spot {
  id: string;
  name: string;
  lat: number;
  lng: number;
  placeId: string;
  tags: string[];
  description: string;
}

// 那須エリア観光地リスト（10〜15件）
const SPOTS_INPUT: SpotInput[] = [
  {
    id: "chausu",
    name: "茶臼岳",
    nominatimQuery: "茶臼岳 那須 栃木",
    placeQuery: "茶臼岳 那須町",
    description: "那須連山の主峰。ロープウェイで気軽に高山の眺望が楽しめる。",
    fallbackCoords: { lat: 37.1207, lng: 139.9718 },
  },
  {
    id: "shikanoyu",
    name: "鹿の湯",
    nominatimQuery: "鹿の湯 那須塩原 栃木",
    placeQuery: "鹿の湯 那須温泉",
    description: "那須温泉発祥の地とされる1300年の歴史を持つ共同浴場。",
    fallbackCoords: { lat: 37.1202, lng: 139.9762 },
  },
  {
    id: "sesshooseki",
    name: "殺生石",
    nominatimQuery: "殺生石 那須塩原 栃木",
    placeQuery: "殺生石 那須",
    description: "九尾の狐伝説が残る奇岩。周囲から硫黄ガスが噴出する天然の景勝地。",
    fallbackCoords: { lat: 37.1225, lng: 139.9740 },
  },
  {
    id: "nasu-shrine",
    name: "那須温泉神社",
    nominatimQuery: "那須温泉神社 那須塩原 栃木",
    placeQuery: "那須温泉神社",
    description: "那須温泉の守護神を祀る古社。杉木立の参道が荘厳な雰囲気を醸す。",
    fallbackCoords: { lat: 37.1188, lng: 139.9750 },
  },
  {
    id: "nasu-ropeway",
    name: "那須ロープウェイ",
    nominatimQuery: "那須ロープウェイ 栃木",
    placeQuery: "那須ロープウェイ",
    description: "茶臼岳山頂近くまでを結ぶロープウェイ。山頂からは関東平野を一望。",
    fallbackCoords: { lat: 37.1148, lng: 139.9709 },
  },
  {
    id: "nasu-animal-kingdom",
    name: "那須どうぶつ王国",
    nominatimQuery: "那須どうぶつ王国 栃木",
    placeQuery: "那須どうぶつ王国",
    description: "国内最大級の動物園。スナネコやアルパカとの近距離ふれあいが人気。",
    fallbackCoords: { lat: 37.0432, lng: 139.9734 },
  },
  {
    id: "nasu-safari",
    name: "那須サファリパーク",
    nominatimQuery: "那須サファリパーク 栃木",
    placeQuery: "那須サファリパーク",
    description: "車内から野生動物を間近に観察できるサファリ形式の動物園。",
    fallbackCoords: { lat: 37.0248, lng: 140.0217 },
  },
  {
    id: "rindoko",
    name: "那須高原りんどう湖ファミリー牧場",
    nominatimQuery: "りんどう湖ファミリー牧場 那須 栃木",
    placeQuery: "りんどう湖ファミリー牧場 那須",
    description: "湖畔に広がる牧場型レジャー施設。ヨーロッパ風の景観とアクティビティ。",
    fallbackCoords: { lat: 37.0346, lng: 140.0230 },
  },
  {
    id: "minamigaoka",
    name: "南ヶ丘牧場",
    nominatimQuery: "南ヶ丘牧場 那須 栃木",
    placeQuery: "南ヶ丘牧場 那須",
    description: "ガーンジィ牛の牧場。自家製ソフトクリームやチーズが名物。",
    fallbackCoords: { lat: 37.0231, lng: 140.0692 },
  },
  {
    id: "cheese-garden",
    name: "チーズガーデン御用邸チーズケーキ本店",
    nominatimQuery: "チーズガーデン 那須 栃木",
    placeQuery: "チーズガーデン 那須高原",
    description: "那須を代表する土産菓子「御用邸チーズケーキ」の本店。カフェも併設。",
    fallbackCoords: { lat: 37.0534, lng: 140.0310 },
  },
  {
    id: "good-news",
    name: "GOOD NEWS",
    nominatimQuery: "GOOD NEWS 那須 栃木",
    placeQuery: "GOOD NEWS 那須高原",
    description: "地元那須の生産者と繋がる複合施設。飲食・雑貨・体験が集まる。",
    fallbackCoords: { lat: 37.0467, lng: 140.0340 },
  },
  {
    id: "stained-glass",
    name: "那須ステンドグラス美術館",
    nominatimQuery: "那須ステンドグラス美術館 栃木",
    placeQuery: "那須ステンドグラス美術館",
    description: "英国の古城を再現した建物に、本物のステンドグラスを展示する美術館。",
    fallbackCoords: { lat: 37.0513, lng: 139.9921 },
  },
  {
    id: "michi-no-eki",
    name: "道の駅 那須高原友愛の森",
    nominatimQuery: "道の駅 那須高原友愛の森 栃木",
    placeQuery: "道の駅 那須高原友愛の森",
    description: "那須の農産物・土産物が揃う道の駅。地元の工芸品展示も。",
    fallbackCoords: { lat: 37.0383, lng: 140.0395 },
  },
];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function geocodeNominatim(query: string): Promise<{ lat: number; lng: number } | null> {
  const url =
    "https://nominatim.openstreetmap.org/search?" +
    new URLSearchParams({
      q: query,
      format: "json",
      countrycodes: "jp",
      limit: "1",
    });

  const res = await fetch(url, {
    headers: {
      "User-Agent": "nasu-tabi/1.0 (bp22029@shibaura-it.ac.jp)",
      "Accept-Language": "ja",
    },
  });

  if (!res.ok) {
    console.warn(`  Nominatim HTTP error: ${res.status}`);
    return null;
  }

  const data = (await res.json()) as Array<{ lat: string; lon: string }>;
  if (data.length === 0) return null;

  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
}

async function fetchPlaceId(query: string, retries = 5): Promise<string | null> {
  // Google Places API (New) — place_id のみ取得（他のコンテンツは保存しない）
  for (let attempt = 1; attempt <= retries; attempt++) {
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY!,
        "X-Goog-FieldMask": "places.id",
      },
      body: JSON.stringify({ textQuery: query, languageCode: "ja" }),
    });

    if (res.ok) {
      const data = (await res.json()) as { places?: Array<{ id: string }> };
      if (!data.places || data.places.length === 0) return null;
      return data.places[0].id;
    }

    if (res.status === 403 && attempt < retries) {
      console.warn(`  Places API 403 (attempt ${attempt}/${retries}) → 5秒後にリトライ`);
      await sleep(5000);
    } else {
      console.warn(`  Places API HTTP error: ${res.status}`);
      return null;
    }
  }
  return null;
}

async function main() {
  console.log("観光地データ取得開始\n");
  const spots: Spot[] = [];

  for (const input of SPOTS_INPUT) {
    console.log(`▶ ${input.name}`);

    // --- Nominatim ジオコーディング（1req/秒制限） ---
    const coords = await geocodeNominatim(input.nominatimQuery);
    await sleep(1100); // Rate limit: 1 req/sec

    let lat: number;
    let lng: number;

    if (coords) {
      lat = coords.lat;
      lng = coords.lng;
      console.log(`  ✓ Nominatim: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    } else {
      // Nominatim で見つからない場合はフォールバック座標を使用
      if (!input.fallbackCoords) {
        console.warn(`  ✗ Nominatim: 見つからず、フォールバックなし → スキップ`);
        continue;
      }
      lat = input.fallbackCoords.lat;
      lng = input.fallbackCoords.lng;
      console.log(`  ⚠ Nominatim: 見つからず → フォールバック座標使用 (${lat}, ${lng})`);
    }

    // --- Google Places API — place_id のみ取得 ---
    const placeId = await fetchPlaceId(input.placeQuery);

    if (placeId) {
      console.log(`  ✓ placeId: ${placeId}`);
    } else {
      console.warn(`  ⚠ placeId: 取得できず（空文字で続行）`);
    }

    spots.push({
      id: input.id,
      name: input.name,
      lat,
      lng,
      placeId: placeId ?? "",
      tags: [],
      description: input.description,
    });
  }

  // data/spots.json に書き出し
  const outputPath = path.join(process.cwd(), "data", "spots.json");
  fs.writeFileSync(outputPath, JSON.stringify(spots, null, 2) + "\n", "utf-8");

  console.log(`\n✅ ${spots.length}件を ${outputPath} に保存しました`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
