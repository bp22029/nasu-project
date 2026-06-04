export interface DeparturePoint {
  id: string;
  name: string;
  lat: number;   // OSM / 地理院由来（Google由来にしない）
  lng: number;
  description: string;
}

export type TripType = "roundtrip" | "oneway";

// 座標は OSM Nominatim で取得（Google由来にしない、CLAUDE.md セクション5）
export const PRESET_DEPARTURES: DeparturePoint[] = [
  {
    id: "nasushiobara-station",
    name: "那須塩原駅",
    lat: 36.9315325,
    lng: 140.0210685,
    description: "新幹線・在来線の玄関口",
  },
  {
    id: "michi-no-eki",
    name: "道の駅 那須高原友愛の森",
    lat: 37.04094596687232,
    lng: 140.01335471346536,
    description: "那須高原の入口にある道の駅",
  },
  {
    id: "nasu-ic",
    name: "那須IC付近",
    lat: 37.0075141,
    lng: 140.0422385,
    description: "東北自動車道 那須IC",
  },
];
