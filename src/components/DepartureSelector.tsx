"use client";

import { useState } from "react";
import { PRESET_DEPARTURES } from "@/types/departure";
import type { DeparturePoint } from "@/types/departure";

interface DepartureSelectorProps {
  selected: DeparturePoint | null;
  onSelect: (dep: DeparturePoint) => void;
}

export default function DepartureSelector({ selected, onSelect }: DepartureSelectorProps) {
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const handleGPS = () => {
    if (!navigator.geolocation) {
      setGpsError("このブラウザはGPSに対応していません");
      return;
    }
    setGpsLoading(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onSelect({
          id: "current-location",
          name: "現在地",
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          description: "GPS取得",
        });
        setGpsLoading(false);
      },
      (err) => {
        setGpsError(err.code === 1 ? "位置情報の許可が必要です" : "取得に失敗しました");
        setGpsLoading(false);
      },
      { timeout: 10000 }
    );
  };

  return (
    <div className="px-4 pt-4 pb-1">
      <p className="text-xs font-semibold text-[#6b7d6b] mb-2 uppercase tracking-wide">出発地</p>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {/* プリセット出発地 */}
        {PRESET_DEPARTURES.map((dep) => {
          const isSelected = selected?.id === dep.id;
          return (
            <button
              key={dep.id}
              onClick={() => onSelect(dep)}
              className={`flex-shrink-0 px-3 py-2 rounded-xl border text-sm font-medium transition-colors
                ${isSelected
                  ? "bg-[#2c3e2d] border-[#2c3e2d] text-white"
                  : "bg-white border-[#e5e0d3] text-[#2c3e2d] hover:border-[#5a7d5a]"
                }`}
            >
              <span className="block text-xs font-bold leading-tight">{dep.name}</span>
              <span className="block text-[10px] opacity-70 leading-tight mt-0.5">{dep.description}</span>
            </button>
          );
        })}

        {/* 現在地ボタン */}
        <button
          onClick={handleGPS}
          disabled={gpsLoading}
          className={`flex-shrink-0 px-3 py-2 rounded-xl border text-sm font-medium transition-colors
            ${selected?.id === "current-location"
              ? "bg-[#2c3e2d] border-[#2c3e2d] text-white"
              : "bg-white border-[#e5e0d3] text-[#2c3e2d] hover:border-[#5a7d5a]"
            }
            disabled:opacity-50`}
        >
          <span className="block text-xs font-bold leading-tight">
            {gpsLoading ? "取得中…" : "📍 現在地"}
          </span>
          <span className="block text-[10px] opacity-70 leading-tight mt-0.5">GPS</span>
        </button>
      </div>

      {gpsError && (
        <p className="text-xs text-red-500 mt-1 px-1">{gpsError}</p>
      )}
      {selected && (
        <p className="text-xs text-[#5a7d5a] mt-1 px-1">
          ✓ {selected.name} を出発地に設定
        </p>
      )}
    </div>
  );
}
