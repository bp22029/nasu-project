"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import RouteTimeline from "@/components/RouteTimeline";
import { decodeRouteQuery } from "@/lib/routeQuery";
import type { RouteResult } from "@/types/route";

const Map = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-500 text-sm">
      地図を読み込み中...
    </div>
  ),
});

function CenteredMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-5 bg-[#f7f5f0] px-6">
      {children}
    </div>
  );
}

function BackToSelectLink({ label = "← 選び直す" }: { label?: string }) {
  return (
    <Link href="/select" className="text-[#5a7d5a] text-sm font-medium underline underline-offset-4">
      {label}
    </Link>
  );
}

function RouteContent() {
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const decoded = decodeRouteQuery(new URLSearchParams(queryString));
    if (!decoded.ok) {
      setError(decoded.error);
      return;
    }
    const { spotIds, departure, tripType, avoidTolls } = decoded.value;
    // Strict Mode の二重マウントや再遷移で重複した計算（= ORS API 呼び出し）を中断する
    const controller = new AbortController();
    setRouteResult(null);
    setError(null);
    fetch("/api/route", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        spotIds,
        departure: { lat: departure.lat, lng: departure.lng, name: departure.name },
        tripType,
        avoidTolls,
      }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json() as { error: string };
          throw new Error(err.error ?? "ルート計算に失敗しました");
        }
        return res.json() as Promise<RouteResult>;
      })
      .then((data) => setRouteResult(data))
      .catch((e) => {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setError(e instanceof Error ? e.message : "エラーが発生しました");
      });
    return () => controller.abort();
  }, [queryString]);

  if (error) {
    return (
      <CenteredMessage>
        <p className="text-sm text-[#b91c1c]">⚠ {error}</p>
        <BackToSelectLink label="← スポットを選び直す" />
      </CenteredMessage>
    );
  }

  if (!routeResult) {
    return (
      <CenteredMessage>
        <span className="animate-spin" style={{
          width: "34px", height: "34px", borderRadius: "50%", display: "inline-block",
          border: "3px solid rgba(90,125,90,.25)", borderTopColor: "#5a7d5a",
        }} />
        <p style={{ fontSize: "12px", letterSpacing: ".2em", color: "#5a7d5a" }}>道なりルートを計算中…</p>
      </CenteredMessage>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f5f0]">
      <header className="bg-white border-b border-[#e5e0d3] sticky top-0 z-10">
        <div className="max-w-[900px] mx-auto px-5 py-4">
          <Link href="/select" className="text-[#5a7d5a] text-xs font-medium mb-2 block">
            ← 選び直す
          </Link>
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
    </main>
  );
}

export default function RoutePage() {
  // useSearchParams は Suspense 境界の内側でしか使えない（Next.js App Router の制約）
  return (
    <Suspense fallback={<CenteredMessage><p style={{ fontSize: "12px", color: "#5a7d5a" }}>読み込み中…</p></CenteredMessage>}>
      <RouteContent />
    </Suspense>
  );
}
