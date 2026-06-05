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
                <span className="start-t-inner">気になる写真から、</span>
              </span>
              <span className="start-t-line">
                <span className="start-t-inner">
                  あなたの<span style={{ color: "#5a7d5a" }}>那須</span>へ。
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
          <header className="bg-white border-b border-[#e5e0d3] sticky top-0 z-10">
            <div className="max-w-[900px] mx-auto px-5 py-4">
              <button
                onClick={() => setView("start")}
                className="text-[#5a7d5a] text-xs font-medium mb-2 block"
              >
                ← もどる
              </button>
              <p className="text-[11px] tracking-[4px] text-[#5a7d5a] font-medium mb-0.5">
                S T E P  0 1
              </p>
              <h2 className="text-xl font-bold text-[#2c3e2d]">行きたい場所を選んでください</h2>
              <p className="text-xs text-[#6b7d6b] mt-0.5">写真をタップして選択</p>
            </div>
          </header>

          <div className="max-w-[900px] mx-auto pb-28">
            <DepartureSelector selected={departure} onSelect={handleSelectDeparture} />

            {/* 選択件数バー */}
            <div className="mx-4 mt-3 mb-4 bg-white rounded-xl px-4 py-3 flex justify-between items-center border border-[#e5e0d3]">
              <span className="text-sm text-[#2c3e2d] font-medium">
                <span className="text-[22px] font-bold text-[#5a7d5a] leading-none">
                  {selectedIds.length}
                </span>{" "}
                件選択中
              </span>
              <span className="text-xs text-[#6b7d6b]">
                {!departure
                  ? "出発地を先に選択"
                  : selectedIds.length === 0
                  ? "1件以上で設計できます"
                  : "↓ 設計するを押す"}
              </span>
            </div>

            <SpotGrid spots={spots} selectedIds={selectedIds} onToggle={toggleSpot} />
          </div>

          {error && (
            <div className="max-w-[900px] mx-auto px-4 mb-3">
              <div className="bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs px-4 py-2">
                ⚠ {error}
              </div>
            </div>
          )}

          {/* 下部アクションバー */}
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#e5e0d3] shadow-lg z-10">
            <div className="max-w-[900px] mx-auto px-4 py-3 flex items-center gap-2">
              {/* 片道/周遊トグル */}
              <div className="flex rounded-lg border border-[#e5e0d3] overflow-hidden text-xs flex-shrink-0">
                <button
                  onClick={() => setTripType("oneway")}
                  className={`px-2.5 py-1.5 font-medium transition-colors
                    ${tripType === "oneway" ? "bg-[#2c3e2d] text-white" : "bg-white text-[#6b7d6b]"}`}
                >
                  片道
                </button>
                <button
                  onClick={() => setTripType("roundtrip")}
                  className={`px-2.5 py-1.5 font-medium border-l border-[#e5e0d3] transition-colors
                    ${tripType === "roundtrip" ? "bg-[#2c3e2d] text-white" : "bg-white text-[#6b7d6b]"}`}
                >
                  周遊
                </button>
              </div>

              {/* 有料道路トグル */}
              <button
                onClick={() => setAvoidTolls((v) => !v)}
                className={`flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors
                  ${avoidTolls
                    ? "bg-white border-[#e5e0d3] text-[#6b7d6b]"
                    : "bg-amber-50 border-amber-300 text-amber-700"}`}
                title={avoidTolls ? "一般道のみ" : "有料道路OK"}
              >
                🛣️
                <span>{avoidTolls ? "一般道" : "有料OK"}</span>
              </button>

              {/* 選択状況 */}
              <span className="text-xs text-[#6b7d6b] flex-1 truncate min-w-0">
                {!departure
                  ? "出発地を選択"
                  : selectedIds.length === 0
                  ? "スポットを選択"
                  : `${selectedIds.length}件選択`}
              </span>

              {/* 設計ボタン */}
              <button
                onClick={handleDesignRoute}
                disabled={!canDesign || view === "calculating"}
                className="bg-[#2c3e2d] text-white px-4 py-2 rounded-[100px] text-sm font-semibold
                           disabled:opacity-40 disabled:cursor-not-allowed
                           active:opacity-80 transition-colors flex-shrink-0"
              >
                {view === "calculating" ? (
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                    計算中...
                  </span>
                ) : (
                  "設計する"
                )}
              </button>
            </div>
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
