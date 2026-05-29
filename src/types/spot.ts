// CLAUDE.md セクション6のスキーマに対応する型定義

export interface Spot {
  id: string;
  name: string;
  lat: number;       // 国土地理院 or OSM 由来（Google由来にしない）
  lng: number;
  placeId: string;   // Google Places Text Search から place_id のみ保存
  tags: string[];    // 機能2（診断）用に確保。現在は空配列
  description: string;
}
