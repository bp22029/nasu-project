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
});
