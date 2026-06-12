"use client";

/**
 * 共通ページシェル（機能3で追加したページ用）
 *
 * /route の RouteShell を一般化したもの: 生成り背景 + 有機ブロブ + グレイン +
 * トップバー（戻るリンク）+ インデックスライン「0X — NAME」。
 * ホーム・選択・ルート画面と同じ世界観を新ページ（/post, /trips, /me）でも保つ。
 *
 * パフォーマンス方針（CLAUDE.md セクション11）: blur フィルタは使わず、
 * 端が透明にフェードする radial-gradient でブロブを表現する。
 */
import Link from "next/link";
import GrainOverlay from "@/components/GrainOverlay";

interface PageShellProps {
  /** 「← ラベル」で戻る先 */
  backHref: string;
  backLabel: string;
  /** インデックスライン（例: index="04", indexLabel="TRIPS"） */
  index: string;
  indexLabel: string;
  children: React.ReactNode;
}

export default function PageShell({
  backHref,
  backLabel,
  index,
  indexLabel,
  children,
}: PageShellProps) {
  return (
    <main className="min-h-screen" style={{ background: "#f7f5f0", color: "#243019" }}>
      {/* 背景有機形状フィールド */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
        <div className="start-parallax" style={{ right: "-8%", top: "-12%", width: "480px", height: "480px" }}>
          <div className="start-drift" style={{ "--dur": "34s" } as React.CSSProperties}>
            <div className="start-blob" style={{
              background: "radial-gradient(closest-side at 42% 38%, #aec7a4, rgba(108,144,105,.5) 55%, rgba(108,144,105,0) 98%)",
              opacity: .3,
            }} />
          </div>
        </div>
        <div className="start-parallax" style={{ left: "-9%", bottom: "-8%", width: "380px", height: "380px" }}>
          <div className="start-drift" style={{ "--dur": "29s" } as React.CSSProperties}>
            <div className="start-blob" style={{
              background: "radial-gradient(closest-side at 44% 40%, #e6efe0, rgba(182,203,172,.55) 55%, rgba(182,203,172,0) 98%)",
              opacity: .42,
            }} />
          </div>
        </div>
      </div>

      <GrainOverlay fixed />

      {/* トップバー */}
      <header className="sticky top-0 flex items-center justify-between" style={{
        zIndex: 20,
        padding: "18px clamp(20px, 5vw, 64px)",
        background: "linear-gradient(180deg, #f7f5f0 62%, rgba(247,245,240,0))",
        pointerEvents: "none",
      }}>
        <Link href={backHref} className="sel-back" style={{ pointerEvents: "auto" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M11 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {backLabel}
        </Link>
        <span style={{ fontSize: "11px", letterSpacing: ".4em", color: "#8fa888" }}>N&nbsp;A&nbsp;S&nbsp;U</span>
      </header>

      <div className="relative" style={{ zIndex: 2, maxWidth: "980px", margin: "0 auto", padding: "4px clamp(20px, 5vw, 64px) 90px" }}>
        {/* インデックスライン */}
        <div className="sel-rise flex items-baseline gap-[14px] mb-[22px]" style={{ animationDelay: ".05s" }}>
          <span style={{ fontFamily: "var(--font-serif)", fontSize: "15px", color: "#5a7d5a", letterSpacing: ".1em" }}>{index}</span>
          <span style={{ width: "56px", height: "1px", background: "#8fa888", opacity: .7, transform: "translateY(-4px)", flexShrink: 0 }} />
          <span style={{ fontSize: "11px", letterSpacing: ".4em", color: "#8fa888" }}>{indexLabel}</span>
        </div>

        {children}
      </div>
    </main>
  );
}
