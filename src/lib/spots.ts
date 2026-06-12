/**
 * スポットマスタ（data/spots.json）の参照ヘルパー
 *
 * DB の spot_id は spots.json の文字列ID（非正規化、CLAUDE.md セクション14）。
 * マスタから消えたIDはフォールバック表示する。
 */
import spotsData from "@/../data/spots.json";
import type { Spot } from "@/types/spot";

export const SPOTS = spotsData as Spot[];

export function spotNameOf(spotId: string): string {
  return SPOTS.find((s) => s.id === spotId)?.name ?? "（削除されたスポット）";
}
