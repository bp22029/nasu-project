import { describe, expect, it } from "vitest";
import { solveTSP } from "@/lib/tsp";

describe("solveTSP", () => {
  it("スポットがないとき出発地だけを返す", () => {
    // 仕様: CLAUDE.md セクション7 出発地は index 0 に固定。
    expect(solveTSP([[0]], true)).toEqual([0]);
  });

  it("片道では出発地からの開いた経路の最小順になる", () => {
    // 0 -> 2 -> 1 -> 3 が 1 + 1 + 1 で最短。
    const matrix = [
      [0, 8, 1, 9],
      [8, 0, 1, 1],
      [1, 1, 0, 9],
      [9, 1, 9, 0],
    ];

    expect(solveTSP(matrix, false)).toEqual([0, 2, 1, 3]);
  });

  it("周遊では最後に出発地へ戻るコストも含めて最小順になる", () => {
    // 片道なら 0 -> 1 -> 2 -> 3 が安いが、3 -> 0 が高い。
    // 周遊では 0 -> 3 -> 2 -> 1 -> 0 が最短。
    const matrix = [
      [0, 1, 8, 4],
      [1, 0, 1, 8],
      [8, 1, 0, 1],
      [50, 8, 1, 0],
    ];

    expect(solveTSP(matrix, true)).toEqual([0, 3, 2, 1]);
  });

  it("スポット7件までは全探索で最適順を返す", () => {
    // 仕様: CLAUDE.md セクション7 TSPのしきい値。
    const matrix = Array.from({ length: 8 }, () => Array(8).fill(99));
    for (let i = 0; i < 8; i++) matrix[i][i] = 0;
    for (let i = 0; i < 7; i++) matrix[i][i + 1] = 1;

    expect(solveTSP(matrix, false)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  it("スポット8件以上は最近傍法で順序を返す", () => {
    // 仕様: CLAUDE.md セクション7 TSPのしきい値。
    const matrix = Array.from({ length: 9 }, () => Array(9).fill(99));
    for (let i = 0; i < 9; i++) matrix[i][i] = 0;
    for (let i = 0; i < 8; i++) matrix[i][i + 1] = 1;

    expect(solveTSP(matrix, true)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("全探索: 固定したスポットは指定位置に置き、残りを最短最適化する", () => {
    // 仕様: 巡回順の一部固定。position は order 配列の添字と一致。
    // 制約なしなら [0, 2, 1, 3]。index 3 を position 1 に固定すると
    // order[1]=3 を満たす順列の中から最短のものを選ぶ。
    const matrix = [
      [0, 8, 1, 9],
      [8, 0, 1, 1],
      [1, 1, 0, 9],
      [9, 1, 9, 0],
    ];

    expect(solveTSP(matrix, false, [{ index: 3, position: 1 }])).toEqual([0, 3, 1, 2]);
    expect(solveTSP(matrix, false, [{ index: 3, position: 2 }])).toEqual([0, 2, 3, 1]);
  });

  it("全探索: 矛盾・範囲外の固定は無視して通常の最適化に倒す", () => {
    const matrix = [
      [0, 8, 1, 9],
      [8, 0, 1, 1],
      [1, 1, 0, 9],
      [9, 1, 9, 0],
    ];

    // position が範囲外（スポットは3件なので 1..3）
    expect(solveTSP(matrix, false, [{ index: 3, position: 9 }])).toEqual([0, 2, 1, 3]);
    // 同一位置に2件固定（矛盾）
    expect(
      solveTSP(matrix, false, [
        { index: 1, position: 1 },
        { index: 2, position: 1 },
      ])
    ).toEqual([0, 2, 1, 3]);
  });

  it("最近傍法(8件以上)でも固定位置は必ず守られ、全ノードを1回ずつ通る", () => {
    const n = 9;
    const matrix = Array.from({ length: n }, (_, a) =>
      Array.from({ length: n }, (_, b) => Math.abs(a - b))
    );

    const order = solveTSP(matrix, true, [{ index: 5, position: 1 }]);
    expect(order[0]).toBe(0);
    expect(order[1]).toBe(5); // 固定が守られている
    expect(order.length).toBe(n);
    expect(new Set(order).size).toBe(n); // 重複・欠落なし
  });
});
