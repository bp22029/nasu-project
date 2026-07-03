// CLAUDE.md セクション6のスキーマに対応する型定義

export interface Spot {
  id: string;
  name: string;
  lat: number;       // 国土地理院 or OSM 由来（Google由来にしない）
  lng: number;
  placeId: string;   // Google Places Text Search から place_id のみ保存
  tags: string[];    // 機能2（診断）用に確保。現在は空配列
  description: string;
  /**
   * true のスポットは /select のグリッド・検索・ホームの件数から除外する
   *（写真に個人が写り込む等の理由で掲載をやめたいスポット）。
   * id は残すので既存の投稿・ルート表示の名前解決（spotNameOf）は維持される。
   */
  hidden?: boolean;
}
