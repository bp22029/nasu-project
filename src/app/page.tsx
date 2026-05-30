"use client";

import dynamic from "next/dynamic";
import { useState, useCallback } from "react";
import SpotGrid from "@/components/SpotGrid";
import RouteTimeline from "@/components/RouteTimeline";
import type { Spot } from "@/types/spot";
import type { RouteResult } from "@/types/route";
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
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggleSpot = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  // ルート設計（CLAUDE.md セクション8: calculateRoute を独立関数として /api/route 経由で呼ぶ）
  const handleDesignRoute = async () => {
    if (selectedIds.length < 2) return;
    setView("calculating");
    setError(null);
    try {
      const res = await fetch("/api/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spotIds: selectedIds }),
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

  const handleBack = () => {
    setView("grid");
    setRouteResult(null);
  };

  return (
    <main className="flex flex-col h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="px-4 py-3 bg-white border-b shadow-sm flex-shrink-0 flex items-center gap-3">
        {view === "route" && (
          <button onClick={handleBack} className="text-blue-600 font-medium text-sm flex-shrink-0">
            ← 戻る
          </button>
        )}
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-gray-800 leading-tight">那須旅</h1>
          <p className="text-xs text-gray-500 truncate">
            {view === "grid"
              ? "行きたいスポットを選んでください（2〜8件推奨）"
              : view === "route" && routeResult
              ? `${routeResult.orderedSpots.length}件のルートを表示中`
              : "計算中..."}
          </p>
        </div>
      </header>

      {/* グリッドビュー */}
      {(view === "grid" || view === "calculating") && (
        <>
          <div className="flex-1 overflow-y-auto pb-20">
            <SpotGrid spots={spots} selectedIds={selectedIds} onToggle={toggleSpot} />
          </div>

          {error && (
            <div className="bg-red-50 border-t border-red-200 text-red-700 text-xs px-4 py-2">
              ⚠ {error}
            </div>
          )}

          {/* 下部アクションバー */}
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t px-4 py-3 flex items-center justify-between shadow-lg">
            <span className="text-sm text-gray-600">
              {selectedIds.length === 0
                ? "スポットをタップして選択"
                : `${selectedIds.length}件選択中`}
            </span>
            <button
              onClick={handleDesignRoute}
              disabled={selectedIds.length < 2 || view === "calculating"}
              className="bg-blue-600 text-white px-5 py-2 rounded-full text-sm font-semibold
                         disabled:opacity-40 disabled:cursor-not-allowed
                         active:bg-blue-700 transition-colors"
            >
              {view === "calculating" ? (
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                  計算中...
                </span>
              ) : (
                "ルートを設計する"
              )}
            </button>
          </div>
        </>
      )}

      {/* ルートビュー */}
      {view === "route" && routeResult && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* 地図（上部 55%） */}
          <div className="flex-1 relative min-h-0">
            <Map
              routeSpots={routeResult.orderedSpots}
              routeGeoJSON={routeResult.geojson}
            />
          </div>

          {/* タイムライン（下部 スクロール可） */}
          <div className="h-64 overflow-y-auto border-t bg-white flex-shrink-0">
            <RouteTimeline result={routeResult} />
          </div>
        </div>
      )}
    </main>
  );
}
