"use client";

/**
 * 公開デモの注記（写真ソースについて）
 *
 * Google Places API の写真は大学演習で使っていた無料クレジットの終了により停止している。
 * 黙って空のカードが並ぶと「壊れているサイト」に見えるので、事情と現在の写真ソースを明示する。
 * 実装は残してあり、GOOGLE_PLACES_API_KEY を設定すれば元の動作に戻る（CLAUDE.md セクション5）。
 *
 * 一度閉じたらそのセッション中は出さない（読めば十分な情報のため）。
 */

import { useEffect, useState } from "react";

const DISMISS_KEY = "nasu-demo-notice-dismissed";
const REPO_URL = "https://github.com/bp22029/nasu-project";

export default function DemoNotice() {
  // 初期値は false 固定（SSR とハイドレーションの不一致を避け、判定後に出す）
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(DISMISS_KEY) !== "1") setVisible(true);
    } catch {
      setVisible(true); // ストレージが使えない環境でも表示はする
    }
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    setVisible(false);
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* 保存できなくても閉じられれば十分 */
    }
  };

  return (
    <div
      className="sel-rise relative mb-[18px]"
      style={{
        animationDelay: ".3s",
        borderRadius: "14px",
        border: "1px solid #e5e0d3",
        background: "rgba(255,255,255,.72)",
        padding: "13px 40px 13px 15px",
      }}
    >
      <p
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: "10px",
          letterSpacing: ".2em",
          color: "#8fa888",
          textTransform: "uppercase",
          marginBottom: "5px",
        }}
      >
        写真について
      </p>
      <p style={{ fontSize: "12.5px", lineHeight: 1.75, color: "#5a6b57", letterSpacing: ".03em" }}>
        Google Places API による写真取得は、演習で利用していた無料クレジットの終了にともない停止しています
        （実装は残してあり、APIキーを設定すれば復帰します）。現在表示している写真は、実証実験の現地調査で
        アプリから投稿されたものです。写真のあるスポットを先頭に並べ、写真がないスポットは施設名とジャンルの
        カードにしています。運用時の画面は{" "}
        <a
          href={REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#5a7d5a", fontWeight: 600, textDecoration: "underline", textUnderlineOffset: "2px" }}
        >
          GitHub の README
        </a>
        にスクリーンショットがあります。
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="この注記を閉じる"
        style={{
          position: "absolute", top: "10px", right: "10px",
          width: "24px", height: "24px", borderRadius: "50%",
          display: "grid", placeItems: "center",
          border: "none", background: "rgba(90,125,90,.08)", color: "#5a7d5a", cursor: "pointer", padding: 0,
        }}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
          <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
