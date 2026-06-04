/**
 * 自前TSP（巡回セールスマン問題）
 *
 * matrix[0] = 出発地（常に始点として固定）
 * matrix[1..n-1] = 選択スポット
 *
 * roundTrip=true  → 最後のスポットから出発地へ戻るコストも含めて最適化
 * roundTrip=false → 出発地→スポット群の片道コストのみで最適化
 *
 * スポット数 ≤ 7（出発地込み ≤ 8）: 全探索 (7! = 5040)
 * スポット数 ≥ 8: 最近傍法にフォールバック
 */

export function solveTSP(durationMatrix: number[][], roundTrip: boolean): number[] {
  const n = durationMatrix.length;
  if (n <= 1) return [0];
  if (n === 2) return [0, 1];

  // インデックス0を出発地として固定し、残りのスポット(1..n-1)を並び替える
  const spotIndices = Array.from({ length: n - 1 }, (_, i) => i + 1);

  if (spotIndices.length <= 7) {
    return tspExact(durationMatrix, spotIndices, roundTrip);
  }
  return tspNearestNeighbor(durationMatrix, roundTrip);
}

function routeCost(order: number[], matrix: number[][], roundTrip: boolean): number {
  let cost = 0;
  for (let i = 0; i < order.length - 1; i++) {
    cost += matrix[order[i]][order[i + 1]];
  }
  if (roundTrip) {
    // 最後のスポット → 出発地（index 0）へ戻るコスト
    cost += matrix[order[order.length - 1]][0];
  }
  return cost;
}

function tspExact(
  matrix: number[][],
  spotIndices: number[],
  roundTrip: boolean
): number[] {
  let bestCost = Infinity;
  let bestOrder = [0, ...spotIndices];

  const perms = generatePermutations(spotIndices);
  for (let p = 0; p < perms.length; p++) {
    const order = [0, ...perms[p]];
    const cost = routeCost(order, matrix, roundTrip);
    if (cost < bestCost) {
      bestCost = cost;
      bestOrder = order.slice();
    }
  }
  return bestOrder;
}

function generatePermutations(arr: number[]): number[][] {
  if (arr.length <= 1) return [arr.slice()];
  const result: number[][] = [];
  for (let i = 0; i < arr.length; i++) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    for (const perm of generatePermutations(rest)) {
      result.push([arr[i], ...perm]);
    }
  }
  return result;
}

function tspNearestNeighbor(matrix: number[][], roundTrip: boolean): number[] {
  const n = matrix.length;
  const visited = new Set<number>([0]);
  const order = [0];

  while (order.length < n) {
    const last = order[order.length - 1];
    let nearest = -1;
    let nearestDist = Infinity;

    for (let j = 0; j < n; j++) {
      if (!visited.has(j) && matrix[last][j] < nearestDist) {
        nearestDist = matrix[last][j];
        nearest = j;
      }
    }
    if (nearest !== -1) {
      order.push(nearest);
      visited.add(nearest);
    }
  }

  // 最近傍法では roundTrip フラグは最適化に影響しない（順序は同じ）
  // コスト算出は calculateRoute 側で行うので、ここでは順序だけ返す
  void roundTrip;
  return order;
}
