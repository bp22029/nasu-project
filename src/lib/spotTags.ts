/**
 * スポットのタグ解釈（/select の画像フィルター用）
 *
 * data/spots-full.json の `tags` は CSV「カテゴリー」列（4軸を連結）と
 * ジャンル1/2 をフラットに1配列へ詰めたもの。位置情報は失われているため、
 * ここでは語彙ベースで「ジャンル大分類」と「同行者」の2軸を取り出す。
 * （詳細ジャンル・季節・内外は今回フィルターに使わない＝機能2のために残す）
 *
 * 整理ルール（CLAUDE.md / プラン参照）:
 * - ジャンル大分類: 「カフェ・レストラン」「温泉・宿」「歴史・文化」は中身を判別できない
 *   1単位として守り、それ以外の組み合わせ（自然・レジャー 等）は構成要素へ分解する。
 *   → GENRE_UNITS を最長一致で貪欲に切り出す。大分類に無い atom（カフェ単独・温泉単独
 *     などの詳細ジャンルや、内/外/季節）は無視する。
 * - 同行者: 各語が独立属性なので「・」で分解して個別トークンにする。
 *   「全構成」は全同行者にマッチ扱い → 全 PARTY_TOKENS へ展開する。
 */
import type { Spot } from "@/types/spot";

/** ジャンル大分類（この順で UI に並ぶ）。複合語ほど先に最長一致させたいので長い順に並べる */
export const GENRE_UNITS = [
  "カフェ・レストラン",
  "温泉・宿",
  "歴史・文化",
  "自然",
  "レジャー",
  "アート",
  "体験",
  "アドベンチャー",
] as const;

/** 同行者トークン（この順で UI に並ぶ） */
export const PARTY_TOKENS = [
  "1人旅",
  "ファミリー",
  "カップル",
  "友達",
  "女子旅",
  "男子旅",
] as const;

/** 全同行者を表す総称タグ（フィルター候補には出さず、全 PARTY_TOKENS へ展開する） */
const PARTY_ALL = "全構成";

// 最長一致のため、ユニットを atom（「・」分割）配列にして長い順に並べておく
const GENRE_UNIT_ATOMS: { unit: string; atoms: string[] }[] = [...GENRE_UNITS]
  .map((unit) => ({ unit, atoms: unit.split("・") }))
  .sort((a, b) => b.atoms.length - a.atoms.length);

const PARTY_SET = new Set<string>(PARTY_TOKENS);

export interface SpotTagAxes {
  /** ジャンル大分類（GENRE_UNITS の値） */
  genres: string[];
  /** 同行者（PARTY_TOKENS の値） */
  parties: string[];
}

/** 1つのタグ文字列（「・」連結されうる）から、含まれるジャンル大分類を最長一致で抽出 */
function extractGenresFromTag(tag: string, out: Set<string>): void {
  const atoms = tag.split("・");
  for (let i = 0; i < atoms.length; ) {
    const match = GENRE_UNIT_ATOMS.find(
      ({ atoms: u }) =>
        i + u.length <= atoms.length && u.every((a, k) => a === atoms[i + k])
    );
    if (match) {
      out.add(match.unit);
      i += match.atoms.length;
    } else {
      i += 1; // 大分類に無い atom（詳細ジャンル・内外・季節など）は読み飛ばす
    }
  }
}

/** スポットの tags をジャンル・同行者の2軸へ解釈する */
export function parseSpotTags(spot: Spot): SpotTagAxes {
  const genres = new Set<string>();
  const parties = new Set<string>();

  for (const tag of spot.tags ?? []) {
    extractGenresFromTag(tag, genres);
    const atoms = tag.split("・");
    if (atoms.includes(PARTY_ALL)) {
      for (const p of PARTY_TOKENS) parties.add(p);
    }
    for (const atom of atoms) {
      if (PARTY_SET.has(atom)) parties.add(atom);
    }
  }

  // UI と同じ定義順に整える
  return {
    genres: GENRE_UNITS.filter((g) => genres.has(g)),
    parties: PARTY_TOKENS.filter((p) => parties.has(p)),
  };
}

/** activeTags（ジャンル・同行者を混ぜた集合）に1つでも一致すれば true。空なら全件 true（OR） */
export function spotMatchesTags(spot: Spot, activeTags: string[]): boolean {
  if (activeTags.length === 0) return true;
  const { genres, parties } = parseSpotTags(spot);
  const own = new Set<string>([...genres, ...parties]);
  return activeTags.some((t) => own.has(t));
}

/** SPOTS 全体から、実際に出現するジャンル・同行者の一覧を定義順で導出（フィルターUIの選択肢） */
export function availableTagAxes(spots: Spot[]): SpotTagAxes {
  const genres = new Set<string>();
  const parties = new Set<string>();
  for (const spot of spots) {
    const axes = parseSpotTags(spot);
    axes.genres.forEach((g) => genres.add(g));
    axes.parties.forEach((p) => parties.add(p));
  }
  return {
    genres: GENRE_UNITS.filter((g) => genres.has(g)),
    parties: PARTY_TOKENS.filter((p) => parties.has(p)),
  };
}
