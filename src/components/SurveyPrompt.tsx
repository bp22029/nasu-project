"use client";

/**
 * アンケートへの導線（再利用CTA、機能: 使用感アンケート）
 *
 * 各ページの完了・閲覧地点に置き、`/survey?from=<from>` へ誘導する。
 * `from` は回答に「どこから来たか」として保存される（ユーザーに追加質問せず文脈を取得）。
 *
 * 一度回答すると localStorage フラグ（SURVEY_ANSWERED_KEY）が立ち、しつこく出さないよう
 * 全ページの CTA を自動で隠す。再回答は /survey 直アクセスで可能。
 *
 * デザインは既存の淡緑リンク（#5a7d5a）に合わせ、控えめに置く。
 */
import Link from "next/link";
import { useEffect, useState } from "react";
import { SURVEY_ANSWERED_KEY } from "@/lib/survey";

interface SurveyPromptProps {
  /** 導線識別子（'route' | 'diagnosis' | 'post' | 'trips' | 'nav' など） */
  from: string;
  /** 見た目。link=淡いテキストリンク（既定） / card=枠付きの小カード */
  variant?: "link" | "card";
}

export default function SurveyPrompt({ from, variant = "link" }: SurveyPromptProps) {
  // SSR とクライアントで localStorage を参照すると不一致になるため、初期は非表示にして
  // マウント後に判定する（回答済みなら出さない）。
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    try {
      setVisible(localStorage.getItem(SURVEY_ANSWERED_KEY) !== "1");
    } catch {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const href = `/survey?from=${encodeURIComponent(from)}`;

  if (variant === "card") {
    return (
      <Link
        href={href}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: "14px",
          maxWidth: "560px", padding: "16px 20px", borderRadius: "16px",
          border: "1px solid #e5e0d3", background: "rgba(255,255,255,.6)",
          textDecoration: "none", color: "#2c3e2d",
        }}
      >
        <span style={{ fontSize: "13px", fontWeight: 600, letterSpacing: ".04em", lineHeight: 1.7 }}>
          使ってみた感想を聞かせてください
          <span style={{ display: "block", fontSize: "11px", color: "#8fa888", fontWeight: 500, marginTop: "3px" }}>
            30秒ほどのアンケート（任意）
          </span>
        </span>
        <span style={{ color: "#5a7d5a", flexShrink: 0 }}>
          <Arrow />
        </span>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      style={{
        display: "inline-flex", alignItems: "center", gap: "8px",
        fontSize: "13px", fontWeight: 600, color: "#5a7d5a", letterSpacing: ".06em",
        textDecoration: "underline", textUnderlineOffset: "4px",
      }}
    >
      使ってみた感想を聞かせてください
      <Arrow />
    </Link>
  );
}

function Arrow() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
