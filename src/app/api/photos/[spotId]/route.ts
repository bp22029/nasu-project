/**
 * 写真取得 API Route（CLAUDE.md セクション8の「写真取得独立関数」の差し込み口）
 *
 * GET /api/photos/[spotId]   ※キーは spots.json の id（Google placeId ではない）
 *
 * Google Places 写真と、グリッド掲載が許可された投稿写真（機能3）をマージして返す。
 * - Google 写真: spots.json で spotId → placeId を引いて動的取得（最大1枚）
 * - 投稿写真: posts.show_in_grid = true / trips.show_in_grid = true のものから最大4枚
 *
 * Google のクレジット終了後は写真が投稿分だけになる（fetchGooglePhotos はキーが無効だと
 * 例外ではなく [] を返す）。写真がどこにあるかは /api/photos/coverage が返し、/select は
 * それを使って写真のあるスポットを先頭に並べる。写真ゼロのカードの見せ方はセクション19。
 *
 * 規約遵守（CLAUDE.md セクション5）:
 * - Google 写真の本体・URLはサーバー側でキャッシュしない（毎回動的取得）
 * - Google 写真には authorAttributions を必ず含める（source: "google"）
 * - 投稿写真は自前ストレージ（Supabase Storage）なので Google 規約の制約外（source: "user"）
 * - 写真は地図外グリッドに表示（地図コンポーネントには渡さない）
 */

import { NextResponse } from "next/server";
import { SPOTS } from "@/lib/spots";
import { getSupabaseServer } from "@/lib/supabase/server";

// Next.js は GET Route Handler とその中の fetch をデフォルトでキャッシュする。
// このAPIはキャッシュ厳禁: Google 写真URLの保存は規約違反（CLAUDE.md セクション5）、
// 投稿写真は削除・掲載許可の変更が即時反映されないと「消したのに残る」事故になる。
export const dynamic = "force-dynamic";

const PLACES_BASE = "https://places.googleapis.com/v1";
// Google 写真は1枚に絞る（media API の呼び出し数 = スポット数で済む）
const MAX_GOOGLE_PHOTOS = 1;
// 投稿写真はカードのカルーセルが重くならない程度に絞る
const MAX_USER_PHOTOS = 4;
interface AuthorAttribution {
  displayName: string;
  uri?: string;
  photoUri?: string;
}

export interface PhotoItem {
  uri: string;
  source: "google" | "user";
  /** source: "google" のときのみ。撮影者クレジット（規約上必ず表示） */
  authorAttributions?: AuthorAttribution[];
  /** source: "user" のときのみ。投稿者ニックネーム */
  nickname?: string;
}

export async function GET(
  _request: Request,
  { params }: { params: { spotId: string } }
) {
  const { spotId } = params;
  if (!spotId) {
    return NextResponse.json({ error: "spotId が必要です" }, { status: 400 });
  }
  const spot = SPOTS.find((s) => s.id === spotId);
  if (!spot) {
    return NextResponse.json({ error: "スポットが見つかりません" }, { status: 404 });
  }

  // Google 写真と投稿写真は独立に取得（片方が失敗してももう片方は返す）
  const [googlePhotos, userPhotos] = await Promise.all([
    fetchGooglePhotos(spot.placeId).catch((err) => {
      console.error("[/api/photos] google", err);
      return [] as PhotoItem[];
    }),
    fetchUserPhotos(spotId).catch((err) => {
      console.error("[/api/photos] user", err);
      return [] as PhotoItem[];
    }),
  ]);

  return NextResponse.json({ photos: [...googlePhotos, ...userPhotos] });
}

/** Google Places (New) からスポット写真を動的取得（従来ロジック） */
async function fetchGooglePhotos(placeId: string): Promise<PhotoItem[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey || !placeId) return [];

  // 1. スポットの写真リストを取得（no-store: Next の Data Cache に残さない）
  const detailRes = await fetch(
    `${PLACES_BASE}/places/${placeId}?fields=photos&languageCode=ja`,
    { headers: { "X-Goog-Api-Key": apiKey }, cache: "no-store" }
  );
  if (!detailRes.ok) return [];

  const detail = await detailRes.json() as {
    photos?: Array<{
      name: string;
      authorAttributions?: AuthorAttribution[];
    }>;
  };

  const photos = (detail.photos ?? []).slice(0, MAX_GOOGLE_PHOTOS);
  if (photos.length === 0) return [];

  // 2. 各写真の photoUri を取得（キャッシュ禁止 → 毎回取得）
  const items = await Promise.all(
    photos.map(async (photo): Promise<PhotoItem | null> => {
      const mediaRes = await fetch(
        `${PLACES_BASE}/${photo.name}/media?maxHeightPx=400&maxWidthPx=600&skipHttpRedirect=true`,
        { headers: { "X-Goog-Api-Key": apiKey }, cache: "no-store" }
      );
      if (!mediaRes.ok) return null;

      const media = await mediaRes.json() as { photoUri?: string };
      if (!media.photoUri) return null;

      return {
        uri: media.photoUri,
        source: "google",
        authorAttributions: photo.authorAttributions ?? [],
      };
    })
  );

  return items.filter((p): p is PhotoItem => p !== null);
}

/**
 * グリッド掲載が許可された投稿写真を取得（機能3）。
 * 単体投稿（posts.show_in_grid）と旅記録（trips.show_in_grid、投稿単位）の両方から集める。
 * 投稿写真は自前データなので URL を返してよい（Public バケットの公開URL）。
 */
async function fetchUserPhotos(spotId: string): Promise<PhotoItem[]> {
  const supabase = getSupabaseServer();
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabase || !baseUrl) return [];

  const toUri = (path: string) =>
    `${baseUrl}/storage/v1/object/public/photos/${path}`;

  const [postsRes, entriesRes] = await Promise.all([
    supabase
      .from("posts")
      .select("photo_path, profiles(nickname)")
      .eq("spot_id", spotId)
      .eq("show_in_grid", true)
      .order("created_at", { ascending: false })
      .limit(MAX_USER_PHOTOS),
    supabase
      .from("trip_entries")
      .select("photo_path, trips!inner(show_in_grid, profiles(nickname))")
      .eq("spot_id", spotId)
      .eq("trips.show_in_grid", true)
      .not("photo_path", "is", null)
      .limit(MAX_USER_PHOTOS),
  ]);

  const items: PhotoItem[] = [];

  for (const row of postsRes.data ?? []) {
    const profile = row.profiles as unknown as { nickname: string } | null;
    items.push({
      uri: toUri(row.photo_path as string),
      source: "user",
      nickname: profile?.nickname ?? "名無しの旅人",
    });
  }

  for (const row of entriesRes.data ?? []) {
    const trip = row.trips as unknown as {
      profiles: { nickname: string } | null;
    } | null;
    items.push({
      uri: toUri(row.photo_path as string),
      source: "user",
      nickname: trip?.profiles?.nickname ?? "名無しの旅人",
    });
  }

  return items.slice(0, MAX_USER_PHOTOS);
}
