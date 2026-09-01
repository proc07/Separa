import { type Coords, DIRECTIONS } from "./types";

export function getLocalSize(w: number, h: number, cellSize = 20): { w: number; h: number } {
  return {
    w: Math.max(10, Math.floor(w / cellSize)),
    h: Math.max(10, Math.floor(h / cellSize)),
  };
}

export function getGlobalSize(w: number, h: number, cellSize = 20): { w: number; h: number } {
  return {
    w: Math.floor(w * cellSize),
    h: Math.floor(h * cellSize),
  };
}

export function convertLocalPositionToGlobal([x, y]: Coords, cellSize = 20): Coords {
  return [x * cellSize, y * cellSize];
}

export function convertGlobalPositionToLocal([x, y]: Coords, cellSize = 20): Coords {
  return [Math.floor(x / cellSize), Math.floor(y / cellSize)];
}

export function randomPosition(w: number, h: number): Coords {
  return [Math.floor(Math.random() * w), Math.floor(Math.random() * h)];
}

export function getIndexByPosition([x, y]: Coords, w: number): number {
  return y * w + x;
}

export function getPositionByIndex(index: number, w: number): Coords {
  const y = Math.floor(index / w);
  const x = index - y * w;
  return [x, y];
}

export function randomId(): string {
  return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString();
}

export function getDifferenceBetweenPositions([x, y]: Coords, [x1, y1]: Coords): number {
  return Math.abs(x1 - x) + Math.abs(y1 - y);
}

export function getNextPositionByDirection(
  [x, y]: Coords,
  direction: DIRECTIONS,
  w: number,
  h: number,
  withBounds = false,
): Coords {
  let nx = x;
  let ny = y;

  if (direction === DIRECTIONS.RIGHT) nx += 1;
  else if (direction === DIRECTIONS.LEFT) nx -= 1;
  else if (direction === DIRECTIONS.TOP) ny -= 1;
  else if (direction === DIRECTIONS.DOWN) ny += 1;

  if (!withBounds) {
    nx = (nx + w) % w;
    ny = (ny + h) % h;
  }

  return [nx, ny];
}

export function getDirectionByPosition([x, y]: Coords, [x1, y1]: Coords): DIRECTIONS {
  if (x1 - x > 0) return DIRECTIONS.RIGHT;
  if (x1 - x < 0) return DIRECTIONS.LEFT;
  if (y1 - y > 0) return DIRECTIONS.DOWN;
  if (y1 - y < 0) return DIRECTIONS.TOP;
  return DIRECTIONS.RIGHT;
}

export function createOperationLogger(name: string): { log: () => void; increment: () => void } {
  let operation = 0;
  return {
    log: () => {
      // eslint-disable-next-line no-console
      console.log(`[Algorithm: ${name}] operations count: ${operation}`);
    },
    increment: () => {
      operation++;
    },
  };
}

const PRESET_COLORS: Array<{ head: string; tail: string }> = [
  { head: "#22c55e", tail: "#86efac" }, // Green
  { head: "#3b82f6", tail: "#93c5fd" }, // Blue
  { head: "#f59e0b", tail: "#fde68a" }, // Amber
  { head: "#ec4899", tail: "#fbcfe8" }, // Pink
  { head: "#8b5cf6", tail: "#c4b5fd" }, // Purple
  { head: "#06b6d4", tail: "#a5f3fc" }, // Cyan
  { head: "#ef4444", tail: "#fca5a5" }, // Red
  { head: "#14b8a6", tail: "#99f6e4" }, // Teal
];

export function generateColors(index = 0): { head: string; tail: string } {
  return PRESET_COLORS[index % PRESET_COLORS.length]!;
}
