/**
 * スポットマスタの単一参照点（全ページ・APIはここから SPOTS を import する）
 *
 * 2つのデータセットを環境変数で切り替える:
 * - デバッグ（既定）: data/spots.json（13件）— 開発中に /select を開くたび
 *   約200スポット分の Google Places 写真APIを消費しないため
 * - 本番: data/spots-full.json（約200件、nasu_spot_v1.csv 由来）—
 *   .env.local / Vercel に NEXT_PUBLIC_SPOTS_MODE=full を設定すると有効
 *
 * 切替はビルド/起動時に決まる（.env.local 変更後は dev サーバー再起動が必要）。
 * spots-full.json は既存13件を同じ id のまま含むので、モードを切り替えても
 * DB の spot_id 参照（非正規化、CLAUDE.md セクション14）は壊れない。
 * スポットの追加は scripts/build-spots-full.ts で行う。
 */
import spotsDebug from "@/../data/spots.json";
import spotsFull from "@/../data/spots-full.json";
import type { Spot } from "@/types/spot";

export const SPOTS: Spot[] =
  process.env.NEXT_PUBLIC_SPOTS_MODE === "full"
    ? (spotsFull as Spot[])
    : (spotsDebug as Spot[]);

/** DB の spot_id から表示名を引く。マスタから消えた id はフォールバック表示 */
export function spotNameOf(spotId: string): string {
  // デバッグモード中でも、フル側に存在する id は正しい名前で表示する
  // （本番で投稿されたデータを開発中に見ても「削除された」と誤表示しない）
  return (
    SPOTS.find((s) => s.id === spotId)?.name ??
    (spotsFull as Spot[]).find((s) => s.id === spotId)?.name ??
    "（削除されたスポット）"
  );
}
