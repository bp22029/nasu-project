"use client";

import dynamic from "next/dynamic";
import { useState, useCallback, useEffect, useRef } from "react";
import SpotGrid from "@/components/SpotGrid";
import RouteTimeline from "@/components/RouteTimeline";
import DepartureSelector from "@/components/DepartureSelector";
import type { Spot } from "@/types/spot";
import type { RouteResult } from "@/types/route";
import type { DeparturePoint, TripType } from "@/types/departure";
import spotsData from "@/../data/spots.json";

const spots = spotsData as Spot[];

const Map = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-500 text-sm">
      地図を読み込み中...
    </div>
  ),
});

type View = "start" | "grid" | "calculating" | "route";

export default function Home() {
  const [view, setView] = useState<View>("start");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [departure, setDeparture] = useState<DeparturePoint | null>(null);
  const [tripType, setTripType] = useState<TripType>("oneway");
  // 現在地（GPS）出発のときはデフォルト true（有料OK）、プリセットは true（一般道推奨）→ユーザーが切替可
  const [avoidTolls, setAvoidTolls] = useState(true);
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const parallaxLayers = useRef<(HTMLDivElement | null)[]>([null, null, null, null, null, null]);
  const gridParallaxLayers = useRef<(HTMLDivElement | null)[]>([null, null, null]);

  useEffect(() => {
    if (view !== "start") return;
    let tx = 0, ty = 0, cx = 0, cy = 0;
    const onMove = (e: PointerEvent) => {
      tx = e.clientX / window.innerWidth - 0.5;
      ty = e.clientY / window.innerHeight - 0.5;
    };
    let raf: number;
    const tick = () => {
      cx += (tx - cx) * 0.06;
      cy += (ty - cy) * 0.06;
      for (const l of parallaxLayers.current) {
        if (!l) continue;
        const d = parseFloat(l.dataset.depth ?? "0");
        l.style.transform = `translate(${cx * d}px, ${cy * d}px)`;
      }
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener("pointermove", onMove as EventListener);
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("pointermove", onMove as EventListener);
      cancelAnimationFrame(raf);
    };
  }, [view]);

  useEffect(() => {
    if (view !== "grid" && view !== "calculating") return;
    let tx = 0, ty = 0, cx = 0, cy = 0;
    const onMove = (e: PointerEvent) => {
      tx = e.clientX / window.innerWidth - 0.5;
      ty = e.clientY / window.innerHeight - 0.5;
    };
    let raf: number;
    const tick = () => {
      cx += (tx - cx) * 0.06;
      cy += (ty - cy) * 0.06;
      for (const l of gridParallaxLayers.current) {
        if (!l) continue;
        const d = parseFloat(l.dataset.depth ?? "0");
        l.style.transform = `translate(${cx * d}px, ${cy * d}px)`;
      }
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener("pointermove", onMove as EventListener);
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("pointermove", onMove as EventListener);
      cancelAnimationFrame(raf);
    };
  }, [view]);

  const toggleSpot = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  // 出発地変更時: GPS = 有料OK（遠方から来る想定）、プリセット = 一般道推奨
  const handleSelectDeparture = useCallback((dep: DeparturePoint) => {
    setDeparture(dep);
    setAvoidTolls(dep.id !== "current-location");
  }, []);

  const canDesign = selectedIds.length >= 1 && departure !== null;

  const handleDesignRoute = async () => {
    if (!canDesign || !departure) return;
    setView("calculating");
    setError(null);
    try {
      const res = await fetch("/api/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spotIds: selectedIds,
          departure: { lat: departure.lat, lng: departure.lng, name: departure.name },
          tripType,
          avoidTolls,
        }),
      });
      if (!res.ok) {
        const err = await res.json() as { error: string };
        throw new Error(err.error ?? "ルート計算に失敗しました");
      }
      const data: RouteResult = await res.json();
      setRouteResult(data);
      setView("route");
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
      setView("grid");
    }
  };

  return (
    <main className="min-h-screen bg-[#f7f5f0]">

      {/* ===== スタート画面 ===== */}
      {view === "start" && (
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

          {/* グレインテクスチャ */}
          <div className="absolute inset-0 pointer-events-none" style={{
            zIndex: 1, opacity: 0.035, mixBlendMode: "multiply",
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E")`,
          }} />

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
              onClick={() => setView("grid")}
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
      )}

      {/* ===== スポット選択画面 ===== */}
      {(view === "grid" || view === "calculating") && (
        <>
          {/* 背景有機形状フィールド */}
          <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
            <div ref={el => { gridParallaxLayers.current[0] = el; }} className="start-parallax" data-depth="16"
              style={{ position: "absolute", right: "-6%", top: "-8%", width: "520px", height: "520px" }}>
              <div className="start-drift" style={{ "--dur": "34s" } as React.CSSProperties}>
                <div className="start-blob" style={{ background: "radial-gradient(60% 60% at 38% 32%, #b9cdb0, #6c9069)", filter: "blur(40px)", opacity: .32, "--mdur": "27s" } as React.CSSProperties} />
              </div>
            </div>
            <div ref={el => { gridParallaxLayers.current[1] = el; }} className="start-parallax" data-depth="44"
              style={{ position: "absolute", right: "10%", top: "8%", width: "240px", height: "240px" }}>
              <div className="start-drift" style={{ "--dur": "28s" } as React.CSSProperties}>
                <div className="start-ring" style={{ "--start-rc": "rgba(90,125,90,.28)", "--mdur": "30s" } as React.CSSProperties} />
              </div>
            </div>
            <div ref={el => { gridParallaxLayers.current[2] = el; }} className="start-parallax" data-depth="22"
              style={{ position: "absolute", left: "-10%", bottom: "-6%", width: "420px", height: "420px" }}>
              <div className="start-drift" style={{ "--dur": "38s" } as React.CSSProperties}>
                <div className="start-blob" style={{ background: "radial-gradient(60% 60% at 40% 35%, #e6efe0, #b6cbac)", filter: "blur(38px)", opacity: .4, "--mdur": "31s" } as React.CSSProperties} />
              </div>
            </div>
          </div>

          {/* グレインテクスチャ */}
          <div className="fixed inset-0 pointer-events-none" style={{
            zIndex: 1, opacity: .035, mixBlendMode: "multiply",
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E")`,
          }} />

          {/* トップバー */}
          <header className="sticky top-0 flex items-center justify-between" style={{
            zIndex: 20,
            padding: "18px clamp(20px, 5vw, 64px)",
            background: "linear-gradient(180deg, #f7f5f0 62%, rgba(247,245,240,0))",
            pointerEvents: "none",
          }}>
            <button type="button" className="sel-back" style={{ pointerEvents: "auto" }} onClick={() => setView("start")}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path d="M19 12H5M11 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              もどる
            </button>
            <span style={{ fontSize: "11px", letterSpacing: ".4em", color: "#8fa888" }}>N&nbsp;A&nbsp;S&nbsp;U</span>
          </header>

          {/* コンテンツ */}
          <div className="relative" style={{ zIndex: 2, maxWidth: "1120px", margin: "0 auto", padding: "4px clamp(20px, 5vw, 64px) 180px" }}>

            {/* 02 — SELECT */}
            <div className="sel-rise flex items-baseline gap-[14px] mb-[22px]" style={{ animationDelay: ".05s" }}>
              <span style={{ fontFamily: "var(--font-serif)", fontSize: "15px", color: "#5a7d5a", letterSpacing: ".1em" }}>02</span>
              <span style={{ width: "56px", height: "1px", background: "#8fa888", opacity: .7, transform: "translateY(-4px)", flexShrink: 0 }} />
              <span style={{ fontSize: "11px", letterSpacing: ".4em", color: "#8fa888" }}>SELECT</span>
            </div>

            {/* 見出し */}
            <h1 className="sel-rise" style={{
              fontFamily: "var(--font-serif)", fontWeight: 600,
              fontSize: "clamp(30px, 4.6vw, 56px)", lineHeight: 1.16, letterSpacing: ".03em",
              color: "#243019", marginBottom: "16px", animationDelay: ".12s",
            }}>
              気になる写真から、<br /><span style={{ color: "#5a7d5a" }}>行き先</span>を選ぶ。
            </h1>

            {/* リード文 */}
            <p className="sel-rise" style={{
              fontSize: "clamp(13px, 1.3vw, 16px)", color: "#5a7d5a",
              letterSpacing: ".06em", lineHeight: 1.9, maxWidth: "44ch", marginBottom: "40px",
              animationDelay: ".2s",
            }}>
              施設名も情報も、いったん忘れて。<br />
              心が動いた一枚をタップするだけで、ルートは描ける。
            </p>

            {/* 出発地セクション */}
            <div className="sel-rise flex items-center gap-3 mb-[14px]" style={{ animationDelay: ".26s" }}>
              <span style={{ fontSize: "11px", letterSpacing: ".26em", color: "#8fa888", textTransform: "uppercase" }}>Departure</span>
              <span style={{ fontSize: "12px", letterSpacing: ".14em", color: "#5a7d5a" }}>出発地</span>
              <span style={{ flex: 1, height: "1px", background: "#e5e0d3" }} />
            </div>
            <div className="sel-rise mb-[44px]" style={{ animationDelay: ".3s" }}>
              <DepartureSelector selected={departure} onSelect={handleSelectDeparture} />
            </div>

            {/* スポットセクション */}
            <div className="sel-rise flex items-center gap-3 mb-[14px]" style={{ animationDelay: ".34s" }}>
              <span style={{ fontSize: "11px", letterSpacing: ".26em", color: "#8fa888", textTransform: "uppercase" }}>Spots</span>
              <span style={{ fontSize: "12px", letterSpacing: ".14em", color: "#5a7d5a" }}>ピンときた写真を選ぶ</span>
              <span style={{ flex: 1, height: "1px", background: "#e5e0d3" }} />
            </div>

            {error && (
              <div className="mb-3 rounded-lg text-xs px-4 py-2" style={{ background: "#fff0f0", border: "1px solid #fecaca", color: "#b91c1c" }}>
                ⚠ {error}
              </div>
            )}

            <SpotGrid spots={spots} selectedIds={selectedIds} onToggle={toggleSpot} />
          </div>

          {/* フローティングアクションバー */}
          <div className="fixed left-1/2 -translate-x-1/2" style={{ bottom: "22px", zIndex: 30, width: "calc(100% - 32px)", maxWidth: "720px" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap",
              padding: "12px 12px 12px 18px",
              background: "rgba(247,245,240,.82)",
              backdropFilter: "blur(16px) saturate(1.2)",
              border: "1px solid rgba(143,168,136,.35)",
              borderRadius: "22px",
              boxShadow: "0 22px 50px -22px rgba(36,48,25,.5)",
            }}>
              {/* 片道/周遊セグメント */}
              <div style={{ display: "flex", border: "1px solid #e5e0d3", borderRadius: "11px", overflow: "hidden", background: "#fff", flexShrink: 0 }}>
                {(["oneway", "roundtrip"] as const).map((t, i) => (
                  <button type="button" key={t} onClick={() => setTripType(t)} style={{
                    border: "none", cursor: "pointer",
                    borderLeft: i > 0 ? "1px solid #e5e0d3" : undefined,
                    padding: "9px 14px", fontSize: "12.5px", fontWeight: 600,
                    letterSpacing: ".06em", fontFamily: "var(--font-sans)",
                    background: tripType === t ? "#2c3e2d" : "#fff",
                    color: tripType === t ? "#f3f1ea" : "#5a7d5a",
                    transition: "background .2s, color .2s",
                  }}>
                    {t === "oneway" ? "片道" : "周遊"}
                  </button>
                ))}
              </div>

              {/* 有料道路トグル */}
              <button type="button" onClick={() => setAvoidTolls((v) => !v)} style={{
                flexShrink: 0, display: "inline-flex", alignItems: "center", gap: "7px", cursor: "pointer",
                padding: "9px 14px", borderRadius: "11px",
                border: avoidTolls ? "1px solid #e5e0d3" : "1px solid #d8c79e",
                background: avoidTolls ? "#fff" : "#f3ede0",
                fontSize: "12.5px", fontWeight: 600, fontFamily: "var(--font-sans)",
                color: avoidTolls ? "#5a7d5a" : "#8a6d2e",
                letterSpacing: ".04em",
                transition: "background .2s, border-color .2s, color .2s",
              }}>
                <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: avoidTolls ? "#8fa888" : "#c39a3e", transition: "background .2s" }} />
                {avoidTolls ? "一般道" : "有料OK"}
              </button>

              {/* 選択数 */}
              <div style={{ flex: 1, minWidth: "64px", display: "flex", alignItems: "baseline", gap: "7px", color: "#5a7d5a" }}>
                <span style={{ fontFamily: "var(--font-serif)", fontSize: "24px", fontWeight: 700, color: "#2c3e2d", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
                  {selectedIds.length}
                </span>
                <span style={{ fontSize: "11px", letterSpacing: ".08em" }}>スポット選択中</span>
              </div>

              {/* 設計するボタン */}
              <button
                type="button"
                onClick={handleDesignRoute}
                disabled={!canDesign || view === "calculating"}
                style={{
                  flexShrink: 0, display: "inline-flex", alignItems: "center", gap: "12px",
                  cursor: canDesign && view !== "calculating" ? "pointer" : "not-allowed",
                  background: "#2c3e2d", color: "#f3f1ea", border: "none",
                  fontSize: "14px", fontWeight: 600, fontFamily: "var(--font-sans)",
                  letterSpacing: ".1em",
                  padding: "13px 16px 13px 24px", borderRadius: "100px",
                  boxShadow: "0 14px 30px -16px rgba(36,48,25,.7)",
                  opacity: !canDesign || view === "calculating" ? .4 : 1,
                  transition: "transform .3s cubic-bezier(.2,.7,.2,1), background .3s, opacity .3s",
                }}
              >
                {view === "calculating" ? "計算中..." : "設計する"}
                <span style={{ width: "30px", height: "30px", borderRadius: "50%", background: "rgba(255,255,255,.14)", display: "grid", placeItems: "center" }}>
                  {view === "calculating"
                    ? <span className="animate-spin" style={{ width: "15px", height: "15px", border: "2px solid rgba(255,255,255,.4)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block" }} />
                    : <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  }
                </span>
              </button>
            </div>

            {/* ヒント */}
            <p style={{ textAlign: "center", marginTop: "10px", fontSize: "11px", letterSpacing: ".1em", color: "#8fa888" }}>
              {!departure
                ? "まず出発地を選んでください"
                : selectedIds.length === 0
                ? "ピンときた写真を1枚以上選んでください"
                : `${selectedIds.length}スポットでルートを設計します`}
            </p>
          </div>
        </>
      )}

      {/* ===== ルート画面 ===== */}
      {view === "route" && routeResult && (
        <>
          <header className="bg-white border-b border-[#e5e0d3] sticky top-0 z-10">
            <div className="max-w-[900px] mx-auto px-5 py-4">
              <button
                onClick={() => { setView("grid"); setRouteResult(null); }}
                className="text-[#5a7d5a] text-xs font-medium mb-2 block"
              >
                ← 選び直す
              </button>
              <p className="text-[11px] tracking-[4px] text-[#5a7d5a] font-medium mb-0.5">
                Y O U R  R O U T E
              </p>
              <h2 className="text-xl font-bold text-[#2c3e2d]">あなたの那須ルート</h2>
              <p className="text-xs text-[#6b7d6b] mt-0.5">
                {routeResult.orderedSpots.length}スポット /{" "}
                {routeResult.tripType === "roundtrip" ? "周遊" : "片道"} /{" "}
                {routeResult.avoidTolls ? "一般道" : "有料道路OK"}
              </p>
            </div>
          </header>

          <div className="max-w-[900px] mx-auto px-4 py-6 pb-16">
            <div className="h-[360px] rounded-2xl overflow-hidden border border-[#e5e0d3] mb-5">
              <Map
                routeSpots={routeResult.orderedSpots}
                departure={routeResult.departure}
                tripType={routeResult.tripType}
                routeGeoJSON={routeResult.geojson}
              />
            </div>
            <div className="bg-white rounded-[14px] border border-[#e5e0d3] overflow-hidden">
              <RouteTimeline result={routeResult} />
            </div>
          </div>
        </>
      )}
    </main>
  );
}
