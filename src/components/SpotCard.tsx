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

// プレースホルダー用グラデーション
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

  // 写真取得（CLAUDE.md セクション8: 写真取得の独立 API ルート）
  useEffect(() => {
    if (!spot.placeId) {
      setPhotoLoading(false);
      return;
    }
    let cancelled = false;
    fetch(`/api/photos/${spot.placeId}`)
      .then((r) => r.json())
      .then((data: { photos?: PhotoItem[] }) => {
        if (!cancelled && data.photos && data.photos.length > 0) {
          setPhoto(data.photos[0]);
        }
      })
      .catch(() => {/* エラー時はプレースホルダーのまま */})
      .finally(() => { if (!cancelled) setPhotoLoading(false); });
    return () => { cancelled = true; };
  }, [spot.placeId]);

  const idx = _spotIndexMap[spot.id] ?? 0;
  const gradient = GRADIENTS[idx % GRADIENTS.length];
  const icon = ICONS[spot.id] ?? "📍";

  return (
    <button
      onClick={onToggle}
      className="relative aspect-square w-full overflow-hidden rounded-sm focus:outline-none"
      aria-pressed={selected}
      aria-label={spot.name}
    >
      {/* 背景: 写真 or プレースホルダー */}
      {photo ? (
        <Image
          src={photo.uri}
          alt={spot.name}
          fill
          sizes="(max-width: 768px) 33vw, 25vw"
          className="object-cover"
          unoptimized  // Google の photoUri はホスト制限があるため最適化しない
        />
      ) : (
        <div className={`w-full h-full bg-gradient-to-br ${gradient} flex flex-col items-center justify-center`}>
          {photoLoading ? (
            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <span className="text-3xl">{icon}</span>
          )}
        </div>
      )}

      {/* スポット名オーバーレイ */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-2">
        <p className="text-white text-xs font-medium leading-tight line-clamp-2">{spot.name}</p>
        {/* 写真クレジット（CLAUDE.md セクション5: authorAttributions 必須表示） */}
        {photo && photo.authorAttributions.length > 0 && (
          <p className="text-white/60 text-[9px] truncate mt-0.5">
            📷 {photo.authorAttributions[0].displayName}
          </p>
        )}
      </div>

      {/* Google ロゴ（写真あり時に表示、CLAUDE.md セクション5） */}
      {photo && (
        <div className="absolute top-1 right-1 bg-white/80 rounded px-1 py-0.5 text-[9px] font-medium text-gray-700 leading-none">
          Google
        </div>
      )}

      {/* 選択時: 青枠 + チェックバッジ */}
      {selected && (
        <>
          <div className="absolute inset-0 border-[3px] border-blue-500 rounded-sm pointer-events-none" />
          <div className="absolute top-1.5 left-1.5 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center shadow">
            <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </>
      )}

      {/* ルート番号バッジ */}
      {routeNumber !== undefined && (
        <div className="absolute top-1.5 left-1.5 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center shadow text-white text-xs font-bold border-2 border-white">
          {routeNumber}
        </div>
      )}
    </button>
  );
}
