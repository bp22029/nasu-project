"use client";

/**
 * 旅記録一覧（/trips）のカード（機能3）
 *
 * 先頭エントリの写真サムネ + タイトル + ニックネーム + 日付 + スポット数。
 * クリックで詳細（/trips/[id]）へ。
 */
import Link from "next/link";
import UserPhoto from "@/components/UserPhoto";
import type { Trip } from "@/types/post";

export function formatTripDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
}

interface TripCardProps {
  trip: Trip;
  index?: number;
}

export default function TripCard({ trip, index = 0 }: TripCardProps) {
  const entries = [...(trip.trip_entries ?? [])].sort((a, b) => a.position - b.position);
  const thumb = entries.find((e) => e.photo_path)?.photo_path ?? null;

  return (
    <Link
      href={`/trips/${trip.id}`}
      className="sel-rise"
      style={{
        display: "flex",
        gap: "16px",
        alignItems: "stretch",
        background: "rgba(255,255,255,.85)",
        border: "1px solid rgba(143,168,136,.35)",
        borderRadius: "18px",
        padding: "14px",
        boxShadow: "0 14px 32px -20px rgba(36,48,25,.35)",
        animationDelay: `${0.2 + index * 0.05}s`,
      }}
    >
      {/* サムネ（写真がない旅はプレースホルダー） */}
      <div
        className="relative overflow-hidden"
        style={{
          width: "92px",
          height: "92px",
          borderRadius: "12px",
          flexShrink: 0,
          background: "linear-gradient(145deg, #cfe0c6, #8fa888)",
        }}
      >
        {thumb && (
          <UserPhoto path={thumb} alt={trip.title} sizes="92px" />
        )}
      </div>

      {/* テキスト */}
      <div style={{ minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center", gap: "7px" }}>
        <span
          style={{
            fontFamily: "var(--font-serif)",
            fontWeight: 600,
            fontSize: "16.5px",
            lineHeight: 1.35,
            letterSpacing: ".03em",
            color: "#243019",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {trip.title}
        </span>
        <span
          className="flex items-center gap-3 flex-wrap"
          style={{ fontSize: "11px", letterSpacing: ".1em", color: "#5a7d5a" }}
        >
          <span>{trip.profiles?.nickname ?? "名無しの旅人"}</span>
          <span style={{ width: "1px", height: "10px", background: "#8fa888", opacity: 0.5 }} />
          <span>{formatTripDate(trip.created_at)}</span>
          <span style={{ width: "1px", height: "10px", background: "#8fa888", opacity: 0.5 }} />
          <span>{entries.length} スポット</span>
        </span>
      </div>
    </Link>
  );
}
