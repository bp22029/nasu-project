import type { Spot } from "@/types/spot";

export interface RouteSegment {
  from: string;
  to: string;
  duration: number;  // seconds
  distance: number;  // meters
}

export interface RouteResult {
  orderedSpots: Spot[];
  segments: RouteSegment[];
  totalDuration: number;   // seconds
  totalDistance: number;   // meters
  // ORS Directions の GeoJSON レスポンス全体（Leaflet polyline 描画用）
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  geojson: any;
}
