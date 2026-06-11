"use client";

import { useRouter } from "next/navigation";
import GrainOverlay from "@/components/GrainOverlay";
import { useParallax } from "@/lib/useParallax";

export default function Home() {
  const router = useRouter();
  const parallaxLayers = useParallax(6);

  return (
    <main className="min-h-screen bg-[#f7f5f0]">
      <div className="relative w-full h-screen overflow-hidden isolate" style={{ background: "#f7f5f0", color: "#243019" }}>

        {/* 有機形状フィールド */}
        <div className="absolute inset-0 overflow-hidden" style={{ zIndex: 0 }}>
          {/* s1: 大ブロブ */}
          <div ref={el => { parallaxLayers.current[0] = el; }} className="start-parallax" data-depth="20"
            style={{ right: "8%", top: "18%", width: "460px", height: "460px" }}>
            <div className="start-drift" style={{ "--dur": "30s" } as React.CSSProperties}>
              <div className="start-blob" style={{
                background: "radial-gradient(60% 60% at 38% 32%, #b9cdb0, #6c9069)",
                filter: "blur(26px)", opacity: 0.5,
                "--mdur": "27s",
              } as React.CSSProperties} />
            </div>
          </div>
          {/* r1: リング大 */}
          <div ref={el => { parallaxLayers.current[1] = el; }} className="start-parallax" data-depth="40"
            style={{ right: "14%", top: "30%", width: "320px", height: "320px" }}>
            <div className="start-drift" style={{ "--dur": "25s" } as React.CSSProperties}>
              <div className="start-ring" style={{ "--start-rc": "rgba(90,125,90,.45)", "--mdur": "26s" } as React.CSSProperties} />
            </div>
          </div>
          {/* s2: 中ブロブ */}
          <div ref={el => { parallaxLayers.current[2] = el; }} className="start-parallax" data-depth="52"
            style={{ right: "26%", top: "56%", width: "300px", height: "300px" }}>
            <div className="start-drift" style={{ "--dur": "22s" } as React.CSSProperties}>
              <div className="start-blob" style={{
                background: "radial-gradient(60% 60% at 40% 35%, #e6efe0, #b6cbac)",
                filter: "blur(22px)", opacity: 0.55,
                "--mdur": "24s",
              } as React.CSSProperties} />
            </div>
          </div>
          {/* r2: 小リング */}
          <div ref={el => { parallaxLayers.current[3] = el; }} className="start-parallax" data-depth="70"
            style={{ right: "30%", top: "22%", width: "150px", height: "150px" }}>
            <div className="start-drift" style={{ "--dur": "19s" } as React.CSSProperties}>
              <div className="start-ring" style={{ "--start-rc": "rgba(44,62,45,.35)", "--mdur": "22s" } as React.CSSProperties} />
            </div>
          </div>
          {/* s3: 暗い小ブロブ */}
          <div ref={el => { parallaxLayers.current[4] = el; }} className="start-parallax" data-depth="14"
            style={{ right: "2%", top: "62%", width: "240px", height: "240px" }}>
            <div className="start-drift" style={{ "--dur": "33s" } as React.CSSProperties}>
              <div className="start-blob" style={{
                background: "radial-gradient(60% 60% at 40% 35%, #4a6b4b, #2c3e2d)",
                filter: "blur(30px)", opacity: 0.22,
                "--mdur": "30s",
              } as React.CSSProperties} />
            </div>
          </div>
          {/* r3: 中リング */}
          <div ref={el => { parallaxLayers.current[5] = el; }} className="start-parallax" data-depth="60"
            style={{ right: "6%", top: "50%", width: "210px", height: "210px" }}>
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

        {/* メインコンテンツ */}
        <div className="absolute inset-0 flex flex-col justify-center" style={{ zIndex: 2, padding: "0 8% 0 9%", maxWidth: "760px" }}>

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
            marginBottom: "52px",
            maxWidth: "42ch",
          }}>
            施設名も情報も、いったん忘れて。<br />
            心が動いた一枚だけで、ルートは描ける。
          </p>

          {/* CTAボタン */}
          <button
            onClick={() => router.push("/select")}
            className="start-cta"
            style={{
              display: "inline-flex", alignItems: "center", gap: "16px", alignSelf: "flex-start",
              background: "#2c3e2d", color: "#f3f1ea", border: "none", cursor: "pointer",
              fontFamily: "var(--font-sans)", fontSize: "16px", fontWeight: 500,
              letterSpacing: ".14em", padding: "20px 24px 20px 40px", borderRadius: "100px",
              boxShadow: "0 18px 40px -18px rgba(36,48,25,.7)",
            }}
          >
            はじめる
            <span className="start-ringbtn" style={{
              width: "40px", height: "40px", borderRadius: "50%",
              background: "rgba(255,255,255,.12)", display: "grid", placeItems: "center",
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </button>
        </div>

        {/* フッターメタ情報 */}
        <div className="start-meta absolute flex gap-5" style={{ left: "9%", bottom: "40px", zIndex: 2, fontSize: "11px", letterSpacing: ".22em", color: "#8fa888" }}>
          <span>栃木県 那須町</span>
          <span style={{ width: "1px", height: "12px", background: "#8fa888", opacity: 0.5, alignSelf: "center" }} />
          <span>13 SPOTS</span>
          <span style={{ width: "1px", height: "12px", background: "#8fa888", opacity: 0.5, alignSelf: "center" }} />
          <span>直感でルート設計</span>
        </div>

        {/* ブランドマーク */}
        <div className="start-brandmark absolute" style={{ right: "7%", bottom: "40px", zIndex: 2, fontSize: "11px", letterSpacing: ".4em", color: "#8fa888" }}>
          N&nbsp;A&nbsp;S&nbsp;U
        </div>

      </div>
    </main>
  );
}
