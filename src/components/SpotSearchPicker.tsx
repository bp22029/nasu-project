"use client";

/**
 * スポット検索ピッカー（機能3の投稿画面用）
 *
 * 部分一致検索（lib/spotSearch.ts、文中の語でもヒット）で絞り込んで1件選ぶ。
 * 200件規模になっても使えるよう、リストはスクロール領域に収める。
 * 写真は取得しない（Places API の呼び出し節約と軽さのため、名前と説明のみ）。
 */
import { useMemo, useState } from "react";
import { searchSpots } from "@/lib/spotSearch";
import type { Spot } from "@/types/spot";

interface SpotSearchPickerProps {
  spots: Spot[];
  selected: Spot | null;
  onSelect: (spot: Spot) => void;
}

export default function SpotSearchPicker({ spots, selected, onSelect }: SpotSearchPickerProps) {
  const [query, setQuery] = useState("");
  const results = useMemo(() => searchSpots(spots, query), [spots, query]);

  return (
    <div>
      {/* 検索入力 */}
      <div style={{ position: "relative", marginBottom: "10px" }}>
        <svg
          width="15" height="15" viewBox="0 0 24 24" fill="none"
          style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#8fa888" }}
        >
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
          <path d="M21 21l-4.3-4.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          value={query}
          placeholder="スポットを検索（例: 牧場、ちーず）"
          onChange={(e) => setQuery(e.target.value)}
          style={{
            width: "100%",
            boxSizing: "border-box",
            background: "rgba(255,255,255,.9)",
            border: "1px solid #d8d2c0",
            borderRadius: "12px",
            padding: "12px 14px 12px 38px",
            fontSize: "14px",
            color: "#2c3e2d",
            outline: "none",
            fontFamily: "var(--font-sans)",
          }}
        />
      </div>

      {/* 結果リスト */}
      <div style={{
        maxHeight: "264px",
        overflowY: "auto",
        borderRadius: "14px",
        border: "1px solid #e5e0d3",
        background: "rgba(255,255,255,.72)",
      }}>
        {results.length === 0 ? (
          <p style={{ fontSize: "12.5px", color: "#9a947f", padding: "18px 16px", margin: 0, letterSpacing: ".04em" }}>
            「{query}」に当てはまるスポットがありません
          </p>
        ) : (
          results.map((spot) => {
            const isSel = selected?.id === spot.id;
            return (
              <button
                type="button"
                key={spot.id}
                onClick={() => onSelect(spot)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  cursor: "pointer",
                  background: isSel ? "#2c3e2d" : "transparent",
                  border: "none",
                  borderBottom: "1px solid rgba(229,224,211,.7)",
                  padding: "11px 14px",
                  transition: "background .2s",
                  fontFamily: "var(--font-sans)",
                }}
              >
                <span style={{
                  display: "block", fontSize: "13.5px", fontWeight: 700,
                  color: isSel ? "#f3f1ea" : "#2c3e2d", letterSpacing: ".04em",
                }}>
                  {spot.name}
                </span>
                <span style={{
                  display: "block", fontSize: "11px", marginTop: "2px",
                  color: isSel ? "rgba(243,241,234,.72)" : "#8fa888",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {spot.description}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
