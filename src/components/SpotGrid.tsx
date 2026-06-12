"use client";

import type { Spot } from "@/types/spot";
import SpotCard from "@/components/SpotCard";

interface SpotGridProps {
  spots: Spot[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  showNames?: boolean;
}

export default function SpotGrid({ spots, selectedIds, onToggle, showNames = true }: SpotGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      {spots.map((spot, i) => (
        <SpotCard
          key={spot.id}
          spot={spot}
          selected={selectedIds.includes(spot.id)}
          onToggle={() => onToggle(spot.id)}
          index={i}
          selectionOrder={selectedIds.includes(spot.id) ? selectedIds.indexOf(spot.id) + 1 : undefined}
          showName={showNames}
        />
      ))}
    </div>
  );
}
