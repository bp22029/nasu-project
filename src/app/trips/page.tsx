"use client";

/**
 * 旅記録一覧ページ（04 — TRIPS、機能3）
 *
 * 公開ページ（ログイン不要）。旅記録のみを新着順で表示する（単体投稿は載せない）。
 * 読み取りは RLS の「public read」ポリシーで anon ロールに許可されている。
 */
import Link from "next/link";
import { useEffect, useState } from "react";
import PageShell from "@/components/PageShell";
import TripCard from "@/components/TripCard";
import SurveyPrompt from "@/components/SurveyPrompt";
import { getSupabase } from "@/lib/supabase/client";
import type { Trip } from "@/types/post";

const PAGE_SIZE = 30;

export default function TripsPage() {
  const [trips, setTrips] = useState<Trip[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getSupabase()
      .from("trips")
      .select("*, profiles(nickname), trip_entries(*)")
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) setError(error.message);
        else setTrips((data as unknown as Trip[]) ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <PageShell backHref="/" backLabel="ホームへ" indexLabel="TRIPS">
      <h1 className="sel-rise" style={{
        fontFamily: "var(--font-serif)", fontWeight: 600,
        fontSize: "clamp(26px, 4vw, 44px)", lineHeight: 1.2, letterSpacing: ".03em",
        color: "#243019", marginBottom: "12px", animationDelay: ".1s",
      }}>
        みんなの<span style={{ color: "#5a7d5a" }}>那須</span>の旅。
      </h1>
      <p className="sel-rise" style={{
        fontSize: "12.5px", color: "#8fa888", letterSpacing: ".06em",
        lineHeight: 1.9, marginBottom: "30px", animationDelay: ".16s",
      }}>
        訪れた人たちが残した旅の記録です。次のルートのヒントにどうぞ。
      </p>

      {error && (
        <p className="sel-rise" style={{ fontSize: "13px", color: "#9a4a3a", letterSpacing: ".05em", animationDelay: ".2s" }}>
          ⚠ 旅記録を読み込めませんでした: {error}
        </p>
      )}

      {!error && trips === null && (
        <div className="sel-rise flex justify-center" style={{ paddingTop: "10vh", animationDelay: ".2s" }}>
          <span className="animate-spin" style={{
            width: "30px", height: "30px", borderRadius: "50%", display: "inline-block",
            border: "3px solid rgba(90,125,90,.22)", borderTopColor: "#5a7d5a",
          }} />
        </div>
      )}

      {trips !== null && trips.length === 0 && (
        <div className="sel-rise" style={{ animationDelay: ".2s" }}>
          <p style={{ fontSize: "13.5px", color: "#5a7d5a", letterSpacing: ".05em", lineHeight: 1.9, marginBottom: "24px" }}>
            まだ旅の記録がありません。最初の一人になりませんか。
          </p>
          <Link href="/trips/new" style={{
            display: "inline-flex", alignItems: "center", gap: "12px",
            background: "#2c3e2d", color: "#f3f1ea",
            fontSize: "13.5px", fontWeight: 600, letterSpacing: ".1em",
            padding: "13px 24px", borderRadius: "100px",
            boxShadow: "0 14px 30px -16px rgba(36,48,25,.7)",
          }}>
            旅を記録する
          </Link>
        </div>
      )}

      {trips !== null && trips.length > 0 && (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px", maxWidth: "640px" }}>
            {trips.map((trip, i) => (
              <TripCard key={trip.id} trip={trip} index={i} />
            ))}
          </div>
          <div className="sel-rise" style={{ marginTop: "30px", animationDelay: ".3s" }}>
            <Link href="/trips/new" style={{
              fontSize: "13px", color: "#5a7d5a", letterSpacing: ".08em",
              textDecoration: "underline", textUnderlineOffset: "4px",
            }}>
              ＋ 自分の旅を記録する
            </Link>
          </div>
        </>
      )}

      {/* 使用感アンケートへの導線（回答済みなら自動で非表示） */}
      <div className="sel-rise" style={{ marginTop: "40px", animationDelay: ".34s" }}>
        <SurveyPrompt from="trips" variant="card" />
      </div>
    </PageShell>
  );
}
