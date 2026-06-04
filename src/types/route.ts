import type { Spot } from "@/types/spot";
import type { TripType } from "@/types/departure";

export interface RouteSegment {
  from: string;
  to: string;
  duration: number;   // seconds
  distance: number;   // meters
}

export interface RouteResult {
  /** 出発地（固定始点） */
  departure: { lat: number; lng: number; name: string };
  /** TSP最適化後のスポット訪問順（出発地は含まない） */
  orderedSpots: Spot[];
  tripType: TripType;
  segments: RouteSegment[];
  totalDuration: number;   // seconds
  totalDistance: number;   // meters
  // ORS Directions の GeoJSON レスポンス全体（Leaflet polyline 描画用）
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  geojson: any;
}
