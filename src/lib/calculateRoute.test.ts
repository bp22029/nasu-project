import { beforeEach, describe, expect, it, vi } from "vitest";
import { calculateRoute } from "@/lib/calculateRoute";
import { getDirectionsGeoJSON, getDurationMatrix } from "@/lib/ors";
import type { Spot } from "@/types/spot";

vi.mock("@/lib/ors", () => ({
  getDurationMatrix: vi.fn(),
  getDirectionsGeoJSON: vi.fn(),
}));

const spots: Spot[] = [
  {
    id: "a",
    name: "Aスポット",
    lat: 37.1,
    lng: 140.1,
    placeId: "pa",
    tags: [],
    description: "A",
  },
  {
    id: "b",
    name: "Bスポット",
    lat: 37.2,
    lng: 140.2,
    placeId: "pb",
    tags: [],
    description: "B",
  },
  {
    id: "c",
    name: "Cスポット",
    lat: 37.3,
    lng: 140.3,
    placeId: "pc",
    tags: [],
    description: "C",
  },
];

const departure = { name: "出発地", lat: 37, lng: 140 };

function geojsonWithSegments(segments: Array<{ duration: number; distance: number }>) {
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {
          segments,
          summary: { duration: 600, distance: 7000 },
        },
        geometry: { type: "LineString", coordinates: [] },
      },
    ],
  };
}

describe("calculateRoute", () => {
  beforeEach(() => {
    vi.mocked(getDurationMatrix).mockResolvedValue([
      [0, 9, 1, 9],
      [9, 0, 9, 1],
      [1, 9, 0, 1],
      [9, 1, 1, 0],
    ]);
    vi.mocked(getDirectionsGeoJSON).mockResolvedValue(
      geojsonWithSegments([
        { duration: 100, distance: 1000 },
        { duration: 200, distance: 2000 },
        { duration: 300, distance: 3000 },
      ])
    );
  });

  it("TSP順にスポットを並べ、片道の区間ラベルを生成する", async () => {
    // 仕様: CLAUDE.md セクション7 Matrix -> TSP -> Directions。
    const result = await calculateRoute(spots, departure, "oneway", true);

    expect(result.orderedSpots.map((s) => s.id)).toEqual(["b", "c", "a"]);
    expect(result.segments).toEqual([
      { from: "出発地", to: "Bスポット", duration: 100, distance: 1000 },
      { from: "Bスポット", to: "Cスポット", duration: 200, distance: 2000 },
      { from: "Cスポット", to: "Aスポット", duration: 300, distance: 3000 },
    ]);
    expect(getDurationMatrix).toHaveBeenCalledWith(
      [
        [140, 37],
        [140.1, 37.1],
        [140.2, 37.2],
        [140.3, 37.3],
      ],
      true
    );
    expect(getDirectionsGeoJSON).toHaveBeenCalledWith(
      [
        [140, 37],
        [140.2, 37.2],
        [140.3, 37.3],
        [140.1, 37.1],
      ],
      true
    );
  });

  it("周遊では最後の waypoint に出発地を追加する", async () => {
    vi.mocked(getDirectionsGeoJSON).mockResolvedValue(
      geojsonWithSegments([
        { duration: 100, distance: 1000 },
        { duration: 200, distance: 2000 },
        { duration: 300, distance: 3000 },
        { duration: 400, distance: 4000 },
      ])
    );

    const result = await calculateRoute(spots, departure, "roundtrip", false);

    expect(getDirectionsGeoJSON).toHaveBeenCalledWith(
      [
        [140, 37],
        [140.1, 37.1],
        [140.3, 37.3],
        [140.2, 37.2],
        [140, 37],
      ],
      false
    );
    expect(result.segments.at(-1)).toEqual({
      from: "Bスポット",
      to: "出発地",
      duration: 400,
      distance: 4000,
    });
  });

  it("スポットが空なら例外にする", async () => {
    await expect(calculateRoute([], departure, "oneway", true)).rejects.toThrow(
      "ルート計算には1件以上のスポットが必要です"
    );
  });
});
