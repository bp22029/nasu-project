import type { Spot } from "@/types/spot";
import type { TripType } from "@/types/departure";

export interface RouteSegment {
  from: string;
  to: string;
  duration: number;   // seconds
  distance: number;   // meters
}

/**
 * 巡回順の一部固定（ピン留め）。
 * spotId のスポットを訪問順の position 番目（1始まり。スポットのみで数え、出発地は含まない）に
 * 固定する。残りのスポットは TSP で最短最適化される（CLAUDE.md セクション7・8）。
 */
export interface SpotLock {
  spotId: string;
  /** 訪問順の位置（1始まり。1 = 出発後の最初のスポット） */
  position: number;
}

export interface RouteResult {
  /** 出発地（固定始点） */
  departure: { lat: number; lng: number; name: string };
  /** TSP最適化後のスポット訪問順（出発地は含まない） */
  orderedSpots: Spot[];
  tripType: TripType;
  avoidTolls: boolean;
  segments: RouteSegment[];
  totalDuration: number;   // seconds
  totalDistance: number;   // meters
  // ORS Directions の GeoJSON レスポンス全体（Leaflet polyline 描画用）
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  geojson: any;
}
