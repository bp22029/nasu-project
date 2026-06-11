import { PRESET_DEPARTURES } from "@/types/departure";
import type { DeparturePoint, TripType } from "@/types/departure";

// ルート条件を URL クエリで表現する（/route?spots=..&dep=..&trip=..&tolls=..）。
// URL にすることで、診断（機能2）からの遷移・アンケートでの共有・リロード復元が
// すべて同じ入口で済む。
export interface RouteQueryInput {
  spotIds: string[];
  departure: DeparturePoint;
  tripType: TripType;
  avoidTolls: boolean;
}

export function encodeRouteQuery(input: RouteQueryInput): string {
  const p = new URLSearchParams();
  p.set("spots", input.spotIds.join(","));
  if (input.departure.id === "current-location") {
    p.set("dep", "gps");
    p.set("lat", input.departure.lat.toFixed(6));
    p.set("lng", input.departure.lng.toFixed(6));
  } else {
    p.set("dep", input.departure.id);
  }
  p.set("trip", input.tripType);
  p.set("tolls", input.avoidTolls ? "1" : "0");
  return p.toString();
}

export type DecodeResult =
  | { ok: true; value: RouteQueryInput }
  | { ok: false; error: string };

export function decodeRouteQuery(params: URLSearchParams): DecodeResult {
  const spotIds = (params.get("spots") ?? "").split(",").filter(Boolean);
  if (spotIds.length === 0) {
    return { ok: false, error: "スポットが指定されていません" };
  }

  const dep = params.get("dep");
  let departure: DeparturePoint;
  if (dep === "gps") {
    const lat = Number(params.get("lat"));
    const lng = Number(params.get("lng"));
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return { ok: false, error: "現在地の座標が不正です" };
    }
    departure = { id: "current-location", name: "現在地", lat, lng, description: "GPSで取得" };
  } else {
    const preset = PRESET_DEPARTURES.find((d) => d.id === dep);
    if (!preset) {
      return { ok: false, error: "出発地が指定されていません" };
    }
    departure = preset;
  }

  const trip = params.get("trip");
  const tripType: TripType = trip === "roundtrip" ? "roundtrip" : "oneway";
  const avoidTolls = params.get("tolls") !== "0";

  return { ok: true, value: { spotIds, departure, tripType, avoidTolls } };
}
