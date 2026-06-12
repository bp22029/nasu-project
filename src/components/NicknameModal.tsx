"use client";

/**
 * ニックネーム入力モーダル（機能3）
 *
 * 初回投稿時（profiles 行が未作成のとき）と、マイページからの変更時に開く。
 * 保存時に匿名サインイン + profiles upsert まで行う（lib/auth.ts の saveNickname）。
 *
 * パフォーマンス方針（CLAUDE.md セクション11）: backdrop-filter は使わず、
 * 半透明の単色オーバーレイ + 不透明度高めのカードで表現する。
 */
import { useEffect, useRef, useState } from "react";
import { saveNickname } from "@/lib/auth";
import type { Profile } from "@/types/post";

interface NicknameModalProps {
  open: boolean;
  /** 変更時は現在のニックネームを初期値に */
  initialNickname?: string;
  onSaved: (profile: Profile) => void;
  onCancel: () => void;
}

export default function NicknameModal({
  open,
  initialNickname = "",
  onSaved,
  onCancel,
}: NicknameModalProps) {
  const [nickname, setNickname] = useState(initialNickname);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setNickname(initialNickname);
      setError(null);
      // モーダルの開きアニメーション後にフォーカス
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open, initialNickname]);

  if (!open) return null;

  const trimmed = nickname.trim();
  const valid = trimmed.length >= 1 && trimmed.length <= 20;

  const handleSave = async () => {
    if (!valid || saving) return;
    setSaving(true);
    setError(null);
    try {
      const profile = await saveNickname(trimmed);
      onSaved(profile);
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="ニックネームの設定"
      onClick={onCancel}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(44,62,45,.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "360px",
          background: "#f7f5f0",
          borderRadius: "20px",
          border: "1px solid #e5e0d3",
          boxShadow: "0 24px 60px -24px rgba(36,48,25,.55)",
          padding: "26px 24px 22px",
          fontFamily: "var(--font-sans)",
        }}
      >
        <h2
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "19px",
            fontWeight: 600,
            color: "#2c3e2d",
            letterSpacing: ".06em",
            margin: 0,
          }}
        >
          ニックネーム
        </h2>
        <p
          style={{
            fontSize: "12px",
            color: "#5a7d5a",
            lineHeight: 1.7,
            margin: "8px 0 16px",
            letterSpacing: ".03em",
          }}
        >
          投稿に表示される名前です。メールアドレス等の登録は不要で、
          アカウントはこのブラウザにだけ紐づきます。
        </p>

        <input
          ref={inputRef}
          type="text"
          value={nickname}
          maxLength={20}
          placeholder="例: なすたび子"
          onChange={(e) => setNickname(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
          }}
          style={{
            width: "100%",
            boxSizing: "border-box",
            background: "rgba(255,255,255,.9)",
            border: "1px solid #d8d2c0",
            borderRadius: "12px",
            padding: "12px 14px",
            fontSize: "15px",
            color: "#2c3e2d",
            outline: "none",
            fontFamily: "var(--font-sans)",
          }}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: "5px",
            fontSize: "11px",
            color: "#9a947f",
          }}
        >
          <span>{error ? "" : "1〜20文字"}</span>
          <span>{trimmed.length}/20</span>
        </div>

        {error && (
          <p style={{ fontSize: "12px", color: "#e05252", margin: "6px 0 0" }}>{error}</p>
        )}

        <div style={{ display: "flex", gap: "10px", marginTop: "18px" }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            style={{
              flex: 1,
              cursor: "pointer",
              background: "transparent",
              border: "1px solid #d8d2c0",
              borderRadius: "12px",
              padding: "12px 0",
              fontSize: "13px",
              color: "#6b6552",
              letterSpacing: ".06em",
              fontFamily: "var(--font-sans)",
            }}
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!valid || saving}
            style={{
              flex: 1.4,
              cursor: valid && !saving ? "pointer" : "default",
              background: valid && !saving ? "#2c3e2d" : "#b9b49f",
              border: "none",
              borderRadius: "12px",
              padding: "12px 0",
              fontSize: "13px",
              fontWeight: 700,
              color: "#f3f1ea",
              letterSpacing: ".08em",
              transition: "background .25s",
              fontFamily: "var(--font-sans)",
            }}
          >
            {saving ? "保存中…" : "この名前にする"}
          </button>
        </div>
      </div>
    </div>
  );
}
