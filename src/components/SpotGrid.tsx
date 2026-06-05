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
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 px-4 pb-4">
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
