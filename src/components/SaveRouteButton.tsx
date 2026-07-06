"use client";

/**
 * 「ルートを保存」ボタン（機能: ルート保存）
 *
 * 設計したルートを軽量ブックマークとして保存する（写真なし・非公開・自分用）。
 * - ルートは /route のクエリ文字列（route_query）一本で完全再現できるので、保存は
 *   saved_routes に route_query を1カラム insert するだけ。タイトルは付けない（一覧では
 *   スポット名から自動生成 = deriveRouteTitle）。あとで /me で改名できる。
 * - ニックネーム不要: 非公開の自分用なので ensureAnonSession() だけ発火する
 *   （投稿・旅記録の ensureSignedInWithProfile とは違い、NicknameModal は挟まない）。
 * - 見返しはマイページ（/me）の SAVED ROUTES 節から。
 *
 * スタイルは ShareRouteButton と対になる「生成り地×深緑縁の従属 pill」に揃える。
 */
import { useState } from "react";
import { ensureAnonSession } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase/client";

interface SaveRouteButtonProps {
  /** 保存する /route のクエリ文字列（searchParams.toString()。"?" は含まない） */
  routeQuery: string;
}

type Status = "idle" | "saving" | "saved";

export default function SaveRouteButton({ routeQuery }: SaveRouteButtonProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (status !== "idle" || !routeQuery) return; // 二重保存を防ぐ（同一表示中は1回だけ）
    setStatus("saving");
    setError(null);
    try {
      await ensureAnonSession();
      const { error } = await getSupabase().from("saved_routes").insert({ route_query: routeQuery });
      if (error) throw new Error(error.message);
      setStatus("saved");
    } catch (e) {
      setStatus("idle");
      setError(e instanceof Error ? e.message : "保存に失敗しました");
    }
  };

  const saved = status === "saved";

  return (
    <div style={{ position: "relative", display: "inline-flex", flexDirection: "column", alignItems: "center" }}>
      <button
        type="button"
        onClick={save}
        disabled={status !== "idle"}
        aria-label="このルートを保存する"
        className="route-cta"
        style={{
          display: "inline-flex", alignItems: "center", gap: "10px",
          cursor: status === "idle" ? "pointer" : "default",
          // 共有CTAと対になる従属 pill。保存済みは淡い緑地に切り替えて完了を示す
          background: saved ? "rgba(90,125,90,.14)" : "rgba(255,255,255,.92)",
          color: "#2c3e2d",
          border: `1px solid ${saved ? "rgba(90,125,90,.5)" : "rgba(44,62,45,.4)"}`,
          fontSize: "13.5px", fontWeight: 600, letterSpacing: ".1em",
          padding: "13px 26px", borderRadius: "100px",
          fontFamily: "var(--font-sans)",
          opacity: status === "saving" ? 0.7 : 1,
          transition: "background .2s, border-color .2s, opacity .2s",
        }}
      >
        {saved ? (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M5 12.5l4.5 4.5L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            {/* ブックマーク（しおり）アイコン */}
            <path d="M6 4h12v16l-6-4-6 4V4z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        {status === "saving" ? "保存中…" : saved ? "保存しました" : "ルートを保存"}
      </button>

      {error && (
        <p style={{ fontSize: "11px", color: "#e05252", letterSpacing: ".04em", marginTop: "8px", maxWidth: "240px", textAlign: "center" }}>
          ⚠ {error}
        </p>
      )}
      {saved && (
        <p style={{ fontSize: "11px", color: "#5a7d5a", letterSpacing: ".06em", marginTop: "8px" }}>
          マイページからいつでも見返せます
        </p>
      )}
    </div>
  );
}
