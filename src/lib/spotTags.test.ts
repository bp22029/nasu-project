import { describe, expect, it } from "vitest";
import {
  parseSpotTags,
  spotMatchesTags,
  availableTagAxes,
} from "@/lib/spotTags";
import type { Spot } from "@/types/spot";

function spot(tags: string[]): Spot {
  return { id: "x", name: "x", lat: 0, lng: 0, placeId: "", tags, description: "" };
}

describe("parseSpotTags - genres", () => {
  it("複合大分類（カフェ・レストラン）は1単位として保つ", () => {
    expect(parseSpotTags(spot(["カフェ・レストラン"])).genres).toEqual([
      "カフェ・レストラン",
    ]);
  });

  it("複数カテゴリの連結は構成要素へ分解しつつ複合語は守る", () => {
    // 自然・温泉・宿・カフェ・レストラン → [自然, 温泉・宿, カフェ・レストラン]
    expect(
      parseSpotTags(spot(["自然・温泉・宿・カフェ・レストラン"])).genres
    ).toEqual(["カフェ・レストラン", "温泉・宿", "自然"]);
  });

  it("大分類に無い単独 atom（詳細ジャンルのカフェ・温泉）は無視する", () => {
    expect(parseSpotTags(spot(["温泉", "カフェ"])).genres).toEqual([]);
  });

  it("季節・内外・同行者タグからはジャンルを拾わない", () => {
    expect(
      parseSpotTags(spot(["全季節", "内", "1人旅・カップル・友達・女子旅"]))
        .genres
    ).toEqual([]);
  });
});

describe("parseSpotTags - parties", () => {
  it("連結された同行者を個別トークンへ分解する", () => {
    expect(
      parseSpotTags(spot(["1人旅・カップル・友達・女子旅"])).parties
    ).toEqual(["1人旅", "カップル", "友達", "女子旅"]);
  });

  it("全構成は全同行者へ展開する", () => {
    expect(parseSpotTags(spot(["全構成"])).parties).toEqual([
      "1人旅",
      "ファミリー",
      "カップル",
      "友達",
      "女子旅",
      "男子旅",
    ]);
  });

  it("tags が空なら両軸とも空", () => {
    expect(parseSpotTags(spot([]))).toEqual({ genres: [], parties: [] });
  });
});

describe("spotMatchesTags (OR)", () => {
  const s = spot(["自然・レジャー", "1人旅・カップル・友達"]);

  it("activeTags が空なら常に true", () => {
    expect(spotMatchesTags(s, [])).toBe(true);
  });

  it("選んだタグのどれか1つでも一致すれば true", () => {
    expect(spotMatchesTags(s, ["カフェ・レストラン", "レジャー"])).toBe(true);
  });

  it("ジャンルと同行者を混ぜても OR で判定する", () => {
    expect(spotMatchesTags(s, ["カフェ・レストラン", "カップル"])).toBe(true);
  });

  it("どれにも一致しなければ false", () => {
    expect(spotMatchesTags(s, ["温泉・宿", "女子旅"])).toBe(false);
  });
});

describe("availableTagAxes", () => {
  it("出現したタグだけを定義順で返す", () => {
    const spots = [
      spot(["レジャー", "全構成"]),
      spot(["自然・カフェ・レストラン", "カップル・友達"]),
    ];
    expect(availableTagAxes(spots)).toEqual({
      genres: ["カフェ・レストラン", "自然", "レジャー"],
      parties: ["1人旅", "ファミリー", "カップル", "友達", "女子旅", "男子旅"],
    });
  });

  it("tags が空のスポットだけなら空（debug モード相当）", () => {
    expect(availableTagAxes([spot([])])).toEqual({ genres: [], parties: [] });
  });
});
