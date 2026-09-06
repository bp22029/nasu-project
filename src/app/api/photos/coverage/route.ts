/**
 * 写真のあるスポット一覧 API
 *
 * GET /api/photos/coverage → { spotIds: string[] }
 *
 * グリッド掲載が許可された投稿写真（機能3）を持つスポットの id を返す。
 * /select はこれを使って**写真のあるスポットをグリッドの先頭に並べる**（CLAUDE.md セクション19）。
 * Google のクレジット終了後、写真は投稿分だけ（現状 10 スポット弱）なので、
 * ランダム順のままだと最初の画面に一枚も写真が出ないことがあるため。
 *
 * 写真の有無だけを返し、URL は返さない（URL は従来どおり /api/photos/[spotId] が都度返す）。
 * Next.js のキャッシュ厳禁の理由は /api/photos/[spotId] と同じ（CLAUDE.md セクション11）。
 */

import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = getSupabaseServer();
  if (!supabase) return NextResponse.json({ spotIds: [] });

  const [postsRes, entriesRes] = await Promise.all([
    supabase.from("posts").select("spot_id").eq("show_in_grid", true),
    supabase
      .from("trip_entries")
      .select("spot_id, trips!inner(show_in_grid)")
      .eq("trips.show_in_grid", true)
      .not("photo_path", "is", null),
  ]);

  if (postsRes.error) console.error("[/api/photos/coverage] posts", postsRes.error);
  if (entriesRes.error) console.error("[/api/photos/coverage] entries", entriesRes.error);

  const ids = new Set<string>();
  for (const row of postsRes.data ?? []) ids.add(row.spot_id as string);
  for (const row of entriesRes.data ?? []) ids.add(row.spot_id as string);

  return NextResponse.json({ spotIds: Array.from(ids) });
}
