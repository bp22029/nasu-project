/**
 * ルート計算の独立関数（CLAUDE.md セクション8）
 * calculateRoute(スポット配列, 出発地, 周遊/片道, 有料道路回避) → ルート結果
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
  tripType: TripType,
  avoidTolls: boolean
): Promise<RouteResult> {
  if (selectedSpots.length < 1) {
    throw new Error("ルート計算には1件以上のスポットが必要です");
  }

  const departureCoord: [number, number] = [departure.lng, departure.lat];
  const spotCoords = selectedSpots.map((s) => [s.lng, s.lat] as [number, number]);

  // index 0 = 出発地、index 1..N = スポット
  const allLocations = [departureCoord, ...spotCoords];
  const durationMatrix = await getDurationMatrix(allLocations, avoidTolls);

  const order = solveTSP(durationMatrix, tripType === "roundtrip");
  const orderedSpots = order.slice(1).map((i) => selectedSpots[i - 1]);

  const waypoints: [number, number][] = [
    departureCoord,
    ...orderedSpots.map((s) => [s.lng, s.lat] as [number, number]),
  ];
  if (tripType === "roundtrip") {
    waypoints.push(departureCoord);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const geojson = await getDirectionsGeoJSON(waypoints, avoidTolls) as any;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orsSegments: any[] = geojson.features[0].properties.segments;
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
    avoidTolls,
    segments,
    totalDuration: summary.duration,
    totalDistance: summary.distance,
    geojson,
  };
}
