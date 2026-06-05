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
  useEffect(() => { initSpotIndex(spots); }, [spots]);

  return (
    <div className="grid grid-cols-2 gap-3 px-3 pb-3">
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
