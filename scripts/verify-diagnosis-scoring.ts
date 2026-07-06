/**
 * 機能2（診断）→ /select「おすすめ順」スコアリングの検証スクリプト（使い捨て・実行専用）
 *
 * 実行:  npx tsx scripts/verify-diagnosis-scoring.ts
 *
 * data/spots-full.json（本番約200件）に対して、16タイプ × 代表的な傾きパターンでスコアを計算し、
 * タイプごとに上位20件のスポット名とスコア階層ごとの件数を出力する。
 *
 * 確認したいこと:
 *   1) タイプ間で上位の顔ぶれに納得感のある差が出ているか（両軸強い / 片軸だけ強い で並びが変わるか）
 *   2) 形（keepsake='f'）側のジャンル（ショップ・雑貨 / ベーカリー・スイーツ / 美術館・博物館）が
 *      薄すぎて、形タイプの上位が埋まらない、という事態になっていないか
 *
 * ※ 診断の採点ロジック・スコア関数の正本は src/lib/diagnosis.ts。ここはそれを呼ぶだけ。
 */
import fs from "fs";
import path from "path";
import { AXES, AXIS_MAX, DIAGNOSIS_TYPES, POLE_GENRES, scoreSpotByAxes } from "@/lib/diagnosis";
import { parseSpotTags } from "@/lib/spotTags";
import type { Spot } from "@/types/spot";

const spots = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "data", "spots-full.json"), "utf8")
) as Spot[];

// スポットのジャンル（GENRE_GROUPS のキー）を前計算
const genresById = new Map<string, string[]>(spots.map((s) => [s.id, parseSpotTags(s).genres]));

/** タイプコード(4文字) + 傾きパターンから、軸ID→スコア を作る。
 *  符号はコードの極で決まり、大きさ（強さ）は desire / value にだけ効かせる（他2軸は寄与ゼロ）。 */
function scoresFor(code: string, magDesire: number, magValue: number): Record<string, number> {
  const scores: Record<string, number> = {};
  AXES.forEach((axis, i) => {
    const poleKey = code[i];
    const mag = axis.id === "desire" ? magDesire : axis.id === "value" ? magValue : AXIS_MAX;
    scores[axis.id] = poleKey === axis.positive.key ? mag : -mag;
  });
  return scores;
}

interface Scored { name: string; score: number; genres: string[] }

function scoreAll(scores: Record<string, number>): Scored[] {
  return spots
    .map((s) => ({ name: s.name, score: scoreSpotByAxes(genresById.get(s.id) ?? [], scores), genres: genresById.get(s.id) ?? [] }))
    .sort((a, b) => b.score - a.score);
}

/** スコア階層ごとの件数（小数第2位で丸めて集計。降順） */
function tierHistogram(rows: Scored[]): string {
  const counts = new Map<string, number>();
  for (const r of rows) {
    const key = r.score.toFixed(2);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => Number(b[0]) - Number(a[0]))
    .map(([score, n]) => `${score}:${n}件`)
    .join("  ");
}

/* ── 0. 寄与ジャンルのカバレッジ（形側が薄すぎないかの下地確認） ───────────── */
console.log("=".repeat(72));
console.log("寄与ジャンルのカバレッジ（全 " + spots.length + " 件中、そのジャンルを持つスポット数）");
console.log("=".repeat(72));
const contributingGenres = new Set<string>();
for (const list of Object.values(POLE_GENRES)) for (const g of list) contributingGenres.add(g);
for (const g of Array.from(contributingGenres)) {
  const n = spots.filter((s) => (genresById.get(s.id) ?? []).includes(g)).length;
  console.log(`  ${g.padEnd(14, "　")} ${n}件`);
}
// 各極（傾き側）の「1つ以上持つ」件数
console.log("\n各極（傾き側）のジャンルを1つ以上持つスポット数:");
for (const [pole, list] of Object.entries(POLE_GENRES)) {
  const n = spots.filter((s) => {
    const own = new Set(genresById.get(s.id) ?? []);
    return list.some((g) => own.has(g));
  }).length;
  console.log(`  極 '${pole}' [${list.join(", ")}] → ${n}件`);
}

/* ── 1. 16タイプの代表プロトタイプ（両軸とも最大の傾き）で上位20件 ──────────── */
console.log("\n" + "=".repeat(72));
console.log("16タイプ × 両軸とも最大の傾き（desire=±8, value=±8）— 上位20件");
console.log("=".repeat(72));
for (const code of Object.keys(DIAGNOSIS_TYPES)) {
  const type = DIAGNOSIS_TYPES[code];
  const scores = scoresFor(code, AXIS_MAX, AXIS_MAX);
  const rows = scoreAll(scores);
  const top = rows.slice(0, 20);
  console.log(`\n■ ${code}  ${type.name}（${type.animal}）`);
  console.log(`   狙いジャンル: ${type.genres.join(" / ") || "（なし）"}`);
  console.log(`   階層別件数: ${tierHistogram(rows)}`);
  top.forEach((r, i) => {
    console.log(`   ${String(i + 1).padStart(2)}. ${r.score.toFixed(2)}  ${r.name}  [${r.genres.join(",")}]`);
  });
}

/* ── 2. 傾き強度の感度デモ（並びが強度で変わるか） ─────────────────────────── */
console.log("\n" + "=".repeat(72));
console.log("傾き強度デモ: 同じタイプでも desire/value の強さで上位が変わるか（上位8件）");
console.log("=".repeat(72));
const patterns: { label: string; d: number; v: number }[] = [
  { label: "両軸とも強い (8,8)", d: 8, v: 8 },
  { label: "刺激/癒しだけ強い (8,2)", d: 8, v: 2 },
  { label: "体験/形だけ強い (2,8)", d: 2, v: 8 },
  { label: "両軸とも弱い (4,4)", d: 4, v: 4 },
];
// 代表2コード: phnf（計画×癒し×内向×形）と isex（即興×刺激×外向×体験）
for (const code of ["phnf", "isex"]) {
  const type = DIAGNOSIS_TYPES[code];
  console.log(`\n▼ ${code}  ${type.name}（${type.animal}）`);
  for (const p of patterns) {
    const rows = scoreAll(scoresFor(code, p.d, p.v)).slice(0, 8);
    console.log(`  ${p.label}: ${rows.map((r) => `${r.name}(${r.score.toFixed(2)})`).join("、")}`);
  }
}
