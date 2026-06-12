/**
 * Supabase ブラウザクライアント（シングルトン）
 *
 * 機能3（写真投稿）は Next.js API Route を介さず、ブラウザから supabase-js で
 * 直接アクセスする（書き込み保護は RLS で完結。anon key は公開前提のキー）。
 * セッションは supabase-js デフォルトの localStorage 永続化を使う
 * （= 同じブラウザなら次回以降も同一の匿名ユーザー）。
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) {
      throw new Error(
        "NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY が未設定です。" +
          "supabase/SETUP.md に従って .env.local に設定し、dev サーバーを再起動してください。"
      );
    }
    client = createClient(url, anonKey);
  }
  return client;
}
