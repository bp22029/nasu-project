/**
 * OpenRouteService (ORS) API クライアント
 *
 * エンドポイントは api.heigit.org を使う。
 * 旧 api.openrouteservice.org は 2026-04-28 に廃止告知され（クォータ制限で Directions が
 * 504/ハングするようになった）、2026-08-24 に完全停止する。移行先が api.heigit.org で、
 * APIキー・エンドポイントの形式（/v2/directions・/v2/matrix）は同一なので base URL の変更だけでよい。
 * 参考: https://ask.openrouteservice.org/t/deprecating-api-openrouteservice-org-in-favour-of-api-heigit-org/7912
 *
 * 公開インスタンス（無料枠）は混雑時に応答が遅く、nginx が 504 Gateway Time-out を返すことがある。
 * そのまま失敗させず、自前で「短めのタイムアウト（AbortController）＋一時エラーのリトライ」で吸収する。
 * - 自前タイムアウトで先に打ち切る → ORS の 60 秒ゲートウェイ待ちを避けて素早く再試行できる。
 * - 502/503/504/429/500・ネットワーク切断・タイムアウトは一時エラーとみなしてリトライ。
 * Vercel の関数実行時間内に収まるよう、試行回数と待ち時間は控えめにする（route.ts の maxDuration と揃える）。
 */

const ORS_BASE = "https://api.heigit.org/openrouteservice/v2";

// 一時的とみなすHTTPステータス（リトライ対象）
const TRANSIENT_STATUS = new Set([429, 500, 502, 503, 504]);

function orsHeaders() {
  const key = process.env.ORS_API_KEY;
  if (!key) throw new Error("ORS_API_KEY が設定されていません");
  return {
    Authorization: key,
    "Content-Type": "application/json",
  };
}

type LngLat = [number, number];

interface OrsFetchOptions {
  /** 1回の試行の上限時間(ms)。超えたら中断して次の試行へ */
  timeoutMs: number;
  /** 総試行回数（初回 + リトライ） */
  attempts: number;
  /** API名（エラーメッセージ用） */
  label: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * ORS へ POST し、一時エラーをタイムアウト＋リトライで吸収する共通関数。
 * 成功時は Response を返す（本文の解釈は呼び出し側）。
 */
async function orsFetch(
  path: string,
  body: unknown,
  { timeoutMs, attempts, label }: OrsFetchOptions
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(`${ORS_BASE}${path}`, {
        method: "POST",
        headers: orsHeaders(),
        body: JSON.stringify(body),
        signal: controller.signal,
        cache: "no-store",
      });

      if (res.ok) return res;

      const text = await res.text();
      const httpError = new Error(`ORS ${label} API エラー ${res.status}: ${text}`);

      // 4xx など恒久エラーはリトライしても無駄なので即失敗。
      if (!TRANSIENT_STATUS.has(res.status)) {
        httpError.name = "OrsPermanentError";
        throw httpError;
      }

      // 502/503/504/429/500 は一時エラー → リトライ対象として控える。
      lastError = httpError;
    } catch (err) {
      // 恒久エラーはここで捕まえず呼び出し元へ抜ける。
      // fetch 自体の失敗（AbortError=タイムアウト / ネットワーク切断）はリトライ対象。
      if (err instanceof Error && err.name === "OrsPermanentError") throw err;
      lastError = err instanceof Error ? err : new Error(String(err));
    } finally {
      clearTimeout(timer);
    }

    // 最終試行でなければ少し待って再試行（バックオフ: 0.8s, 1.6s, ...）
    if (attempt < attempts) {
      await sleep(800 * attempt);
    }
  }

  throw new Error(
    `ORS ${label} API が ${attempts} 回とも失敗しました（混雑またはタイムアウト）: ${lastError?.message ?? "不明なエラー"}`
  );
}

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

  const res = await orsFetch("/matrix/driving-car", body, {
    timeoutMs: 12_000,
    attempts: 2,
    label: "Matrix",
  });

  const data = (await res.json()) as { durations: number[][] };
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

  const res = await orsFetch("/directions/driving-car/geojson", body, {
    timeoutMs: 15_000,
    attempts: 3,
    label: "Directions",
  });

  return res.json();
}
