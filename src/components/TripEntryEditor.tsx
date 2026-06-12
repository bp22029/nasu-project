"use client";

/**
 * 旅記録のエントリ編集リスト（/trips/new 用、機能3）
 *
 * 訪問順に並んだ（スポット, 写真）エントリを編集する:
 * 写真の追加（PhotoUploadField）・上下の入れ替え・削除・末尾へのスポット追加。
 * 写真は任意（写真なしの訪問地も旅記録に残せる）。
 */
import { useState } from "react";
import PhotoUploadField from "@/components/PhotoUploadField";
import SpotSearchPicker from "@/components/SpotSearchPicker";
import type { Spot } from "@/types/spot";

/** 編集中のエントリ（保存前なので photo はリサイズ済み Blob） */
export interface DraftEntry {
  key: string; // React key 用のローカルID
  spot: Spot;
  photo: Blob | null;
}

export function newDraftEntry(spot: Spot): DraftEntry {
  return { key: crypto.randomUUID(), spot, photo: null };
}

interface TripEntryEditorProps {
  spots: Spot[]; // 検索対象の全スポット
  entries: DraftEntry[];
  onChange: (entries: DraftEntry[]) => void;
}

const iconButtonStyle = (enabled: boolean): React.CSSProperties => ({
  cursor: enabled ? "pointer" : "default",
  background: "rgba(255,255,255,.8)",
  border: "1px solid #d8d2c0",
  borderRadius: "10px",
  width: "30px",
  height: "30px",
  display: "grid",
  placeItems: "center",
  color: enabled ? "#5a7d5a" : "#cdc8b6",
  fontSize: "13px",
  lineHeight: 1,
  padding: 0,
});

export default function TripEntryEditor({ spots, entries, onChange }: TripEntryEditorProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const move = (index: number, dir: -1 | 1) => {
    const to = index + dir;
    if (to < 0 || to >= entries.length) return;
    const next = [...entries];
    [next[index], next[to]] = [next[to], next[index]];
    onChange(next);
  };

  const remove = (index: number) => {
    onChange(entries.filter((_, i) => i !== index));
  };

  const setPhoto = (index: number, photo: Blob | null) => {
    onChange(entries.map((e, i) => (i === index ? { ...e, photo } : e)));
  };

  const addSpot = (spot: Spot) => {
    onChange([...entries, newDraftEntry(spot)]);
    setPickerOpen(false);
  };

  return (
    <div>
      {entries.length === 0 && (
        <p style={{
          fontSize: "12.5px", color: "#9a947f", letterSpacing: ".04em",
          lineHeight: 1.8, margin: "0 0 14px",
        }}>
          訪れたスポットを追加して、旅の順番どおりに並べましょう。
        </p>
      )}

      {entries.map((entry, index) => (
        <div
          key={entry.key}
          style={{
            background: "rgba(255,255,255,.82)",
            border: "1px solid #e5e0d3",
            borderRadius: "16px",
            padding: "14px",
            marginBottom: "12px",
          }}
        >
          {/* ヘッダー行: 訪問順バッジ + スポット名 + 操作ボタン */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
            <span style={{
              width: "24px", height: "24px", borderRadius: "50%", flexShrink: 0,
              background: "#2c3e2d", color: "#f3f1ea",
              display: "grid", placeItems: "center",
              fontSize: "12px", fontWeight: 700,
            }}>
              {index + 1}
            </span>
            <span style={{
              flex: 1, fontSize: "14px", fontWeight: 700, color: "#2c3e2d",
              letterSpacing: ".04em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {entry.spot.name}
            </span>
            <button type="button" aria-label="上へ" onClick={() => move(index, -1)}
              disabled={index === 0} style={iconButtonStyle(index !== 0)}>↑</button>
            <button type="button" aria-label="下へ" onClick={() => move(index, 1)}
              disabled={index === entries.length - 1} style={iconButtonStyle(index !== entries.length - 1)}>↓</button>
            <button type="button" aria-label="削除" onClick={() => remove(index)}
              style={{ ...iconButtonStyle(true), color: "#b06a5a" }}>✕</button>
          </div>

          <PhotoUploadField photo={entry.photo} onChange={(photo) => setPhoto(index, photo)} />
        </div>
      ))}

      {/* スポット追加 */}
      {pickerOpen ? (
        <div style={{
          background: "rgba(255,255,255,.82)",
          border: "1px solid #e5e0d3",
          borderRadius: "16px",
          padding: "14px",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <span style={{ fontSize: "11.5px", letterSpacing: ".22em", color: "#5a7d5a" }}>ADD SPOT</span>
            <button
              type="button"
              onClick={() => setPickerOpen(false)}
              style={{
                cursor: "pointer", background: "none", border: "none",
                fontSize: "12px", color: "#9a947f", letterSpacing: ".06em",
                fontFamily: "var(--font-sans)",
              }}
            >
              閉じる
            </button>
          </div>
          <SpotSearchPicker spots={spots} selected={null} onSelect={addSpot} />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          style={{
            width: "100%",
            cursor: "pointer",
            background: "rgba(255,255,255,.6)",
            border: "1.5px dashed #b6cbac",
            borderRadius: "16px",
            padding: "16px",
            fontSize: "13px", fontWeight: 600, color: "#5a7d5a",
            letterSpacing: ".08em",
            fontFamily: "var(--font-sans)",
          }}
        >
          ＋ スポットを追加
        </button>
      )}
    </div>
  );
}
