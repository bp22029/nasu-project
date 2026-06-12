"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import type { Spot } from "@/types/spot";

interface SpotCardProps {
  spot: Spot;
  selected: boolean;
  onToggle: () => void;
  routeNumber?: number;
  index?: number;
  selectionOrder?: number;
}

interface PhotoItem {
  uri: string;
  authorAttributions: Array<{ displayName: string; uri?: string }>;
}

function cardGradient(i: number): string {
  const hue = 118 + (i * 13) % 64;
  const light = 0.62 + ((i * 7) % 20) / 100;
  const c1 = `oklch(${(light + 0.12).toFixed(2)} 0.05 ${hue})`;
  const c2 = `oklch(${(light - 0.18).toFixed(2)} 0.06 ${(hue + 22) % 360})`;
  return `linear-gradient(${145 + (i * 9) % 40}deg, ${c1}, ${c2})`;
}

export default function SpotCard({ spot, selected, onToggle, routeNumber, index = 0, selectionOrder }: SpotCardProps) {
  const [photo, setPhoto] = useState<PhotoItem | null>(null);
  const [photoLoading, setPhotoLoading] = useState(!!spot.placeId);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const debugOff =
      process.env.NEXT_PUBLIC_DEBUG_NO_PHOTOS === "true" ||
      (typeof window !== "undefined" && new URLSearchParams(window.location.search).has("noPhotos"));
    if (!spot.placeId || debugOff) { setPhotoLoading(false); return; }
    let cancelled = false;
    fetch(`/api/photos/${spot.placeId}`)
      .then((r) => r.json())
      .then((data: { photos?: PhotoItem[] }) => {
        if (!cancelled && data.photos?.[0]) setPhoto(data.photos[0]);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setPhotoLoading(false); });
    return () => { cancelled = true; };
  }, [spot.placeId]);

  const badgeNum = routeNumber ?? selectionOrder;

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      aria-label={spot.name}
      className="sel-card relative w-full p-0 border-none"
      style={{
        borderRadius: "16px",
        aspectRatio: "4 / 5",
        background: "#f0ede4",
        cursor: "pointer",
        isolation: "isolate",
        animationDelay: `${0.38 + index * 0.04}s`,
        boxShadow: selected
          ? "0 16px 36px -16px rgba(90,125,90,.6)"
          : hovered
          ? "0 20px 40px -18px rgba(44,62,45,.45)"
          : "0 10px 26px -16px rgba(44,62,45,.35)",
        transform: hovered ? "translateY(-4px)" : "none",
        transition: "transform .3s cubic-bezier(.2,.7,.2,1), box-shadow .3s",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Photo or gradient placeholder */}
      <div className="absolute inset-0 overflow-hidden" style={{ borderRadius: "16px" }}>
        {photo ? (
          <Image
            src={photo.uri}
            alt={spot.name}
            fill
            sizes="(max-width: 640px) 50vw, 33vw"
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="w-full h-full" style={{ background: cardGradient(index) }}>
            <div className="absolute inset-0" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E")`,
              opacity: .08, mixBlendMode: "overlay",
            }} />
          </div>
        )}
      </div>

      {/* "写真" tag top-left */}
      <span className="absolute flex items-center gap-[5px]" style={{
        top: "11px", left: "12px", zIndex: 3,
        fontFamily: "var(--font-sans)", fontSize: "9px", letterSpacing: ".18em",
        color: "rgba(255,255,255,.82)", textTransform: "uppercase",
      }}>
        <span style={{ width: "5px", height: "5px", borderRadius: "1px", background: "rgba(255,255,255,.7)", flexShrink: 0 }} />
        写真
      </span>

      {/* Loading spinner */}
      {photoLoading && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 2 }}>
          <span className="w-5 h-5 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Selection overlay + border */}
      {selected && (
        <div className="absolute inset-0 pointer-events-none" style={{
          border: "3px solid #5a7d5a",
          borderRadius: "16px",
          background: "rgba(90,125,90,.16)",
          zIndex: 2,
        }} />
      )}

      {/* Number badge top-right (selection order or route number) */}
      {badgeNum !== undefined && (
        <span className="absolute" style={{
          top: "10px", right: "11px", zIndex: 4,
          width: "27px", height: "27px", borderRadius: "50%",
          display: "grid", placeItems: "center",
          background: "#5a7d5a",
          border: "1.5px solid #fff",
          color: "#fff", fontSize: "12px", fontWeight: 700,
        }}>
          {badgeNum}
        </span>
      )}

      {/* Bottom caption: name + optional attribution */}
      <div className="absolute left-0 right-0 bottom-0" style={{
        padding: "38px 14px 14px", zIndex: 3,
        background: "linear-gradient(0deg, rgba(20,28,16,.62) 0%, rgba(20,28,16,.22) 55%, transparent 100%)",
      }}>
        <div style={{
          fontFamily: "var(--font-serif)", fontWeight: 600, fontSize: "16px",
          lineHeight: 1.32, color: "#f6f4ed", letterSpacing: ".03em",
          textShadow: "0 1px 8px rgba(0,0,0,.3)",
        }}>
          {spot.name}
        </div>
        {photo?.authorAttributions?.[0] && (
          <p style={{
            fontSize: "8px", color: "rgba(255,255,255,.65)", marginTop: "3px",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {photo.authorAttributions[0].displayName} · Google
          </p>
        )}
      </div>
    </button>
  );
}
