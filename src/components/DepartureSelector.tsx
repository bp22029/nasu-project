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
          description: "GPSで取得",
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

  const chipStyle = (isSelected: boolean): React.CSSProperties => ({
    flexShrink: 0,
    textAlign: "left",
    cursor: "pointer",
    background: isSelected ? "#2c3e2d" : "rgba(255,255,255,.7)",
    border: `1px solid ${isSelected ? "#2c3e2d" : "#e5e0d3"}`,
    borderRadius: "16px",
    padding: "13px 18px",
    minWidth: "150px",
    transition: "border-color .25s, background .25s, transform .25s, box-shadow .25s",
    boxShadow: isSelected ? "0 14px 30px -16px rgba(36,48,25,.7)" : undefined,
    fontFamily: "var(--font-sans)",
  });

  const nameStyle = (isSelected: boolean): React.CSSProperties => ({
    display: "block", fontSize: "14px", fontWeight: 700,
    color: isSelected ? "#f3f1ea" : "#2c3e2d",
    letterSpacing: ".04em",
  });

  const descStyle = (isSelected: boolean): React.CSSProperties => ({
    display: "block", fontSize: "10.5px",
    color: isSelected ? "rgba(243,241,234,.72)" : "#5a7d5a",
    opacity: 0.8, marginTop: "3px", letterSpacing: ".03em",
  });

  const gpsSelected = selected?.id === "current-location";

  return (
    <div>
      <div style={{
        display: "flex", gap: "10px", overflowX: "auto",
        paddingBottom: "6px", scrollbarWidth: "none",
      }}>
        {PRESET_DEPARTURES.map((dep) => {
          const isSel = selected?.id === dep.id;
          return (
            <button key={dep.id} onClick={() => onSelect(dep)} style={chipStyle(isSel)}>
              <span style={nameStyle(isSel)}>{dep.name}</span>
              <span style={descStyle(isSel)}>{dep.description}</span>
            </button>
          );
        })}

        {/* GPS / 現在地 */}
        <button
          onClick={handleGPS}
          disabled={gpsLoading}
          style={{ ...chipStyle(gpsSelected), opacity: gpsLoading ? 0.6 : 1 }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", ...nameStyle(gpsSelected) }}>
            <span style={{
              width: "7px", height: "7px", borderRadius: "50%", flexShrink: 0,
              background: gpsSelected ? "#cfe0c6" : "#5a7d5a",
              boxShadow: gpsSelected ? "0 0 0 3px rgba(207,224,198,.25)" : "0 0 0 3px rgba(90,125,90,.2)",
            }} />
            {gpsLoading ? "取得中…" : "現在地"}
          </span>
          <span style={descStyle(gpsSelected)}>GPSで取得</span>
        </button>
      </div>

      {gpsError && (
        <p style={{ fontSize: "11px", color: "#e05252", marginTop: "6px" }}>{gpsError}</p>
      )}
    </div>
  );
}
