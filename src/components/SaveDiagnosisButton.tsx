"use client";

/**
 * 「結果を保存」ボタン（機能2: 診断結果の保存）
 *
 * 旅タイプ診断の結果を保存する（非公開・自分用・**最新1件のみ**）。
 * - 結果は encodeDiagnosisQuery の文字列（type + 4軸スコア）一本で完全復元できるので、
 *   diagnoses テーブルに result_query を upsert するだけ。user_id が主キーなので
 *   何度保存しても行は常に1つ＝最新に置き換わる（マイページはそれを1件表示する）。
 * - ニックネーム不要: 非公開なので ensureAnonSession() だけ発火する
 *   （投稿・旅記録の ensureSignedInWithProfile とは違い NicknameModal は挟まない）。
 * - 見返しはマイページ（/me）の DIAGNOSIS 節から。
 *
 * スタイル・注記の絶対配置は SaveRouteButton に倣う（従属 pill。注記でボタンがずれないよう絶対配置）。
 */
import { useState } from "react";
import { ensureAnonSession } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase/client";

interface SaveDiagnosisButtonProps {
  /** 保存する結果の encodeDiagnosisQuery 文字列（"?" は含まない） */
  resultQuery: string;
}

type Status = "idle" | "saving" | "saved";

export default function SaveDiagnosisButton({ resultQuery }: SaveDiagnosisButtonProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (status !== "idle" || !resultQuery) return; // 二重保存を防ぐ（同一表示中は1回だけ）
    setStatus("saving");
    setError(null);
    try {
      const userId = await ensureAnonSession();
      // user_id 主キーで upsert ＝ 常に最新1件だけを保持する（created_at も now に更新）
      const { error } = await getSupabase()
        .from("diagnoses")
        .upsert(
          { user_id: userId, result_query: resultQuery, created_at: new Date().toISOString() },
          { onConflict: "user_id" }
        );
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
        aria-label="この診断結果を保存する"
        className="route-cta"
        style={{
          display: "inline-flex", alignItems: "center", gap: "10px",
          cursor: status === "idle" ? "pointer" : "default",
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
        {status === "saving" ? "保存中…" : saved ? "保存しました" : "結果を保存"}
      </button>

      {/* 注記はボタン下に絶対配置（通常フローに入れるとボタンが上へずれるため。SaveRouteButton と同様） */}
      {error && (
        <p style={{
          position: "absolute", top: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)",
          width: "240px", textAlign: "center", margin: 0,
          fontSize: "11px", color: "#e05252", letterSpacing: ".04em",
        }}>
          ⚠ {error}
        </p>
      )}
      {saved && (
        <p style={{
          position: "absolute", top: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)",
          whiteSpace: "nowrap", margin: 0,
          fontSize: "11px", color: "#5a7d5a", letterSpacing: ".06em",
        }}>
          マイページからいつでも見返せます
        </p>
      )}
    </div>
  );
}
