"use client";

import dynamic from "next/dynamic";
import { useState, useCallback } from "react";
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

type View = "grid" | "calculating" | "route";

export default function Home() {
  const [view, setView] = useState<View>("grid");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [departure, setDeparture] = useState<DeparturePoint | null>(null);
  const [tripType, setTripType] = useState<TripType>("oneway");
  // 現在地（GPS）出発のときはデフォルト true（有料OK）、プリセットは true（一般道推奨）→ユーザーが切替可
  const [avoidTolls, setAvoidTolls] = useState(true);
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    <main className="flex flex-col h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="px-4 py-3 bg-white border-b shadow-sm flex-shrink-0 flex items-center gap-3">
        {view === "route" && (
          <button
            onClick={() => { setView("grid"); setRouteResult(null); }}
            className="text-blue-600 font-medium text-sm flex-shrink-0"
          >
            ← 戻る
          </button>
        )}
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-gray-800 leading-tight">那須旅</h1>
          <p className="text-xs text-gray-500 truncate">
            {view === "grid"
              ? "出発地を選んでスポットをタップ"
              : view === "route" && routeResult
              ? `${routeResult.orderedSpots.length}スポット / ${routeResult.tripType === "roundtrip" ? "周遊" : "片道"} / ${routeResult.avoidTolls ? "一般道" : "有料道路OK"}`
              : "ルート計算中..."}
          </p>
        </div>
      </header>

      {/* グリッドビュー */}
      {(view === "grid" || view === "calculating") && (
        <>
          <div className="flex-1 overflow-y-auto pb-20">
            {/* 出発地セレクター */}
            <DepartureSelector selected={departure} onSelect={handleSelectDeparture} />

            {/* スポットグリッド */}
            <div className="mt-2">
              <p className="text-xs text-gray-400 px-3 mb-2">行きたいスポットを選択</p>
              <SpotGrid spots={spots} selectedIds={selectedIds} onToggle={toggleSpot} />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border-t border-red-200 text-red-700 text-xs px-4 py-2">
              ⚠ {error}
            </div>
          )}

          {/* 下部アクションバー */}
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t px-3 py-2.5 shadow-lg">
            <div className="flex items-center gap-2">
              {/* 片道/周遊トグル */}
              <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs flex-shrink-0">
                <button
                  onClick={() => setTripType("oneway")}
                  className={`px-2.5 py-1.5 font-medium transition-colors
                    ${tripType === "oneway" ? "bg-blue-600 text-white" : "bg-white text-gray-600"}`}
                >
                  片道
                </button>
                <button
                  onClick={() => setTripType("roundtrip")}
                  className={`px-2.5 py-1.5 font-medium border-l border-gray-200 transition-colors
                    ${tripType === "roundtrip" ? "bg-blue-600 text-white" : "bg-white text-gray-600"}`}
                >
                  周遊
                </button>
              </div>

              {/* 有料道路トグル */}
              <button
                onClick={() => setAvoidTolls((v) => !v)}
                className={`flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors
                  ${avoidTolls
                    ? "bg-white border-gray-200 text-gray-500"
                    : "bg-amber-50 border-amber-300 text-amber-700"}`}
                title={avoidTolls ? "一般道のみ（タップで有料道路を許可）" : "有料道路OK（タップで一般道のみに変更）"}
              >
                🛣️
                <span>{avoidTolls ? "一般道" : "有料OK"}</span>
              </button>

              {/* 選択状況 */}
              <span className="text-xs text-gray-400 flex-1 truncate min-w-0">
                {!departure ? "出発地を選択" : selectedIds.length === 0 ? "スポットを選択" : `${selectedIds.length}件選択`}
              </span>

              {/* ルート設計ボタン */}
              <button
                onClick={handleDesignRoute}
                disabled={!canDesign || view === "calculating"}
                className="bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-semibold
                           disabled:opacity-40 disabled:cursor-not-allowed
                           active:bg-blue-700 transition-colors flex-shrink-0"
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

      {/* ルートビュー */}
      {view === "route" && routeResult && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 relative min-h-0">
            <Map
              routeSpots={routeResult.orderedSpots}
              departure={routeResult.departure}
              tripType={routeResult.tripType}
              routeGeoJSON={routeResult.geojson}
            />
          </div>
          <div className="h-64 overflow-y-auto border-t bg-white flex-shrink-0">
            <RouteTimeline result={routeResult} />
          </div>
        </div>
      )}
    </main>
  );
}
