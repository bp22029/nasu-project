"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import type { Spot } from "@/types/spot";

// Leafletのデフォルトマーカーアイコンのパス修正（Next.jsでのWebpack問題対策）
function FixLeafletIcons() {
  const map = useMap();
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });
    void map;
  }, [map]);
  return null;
}

// 那須町中心座標
const NASU_CENTER: [number, number] = [37.07, 140.0];
const INITIAL_ZOOM = 12;

interface MapProps {
  spots?: Spot[];
}

export default function Map({ spots = [] }: MapProps) {
  return (
    <MapContainer
      center={NASU_CENTER}
      zoom={INITIAL_ZOOM}
      className="w-full h-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FixLeafletIcons />
      {spots.map((spot) => (
        <Marker key={spot.id} position={[spot.lat, spot.lng]}>
          <Popup>
            <strong>{spot.name}</strong>
            <br />
            <span className="text-sm text-gray-600">{spot.description}</span>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
