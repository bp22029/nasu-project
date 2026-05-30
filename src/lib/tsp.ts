/**
 * 自前TSP（巡回セールスマン問題）
 * - n ≤ 8: 全探索（(n-1)! ≤ 5040 通り）
 * - n ≥ 9: 最近傍法にフォールバック
 *
 * 入力: 対称な所要時間行列（秒）
 * 出力: 最適な訪問順インデックス配列（先頭は常に 0）
 */

export function solveTSP(durationMatrix: number[][]): number[] {
  const n = durationMatrix.length;
  if (n <= 1) return [0];
  if (n === 2) return [0, 1];
  if (n <= 8) return tspExact(durationMatrix);
  return tspNearestNeighbor(durationMatrix);
}

function routeCost(order: number[], matrix: number[][]): number {
  let cost = 0;
  for (let i = 0; i < order.length - 1; i++) {
    cost += matrix[order[i]][order[i + 1]];
  }
  return cost;
}

// 全探索: 先頭を 0 に固定し残りを全列挙
function tspExact(matrix: number[][]): number[] {
  const n = matrix.length;
  const rest = Array.from({ length: n - 1 }, (_, i) => i + 1);
  let bestCost = Infinity;
  let bestOrder = [0, ...rest];

  const perms = generatePermutations(rest);
  for (let p = 0; p < perms.length; p++) {
    const order = [0, ...perms[p]];
    const cost = routeCost(order, matrix);
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

// 最近傍法: 現在地から最短の未訪問スポットへ
function tspNearestNeighbor(matrix: number[][]): number[] {
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
  return order;
}
