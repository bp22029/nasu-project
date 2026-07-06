/**
 * 保存したルート（機能: ルート保存）のヘルパー
 *
 * ルートは /route のクエリ文字列（encodeRouteQuery）一本で完全に再現できるので、
 * 保存は route_query を1カラム入れるだけ。一覧での見分け用のタイトルは、
 * ユーザーが付けていなければ route_query 内のスポット名から自動生成する。
 *
 * DB アクセス（insert/select/delete/update）は他機能と同じくブラウザから
 * getSupabase() 直叩き（保護は RLS）。CRUD は呼び出し側にインラインで書く。
 */
import { spotNameOf } from "@/lib/spots";

/** route_query から選択スポットの id 配列を取り出す（順序は spots= のまま） */
export function routeSpotIds(routeQuery: string): string[] {
  return (new URLSearchParams(routeQuery).get("spots") ?? "").split(",").filter(Boolean);
}

/**
 * 保存ルートの表示名。ユーザーが付けた title があればそれを、無ければ
 * スポット名から自動生成する（例「茶臼岳・鹿の湯 ほか3スポット」）。
 */
export function deriveRouteTitle(routeQuery: string, title?: string | null): string {
  if (title && title.trim().length > 0) return title.trim();
  const ids = routeSpotIds(routeQuery);
  if (ids.length === 0) return "保存したルート";
  const names = ids.map(spotNameOf);
  if (names.length <= 2) return names.join("・");
  return `${names[0]}・${names[1]} ほか${names.length - 2}スポット`;
}
