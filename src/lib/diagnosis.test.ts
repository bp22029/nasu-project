import { describe, expect, it } from "vitest";
import { AXIS_MAX, computeResult, resultFromScores } from "@/lib/diagnosis";
import { encodeDiagnosisQuery, decodeDiagnosisQuery } from "@/lib/diagnosisQuery";

// 機能2: 軸スコア（-8〜+8）だけから結果カードを再構築できること（保存・共有URLの復元）
describe("resultFromScores", () => {
  it("全軸が最大の正極スコアなら phnf（各軸 positivePercent=100）", () => {
    const r = resultFromScores({ plan: AXIS_MAX, desire: AXIS_MAX, social: AXIS_MAX, value: AXIS_MAX });
    expect(r.type.code).toBe("phnf");
    expect(r.axes.map((a) => a.axisId)).toEqual(["plan", "desire", "social", "value"]);
    expect(r.axes.every((a) => a.positivePercent === 100)).toBe(true);
  });

  it("全軸が最大の負極スコアなら isex（各軸 positivePercent=0）", () => {
    const r = resultFromScores({ plan: -AXIS_MAX, desire: -AXIS_MAX, social: -AXIS_MAX, value: -AXIS_MAX });
    expect(r.type.code).toBe("isex");
    expect(r.axes.every((a) => a.positivePercent === 0)).toBe(true);
  });

  it("スコア0は正極に倒れ、比率は50%（欠損軸も0扱い）", () => {
    const r = resultFromScores({});
    expect(r.type.code).toBe("phnf");
    expect(r.axes.every((a) => a.positivePercent === 50)).toBe(true);
  });

  it("軸ごとに符号が違えば混合コードになる（plan+ desire- social+ value-） = psnx", () => {
    const r = resultFromScores({ plan: 8, desire: -8, social: 8, value: -8 });
    expect(r.type.code).toBe("psnx");
  });

  it("encode → decode → resultFromScores で code とスコアが保たれる", () => {
    const scores = { plan: 6, desire: -4, social: 2, value: -8 };
    const decoded = decodeDiagnosisQuery(new URLSearchParams(encodeDiagnosisQuery({ code: "psnx", scores })));
    expect(decoded).not.toBeNull();
    const r = resultFromScores(decoded!.scores);
    // 符号: plan+ → p, desire- → s, social+ → n, value- → x
    expect(r.type.code).toBe("psnx");
    const byId = Object.fromEntries(r.axes.map((a) => [a.axisId, a.score]));
    expect(byId).toEqual(scores);
  });

  it("computeResult（生回答）と resultFromScores（同じ軸スコア）が一致する", () => {
    // 全問「とても当てはまる(+2)」= 各軸 逆転2問(+2→-2)・非逆転2問(+2) の合計 = 0 → 全軸 phnf・50%
    const result = computeResult(Array(16).fill(2));
    const byScore = resultFromScores(Object.fromEntries(result.axes.map((a) => [a.axisId, a.score])));
    expect(byScore.type.code).toBe(result.type.code);
    expect(byScore.axes.map((a) => a.positivePercent)).toEqual(result.axes.map((a) => a.positivePercent));
  });
});
