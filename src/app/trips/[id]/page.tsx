"use client";

/**
 * 旅記録の詳細ページ（04 — TRIPS、機能3）
 *
 * 公開ページ（ログイン不要）。タイトル・投稿者・コメントと、
 * 訪問順（position 昇順）のエントリ（スポット名 + 写真）を表示する。
 * route_query があれば「このルートを地図で見る」で既存の /route 画面を丸ごと再利用する。
 */
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import PageShell from "@/components/PageShell";
import UserPhoto from "@/components/UserPhoto";
import SurveyPrompt from "@/components/SurveyPrompt";
import { formatTripDate } from "@/components/TripCard";
import { getSupabase } from "@/lib/supabase/client";
import { spotNameOf } from "@/lib/spots";
import type { Trip } from "@/types/post";

export default function TripDetailPage() {
  const params = useParams<{ id: string }>();
  const tripId = params.id;
  const [trip, setTrip] = useState<Trip | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tripId) return;
    let cancelled = false;
    getSupabase()
      .from("trips")
      .select("*, profiles(nickname), trip_entries(*)")
      .eq("id", tripId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) setError(error.message);
        else if (!data) setError("この旅記録は見つかりませんでした");
        else setTrip(data as unknown as Trip);
      });
    return () => {
      cancelled = true;
    };
  }, [tripId]);

  if (error) {
    return (
      <PageShell backHref="/trips" backLabel="一覧へ" indexLabel="TRIPS">
        <p className="sel-rise" style={{ fontSize: "13px", color: "#9a4a3a", letterSpacing: ".05em", marginBottom: "26px", animationDelay: ".1s" }}>
          ⚠ {error}
        </p>
        <Link href="/trips" className="sel-rise" style={{
          display: "inline-flex", alignItems: "center", gap: "12px",
          background: "#2c3e2d", color: "#f3f1ea",
          fontSize: "13.5px", fontWeight: 600, letterSpacing: ".1em",
          padding: "13px 24px", borderRadius: "100px",
          boxShadow: "0 14px 30px -16px rgba(36,48,25,.7)",
          animationDelay: ".16s",
        }}>
          ← 一覧へ戻る
        </Link>
      </PageShell>
    );
  }

  if (!trip) {
    return (
      <PageShell backHref="/trips" backLabel="一覧へ" indexLabel="TRIPS">
        <div className="sel-rise flex justify-center" style={{ paddingTop: "10vh", animationDelay: ".1s" }}>
          <span className="animate-spin" style={{
            width: "30px", height: "30px", borderRadius: "50%", display: "inline-block",
            border: "3px solid rgba(90,125,90,.22)", borderTopColor: "#5a7d5a",
          }} />
        </div>
      </PageShell>
    );
  }

  const entries = [...(trip.trip_entries ?? [])].sort((a, b) => a.position - b.position);

  return (
    <PageShell backHref="/trips" backLabel="一覧へ" indexLabel="TRIPS">
      {/* タイトル + メタ */}
      <h1 className="sel-rise" style={{
        fontFamily: "var(--font-serif)", fontWeight: 600,
        fontSize: "clamp(26px, 4vw, 44px)", lineHeight: 1.25, letterSpacing: ".03em",
        color: "#243019", marginBottom: "14px", animationDelay: ".1s",
      }}>
        {trip.title}
      </h1>
      <div className="sel-rise flex items-center gap-4 flex-wrap" style={{
        fontSize: "11.5px", letterSpacing: ".18em", color: "#5a7d5a", marginBottom: "22px", animationDelay: ".16s",
      }}>
        <span>{trip.profiles?.nickname ?? "名無しの旅人"}</span>
        <span style={{ width: "1px", height: "12px", background: "#8fa888", opacity: .5 }} />
        <span>{formatTripDate(trip.created_at)}</span>
        <span style={{ width: "1px", height: "12px", background: "#8fa888", opacity: .5 }} />
        <span>{entries.length} スポット</span>
      </div>

      {/* コメント */}
      {trip.comment && (
        <p className="sel-rise" style={{
          fontSize: "13.5px", color: "#43522f", letterSpacing: ".04em", lineHeight: 2,
          marginBottom: "26px", maxWidth: "60ch", whiteSpace: "pre-wrap", animationDelay: ".2s",
        }}>
          {trip.comment}
        </p>
      )}

      {/* 設計ルートへのリンク（route_query があるときだけ） */}
      {trip.route_query && (
        <div className="sel-rise" style={{ marginBottom: "32px", animationDelay: ".24s" }}>
          <Link href={`/route?${trip.route_query}`} style={{
            display: "inline-flex", alignItems: "center", gap: "10px",
            background: "rgba(255,255,255,.85)",
            border: "1px solid rgba(143,168,136,.5)",
            color: "#2c3e2d",
            fontSize: "12.5px", fontWeight: 600, letterSpacing: ".08em",
            padding: "11px 20px", borderRadius: "100px",
            boxShadow: "0 10px 24px -16px rgba(36,48,25,.4)",
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M9 20l-5.5-2.5v-13L9 7m0 13l6-3m-6 3V7m6 10l5.5 2.5v-13L15 4m0 13V4M9 7l6-3"
                stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
            </svg>
            このルートを地図で見る
          </Link>
        </div>
      )}

      {/* 訪問エントリ（訪問順） */}
      <div style={{ maxWidth: "560px" }}>
        {entries.map((entry, index) => (
          <div key={entry.id} className="sel-rise" style={{
            marginBottom: "18px",
            animationDelay: `${0.28 + index * 0.05}s`,
          }}>
            <div className="flex items-center gap-3" style={{ marginBottom: entry.photo_path ? "10px" : 0 }}>
              <span style={{
                width: "26px", height: "26px", borderRadius: "50%", flexShrink: 0,
                background: "#2c3e2d", color: "#f3f1ea",
                display: "grid", placeItems: "center",
                fontSize: "12.5px", fontWeight: 700,
              }}>
                {index + 1}
              </span>
              <span style={{
                fontFamily: "var(--font-serif)", fontWeight: 600,
                fontSize: "16px", color: "#243019", letterSpacing: ".04em",
              }}>
                {spotNameOf(entry.spot_id)}
              </span>
            </div>
            {entry.photo_path && (
              // 投稿者が切り抜きで決めた縦横比のまま表示する（枠で再度切らない）
              <div className="overflow-hidden" style={{
                borderRadius: "18px",
                border: "1px solid rgba(143,168,136,.35)",
                boxShadow: "0 16px 36px -20px rgba(36,48,25,.4)",
              }}>
                <UserPhoto
                  path={entry.photo_path}
                  alt={spotNameOf(entry.spot_id)}
                  natural
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 使用感アンケートへの導線（回答済みなら自動で非表示） */}
      <div className="sel-rise" style={{ maxWidth: "560px", marginTop: "40px" }}>
        <SurveyPrompt from="trips" variant="card" />
      </div>
    </PageShell>
  );
}
