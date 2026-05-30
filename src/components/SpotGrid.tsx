"use client";

import { useEffect } from "react";
import type { Spot } from "@/types/spot";
import SpotCard, { initSpotIndex } from "@/components/SpotCard";

interface SpotGridProps {
  spots: Spot[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}

export default function SpotGrid({ spots, selectedIds, onToggle }: SpotGridProps) {
  // SpotCard の色割り当てを初期化
  useEffect(() => {
    initSpotIndex(spots);
  }, [spots]);

  return (
    <div className="grid grid-cols-3 gap-0.5">
      {spots.map((spot) => (
        <SpotCard
          key={spot.id}
          spot={spot}
          selected={selectedIds.includes(spot.id)}
          onToggle={() => onToggle(spot.id)}
        />
      ))}
    </div>
  );
}
