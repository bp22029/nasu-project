/**
 * Supabase サーバーサイドクライアント（API Route 用、機能3）
 *
 * /api/photos でグリッド掲載許可済みの投稿写真を読むためのクライアント。
 * 読み取りは RLS の「public read」ポリシーで anon キーのまま可能。
 * サーバーにはセッションがないので永続化・自動更新は切る。
 * service_role key は使わない（CLAUDE.md セクション14）。
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function getSupabaseServer(): SupabaseClient | null {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    // 未設定でも写真APIは Google 写真だけで動かしたいので throw しない
    if (!url || !anonKey) return null;
    client = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}
