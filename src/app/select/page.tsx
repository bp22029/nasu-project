"use client";

import { useRouter } from "next/navigation";
import { useState, useCallback, useEffect, useRef } from "react";
import SpotGrid from "@/components/SpotGrid";
import DepartureSelector from "@/components/DepartureSelector";
import GrainOverlay from "@/components/GrainOverlay";
import { encodeRouteQuery } from "@/lib/routeQuery";
import type { Spot } from "@/types/spot";
import type { DeparturePoint, TripType } from "@/types/departure";
import spotsData from "@/../data/spots.json";

const spots = spotsData as Spot[];

// /route から「選び直す」で戻ったときに選択状態を復元するためのキー
const STORAGE_KEY = "nasu-select-state";

interface StoredState {
  selectedIds: string[];
  departure: DeparturePoint | null;
  tripType: TripType;
  avoidTolls: boolean;
}

export default function SelectPage() {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [departure, setDeparture] = useState<DeparturePoint | null>(null);
  const [tripType, setTripType] = useState<TripType>("oneway");
  // 現在地（GPS）出発のときはデフォルト false（有料OK）、プリセットは true（一般道推奨）→ユーザーが切替可
  const [avoidTolls, setAvoidTolls] = useState(true);
  const [restored, setRestored] = useState(false);
  // 設計ボタン押下時に出発地が未選択なら、出発地セクションへスクロールして点滅で誘導する
  const [departureFlash, setDepartureFlash] = useState(false);
  const departureSectionRef = useRef<HTMLDivElement | null>(null);

  // sessionStorage から選択状態を復元（ルート画面から戻ってきたとき用）
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const s = JSON.parse(raw) as StoredState;
        const validIds = (s.selectedIds ?? []).filter((id) => spots.some((sp) => sp.id === id));
        setSelectedIds(validIds);
        if (s.departure?.id && typeof s.departure.lat === "number") setDeparture(s.departure);
        if (s.tripType === "roundtrip" || s.tripType === "oneway") setTripType(s.tripType);
        if (typeof s.avoidTolls === "boolean") setAvoidTolls(s.avoidTolls);
      }
    } catch { /* 壊れた保存データは無視して初期状態で開始 */ }
    setRestored(true);
  }, []);

  useEffect(() => {
    if (!restored) return;
    const state: StoredState = { selectedIds, departure, tripType, avoidTolls };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [restored, selectedIds, departure, tripType, avoidTolls]);

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

  // 未準備のままボタンを押されたら、足りないもの（出発地）へ誘導する
  const handleDesignClick = () => {
    if (!departure) {
      departureSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      setDepartureFlash(true);
      window.setTimeout(() => setDepartureFlash(false), 1800);
      return;
    }
    if (selectedIds.length === 0) return;
    router.push(`/route?${encodeRouteQuery({ spotIds: selectedIds, departure, tripType, avoidTolls })}`);
  };

  return (
    <main className="min-h-screen bg-[#f7f5f0]">
      {/* 背景有機形状フィールド（blurフィルタ不使用・透明フェードのグラデーションで軽量化） */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
        <div className="start-parallax" style={{ right: "-6%", top: "-8%", width: "520px", height: "520px" }}>
          <div className="start-drift" style={{ "--dur": "34s" } as React.CSSProperties}>
            <div className="start-blob" style={{
              background: "radial-gradient(closest-side at 42% 38%, #aec7a4, rgba(108,144,105,.5) 55%, rgba(108,144,105,0) 98%)",
              opacity: .38,
            }} />
          </div>
        </div>
        <div className="start-parallax" style={{ right: "10%", top: "8%", width: "240px", height: "240px" }}>
          <div className="start-drift" style={{ "--dur": "28s" } as React.CSSProperties}>
            <div className="start-ring" style={{ "--start-rc": "rgba(90,125,90,.28)", "--mdur": "30s" } as React.CSSProperties} />
          </div>
        </div>
        <div className="start-parallax" style={{ left: "-10%", bottom: "-6%", width: "420px", height: "420px" }}>
          <div className="start-drift" style={{ "--dur": "38s" } as React.CSSProperties}>
            <div className="start-blob" style={{
              background: "radial-gradient(closest-side at 44% 40%, #e6efe0, rgba(182,203,172,.55) 55%, rgba(182,203,172,0) 98%)",
              opacity: .45,
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
        <button type="button" className="sel-back" style={{ pointerEvents: "auto" }} onClick={() => router.push("/")}>
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
        <div
          ref={departureSectionRef}
          className={`sel-rise mb-[44px]${departureFlash ? " dep-flash" : ""}`}
          style={{ animationDelay: ".3s", borderRadius: "20px" }}
        >
          <DepartureSelector selected={departure} onSelect={handleSelectDeparture} />
        </div>

        {/* スポットセクション */}
        <div className="sel-rise flex items-center gap-3 mb-[14px]" style={{ animationDelay: ".34s" }}>
          <span style={{ fontSize: "11px", letterSpacing: ".26em", color: "#8fa888", textTransform: "uppercase" }}>Spots</span>
          <span style={{ fontSize: "12px", letterSpacing: ".14em", color: "#5a7d5a" }}>ピンときた写真を選ぶ</span>
          <span style={{ flex: 1, height: "1px", background: "#e5e0d3" }} />
        </div>

        <SpotGrid spots={spots} selectedIds={selectedIds} onToggle={toggleSpot} />
      </div>

      {/* フローティングアクションバー */}
      <div className="fixed left-1/2 -translate-x-1/2" style={{ bottom: "22px", zIndex: 30, width: "calc(100% - 32px)", maxWidth: "720px" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap",
          padding: "12px 12px 12px 18px",
          // backdrop-filter はスクロールごとに背後の再ぼかしが走り重いため、不透明度高めの単色で代替
          background: "rgba(247,245,240,.95)",
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
            onClick={handleDesignClick}
            aria-disabled={!canDesign}
            style={{
              flexShrink: 0, display: "inline-flex", alignItems: "center", gap: "12px",
              cursor: "pointer",
              background: "#2c3e2d", color: "#f3f1ea", border: "none",
              fontSize: "14px", fontWeight: 600, fontFamily: "var(--font-sans)",
              letterSpacing: ".1em",
              padding: "13px 16px 13px 24px", borderRadius: "100px",
              boxShadow: "0 14px 30px -16px rgba(36,48,25,.7)",
              opacity: !canDesign ? .55 : 1,
              transition: "transform .3s cubic-bezier(.2,.7,.2,1), background .3s, opacity .3s",
            }}
          >
            設計する
            <span style={{ width: "30px", height: "30px", borderRadius: "50%", background: "rgba(255,255,255,.14)", display: "grid", placeItems: "center" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
          </button>
        </div>

        {/* ヒント */}
        <p style={{
          textAlign: "center", marginTop: "10px", fontSize: "11px", letterSpacing: ".1em",
          color: !departure && selectedIds.length > 0 ? "#8a6d2e" : "#8fa888",
          fontWeight: !departure && selectedIds.length > 0 ? 600 : 400,
        }}>
          {!departure
            ? selectedIds.length > 0
              ? "あとは出発地を選ぶだけ（ボタンを押すと出発地へ移動します）"
              : "まず出発地を選んでください"
            : selectedIds.length === 0
            ? "ピンときた写真を1枚以上選んでください"
            : `${selectedIds.length}スポットでルートを設計します`}
        </p>
      </div>
    </main>
  );
}
