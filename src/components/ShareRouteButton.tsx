"use client";

import { useEffect, useRef, useState } from "react";

// 提案されたルートを SNS / メッセージで共有するボタン（機能1の一部）。
//
// 共有する中身は「アプリ内のルートURL（リンク）のみ」。/route のクエリだけで
// ルートは決定的に再現される（CLAUDE.md セクション8）ので、OGP画像などは作らず
// URL を渡すだけにしている。渡す URL には Google 由来データ（写真URL等）を
// 一切含めない（規約=CLAUDE.md セクション5）。
//
// 二段構え:
// - スマホなど navigator.share が使える環境 → OS の共有シート（LINE / Instagram /
//   X / メール等がまとめて出る）
// - PC など未対応 → フォールバックUI（①リンクをコピー ②LINEで送る ③Xで送る）。
//   Instagram の DM は Web の URL スキームで直接送れないため、フォールバックには
//   含めない（共有シート経由なら選べる）。

interface ShareRouteButtonProps {
  /** 共有する完全なURL（例: https://example.com/route?spots=..）。呼び出し側で組み立てて渡す */
  url: string;
}

// 那須旅アプリらしい短文（ブランド「#NASU」に合わせる）
const SHARE_TITLE = "#NASU の那須ルート";
const SHARE_TEXT = "那須の周遊ルートを作りました。地図で見てね";

export default function ShareRouteButton({ url }: ShareRouteButtonProps) {
  // navigator の機能検出はクライアントでのみ有効。SSR との不整合を避けるため
  // マウント後に判定する（初期レンダーはフォールバック非表示の状態から始まる）。
  const [canNativeShare, setCanNativeShare] = useState(false);
  const [fallbackOpen, setFallbackOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setCanNativeShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  // フォールバックのポップオーバー: 外側クリック / Escape で閉じる（キーボード対応）
  useEffect(() => {
    if (!fallbackOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setFallbackOpen(false);
        buttonRef.current?.focus();
      }
    };
    const onClick = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setFallbackOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [fallbackOpen]);

  useEffect(() => {
    return () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    };
  }, []);

  const handleShareClick = async () => {
    if (canNativeShare) {
      try {
        await navigator.share({ title: SHARE_TITLE, text: SHARE_TEXT, url });
      } catch {
        // ユーザーがキャンセルした場合など。何もしない（フォールバックは出さない）
      }
      return;
    }
    setFallbackOpen((v) => !v);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopied(false), 1800);
    } catch {
      // クリップボード不可（http・権限拒否など）。無視する
    }
  };

  // LINE の Web 共有（LINEit）。PCブラウザでも共有先（トーク/Keepメモ）を選べる公式エンドポイント。
  // line.me/R/msg/text/ はスマホアプリ向けスキームで、PCでは共有画面のボタンが押せないため使わない。
  // lineit/share は url のみ受け取り、本文は共有先URLのOGPプレビューで表現される（SHARE_TEXT は付かない）。
  const lineUrl = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}`;
  // X（旧Twitter）のツイートIntent。DM 直リンクは不可のためツイート共有にする
  const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(SHARE_TEXT)}&url=${encodeURIComponent(url)}`;

  return (
    <div style={{ position: "relative", display: "inline-flex", flexDirection: "column", alignItems: "center" }}>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleShareClick}
        aria-label="このルートを共有する"
        aria-haspopup={canNativeShare ? undefined : "menu"}
        aria-expanded={canNativeShare ? undefined : fallbackOpen}
        className="route-cta"
        style={{
          display: "inline-flex", alignItems: "center", gap: "10px",
          cursor: "pointer",
          // 記録CTA（深緑pill）と対になる、生成り地×深緑縁の従属pill
          background: "rgba(255,255,255,.92)", color: "#2c3e2d",
          border: "1px solid rgba(44,62,45,.4)",
          fontSize: "13.5px", fontWeight: 600, letterSpacing: ".1em",
          padding: "13px 26px", borderRadius: "100px",
          fontFamily: "var(--font-sans)",
        }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          {/* 共有アイコン（3点をつなぐシェア記号） */}
          <circle cx="18" cy="5" r="2.4" stroke="currentColor" strokeWidth="2" />
          <circle cx="6" cy="12" r="2.4" stroke="currentColor" strokeWidth="2" />
          <circle cx="18" cy="19" r="2.4" stroke="currentColor" strokeWidth="2" />
          <path d="M8.1 10.9l7.8-4.6M8.1 13.1l7.8 4.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        ルートを共有する
      </button>

      {/* フォールバックUI（navigator.share 非対応環境のみ）: コピー / LINE / X */}
      {!canNativeShare && fallbackOpen && (
        <div
          ref={popoverRef}
          role="menu"
          aria-label="共有方法を選ぶ"
          style={{
            position: "absolute", top: "calc(100% + 12px)", left: "50%", transform: "translateX(-50%)",
            zIndex: 20,
            display: "flex", flexDirection: "column", gap: "6px",
            background: "rgba(255,255,255,.98)",
            border: "1px solid rgba(143,168,136,.5)",
            borderRadius: "16px",
            padding: "10px",
            minWidth: "200px",
            boxShadow: "0 22px 50px -20px rgba(36,48,25,.5)",
          }}
        >
          <button
            type="button"
            role="menuitem"
            onClick={handleCopy}
            style={fallbackItemStyle}
          >
            {copied ? "コピーしました" : "リンクをコピー"}
          </button>
          <a
            role="menuitem"
            href={lineUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setFallbackOpen(false)}
            style={{ ...fallbackItemStyle, textDecoration: "none" }}
          >
            LINEで送る
          </a>
          <a
            role="menuitem"
            href={xUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setFallbackOpen(false)}
            style={{ ...fallbackItemStyle, textDecoration: "none" }}
          >
            Xで送る
          </a>
        </div>
      )}
    </div>
  );
}

// フォールバック内の各行（コピー / LINE / X）の共通スタイル
const fallbackItemStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  textAlign: "center",
  cursor: "pointer",
  background: "rgba(240,238,230,.7)",
  color: "#2c3e2d",
  border: "1px solid rgba(143,168,136,.35)",
  fontSize: "12.5px", fontWeight: 600, letterSpacing: ".08em",
  padding: "11px 14px", borderRadius: "10px",
  fontFamily: "var(--font-sans)",
};
