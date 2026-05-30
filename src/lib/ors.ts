/**
 * OpenRouteService (ORS) API クライアント
 * - Matrix API: 道なり所要時間行列を取得
 * - Directions API: 道なり経路 (GeoJSON) を取得
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

/** 座標ペア [lng, lat] の配列（ORS は経度→緯度の順） */
type LngLat = [number, number];

/**
 * ORS Matrix API (driving-car)
 * 返値: 所要時間の N×N 行列（秒）
 */
export async function getDurationMatrix(locations: LngLat[]): Promise<number[][]> {
  const res = await fetch(`${ORS_BASE}/matrix/driving-car`, {
    method: "POST",
    headers: orsHeaders(),
    body: JSON.stringify({
      locations,
      metrics: ["duration"],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ORS Matrix API エラー ${res.status}: ${text}`);
  }

  const data = await res.json() as { durations: number[][] };
  return data.durations;
}

/**
 * ORS Directions API (driving-car, GeoJSON フォーマット)
 * 返値: ORS の GeoJSON レスポンス全体
 */
export async function getDirectionsGeoJSON(waypoints: LngLat[]): Promise<unknown> {
  const res = await fetch(`${ORS_BASE}/directions/driving-car/geojson`, {
    method: "POST",
    headers: orsHeaders(),
    body: JSON.stringify({
      coordinates: waypoints,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ORS Directions API エラー ${res.status}: ${text}`);
  }

  return res.json();
}
