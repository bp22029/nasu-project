/** 機能3（写真投稿）のレコード型。supabase/schema.sql のテーブルと対 */

export interface Profile {
  id: string; // auth.users の UUID
  nickname: string;
  created_at: string;
}

/** 単体投稿（写真1枚 + スポット） */
export interface Post {
  id: string;
  user_id: string;
  spot_id: string; // data/spots.json の id（非正規化）
  photo_path: string; // Storage 内パス（{user_id}/{uuid}.jpg）
  caption: string | null;
  /** /select グリッドへの掲載許可（投稿者がアップロード時に選択。初期値 true） */
  show_in_grid: boolean;
  created_at: string;
  /** `select('*, profiles(nickname)')` で展開した投稿者名 */
  profiles?: Pick<Profile, "nickname"> | null;
}

/** 旅記録 */
export interface Trip {
  id: string;
  user_id: string;
  title: string;
  comment: string | null;
  /** /route の encodeRouteQuery 文字列（ルート画面起点のときのみ。手動作成は null） */
  route_query: string | null;
  /** 旅記録内の写真の /select グリッド掲載許可（投稿単位で1つ。初期値 true） */
  show_in_grid: boolean;
  created_at: string;
  profiles?: Pick<Profile, "nickname"> | null;
  trip_entries?: TripEntry[];
}

/** 旅記録の訪問エントリ（position 昇順 = 訪問順） */
export interface TripEntry {
  id: string;
  trip_id: string;
  position: number;
  spot_id: string;
  photo_path: string | null; // 写真なしの訪問地も許す
}

/**
 * /route → /trips/new へのプレフィル受け渡し（sessionStorage 経由）。
 * URL の spots= は選択順であって TSP 最適化後の訪問順ではないため、
 * ルート画面が訪問順をここに保存する。
 */
export interface TripDraft {
  spotIds: string[]; // RouteResult.orderedSpots の訪問順
  routeQuery: string; // 現在の searchParams.toString() → trips.route_query
  createdAt: number; // 古いドラフトの破棄判定用
}

export const TRIP_DRAFT_KEY = "nasu-trip-draft";

/** これより古い TripDraft は無視する（24時間） */
export const TRIP_DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000;
