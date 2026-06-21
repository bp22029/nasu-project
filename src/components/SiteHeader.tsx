"use client";

/**
 * 共通の sticky ヘッダー（全ページで使う）
 *
 * 左: 文脈的な「← 戻る」（任意。状態復元の意味を持つので各ページが指定）
 * 右: 「#NASU」ブランド（→ホーム、1タップでホームに戻れる）＋ グローバルメニュー
 *
 * 以前は /select・/route(RouteShell)・PageShell が同一マークアップのヘッダーを
 * 各自に持っていた。それをこのコンポーネントへ集約する。
 */
import Link from "next/link";
import NavMenu from "@/components/NavMenu";
import BrandMark from "@/components/BrandMark";

interface SiteHeaderProps {
  /** 左の「← ラベル」で戻る先。省略時は戻るを表示しない（ホーム等） */
  backHref?: string;
  backLabel?: string;
}

export default function SiteHeader({ backHref, backLabel }: SiteHeaderProps) {
  return (
    <header
      className="sticky top-0 flex items-center justify-between"
      style={{
        zIndex: 30,
        padding: "18px clamp(20px, 5vw, 64px)",
        background: "linear-gradient(180deg, #f7f5f0 62%, rgba(247,245,240,0))",
        pointerEvents: "none",
      }}
    >
      {backHref ? (
        <Link href={backHref} className="sel-back" style={{ pointerEvents: "auto" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M11 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {backLabel}
        </Link>
      ) : (
        <span />
      )}

      <div className="flex items-center" style={{ gap: "16px" }}>
        <Link
          href="/"
          aria-label="#NASU ホームへ"
          style={{ pointerEvents: "auto", textDecoration: "none" }}
        >
          <BrandMark fontSize="14px" />
        </Link>
        <NavMenu />
      </div>
    </header>
  );
}
