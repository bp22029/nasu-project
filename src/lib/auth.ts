/**
 * 匿名認証 + プロフィール（ニックネーム）のヘルパー（機能3）
 *
 * 方針は「遅延発火」: 閲覧にはセッション不要なので、匿名サインインは
 * ユーザーが投稿しようとした瞬間に初めて行う（無駄な匿名MAUを増やさない）。
 *
 * 投稿フローの使い方:
 *   const { profile } = await ensureSignedInWithProfile();
 *   if (!profile) → NicknameModal を開き、保存後に投稿処理を続行
 */
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import type { Profile } from "@/types/post";

/** セッションがなければ匿名サインインして user_id を返す */
export async function ensureAnonSession(): Promise<string> {
  const supabase = getSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session) return session.user.id;

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error || !data.user) {
    throw new Error(`サインインに失敗しました: ${error?.message ?? "unknown"}`);
  }
  return data.user.id;
}

/**
 * 投稿前に呼ぶ。セッションを保証し、プロフィールを取得する。
 * profile が null = ニックネーム未設定 → 呼び出し側で NicknameModal を開く。
 */
export async function ensureSignedInWithProfile(): Promise<{
  userId: string;
  profile: Profile | null;
}> {
  const userId = await ensureAnonSession();
  const { data, error } = await getSupabase()
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    throw new Error(`プロフィールの取得に失敗しました: ${error.message}`);
  }
  return { userId, profile: (data as Profile | null) ?? null };
}

/** ニックネームを保存（新規作成 or 変更）。セッションがなければ作る */
export async function saveNickname(nickname: string): Promise<Profile> {
  const trimmed = nickname.trim();
  if (trimmed.length < 1 || trimmed.length > 20) {
    throw new Error("ニックネームは1〜20文字で入力してください");
  }
  const userId = await ensureAnonSession();
  const { data, error } = await getSupabase()
    .from("profiles")
    .upsert({ id: userId, nickname: trimmed })
    .select()
    .single();
  if (error || !data) {
    throw new Error(`ニックネームの保存に失敗しました: ${error?.message ?? "unknown"}`);
  }
  return data as Profile;
}

/**
 * 現在のセッションのプロフィールを読む（サインインは発火しない）。
 * /me やヘッダー表示用。セッションなし・プロフィール未作成は null。
 */
export function useProfile(): {
  profile: Profile | null;
  loading: boolean;
  refresh: () => void;
} {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = getSupabase();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          if (!cancelled) setProfile(null);
          return;
        }
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .maybeSingle();
        if (!cancelled) setProfile((data as Profile | null) ?? null);
      } catch {
        if (!cancelled) setProfile(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [nonce]);

  return { profile, loading, refresh: () => setNonce((n) => n + 1) };
}
