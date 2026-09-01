import type { HeuristicProps } from "../types";

export function manhattanDistance({ p: [x, y], p1: [x1, y1] }: HeuristicProps): number {
  return Math.abs(x1 - x) + Math.abs(y1 - y);
}

export function chebyshevDistance({ p: [x, y], p1: [x1, y1] }: HeuristicProps): number {
  return Math.max(Math.abs(x1 - x), Math.abs(y1 - y));
}

export function euclidianDistance({ p: [x, y], p1: [x1, y1] }: HeuristicProps): number {
  return Math.sqrt(Math.pow(x1 - x, 2) + Math.pow(y1 - y, 2));
}

export const heuristics = [
  { id: "manhattan", name: "Manhattan", fn: manhattanDistance },
  { id: "chebyshev", name: "Chebyshev", fn: chebyshevDistance },
  { id: "euclidian", name: "Euclidian", fn: euclidianDistance },
];
