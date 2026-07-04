import { PRESET_DEPARTURES } from "@/types/departure";
import type { DeparturePoint, TripType } from "@/types/departure";
import type { SpotLock } from "@/types/route";

// ルート条件を URL クエリで表現する（/route?spots=..&dep=..&trip=..&tolls=..&lock=..）。
// URL にすることで、診断（機能2）からの遷移・アンケートでの共有・リロード復元が
// すべて同じ入口で済む。
export interface RouteQueryInput {
  spotIds: string[];
  departure: DeparturePoint;
  tripType: TripType;
  avoidTolls: boolean;
  // 巡回順の一部固定（任意。省略・空なら固定なし＝完全に自動最適化）。
  // URL 表現は lock=<spotId>:<pos>,<spotId>:<pos>...（pos は 1 始まりの訪問順位置）
  locks?: SpotLock[];
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
  if (input.locks && input.locks.length > 0) {
    p.set("lock", input.locks.map((l) => `${l.spotId}:${l.position}`).join(","));
  }
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

  const locks = decodeLocks(params.get("lock"), spotIds);

  return {
    ok: true,
    value: { spotIds, departure, tripType, avoidTolls, ...(locks.length > 0 ? { locks } : {}) },
  };
}

// lock=<spotId>:<pos>,... を SpotLock[] に復元する。
// 不正なトークン（数値でない・範囲外・未選択のspotId・位置重複・spotId重複）は捨てる。
// spot.id にコロンは含まれないが、念のため最後のコロンで区切って位置を取り出す。
function decodeLocks(raw: string | null, spotIds: string[]): SpotLock[] {
  if (!raw) return [];
  const spotIdSet = new Set(spotIds);
  const usedSpotIds = new Set<string>();
  const usedPositions = new Set<number>();
  const locks: SpotLock[] = [];

  for (const token of raw.split(",").filter(Boolean)) {
    const sep = token.lastIndexOf(":");
    if (sep <= 0) continue;
    const spotId = token.slice(0, sep);
    const position = Number(token.slice(sep + 1));
    if (!Number.isInteger(position) || position < 1 || position > spotIds.length) continue;
    if (!spotIdSet.has(spotId)) continue;
    if (usedSpotIds.has(spotId) || usedPositions.has(position)) continue;
    usedSpotIds.add(spotId);
    usedPositions.add(position);
    locks.push({ spotId, position });
  }
  return locks;
}
