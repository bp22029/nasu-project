/**
 * ルート計算の独立関数（CLAUDE.md セクション8）
 *
 * calculateRoute(選択スポット配列, 出発地, 周遊/片道) → ルート結果
 *
 * 処理フロー:
 * 1. 出発地 + 選択スポットを ORS Matrix API に渡して道なり所要時間行列を取得
 * 2. TSP で最適巡回順を算出（出発地は常に始点として固定）
 * 3. ORS Directions API で道なり経路形状 (GeoJSON) を取得
 *    - 周遊: ウェイポイントの末尾に出発地を追加して閉じた経路にする
 *    - 片道: そのまま
 * 4. RouteResult を構築して返す
 */

import type { Spot } from "@/types/spot";
import type { TripType } from "@/types/departure";
import type { RouteResult, RouteSegment } from "@/types/route";
import { getDurationMatrix, getDirectionsGeoJSON } from "@/lib/ors";
import { solveTSP } from "@/lib/tsp";

interface DepartureCoord {
  lat: number;
  lng: number;
  name: string;
}

export async function calculateRoute(
  selectedSpots: Spot[],
  departure: DepartureCoord,
  tripType: TripType
): Promise<RouteResult> {
  if (selectedSpots.length < 1) {
    throw new Error("ルート計算には1件以上のスポットが必要です");
  }

  // ORS は [lng, lat] の順
  const departureCoord: [number, number] = [departure.lng, departure.lat];
  const spotCoords = selectedSpots.map((s) => [s.lng, s.lat] as [number, number]);

  // 距離行列: index 0 = 出発地、index 1..N = スポット
  const allLocations = [departureCoord, ...spotCoords];
  const durationMatrix = await getDurationMatrix(allLocations);

  // TSP で最適訪問順を算出（index 0 = 出発地は固定）
  const order = solveTSP(durationMatrix, tripType === "roundtrip");
  // order = [0, i1, i2, ..., iN]  → スポットのみ抽出（index 0 を除く）
  const orderedSpots = order.slice(1).map((i) => selectedSpots[i - 1]);

  // ORS Directions のウェイポイント構築
  const waypoints: [number, number][] = [
    departureCoord,
    ...orderedSpots.map((s) => [s.lng, s.lat] as [number, number]),
  ];
  if (tripType === "roundtrip") {
    waypoints.push(departureCoord); // 出発地へ戻る
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const geojson = await getDirectionsGeoJSON(waypoints) as any;

  // セグメント構築
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orsSegments: any[] = geojson.features[0].properties.segments;

  // ウェイポイントラベル: [出発地, spot1, spot2, ..., (出発地 if roundtrip)]
  const labels = [
    departure.name,
    ...orderedSpots.map((s) => s.name),
    ...(tripType === "roundtrip" ? [departure.name] : []),
  ];

  const segments: RouteSegment[] = orsSegments.map(
    (seg: { duration: number; distance: number }, i: number) => ({
      from: labels[i],
      to: labels[i + 1],
      duration: seg.duration,
      distance: seg.distance,
    })
  );

  const summary = geojson.features[0].properties.summary;

  return {
    departure,
    orderedSpots,
    tripType,
    segments,
    totalDuration: summary.duration,
    totalDistance: summary.distance,
    geojson,
  };
}
