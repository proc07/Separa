import type { ColorId, GameConfig } from "./types";

interface InternalBall {
  column: InternalBall[];
  level: number;
  color: ColorId;
  step: number;
}

function getColors(colorsCount: number, levels: number): ColorId[] {
  return Array.from({ length: colorsCount * levels }, (_, i) => i % colorsCount);
}

function createEmptyColumns(cols: number): InternalBall[][] {
  return Array.from({ length: cols }, () => []);
}

function initColumns(cols: number, emptyCols: number, levels: number, colors: ColorId[]): InternalBall[][] {
  const columns = createEmptyColumns(cols);
  const colorStack = [...colors];

  for (let lvl = 0; lvl < levels; ++lvl) {
    for (const column of columns.slice(0, -emptyCols)) {
      const color = colorStack.pop();
      if (typeof color !== "undefined") {
        column.push({ column, level: lvl, color, step: -1 });
      }
    }
  }

  return columns;
}

const last = <T>(arr: T[], n = 0): T | undefined => arr[arr.length - 1 - n];

const resort = <T>(cols: T[]): T[] => {
  const newCols = [...cols];
  for (let c = 0; c < newCols.length; c++) {
    const rnd = Math.trunc(Math.random() * newCols.length);
    if (rnd !== c) {
      const tmp = newCols[c]!;
      newCols[c] = newCols[rnd]!;
      newCols[rnd] = tmp;
    }
  }
  return newCols;
};

const findSource = (cols: InternalBall[][], dest: InternalBall[]): InternalBall[][] | undefined => {
  const destTop = last(dest);

  for (const c of cols) {
    if (c.length === 0) continue;
    if (!destTop) return [c];

    const srcTop = last(c)!;
    const srcUnderTop = last(c, 1);

    const notImmediatelyFromDest = srcTop.column !== dest && srcTop.level !== dest.length;
    const sameColorUnder = !srcUnderTop || srcTop.color === srcUnderTop.color;

    if (notImmediatelyFromDest && sameColorUnder) {
      return [c];
    }
  }
  return undefined;
};

const move = (from: InternalBall[], to: InternalBall[], step: number) => {
  const src = from.pop()!;
  src.column = from;
  src.level = from.length;
  src.step = step;
  to.push(src);
};

/**
 * 生成保证有解的分色球球拼图关卡（从已还原的终局状态进行合法反向洗牌）。
 */
export function generatePuzzle(config: GameConfig): ColorId[][] {
  const { cols, levels, emptyCols, steps } = config;
  const colorsCount = cols - emptyCols;
  const isFull = (arr: InternalBall[]) => arr.length === levels;
  const RETRY_COUNT = 10;

  let retryIndex = 0;
  let variants: { iterations: number; columns: ColorId[][]; noSource: boolean; emptyCount: number }[] = [];

  const clone = (columns: InternalBall[][]): ColorId[][] =>
    columns.map((col) => col.map((item) => item.color));

  do {
    retryIndex = 0;
    variants = [];
    do {
      let i = 0;
      let emptyCount = 0;
      let noSource = false;

      const colors = getColors(colorsCount, levels);
      const columns = initColumns(cols, emptyCols, levels, colors);

      while (i < steps) {
        const nonFullCols = columns.filter((c) => !isFull(c));
        for (const dest of resort(nonFullCols)) {
          const rest = columns.filter((c) => c !== dest && c.length > 0);
          const rndCols = resort(rest);

          const byMinSteps = [...rndCols].sort((a, b) => (last(a)?.step ?? 0) - (last(b)?.step ?? 0));
          const srcList = findSource(byMinSteps, dest);

          if (!srcList || srcList.length === 0) {
            noSource = true;
            continue;
          }

          noSource = false;
          move(srcList[0]!, dest, i);
          break;
        }

        if (noSource) break;
        emptyCount = columns.filter((c) => c.length === 0).length;
        if (i > steps - steps / 4 && emptyCount === 2) break;
        i++;
      }

      const variant = { iterations: i, columns: clone(columns), noSource, emptyCount };
      variants.push(variant);
    } while (++retryIndex < RETRY_COUNT);

    variants.sort((a, b) => {
      if (b.emptyCount - a.emptyCount === 0) {
        if (b.iterations - a.iterations === 0) {
          return (b.noSource ? 1 : 0) - (a.noSource ? 1 : 0);
        }
        return b.iterations - a.iterations;
      }
      return b.emptyCount - a.emptyCount;
    });
  } while (variants[0] && variants[0].emptyCount !== 2);

  return variants[0]?.columns ?? Array.from({ length: cols }, () => []);
}
