import type { ColorId, HintMove } from "./types";

/**
 * 判断单根球管是否已经达成单色且满管
 */
export function isColumnComplete(column: ColorId[], levels: number): boolean {
  return column.length === levels && column.every((c) => c === column[0]);
}

/**
 * 判断单根球管内部球色是否全相同（无论满或未满）
 */
export function isColumnMonochromatic(column: ColorId[]): boolean {
  return column.length > 0 && column.every((c) => c === column[0]);
}

/**
 * 判断当前整局游戏是否已经完成还原
 */
export function isBoardSolved(columns: ColorId[][], levels: number): boolean {
  const nonEmpty = columns.filter((c) => c.length > 0);
  if (nonEmpty.length === 0) return false;
  return nonEmpty.every((c) => isColumnComplete(c, levels));
}

/**
 * 判断当前盘面是否还存在任何有意义的合法移动
 */
export function hasAnyLegalMove(columns: ColorId[][], levels: number): boolean {
  const n = columns.length;
  for (let i = 0; i < n; i++) {
    const src = columns[i];
    if (!src || src.length === 0) continue;
    if (isColumnComplete(src, levels)) continue;

    const ball = src[src.length - 1]!;
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const dst = columns[j];
      if (!dst) continue;

      // 目标为空管，且源管不是纯色管（若源管本身已纯色，移到空管无意义）
      if (dst.length === 0) {
        if (!isColumnMonochromatic(src)) return true;
      } else if (dst.length < levels && dst[dst.length - 1] === ball) {
        return true;
      }
    }
  }
  return false;
}

/**
 * 规范化盘面状态签名，用于消除等价对称分支
 */
function getCanonicalKey(columns: ColorId[][]): string {
  return columns
    .map((col) => col.join(","))
    .sort()
    .join("|");
}

/**
 * 启发式估值函数（错位度与混乱度越低，估值越小）
 */
function calculateHeuristic(columns: ColorId[][], levels: number): number {
  let score = 0;
  for (const col of columns) {
    if (col.length === 0) continue;
    if (isColumnComplete(col, levels)) continue;

    let colorSwitches = 0;
    for (let i = 0; i < col.length - 1; i++) {
      if (col[i] !== col[i + 1]) {
        colorSwitches++;
      }
    }
    score += colorSwitches * 2 + (levels - col.length);
  }
  return score;
}

interface SearchNode {
  columns: ColorId[][];
  moves: HintMove[];
  g: number;
  h: number;
  f: number;
}

/**
 * 使用 A* / BFS 启发式算法搜索还原路径
 * @param columns 当前所有球管状态
 * @param levels 单管容量（通常为 4）
 * @param maxIterations 最大探索节点数
 * @returns 还原步骤数组，若无解或超限则返回 null
 */
export function solvePuzzle(
  columns: ColorId[][],
  levels: number,
  maxIterations = 8000,
): HintMove[] | null {
  if (isBoardSolved(columns, levels)) {
    return [];
  }

  const initialCols = columns.map((col) => [...col]);
  const initialKey = getCanonicalKey(initialCols);
  const initialH = calculateHeuristic(initialCols, levels);

  const startNode: SearchNode = {
    columns: initialCols,
    moves: [],
    g: 0,
    h: initialH,
    f: initialH,
  };

  // 优先级队列 (按 f 从小到大排序)
  const openList: SearchNode[] = [startNode];
  const closedSet = new Set<string>([initialKey]);

  let iterations = 0;

  while (openList.length > 0 && iterations < maxIterations) {
    iterations++;

    // 弹出 f 最小的节点
    let minIdx = 0;
    for (let i = 1; i < openList.length; i++) {
      if (openList[i]!.f < openList[minIdx]!.f) {
        minIdx = i;
      }
    }
    const current = openList.splice(minIdx, 1)[0]!;

    if (isBoardSolved(current.columns, levels)) {
      return current.moves;
    }

    const n = current.columns.length;
    let handledFirstEmpty = false;

    for (let i = 0; i < n; i++) {
      const src = current.columns[i]!;
      if (src.length === 0) continue;
      if (isColumnComplete(src, levels)) continue;

      const ball = src[src.length - 1]!;
      const isSrcPure = isColumnMonochromatic(src);

      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const dst = current.columns[j]!;

        const isDstEmpty = dst.length === 0;
        if (isDstEmpty) {
          // 对称性剪枝：多个空管只尝试第一个
          if (handledFirstEmpty) continue;
          // 纯色管移到空管无意义
          if (isSrcPure) continue;
          handledFirstEmpty = true;
        } else {
          if (dst.length >= levels || dst[dst.length - 1] !== ball) {
            continue;
          }
        }

        // 生成新状态
        const nextCols = current.columns.map((c, idx) => {
          if (idx === i) return c.slice(0, -1);
          if (idx === j) return [...c, ball];
          return c;
        });

        const key = getCanonicalKey(nextCols);
        if (closedSet.has(key)) continue;
        closedSet.add(key);

        const nextG = current.g + 1;
        const nextH = calculateHeuristic(nextCols, levels);
        const nextNode: SearchNode = {
          columns: nextCols,
          moves: [...current.moves, { from: i, to: j }],
          g: nextG,
          h: nextH,
          f: nextG + nextH,
        };

        openList.push(nextNode);
      }
    }
  }

  return null;
}

/**
 * 计算当前盘面的单步最佳提示
 */
export function findBestHint(
  columns: ColorId[][],
  levels: number,
  maxIterations = 8000,
): HintMove | null {
  const path = solvePuzzle(columns, levels, maxIterations);
  if (!path || path.length === 0) return null;
  return path[0] ?? null;
}
