"use client";

import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import type { Spot } from "@/types/spot";
import type { TripType } from "@/types/departure";

// Leafletのデフォルトマーカーアイコンのパス修正
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

// ルート全体が収まるよう自動的にズーム・パンを調整
function FitBoundsToSpots({ spots }: { spots: Spot[] }) {
  const map = useMap();
  useEffect(() => {
    if (spots.length === 0) return;
    const bounds = spots.map((s) => [s.lat, s.lng] as [number, number]);
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
  }, [map, spots]);
  return null;
}

// 番号付き丸アイコン
function createNumberIcon(num: number) {
  return L.divIcon({
    html: `<div style="
      background:#2563eb;
      color:white;
      width:28px;
      height:28px;
      border-radius:50%;
      display:flex;
      align-items:center;
      justify-content:center;
      font-weight:700;
      font-size:13px;
      border:2px solid white;
      box-shadow:0 2px 6px rgba(0,0,0,.4);
    ">${num}</div>`,
    className: "",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

// 那須町中心座標
const NASU_CENTER: [number, number] = [37.07, 140.0];
const INITIAL_ZOOM = 12;

// 出発地マーカー（緑色）
function createDepartureIcon() {
  return L.divIcon({
    html: `<div style="
      background:#16a34a;
      color:white;
      width:28px;
      height:28px;
      border-radius:50%;
      display:flex;
      align-items:center;
      justify-content:center;
      font-weight:700;
      font-size:11px;
      border:2px solid white;
      box-shadow:0 2px 6px rgba(0,0,0,.4);
    ">出</div>`,
    className: "",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

interface MapProps {
  /** 初期表示用スポット一覧（ルートなし時） */
  spots?: Spot[];
  /** ルート確定後の順番付きスポット */
  routeSpots?: Spot[];
  /** 出発地（ルート表示時） */
  departure?: { lat: number; lng: number; name: string };
  /** 周遊/片道 */
  tripType?: TripType;
  /** ORS Directions GeoJSON レスポンス */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  routeGeoJSON?: any;
}

export default function Map({ spots = [], routeSpots, departure, tripType, routeGeoJSON }: MapProps) {
  const hasRoute = routeSpots && routeSpots.length > 0 && routeGeoJSON && departure;

  // ORS GeoJSON の [lng, lat] → Leaflet の [lat, lng] に変換
  const polylinePositions = useMemo<[number, number][]>(() => {
    if (!hasRoute) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return routeGeoJSON.features[0].geometry.coordinates.map((coord: number[]) => [coord[1], coord[0]]);
  }, [hasRoute, routeGeoJSON]);

  return (
    <MapContainer center={NASU_CENTER} zoom={INITIAL_ZOOM} className="w-full h-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FixLeafletIcons />

      {/* ルートあり: 出発地マーカー + 番号付きマーカー + ポリライン */}
      {hasRoute ? (
        <>
          <FitBoundsToSpots spots={[
            { id: "_dep", lat: departure.lat, lng: departure.lng } as Spot,
            ...routeSpots,
          ]} />
          <Polyline
            positions={polylinePositions}
            pathOptions={{ color: "#2563eb", weight: 5, opacity: 0.85 }}
          />

          {/* 出発地マーカー（緑） */}
          <Marker position={[departure.lat, departure.lng]} icon={createDepartureIcon()}>
            <Popup>
              <strong>出発地: {departure.name}</strong>
              {tripType === "roundtrip" && <><br /><span className="text-xs text-gray-500">ここへ戻ります</span></>}
            </Popup>
          </Marker>

          {/* スポット番号マーカー（青） */}
          {routeSpots.map((spot, i) => (
            <Marker
              key={spot.id}
              position={[spot.lat, spot.lng]}
              icon={createNumberIcon(i + 1)}
            >
              <Popup>
                <strong>{i + 1}. {spot.name}</strong>
                <br />
                <span className="text-sm text-gray-600">{spot.description}</span>
              </Popup>
            </Marker>
          ))}
        </>
      ) : (
        /* ルートなし: 全スポットをデフォルトマーカーで表示 */
        spots.map((spot) => (
          <Marker key={spot.id} position={[spot.lat, spot.lng]}>
            <Popup>
              <strong>{spot.name}</strong>
              <br />
              <span className="text-sm text-gray-600">{spot.description}</span>
            </Popup>
          </Marker>
        ))
      )}
    </MapContainer>
  );
}
