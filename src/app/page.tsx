"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useState, useCallback, useEffect } from "react";
import SpotGrid from "@/components/SpotGrid";
import RouteTimeline from "@/components/RouteTimeline";
import DepartureSelector from "@/components/DepartureSelector";
import type { Spot } from "@/types/spot";
import type { RouteResult } from "@/types/route";
import type { DeparturePoint, TripType } from "@/types/departure";
import spotsData from "@/../data/spots.json";

const spots = spotsData as Spot[];

const HERO_GRADIENTS = [
  "from-emerald-300 to-green-700",
  "from-teal-300 to-emerald-700",
  "from-green-300 to-teal-600",
  "from-emerald-400 to-green-800",
  "from-teal-200 to-emerald-600",
  "from-green-200 to-teal-700",
];

const Map = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[#f7f5f0] text-[#6b7d6b] text-sm">
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
  const [heroPhotos, setHeroPhotos] = useState<string[]>([]);

  useEffect(() => {
    const targets = spots.slice(0, 6).filter(s => s.placeId);
    Promise.all(
      targets.map(s =>
        fetch(`/api/photos/${s.placeId}`)
          .then(r => r.json())
          .then((d: { photos?: { uri: string }[] }) => d.photos?.[0]?.uri ?? "")
          .catch(() => "")
      )
    ).then(uris => setHeroPhotos(uris.filter(Boolean)));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
        <div className="relative h-screen overflow-hidden">

          {/* 写真モザイク（2列×3行） */}
          <div
            className="absolute inset-0 grid grid-cols-2"
            style={{ gridTemplateRows: "repeat(3, 1fr)" }}
          >
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="relative overflow-hidden">
                <div className={`absolute inset-0 bg-gradient-to-br ${HERO_GRADIENTS[i]}`} />
                {heroPhotos[i] && (
                  <Image
                    src={heroPhotos[i]}
                    alt=""
                    fill
                    sizes="50vw"
                    className="object-cover"
                    unoptimized
                  />
                )}
              </div>
            ))}
          </div>

          {/* グラデーションオーバーレイ */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0) 20%, rgba(0,0,0,0.35) 52%, rgba(0,0,0,0.92) 100%)",
            }}
          />

          {/* テキスト・ボタン */}
          <div className="absolute inset-x-0 bottom-0 px-7 pb-14 z-10">
            <p className="text-[11px] tracking-[6px] text-white/50 font-medium mb-5">
              N A S U  T R I P
            </p>
            <h1 className="text-[46px] font-bold text-white leading-[1.05] tracking-tight mb-4">
              那須を<br />直感で旅する
            </h1>
            <p className="text-[15px] text-white/65 leading-relaxed mb-10">
              気になる写真から、<br />あなたの那須が見えてくる
            </p>
            <button
              onClick={() => setView("grid")}
              className="bg-white text-[#2c3e2d] px-10 py-[15px] rounded-[100px] text-base font-semibold tracking-wide active:opacity-75 transition-opacity"
            >
              はじめる
            </button>
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
              <p className="text-[11px] tracking-[4px] text-[#5a7d5a] font-medium mb-0.5">S T E P  0 1</p>
              <h2 className="text-xl font-bold text-[#2c3e2d]">行きたい場所を選んでください</h2>
              <p className="text-xs text-[#6b7d6b] mt-0.5">写真をタップして選択</p>
            </div>
          </header>

          <div className="max-w-[900px] mx-auto pb-28">
            <DepartureSelector selected={departure} onSelect={handleSelectDeparture} />

            {/* 選択件数バー */}
            <div className="mx-4 mt-3 bg-white rounded-xl px-4 py-3 mb-4 flex justify-between items-center border border-[#e5e0d3]">
              <span className="text-sm text-[#2c3e2d] font-medium">
                <span className="text-[22px] font-bold text-[#5a7d5a] leading-none">{selectedIds.length}</span>
                {" "}件選択中
              </span>
              <span className="text-xs text-[#6b7d6b]">
                {!departure ? "出発地を先に選択" : selectedIds.length === 0 ? "1件以上で設計できます" : "↓ 設計するを押す"}
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
                title={avoidTolls ? "一般道のみ（タップで有料道路を許可）" : "有料道路OK（タップで一般道のみに変更）"}
              >
                🛣️
                <span>{avoidTolls ? "一般道" : "有料OK"}</span>
              </button>

              {/* 選択状況 */}
              <span className="text-xs text-[#6b7d6b] flex-1 truncate min-w-0">
                {!departure ? "出発地を選択" : selectedIds.length === 0 ? "スポットを選択" : `${selectedIds.length}件選択`}
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
                ) : "設計する"}
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
              <p className="text-[11px] tracking-[4px] text-[#5a7d5a] font-medium mb-0.5">Y O U R  R O U T E</p>
              <h2 className="text-xl font-bold text-[#2c3e2d]">あなたの那須ルート</h2>
              <p className="text-xs text-[#6b7d6b] mt-0.5">
                {routeResult.orderedSpots.length}スポット /{" "}
                {routeResult.tripType === "roundtrip" ? "周遊" : "片道"} /{" "}
                {routeResult.avoidTolls ? "一般道" : "有料道路OK"}
              </p>
            </div>
          </header>

          <div className="max-w-[900px] mx-auto px-4 py-6 pb-16">
            {/* 地図 */}
            <div className="h-[360px] rounded-2xl overflow-hidden border border-[#e5e0d3] mb-5">
              <Map
                routeSpots={routeResult.orderedSpots}
                departure={routeResult.departure}
                tripType={routeResult.tripType}
                routeGeoJSON={routeResult.geojson}
              />
            </div>
            {/* タイムライン */}
            <div className="bg-white rounded-[14px] border border-[#e5e0d3] overflow-hidden">
              <RouteTimeline result={routeResult} />
            </div>
          </div>
        </>
      )}
    </main>
  );
}
