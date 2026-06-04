/**
 * OpenRouteService (ORS) API クライアント
 */

const ORS_BASE = "https://api.openrouteservice.org/v2";

function orsHeaders() {
  const key = process.env.ORS_API_KEY;
  if (!key) throw new Error("ORS_API_KEY が設定されていません");
  return {
    Authorization: key,
    "Content-Type": "application/json",
  };
}

type LngLat = [number, number];

/**
 * ORS Matrix API (driving-car)
 * @param avoidTolls true のとき avoid_features: ["tollways"] を付加
 */
export async function getDurationMatrix(
  locations: LngLat[],
  avoidTolls: boolean
): Promise<number[][]> {
  const body: Record<string, unknown> = {
    locations,
    metrics: ["duration"],
  };
  if (avoidTolls) {
    body.options = { avoid_features: ["tollways"] };
  }

  const res = await fetch(`${ORS_BASE}/matrix/driving-car`, {
    method: "POST",
    headers: orsHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ORS Matrix API エラー ${res.status}: ${text}`);
  }

  const data = await res.json() as { durations: number[][] };
  return data.durations;
}

/**
 * ORS Directions API (driving-car, GeoJSON)
 * @param avoidTolls true のとき avoid_features: ["tollways"] を付加
 */
export async function getDirectionsGeoJSON(
  waypoints: LngLat[],
  avoidTolls: boolean
): Promise<unknown> {
  const body: Record<string, unknown> = {
    coordinates: waypoints,
  };
  if (avoidTolls) {
    body.options = { avoid_features: ["tollways"] };
  }

  const res = await fetch(`${ORS_BASE}/directions/driving-car/geojson`, {
    method: "POST",
    headers: orsHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ORS Directions API エラー ${res.status}: ${text}`);
  }

  return res.json();
}
