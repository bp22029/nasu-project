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
 *
 * locks（任意）: 巡回順の一部を固定する（CLAUDE.md セクション8）。
 *   { index: matrix index(1..n-1), position: 訪問順の位置(1..n-1、1=最初のスポット) }
 *   ここでの position は order 配列の添字と一致する（order[0]=出発地なので order[position]=index）。
 *   固定スポットは指定位置に置き、残りは最短最適化される。
 *   矛盾する制約（同一位置に複数固定・範囲外・index重複など）は安全に無視して通常の最適化に倒す。
 */

export interface TSPLock {
  /** matrix のインデックス（1..n-1。出発地 0 は固定できない） */
  index: number;
  /** 訪問順の位置（1..n-1。order 配列の添字と一致） */
  position: number;
}

export function solveTSP(
  durationMatrix: number[][],
  roundTrip: boolean,
  locks?: TSPLock[]
): number[] {
  const n = durationMatrix.length;
  if (n <= 1) return [0];
  if (n === 2) return [0, 1];

  // インデックス0を出発地として固定し、残りのスポット(1..n-1)を並び替える
  const spotIndices = Array.from({ length: n - 1 }, (_, i) => i + 1);

  // 固定制約を position→index の Map に正規化する（矛盾があれば空 Map = 制約なし）
  const posToIndex = normalizeLocks(locks, n);

  if (spotIndices.length <= 7) {
    return tspExact(durationMatrix, spotIndices, roundTrip, posToIndex);
  }
  return tspNearestNeighbor(durationMatrix, posToIndex);
}

/**
 * locks を position→index の Map に正規化する。
 * 範囲外・重複・出発地固定などの矛盾があれば全体を無効化して空 Map（=制約なし）を返す。
 */
function normalizeLocks(locks: TSPLock[] | undefined, n: number): Map<number, number> {
  const posToIndex = new Map<number, number>();
  if (!locks || locks.length === 0) return posToIndex;

  const usedIndices = new Set<number>();
  for (const { index, position } of locks) {
    // 範囲チェック（index / position ともに 1..n-1）
    if (!Number.isInteger(index) || index < 1 || index > n - 1) return new Map();
    if (!Number.isInteger(position) || position < 1 || position > n - 1) return new Map();
    // 同一位置・同一スポットの重複は矛盾なので無効化
    if (posToIndex.has(position) || usedIndices.has(index)) return new Map();
    posToIndex.set(position, index);
    usedIndices.add(index);
  }
  return posToIndex;
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
  roundTrip: boolean,
  posToIndex: Map<number, number>
): number[] {
  let bestCost = Infinity;
  let bestOrder = [0, ...spotIndices];

  const perms = generatePermutations(spotIndices);
  for (let p = 0; p < perms.length; p++) {
    const perm = perms[p];
    // 固定制約を満たさない順列は捨てる（5040件程度なのでフィルタで十分速い）
    if (!satisfiesLocks(perm, posToIndex)) continue;
    const order = [0, ...perm];
    const cost = routeCost(order, matrix, roundTrip);
    if (cost < bestCost) {
      bestCost = cost;
      bestOrder = order.slice();
    }
  }
  return bestOrder;
}

// perm[i] は order[i+1] に対応する（order[0]=出発地）。position は order 添字なので perm[position-1] と突き合わせる。
function satisfiesLocks(perm: number[], posToIndex: Map<number, number>): boolean {
  for (const [position, index] of posToIndex) {
    if (perm[position - 1] !== index) return false;
  }
  return true;
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

function tspNearestNeighbor(matrix: number[][], posToIndex: Map<number, number>): number[] {
  const n = matrix.length;
  const order = new Array<number>(n).fill(-1);
  order[0] = 0;
  const visited = new Set<number>([0]);

  // 固定スポットを先に指定位置へ埋める
  for (const [position, index] of posToIndex) {
    order[position] = index;
    visited.add(index);
  }

  // 空いている位置を、直前のウェイポイントから最も近い未訪問スポットで貪欲に埋める
  let last = 0;
  for (let pos = 1; pos < n; pos++) {
    if (order[pos] !== -1) {
      last = order[pos];
      continue;
    }
    let nearest = -1;
    let nearestDist = Infinity;
    for (let j = 1; j < n; j++) {
      if (!visited.has(j) && matrix[last][j] < nearestDist) {
        nearestDist = matrix[last][j];
        nearest = j;
      }
    }
    if (nearest !== -1) {
      order[pos] = nearest;
      visited.add(nearest);
      last = nearest;
    }
  }

  // 最近傍法では roundTrip フラグは最適化に影響しない（順序は同じ）
  // コスト算出は calculateRoute 側で行うので、ここでは順序だけ返す
  return order;
}
