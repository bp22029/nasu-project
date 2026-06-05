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
  "good-news": "🌱",
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
        relative w-full rounded-[14px] overflow-hidden
        transition-all duration-200
        ${selected
          ? "ring-2 ring-[#5a7d5a] shadow-[0_8px_24px_rgba(90,125,90,0.20)]"
          : "shadow-[0_8px_24px_rgba(44,62,45,0.10)] hover:shadow-[0_8px_24px_rgba(44,62,45,0.16)] active:scale-[0.98]"}
      `}
    >
      {/* 画像エリア（正方形） */}
      <div className="relative aspect-square overflow-hidden bg-gray-100">
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
              : <span className="text-4xl">{icon}</span>}
          </div>
        )}

        {/* 選択時のオーバーレイ */}
        {selected && <div className="absolute inset-0 bg-[#5a7d5a]/15" />}

        {/* 撮影者クレジット + Google（写真あり時、CLAUDE.md セクション5） */}
        {photo && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent px-2 py-1.5">
            <p className="text-[8px] text-white/80 truncate leading-none">
              {photo.authorAttributions?.[0]
                ? `📷 ${photo.authorAttributions[0].displayName} · Google`
                : "Google"}
            </p>
          </div>
        )}

        {/* 選択チェックバッジ */}
        {selected && (
          <div className="absolute top-2 right-2 w-7 h-7 bg-[#5a7d5a] rounded-full flex items-center justify-center shadow-md border-2 border-white">
            <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 12 12" fill="none">
              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}

        {/* ルート番号バッジ */}
        {routeNumber !== undefined && (
          <div className="absolute top-2 left-2 w-6 h-6 bg-[#2c3e2d] rounded-full flex items-center justify-center shadow-md border-2 border-white text-white text-[11px] font-bold">
            {routeNumber}
          </div>
        )}
      </div>
    </button>
  );
}
