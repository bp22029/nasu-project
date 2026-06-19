"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import GrainOverlay from "@/components/GrainOverlay";
import NavMenu from "@/components/NavMenu";
import { SELECT_STATE_KEY } from "@/lib/selectState";
// スポット件数はマスタから動的に表示する（debug=13 / full=198。ハードコードしない）
import { SPOTS } from "@/lib/spots";

// 機能3の導線（見る・記録・投稿）。マイページはユーティリティとして右上ヘッダに分離する
const NAV_ITEMS = [
  {
    href: "/trips",
    label: "みんなの旅をみる",
    icon: (
      <>
        <path d="M1.5 10S4.5 4 10 4s8.5 6 8.5 6-3 6-8.5 6-8.5-6-8.5-6Z" />
        <circle cx="10" cy="10" r="2.6" />
      </>
    ),
  },
  {
    href: "/trips/new",
    label: "旅を記録する",
    icon: (
      <>
        <path d="M4 16l.9-3.2 8-8 2.3 2.3-8 8L4 16Z" />
        <path d="M11.7 6.6 13.9 8.8" />
      </>
    ),
  },
  {
    href: "/post",
    label: "写真を投稿する",
    icon: (
      <>
        <rect x="2" y="6" width="16" height="11" rx="2.5" />
        <path d="M6.8 6l1.2-2h4l1.2 2" />
        <circle cx="10" cy="11.5" r="3" />
      </>
    ),
  },
];

const navIconProps = {
  width: 17,
  height: 17,
  viewBox: "0 0 20 20",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export default function Home() {
  const router = useRouter();

  return (
    <main
      className="relative flex flex-col min-h-[100dvh] isolate"
      style={{ background: "#f7f5f0", color: "#243019" }}
    >
      {/* 有機形状フィールド（blurフィルタ不使用・透明フェードのグラデーションで軽量化）。
          このレイヤー自身が overflow-hidden でブロブをクリップする（main 全体ではクリップしない＝
          低い画面ではスクロールできるようにして中央コンテンツとフッターの衝突を防ぐ） */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
        {/* s1: 大ブロブ */}
        <div className="start-parallax" style={{ right: "8%", top: "18%", width: "460px", height: "460px" }}>
          <div className="start-drift" style={{ "--dur": "30s" } as React.CSSProperties}>
            <div className="start-blob" style={{
              background: "radial-gradient(closest-side at 42% 38%, #aec7a4, rgba(108,144,105,.55) 55%, rgba(108,144,105,0) 98%)",
              opacity: 0.55,
            }} />
          </div>
        </div>
        {/* r1: リング大 */}
        <div className="start-parallax" style={{ right: "14%", top: "30%", width: "320px", height: "320px" }}>
          <div className="start-drift" style={{ "--dur": "25s" } as React.CSSProperties}>
            <div className="start-ring" style={{ "--start-rc": "rgba(90,125,90,.45)", "--mdur": "26s" } as React.CSSProperties} />
          </div>
        </div>
        {/* s2: 中ブロブ */}
        <div className="start-parallax" style={{ right: "26%", top: "56%", width: "300px", height: "300px" }}>
          <div className="start-drift" style={{ "--dur": "22s" } as React.CSSProperties}>
            <div className="start-blob" style={{
              background: "radial-gradient(closest-side at 44% 40%, #e6efe0, rgba(182,203,172,.6) 55%, rgba(182,203,172,0) 98%)",
              opacity: 0.6,
            }} />
          </div>
        </div>
        {/* r2: 小リング */}
        <div className="start-parallax" style={{ right: "30%", top: "22%", width: "150px", height: "150px" }}>
          <div className="start-drift" style={{ "--dur": "19s" } as React.CSSProperties}>
            <div className="start-ring" style={{ "--start-rc": "rgba(44,62,45,.35)", "--mdur": "22s" } as React.CSSProperties} />
          </div>
        </div>
        {/* s3: 暗い小ブロブ */}
        <div className="start-parallax" style={{ right: "2%", top: "62%", width: "240px", height: "240px" }}>
          <div className="start-drift" style={{ "--dur": "33s" } as React.CSSProperties}>
            <div className="start-blob" style={{
              background: "radial-gradient(closest-side at 44% 40%, #4a6b4b, rgba(44,62,45,.5) 55%, rgba(44,62,45,0) 98%)",
              opacity: 0.26,
            }} />
          </div>
        </div>
        {/* r3: 中リング */}
        <div className="start-parallax" style={{ right: "6%", top: "50%", width: "210px", height: "210px" }}>
          <div className="start-drift" style={{ "--dur": "27s" } as React.CSSProperties}>
            <div className="start-ring" style={{ "--start-rc": "rgba(143,168,136,.5)", "--mdur": "28s" } as React.CSSProperties} />
          </div>
        </div>
      </div>

      <GrainOverlay />

      {/* 左フェード（テキストを背景形状から守る） */}
      <div className="absolute inset-0 pointer-events-none" style={{
        zIndex: 1,
        background: "linear-gradient(100deg, #f7f5f0 30%, rgba(247,245,240,.4) 52%, transparent 70%)",
      }} />

      {/* トップヘッダー: どこへでも飛べるグローバルメニューを右上に置く */}
      <header className="start-meta relative flex items-center justify-end" style={{
        zIndex: 3, padding: "20px clamp(20px, 7vw, 72px) 0", pointerEvents: "none",
      }}>
        <NavMenu />
      </header>

      {/* メインコンテンツ（縦中央。低い画面では flex-1 が縮みフッターと衝突しない） */}
      <div className="relative flex flex-col justify-center" style={{
        zIndex: 2, flex: "1 1 auto",
        padding: "clamp(20px, 3vh, 36px) clamp(20px, 8vw, 72px)",
        maxWidth: "840px", width: "100%",
      }}>

        {/* インデックスライン */}
        <div className="start-index flex items-baseline gap-[14px] mb-[34px]">
          <span style={{ fontFamily: "var(--font-serif)", fontSize: "15px", color: "#5a7d5a", letterSpacing: ".1em" }}>01</span>
          <span style={{ width: "64px", height: "1px", background: "#8fa888", opacity: 0.7, transform: "translateY(-4px)", flexShrink: 0 }} />
          <span style={{ fontSize: "11px", letterSpacing: ".4em", color: "#8fa888" }}>NASU TRIP</span>
        </div>

        {/* タイトル（明朝体・行ごとスライドアップ） */}
        <h1 style={{
          fontFamily: "var(--font-serif)",
          fontWeight: 600,
          fontSize: "clamp(28px, 7.5vw, 86px)",
          lineHeight: 1.14,
          letterSpacing: ".03em",
          color: "#243019",
          marginBottom: "30px",
        }}>
          <span className="start-t-line">
            <span className="start-t-mask">
              <span className="start-t-inner">気になる写真から、</span>
            </span>
          </span>
          <span className="start-t-line">
            <span className="start-t-mask">
              <span className="start-t-inner">
                あなたの<span style={{ color: "#5a7d5a" }}>那須</span>へ。
              </span>
            </span>
          </span>
        </h1>

        {/* サブタイトル */}
        <p className="start-subtitle" style={{
          fontSize: "clamp(14px, 1.4vw, 17px)",
          color: "#5a7d5a",
          letterSpacing: ".07em",
          lineHeight: 1.95,
          marginBottom: "44px",
          maxWidth: "42ch",
        }}>
          施設名も情報も、いったん忘れて。<br />
          心が動いた一枚だけで、ルートは描ける。
        </p>

        {/* メインCTA: 何をするボタンか明確に（ルートを設計する） */}
        <button
          onClick={() => {
            // 「ルートを設計する」は常に新規スタート: 前回の選択状態を破棄する。
            // /route の「← 選び直す」で戻る場合は破棄されないため、設計→戻るの往復では維持される
            sessionStorage.removeItem(SELECT_STATE_KEY);
            router.push("/select");
          }}
          className="start-cta"
          style={{
            display: "inline-flex", alignItems: "center", gap: "16px", alignSelf: "flex-start",
            background: "#2c3e2d", color: "#f3f1ea", border: "none", cursor: "pointer",
            fontFamily: "var(--font-sans)", fontSize: "16px", fontWeight: 500,
            letterSpacing: ".14em", padding: "20px 24px 20px 40px", borderRadius: "100px",
            boxShadow: "0 18px 40px -18px rgba(36,48,25,.7)",
          }}
        >
          ルートを設計する
          <span className="start-ringbtn" style={{
            width: "40px", height: "40px", borderRadius: "50%",
            background: "rgba(255,255,255,.12)", display: "grid", placeItems: "center",
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </button>

        {/* 副次導線（機能3）: 見る・記録・投稿。テキストリンクではなくアイコン付きボタンで
            「機能」として認識でき、タップ領域も十分にする */}
        <div className="start-nav" style={{ marginTop: "40px" }}>
          <div className="flex items-center gap-3 mb-[14px]">
            <span style={{ fontSize: "11px", letterSpacing: ".3em", color: "#8fa888", textTransform: "uppercase" }}>Community</span>
            <span style={{ fontSize: "12px", letterSpacing: ".14em", color: "#5a7d5a" }}>みんなの那須</span>
          </div>
          <div className="flex flex-wrap gap-[10px]">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="home-navchip"
                style={{
                  display: "inline-flex", alignItems: "center", gap: "10px",
                  padding: "13px 18px", borderRadius: "14px",
                  border: "1px solid #e5e0d3", background: "rgba(255,255,255,.7)",
                  color: "#2c3e2d", fontSize: "13.5px", fontWeight: 600,
                  letterSpacing: ".05em", fontFamily: "var(--font-sans)", textDecoration: "none",
                }}
              >
                <span style={{ color: "#5a7d5a", display: "inline-flex" }}>
                  <svg {...navIconProps}>{item.icon}</svg>
                </span>
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* フッターメタ情報（絶対配置をやめ通常フローに。低い画面でも中央コンテンツと衝突しない） */}
      <footer className="relative flex items-end justify-between flex-wrap" style={{
        zIndex: 2, gap: "16px",
        padding: "0 clamp(20px, 8vw, 72px) clamp(24px, 5vh, 40px)",
      }}>
        <div className="start-meta flex items-center flex-wrap" style={{
          gap: "20px", fontSize: "11px", letterSpacing: ".22em", color: "#8fa888",
        }}>
          <span>栃木県 那須町</span>
          <span style={{ width: "1px", height: "12px", background: "#8fa888", opacity: 0.5, alignSelf: "center" }} />
          <span>{SPOTS.length} SPOTS</span>
          <span style={{ width: "1px", height: "12px", background: "#8fa888", opacity: 0.5, alignSelf: "center" }} />
          <span>直感でルート設計</span>
        </div>
        <div className="start-brandmark" style={{ fontSize: "11px", letterSpacing: ".4em", color: "#8fa888" }}>
          N&nbsp;A&nbsp;S&nbsp;U
        </div>
      </footer>
    </main>
  );
}
