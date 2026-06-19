/**
 * スポットのタグ解釈（/select の画像フィルター用）
 *
 * data/spots-full.json の `tags` は CSV「カテゴリー」列（季節/ジャンル大分類/内外/同行者を連結）と
 * 「ジャンル1」「ジャンル2」（詳細ジャンル）をフラットに1配列へ詰めたもの。
 * ここから「ジャンル」と「同行者」の2軸を取り出す。
 *
 * - ジャンル: **詳細ジャンル（ジャンル1/2 由来の単独トークン）**を使う。大分類「カフェ・レストラン」だと
 *   カフェか食事処か判別できないため、詳細トークン（カフェ/飲食店/ベーカリー…）を近いものでまとめた
 *   キュレーション分類（GENRE_GROUPS）にマップする。大分類の複合文字列（"カフェ・レストラン" 等）は
 *   DETAIL_TO_GENRE のキーではないので自然に無視される。
 *   ※ "自然"/"レジャー"/"体験" は大分類にも詳細にも同じ文字列で現れるが、同じ意味なのでそのままマップする。
 * - 同行者: 各語が独立属性なので「・」で分解して個別トークンにする。「全構成」は全同行者へ展開。
 */
import type { Spot } from "@/types/spot";

/** ジャンル（詳細ジャンルを近いものでまとめたキュレーション分類。この順で UI に並ぶ） */
export const GENRE_GROUPS: { label: string; members: string[] }[] = [
  { label: "カフェ", members: ["カフェ", "喫茶"] },
  { label: "食事処", members: ["飲食店", "バー"] },
  { label: "ベーカリー・スイーツ", members: ["ベーカリー", "ケーキ屋"] },
  { label: "温泉・サウナ", members: ["温泉", "サウナ"] },
  { label: "宿泊・キャンプ", members: ["宿泊施設", "キャンプ場"] },
  { label: "自然・公園", members: ["自然", "公園"] },
  { label: "レジャー・体験", members: ["レジャー", "体験", "体験施設", "パーク"] },
  { label: "美術館・博物館", members: ["美術館", "博物館"] },
  { label: "ショップ・雑貨", members: ["ショップ", "雑貨屋", "お土産", "アウトレット", "商業施設"] },
  { label: "道の駅・スーパー", members: ["道の駅", "スーパー"] },
  { label: "名所・史跡", members: ["名所", "遺跡"] },
];

/** ジャンルのラベル一覧（定義順） */
export const GENRE_LABELS = GENRE_GROUPS.map((g) => g.label);

/** 詳細ジャンルのトークン → キュレーション分類ラベル */
const DETAIL_TO_GENRE = new Map<string, string>();
for (const g of GENRE_GROUPS) {
  for (const m of g.members) DETAIL_TO_GENRE.set(m, g.label);
}

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

const PARTY_SET = new Set<string>(PARTY_TOKENS);

export interface SpotTagAxes {
  /** ジャンル（GENRE_LABELS の値） */
  genres: string[];
  /** 同行者（PARTY_TOKENS の値） */
  parties: string[];
}

/** スポットの tags をジャンル・同行者の2軸へ解釈する */
export function parseSpotTags(spot: Spot): SpotTagAxes {
  const genres = new Set<string>();
  const parties = new Set<string>();

  for (const tag of spot.tags ?? []) {
    // ジャンル: 詳細トークンならキュレーション分類へマップ（複合の大分類文字列はキーに無く無視される）
    const genre = DETAIL_TO_GENRE.get(tag);
    if (genre) genres.add(genre);

    // 同行者: 「・」で分解。「全構成」は全トークンへ展開
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
    genres: GENRE_LABELS.filter((g) => genres.has(g)),
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
    genres: GENRE_LABELS.filter((g) => genres.has(g)),
    parties: PARTY_TOKENS.filter((p) => parties.has(p)),
  };
}
