/**
 * スポットの部分一致検索（機能3の投稿画面用）
 *
 * スポットは将来200件規模になる想定だが、spots.json は全件バンドル済みで
 * 200件 × includes は 1ms 未満なので、クライアント側 filter で十分（DB検索は使わない）。
 *
 * 正規化（NFKC + 小文字化 + カタカナ→ひらがな + 空白除去）してから
 * name / description を部分一致で照合するので、
 * 「ちーず」→「チーズガーデン 那須本店」、「牧場」→ 牧場2件 のように文中の語でもヒットする。
 * 表記ゆれの強化が必要になったら spots.json に aliases: string[] を足して
 * 照合対象に加えるだけで拡張できる。
 */
import type { Spot } from "@/types/spot";

function normalize(s: string): string {
  return s
    .normalize("NFKC") // 全角英数→半角 など
    .toLowerCase()
    .replace(/[ァ-ヶ]/g, (c) =>
      String.fromCharCode(c.charCodeAt(0) - 0x60)
    ) // カタカナ→ひらがな
    .replace(/\s+/g, "");
}

export function searchSpots(spots: Spot[], query: string): Spot[] {
  const q = normalize(query);
  if (!q) return spots;
  return spots.filter(
    (s) => normalize(s.name).includes(q) || normalize(s.description).includes(q)
  );
}
