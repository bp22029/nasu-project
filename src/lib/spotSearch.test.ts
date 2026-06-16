import { describe, expect, it } from "vitest";
import { searchSpots } from "@/lib/spotSearch";
import type { Spot } from "@/types/spot";

const spots: Spot[] = [
  {
    id: "cheese-garden",
    name: "チーズガーデン 那須本店",
    lat: 0,
    lng: 0,
    placeId: "p1",
    tags: [],
    description: "御用邸チーズケーキで知られるショップ。",
  },
  {
    id: "minamigaoka",
    name: "南ヶ丘牧場",
    lat: 0,
    lng: 0,
    placeId: "p2",
    tags: [],
    description: "動物とのふれあいとソフトクリーム。",
  },
  {
    id: "good-news",
    name: "GOOD NEWS",
    lat: 0,
    lng: 0,
    placeId: "p3",
    tags: [],
    description: "森の中のショップとカフェ。",
  },
];

describe("searchSpots", () => {
  it("空クエリなら全件を返す", () => {
    expect(searchSpots(spots, "  ")).toEqual(spots);
  });

  it("カタカナとひらがなを同一視して検索する", () => {
    // 仕様: AGENTS.md セクション6 「ちーず」→ チーズガーデン。
    expect(searchSpots(spots, "ちーず").map((s) => s.id)).toEqual([
      "cheese-garden",
    ]);
  });

  it("全角半角・大文字小文字・空白を正規化して検索する", () => {
    expect(searchSpots(spots, "ｇｏｏｄ　news").map((s) => s.id)).toEqual([
      "good-news",
    ]);
  });

  it("説明文も部分一致検索の対象にする", () => {
    expect(searchSpots(spots, "ソフト クリーム").map((s) => s.id)).toEqual([
      "minamigaoka",
    ]);
  });
});
