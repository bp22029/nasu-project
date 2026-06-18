"use client";

import type { Spot } from "@/types/spot";
import SpotCard from "@/components/SpotCard";

interface SpotGridProps {
  spots: Spot[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  showNames?: boolean;
  /** シャッフルのたびに増える値。SpotCard が表示写真を選び直すトリガー */
  shuffleNonce?: number;
  /** フィルターで表示するスポットid。未指定なら全件表示。
      非一致カードは unmount せず CSS で隠す（写真の再取得を避けるため。CLAUDE.md 参照） */
  visibleIds?: Set<string>;
}

export default function SpotGrid({ spots, selectedIds, onToggle, showNames = true, shuffleNonce = 0, visibleIds }: SpotGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      {spots.map((spot, i) => {
        const hidden = visibleIds ? !visibleIds.has(spot.id) : false;
        return (
          <div key={spot.id} style={hidden ? { display: "none" } : undefined}>
            <SpotCard
              spot={spot}
              selected={selectedIds.includes(spot.id)}
              onToggle={() => onToggle(spot.id)}
              index={i}
              selectionOrder={selectedIds.includes(spot.id) ? selectedIds.indexOf(spot.id) + 1 : undefined}
              showName={showNames}
              shuffleNonce={shuffleNonce}
            />
          </div>
        );
      })}
    </div>
  );
}
