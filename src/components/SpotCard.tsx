"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import type { Spot } from "@/types/spot";

interface SpotCardProps {
  spot: Spot;
  selected: boolean;
  onToggle: () => void;
  routeNumber?: number;
}

interface PhotoItem {
  uri: string;
  authorAttributions: Array<{ displayName: string; uri?: string }>;
}

const GRADIENTS = [
  "from-emerald-400 to-green-600",
  "from-sky-400 to-blue-600",
  "from-violet-400 to-purple-600",
  "from-amber-400 to-orange-500",
  "from-rose-400 to-red-500",
  "from-teal-400 to-cyan-600",
  "from-indigo-400 to-blue-700",
  "from-lime-400 to-green-500",
  "from-fuchsia-400 to-pink-600",
  "from-yellow-400 to-amber-500",
  "from-red-400 to-rose-600",
  "from-cyan-400 to-teal-600",
  "from-blue-400 to-indigo-600",
];

const ICONS: Record<string, string> = {
  chausu: "🌋",
  shikanoyu: "♨️",
  sesshooseki: "🪨",
  "nasu-shrine": "⛩️",
  "nasu-ropeway": "🚡",
  "nasu-animal-kingdom": "🐾",
  "nasu-safari": "🦁",
  rindoko: "🌿",
  minamigaoka: "🐄",
  "cheese-garden": "🧀",
  "good-news-neighbors": "🌱",
  "stained-glass": "🎨",
  "michi-no-eki": "🛒",
};

let _spotIndexMap: Record<string, number> = {};
export function initSpotIndex(spots: Spot[]) {
  spots.forEach((s, i) => { _spotIndexMap[s.id] = i; });
}

export default function SpotCard({ spot, selected, onToggle, routeNumber }: SpotCardProps) {
  const [photo, setPhoto] = useState<PhotoItem | null>(null);
  const [photoLoading, setPhotoLoading] = useState(!!spot.placeId);

  useEffect(() => {
    if (!spot.placeId) { setPhotoLoading(false); return; }
    let cancelled = false;
    fetch(`/api/photos/${spot.placeId}`)
      .then((r) => r.json())
      .then((data: { photos?: PhotoItem[] }) => {
        if (!cancelled && data.photos?.[0]) setPhoto(data.photos[0]);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setPhotoLoading(false); });
    return () => { cancelled = true; };
  }, [spot.placeId]);

  const idx = _spotIndexMap[spot.id] ?? 0;
  const gradient = GRADIENTS[idx % GRADIENTS.length];
  const icon = ICONS[spot.id] ?? "📍";

  return (
    <button
      onClick={onToggle}
      aria-pressed={selected}
      aria-label={spot.name}
      className={`
        relative w-full text-left bg-white rounded-2xl overflow-hidden
        shadow-sm transition-all duration-200
        ${selected
          ? "ring-2 ring-blue-500 shadow-blue-100 shadow-md"
          : "hover:shadow-md active:scale-[0.98]"}
      `}
    >
      {/* 写真エリア（16:9） */}
      <div className="relative aspect-video overflow-hidden bg-gray-100">
        {photo ? (
          <Image
            src={photo.uri}
            alt={spot.name}
            fill
            sizes="(max-width: 640px) 50vw, 33vw"
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
            {photoLoading
              ? <span className="w-5 h-5 border-2 border-white/70 border-t-transparent rounded-full animate-spin" />
              : <span className="text-3xl">{icon}</span>}
          </div>
        )}

        {/* Google ロゴ（写真あり時、CLAUDE.md セクション5） */}
        {photo && (
          <span className="absolute bottom-1 right-1.5 text-[9px] font-semibold text-white/90 bg-black/30 rounded px-1 py-0.5 leading-none">
            Google
          </span>
        )}

        {/* 選択時のオーバーレイ */}
        {selected && <div className="absolute inset-0 bg-blue-500/10" />}
      </div>

      {/* カード本文 */}
      <div className="px-2.5 pt-2 pb-2.5">
        <p className="text-xs font-bold text-gray-900 leading-snug line-clamp-1">{spot.name}</p>
        <p className="text-[10px] text-gray-400 mt-0.5 leading-snug line-clamp-2">{spot.description}</p>

        {/* 撮影者クレジット（CLAUDE.md セクション5） */}
        {photo?.authorAttributions?.[0] && (
          <p className="text-[9px] text-gray-300 mt-1 truncate">
            📷 {photo.authorAttributions[0].displayName}
          </p>
        )}
      </div>

      {/* 選択チェックバッジ */}
      {selected && (
        <div className="absolute top-2 right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center shadow-md border-2 border-white">
          <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}

      {/* ルート番号バッジ */}
      {routeNumber !== undefined && (
        <div className="absolute top-2 left-2 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center shadow-md border-2 border-white text-white text-[11px] font-bold">
          {routeNumber}
        </div>
      )}
    </button>
  );
}
