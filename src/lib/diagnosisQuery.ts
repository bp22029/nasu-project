/**
 * 診断結果を /select へ渡す URL クエリのエンコード / デコード（機能2 → スポット選択の連携）。
 *
 * routeQuery.ts と同じ思想: 状態はすべて URL に載せる。これにより
 *   - 診断結果画面 → /select への遷移
 *   - おすすめ順で表示中の /select の共有・リロード復元
 * が同じ入口（URL）で完結する。
 *
 * 形式: /select?type=<4文字コード>&plan=<n>&desire=<n>&social=<n>&value=<n>
 *   - type … 診断タイプの4文字コード（DIAGNOSIS_TYPES のキー）
 *   - plan/desire/social/value … 各軸の合計スコア（整数 -AXIS_MAX〜+AXIS_MAX）
 *   ※ スポット選定に使うのは2軸だけだが、将来の拡張のため4軸すべて載せる。
 */
import { AXES, AXIS_MAX, DIAGNOSIS_TYPES, type DiagnosisType } from "@/lib/diagnosis";

/** URL に載せる診断状態（タイプコード + 4軸スコア） */
export interface DiagnosisQueryInput {
  /** 4文字コード（DIAGNOSIS_TYPES のキー） */
  code: string;
  /** 軸ID(AXES.id) → 合計スコア(-AXIS_MAX〜+AXIS_MAX) */
  scores: Record<string, number>;
}

/** デコード成功時に /select が受け取る値 */
export interface DecodedDiagnosis {
  code: string;
  type: DiagnosisType;
  /** 軸ID → スコア（欠損軸は 0 で補完済み） */
  scores: Record<string, number>;
}

function clampScore(n: number): number {
  const r = Math.round(n);
  if (r > AXIS_MAX) return AXIS_MAX;
  if (r < -AXIS_MAX) return -AXIS_MAX;
  return r;
}

/** DiagnosisQueryInput → URLSearchParams（type + 各軸スコア） */
export function encodeDiagnosisParams(input: DiagnosisQueryInput): URLSearchParams {
  const p = new URLSearchParams();
  p.set("type", input.code);
  for (const axis of AXES) {
    p.set(axis.id, String(clampScore(input.scores[axis.id] ?? 0)));
  }
  return p;
}

/** DiagnosisQueryInput → クエリ文字列（"?" は含まない） */
export function encodeDiagnosisQuery(input: DiagnosisQueryInput): string {
  return encodeDiagnosisParams(input).toString();
}

/**
 * URLSearchParams から診断状態を復元する。
 * type が無い / 未知のコードなら null（＝/select は通常モードで動く）。
 * 各軸スコアは整数化・範囲クランプし、欠損・不正は 0 に倒す（並べ替えに安全に効く）。
 */
export function decodeDiagnosisQuery(params: URLSearchParams): DecodedDiagnosis | null {
  const code = params.get("type");
  if (!code) return null;
  const type = DIAGNOSIS_TYPES[code];
  if (!type) return null;

  const scores: Record<string, number> = {};
  for (const axis of AXES) {
    const raw = Number(params.get(axis.id));
    scores[axis.id] = Number.isFinite(raw) ? clampScore(raw) : 0;
  }
  return { code, type, scores };
}
