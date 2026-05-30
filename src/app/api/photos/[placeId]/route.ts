/**
 * 写真取得 API Route（CLAUDE.md セクション8の「写真取得独立関数」の差し込み口）
 *
 * GET /api/photos/[placeId]
 *
 * 規約遵守（CLAUDE.md セクション5）:
 * - 写真本体・URLはサーバー側でキャッシュしない（毎回動的取得）
 * - authorAttributions を必ずレスポンスに含める
 * - 写真は地図外グリッドに表示（地図コンポーネントには渡さない）
 */

import { NextResponse } from "next/server";

const PLACES_BASE = "https://places.googleapis.com/v1";
const MAX_PHOTOS = 3;

interface AuthorAttribution {
  displayName: string;
  uri?: string;
  photoUri?: string;
}

interface PhotoItem {
  uri: string;
  authorAttributions: AuthorAttribution[];
}

export async function GET(
  _request: Request,
  { params }: { params: { placeId: string } }
) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GOOGLE_PLACES_API_KEY が未設定" }, { status: 500 });
  }

  const { placeId } = params;
  if (!placeId) {
    return NextResponse.json({ error: "placeId が必要です" }, { status: 400 });
  }

  try {
    // 1. スポットの写真リストを取得
    const detailRes = await fetch(
      `${PLACES_BASE}/places/${placeId}?fields=photos&languageCode=ja`,
      { headers: { "X-Goog-Api-Key": apiKey } }
    );

    if (!detailRes.ok) {
      return NextResponse.json(
        { error: `Places API エラー: ${detailRes.status}` },
        { status: detailRes.status }
      );
    }

    const detail = await detailRes.json() as {
      photos?: Array<{
        name: string;
        authorAttributions?: AuthorAttribution[];
      }>;
    };

    const photos = (detail.photos ?? []).slice(0, MAX_PHOTOS);
    if (photos.length === 0) {
      return NextResponse.json({ photos: [] });
    }

    // 2. 各写真の photoUri を取得（キャッシュ禁止 → 毎回取得）
    const photoItems = await Promise.all(
      photos.map(async (photo): Promise<PhotoItem | null> => {
        const mediaRes = await fetch(
          `${PLACES_BASE}/${photo.name}/media?maxHeightPx=400&maxWidthPx=600&skipHttpRedirect=true`,
          { headers: { "X-Goog-Api-Key": apiKey } }
        );
        if (!mediaRes.ok) return null;

        const media = await mediaRes.json() as { photoUri?: string };
        if (!media.photoUri) return null;

        return {
          uri: media.photoUri,
          // authorAttributions がない場合は空配列
          authorAttributions: photo.authorAttributions ?? [],
        };
      })
    );

    const validPhotos = photoItems.filter((p): p is PhotoItem => p !== null);
    return NextResponse.json({ photos: validPhotos });
  } catch (err) {
    console.error("[/api/photos]", err);
    return NextResponse.json({ error: "写真取得に失敗しました" }, { status: 500 });
  }
}
