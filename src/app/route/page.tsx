"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import RouteTimeline from "@/components/RouteTimeline";
import GrainOverlay from "@/components/GrainOverlay";
import SiteHeader from "@/components/SiteHeader";
import SurveyPrompt from "@/components/SurveyPrompt";
import ShareRouteButton from "@/components/ShareRouteButton";
import SaveRouteButton from "@/components/SaveRouteButton";
import { decodeRouteQuery } from "@/lib/routeQuery";
import type { RouteResult, SpotLock } from "@/types/route";
import { TRIP_DRAFT_KEY, type TripDraft } from "@/types/post";

const Map = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center" style={{ background: "#edeae1", color: "#8fa888", fontSize: "12px", letterSpacing: ".14em" }}>
      地図を読み込み中…
    </div>
  ),
});

// 背景・グレイン・トップバーを共通化したシェル。計算中/エラー/結果のどの状態でも
// ホーム・選択画面と同じ世界観を保つ。
function RouteShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen" style={{ background: "#f7f5f0", color: "#243019" }}>
      {/* 背景有機形状フィールド（blurフィルタ不使用・透明フェードのグラデーションで軽量化） */}
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

      {/* トップバー（共通ヘッダー）。「選び直す」→/select は sessionStorage から選択を復元する */}
      <SiteHeader backHref="/select" backLabel="選び直す" />

      <div className="relative" style={{ zIndex: 2, maxWidth: "980px", margin: "0 auto", padding: "4px clamp(20px, 5vw, 64px) 90px" }}>
        {children}
      </div>
    </main>
  );
}

// ROUTE のセクション見出し（結果/計算中/エラーで共用）
function RouteIndexLine() {
  return (
    <div className="sel-rise mb-[22px]" style={{ animationDelay: ".05s" }}>
      <span style={{ fontSize: "11px", letterSpacing: ".4em", color: "#8fa888" }}>ROUTE</span>
    </div>
  );
}

function RouteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  // 共有URLの生成に使う origin。window は SSR で触れないためマウント後に取得する。
  // queryString をそのまま繋ぐことで、将来クエリ（lock= 等）が増えても自動で共有に含まれる。
  const [origin, setOrigin] = useState("");
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  // 「この旅を記録する」: TSP最適化後の訪問順を sessionStorage 経由で
  // /trips/new に引き継ぐ（URL の spots= は選択順なので使わない。CLAUDE.md セクション14）。
  // ?from=route を付けることで「ルート経由のときだけプレフィルする」ことを明示する
  // （ホームから開いたときは常に白紙から始まる）
  const handleRecordTrip = () => {
    if (!routeResult) return;
    const draft: TripDraft = {
      spotIds: routeResult.orderedSpots.map((s) => s.id),
      routeQuery: queryString,
      createdAt: Date.now(),
    };
    sessionStorage.setItem(TRIP_DRAFT_KEY, JSON.stringify(draft));
    router.push("/trips/new?from=route");
  };

  // 現在 URL に載っている固定情報（タイムラインのピン状態表示に使う）。
  // 状態の正本は URL なので、ここでは decode して読むだけにする。
  const currentLocks: SpotLock[] = useMemo(() => {
    const decoded = decodeRouteQuery(new URLSearchParams(queryString));
    return decoded.ok ? decoded.value.locks ?? [] : [];
  }, [queryString]);

  const lockedSpotIds = useMemo(
    () => new Set(currentLocks.map((l) => l.spotId)),
    [currentLocks]
  );

  // タイムラインで各スポットの訪問順を選ぶ。position を指定すると「その順番に固定」、
  // null（「自動」選択）で解除。固定情報を URL に反映して router.push すると、
  // queryString 依存の useEffect が再計算（POST /api/route）を発火する（新しい再計算経路は作らない）。
  const handleSetLock = (spotId: string, position: number | null) => {
    let next: SpotLock[];
    if (position === null) {
      // 解除（「自動」）
      next = currentLocks.filter((l) => l.spotId !== spotId);
    } else {
      // 指定した順番に固定。同じ位置の既存固定・このスポットの旧固定は追い出す（矛盾回避）。
      next = [
        ...currentLocks.filter((l) => l.spotId !== spotId && l.position !== position),
        { spotId, position },
      ].sort((a, b) => a.position - b.position);
    }

    const params = new URLSearchParams(queryString);
    if (next.length > 0) {
      params.set("lock", next.map((l) => `${l.spotId}:${l.position}`).join(","));
    } else {
      params.delete("lock");
    }
    router.push(`/route?${params.toString()}`);
  };

  useEffect(() => {
    const decoded = decodeRouteQuery(new URLSearchParams(queryString));
    if (!decoded.ok) {
      setError(decoded.error);
      return;
    }
    const { spotIds, departure, tripType, avoidTolls, locks } = decoded.value;
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
        locks,
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
      <RouteShell>
        <RouteIndexLine />
        <h1 className="sel-rise" style={{
          fontFamily: "var(--font-serif)", fontWeight: 600,
          fontSize: "clamp(26px, 4vw, 44px)", lineHeight: 1.2, letterSpacing: ".03em",
          color: "#243019", marginBottom: "18px", animationDelay: ".12s",
        }}>
          ルートを描けませんでした。
        </h1>
        <p className="sel-rise" style={{ fontSize: "13px", color: "#9a4a3a", letterSpacing: ".05em", lineHeight: 1.9, marginBottom: "30px", animationDelay: ".2s" }}>
          ⚠ {error}
        </p>
        <Link href="/select" className="sel-rise" style={{
          display: "inline-flex", alignItems: "center", gap: "12px",
          background: "#2c3e2d", color: "#f3f1ea",
          fontSize: "13.5px", fontWeight: 600, letterSpacing: ".1em",
          padding: "13px 24px", borderRadius: "100px",
          boxShadow: "0 14px 30px -16px rgba(36,48,25,.7)",
          animationDelay: ".26s",
        }}>
          ← スポットを選び直す
        </Link>
      </RouteShell>
    );
  }

  if (!routeResult) {
    return (
      <RouteShell>
        <RouteIndexLine />
        <div className="sel-rise flex flex-col items-center justify-center text-center" style={{ paddingTop: "16vh", animationDelay: ".12s" }}>
          <span className="animate-spin" style={{
            width: "36px", height: "36px", borderRadius: "50%", display: "inline-block",
            border: "3px solid rgba(90,125,90,.22)", borderTopColor: "#5a7d5a", marginBottom: "26px",
          }} />
          <p style={{
            fontFamily: "var(--font-serif)", fontWeight: 600,
            fontSize: "clamp(20px, 2.6vw, 28px)", letterSpacing: ".06em", color: "#243019", marginBottom: "10px",
          }}>
            ルートを描いています。
          </p>
          <p style={{ fontSize: "12px", letterSpacing: ".18em", color: "#8fa888" }}>
            道なりの経路と巡る順番を計算中…
          </p>
        </div>
      </RouteShell>
    );
  }

  return (
    <RouteShell>
      <RouteIndexLine />

      {/* 見出し */}
      <h1 className="sel-rise" style={{
        fontFamily: "var(--font-serif)", fontWeight: 600,
        fontSize: "clamp(30px, 4.6vw, 56px)", lineHeight: 1.16, letterSpacing: ".03em",
        color: "#243019", marginBottom: "14px", animationDelay: ".12s",
      }}>
        あなたの<span style={{ color: "#5a7d5a" }}>那須</span>ルート。
      </h1>

      {/* 条件メタ情報 */}
      <div className="sel-rise flex items-center gap-4 flex-wrap" style={{
        fontSize: "11.5px", letterSpacing: ".18em", color: "#5a7d5a", marginBottom: "34px", animationDelay: ".2s",
      }}>
        <span>{routeResult.orderedSpots.length} スポット</span>
        <span style={{ width: "1px", height: "12px", background: "#8fa888", opacity: .5 }} />
        <span>{routeResult.tripType === "roundtrip" ? "周遊" : "片道"}</span>
        <span style={{ width: "1px", height: "12px", background: "#8fa888", opacity: .5 }} />
        <span>{routeResult.avoidTolls ? "一般道" : "有料道路OK"}</span>
      </div>

      {/* 地図カード */}
      <div className="sel-rise isolate overflow-hidden" style={{
        height: "clamp(320px, 46vh, 440px)",
        borderRadius: "22px",
        border: "1px solid rgba(143,168,136,.35)",
        boxShadow: "0 22px 50px -22px rgba(36,48,25,.4)",
        marginBottom: "22px",
        animationDelay: ".26s",
      }}>
        <Map
          routeSpots={routeResult.orderedSpots}
          departure={routeResult.departure}
          tripType={routeResult.tripType}
          routeGeoJSON={routeResult.geojson}
        />
      </div>

      {/* タイムラインカード */}
      <div className="sel-rise overflow-hidden" style={{
        background: "rgba(255,255,255,.92)",
        borderRadius: "22px",
        border: "1px solid rgba(143,168,136,.35)",
        boxShadow: "0 22px 50px -22px rgba(36,48,25,.3)",
        animationDelay: ".34s",
      }}>
        <RouteTimeline
          result={routeResult}
          lockedSpotIds={lockedSpotIds}
          onSetLock={handleSetLock}
        />
      </div>

      {/* 旅記録への導線（機能3）＋ ルート共有（機能1）: 深緑pillの主CTAと従属pillを並べる。
          position/zIndex は共有メニューを下のアンケート導線より前面に出すため（重なり順の固定） */}
      <div className="sel-rise flex flex-col items-center" style={{ marginTop: "30px", animationDelay: ".42s", position: "relative", zIndex: 30 }}>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={handleRecordTrip}
            className="route-cta"
            style={{
              display: "inline-flex", alignItems: "center", gap: "12px",
              cursor: "pointer",
              background: "#2c3e2d", color: "#f3f1ea", border: "none",
              fontSize: "13.5px", fontWeight: 600, letterSpacing: ".1em",
              padding: "14px 28px", borderRadius: "100px",
              boxShadow: "0 14px 30px -16px rgba(36,48,25,.7)",
              fontFamily: "var(--font-sans)",
            }}
          >
            この旅を記録する
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {/* このルートを軽量保存（写真なし・非公開・自分用。マイページで見返す） */}
          <SaveRouteButton routeQuery={queryString} />
          {/* 共有するのはアプリ内のルートURLのみ（Google由来データは含めない。CLAUDE.md セクション5） */}
          <ShareRouteButton url={`${origin}/route?${queryString}`} />
        </div>
        <p style={{ fontSize: "11px", color: "#8fa888", letterSpacing: ".08em", marginTop: "10px" }}>
          訪問地が入った状態で旅の記録をはじめられます
        </p>
      </div>

      {/* 使用感アンケートへの導線（回答済みなら自動で非表示） */}
      <div className="sel-rise flex justify-center" style={{ marginTop: "34px", animationDelay: ".5s" }}>
        <SurveyPrompt from="route" />
      </div>
    </RouteShell>
  );
}

export default function RoutePage() {
  // useSearchParams は Suspense 境界の内側でしか使えない（Next.js App Router の制約）
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center" style={{ background: "#f7f5f0" }}>
        <p style={{ fontSize: "12px", letterSpacing: ".2em", color: "#8fa888" }}>読み込み中…</p>
      </main>
    }>
      <RouteContent />
    </Suspense>
  );
}
