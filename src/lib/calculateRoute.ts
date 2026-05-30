/**
 * ルート計算の独立関数（CLAUDE.md セクション8）
 *
 * calculateRoute(選択スポット配列) → ルート結果
 *
 * 機能2（診断）は「診断結果からスポット配列を生成してこの関数に渡す」だけで対応可能。
 */

import type { Spot } from "@/types/spot";
import type { RouteResult } from "@/types/route";
import { getDurationMatrix, getDirectionsGeoJSON } from "@/lib/ors";
import { solveTSP } from "@/lib/tsp";

export async function calculateRoute(selectedSpots: Spot[]): Promise<RouteResult> {
  if (selectedSpots.length < 2) {
    throw new Error("ルート計算には2件以上のスポットが必要です");
  }

  // ORS は [lng, lat] の順
  const locations = selectedSpots.map((s) => [s.lng, s.lat] as [number, number]);

  // 1. ORS Matrix API で道なり所要時間行列を取得
  const durationMatrix = await getDurationMatrix(locations);

  // 2. TSP で最適巡回順を算出
  const order = solveTSP(durationMatrix);
  const routeSpots = order.map((i) => selectedSpots[i]);

  // 3. ORS Directions API (GeoJSON) で道なり経路形状を取得
  const waypoints = routeSpots.map((s) => [s.lng, s.lat] as [number, number]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const geojson = await getDirectionsGeoJSON(waypoints) as any;

  // 4. セグメント情報を構築
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orsSegments: any[] = geojson.features[0].properties.segments;
  const segments = orsSegments.map((seg: { duration: number; distance: number }, i: number) => ({
    from: routeSpots[i].name,
    to: routeSpots[i + 1].name,
    duration: seg.duration,
    distance: seg.distance,
  }));

  const summary = geojson.features[0].properties.summary;

  return {
    orderedSpots: routeSpots,
    segments,
    totalDuration: summary.duration,
    totalDistance: summary.distance,
    geojson,
  };
}
