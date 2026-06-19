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

describe("parseSpotTags - genres（詳細ジャンルベース）", () => {
  it("詳細トークンをキュレーション分類へマップする", () => {
    expect(parseSpotTags(spot(["カフェ"])).genres).toEqual(["カフェ"]);
    expect(parseSpotTags(spot(["飲食店"])).genres).toEqual(["食事処"]);
    expect(parseSpotTags(spot(["美術館"])).genres).toEqual(["美術館・博物館"]);
  });

  it("同じ分類の複数トークンは1ラベルにまとまる", () => {
    expect(parseSpotTags(spot(["温泉", "サウナ"])).genres).toEqual([
      "温泉・サウナ",
    ]);
  });

  it("カフェと食事処を分けて判別できる（大分類では不可能だった）", () => {
    expect(parseSpotTags(spot(["カフェ・レストラン", "カフェ"])).genres).toEqual([
      "カフェ",
    ]);
    expect(parseSpotTags(spot(["カフェ・レストラン", "飲食店"])).genres).toEqual([
      "食事処",
    ]);
  });

  it("大分類の複合文字列・季節・内外・同行者からはジャンルを拾わない", () => {
    expect(
      parseSpotTags(
        spot(["全季節", "カフェ・レストラン", "内", "1人旅・カップル・友達・女子旅"])
      ).genres
    ).toEqual([]);
  });

  it("ラベルは定義順に並ぶ", () => {
    expect(parseSpotTags(spot(["名所", "カフェ"])).genres).toEqual([
      "カフェ",
      "名所・史跡",
    ]);
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
  // 詳細ジャンル「自然」(→自然・公園) + 同行者「1人旅・カップル・友達」
  const s = spot(["自然・レジャー", "自然", "1人旅・カップル・友達"]);

  it("activeTags が空なら常に true", () => {
    expect(spotMatchesTags(s, [])).toBe(true);
  });

  it("選んだタグのどれか1つでも一致すれば true", () => {
    expect(spotMatchesTags(s, ["カフェ", "自然・公園"])).toBe(true);
  });

  it("ジャンルと同行者を混ぜても OR で判定する", () => {
    expect(spotMatchesTags(s, ["カフェ", "カップル"])).toBe(true);
  });

  it("どれにも一致しなければ false", () => {
    expect(spotMatchesTags(s, ["温泉・サウナ", "女子旅"])).toBe(false);
  });
});

describe("availableTagAxes", () => {
  it("出現したジャンル・同行者だけを定義順で返す", () => {
    const spots = [
      spot(["レジャー", "全構成"]),
      spot(["自然・カフェ・レストラン", "自然", "カフェ", "カップル・友達"]),
    ];
    expect(availableTagAxes(spots)).toEqual({
      genres: ["カフェ", "自然・公園", "レジャー・体験"],
      parties: ["1人旅", "ファミリー", "カップル", "友達", "女子旅", "男子旅"],
    });
  });

  it("tags が空のスポットだけなら空（debug モード相当）", () => {
    expect(availableTagAxes([spot([])])).toEqual({ genres: [], parties: [] });
  });
});
