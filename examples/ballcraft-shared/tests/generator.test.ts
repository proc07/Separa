import { describe, it, expect } from "vitest";
import { generatePuzzle } from "../src/generator";
import { DEFAULT_CONFIG } from "../src/constants";
import type { GameConfig } from "../src/types";

describe("Ballcraft Puzzle Generator (examples/ballcraft-shared)", () => {
  it("generates a valid puzzle with default configuration", () => {
    const puzzle = generatePuzzle(DEFAULT_CONFIG);

    expect(puzzle).toHaveLength(DEFAULT_CONFIG.cols);

    const emptyCols = puzzle.filter((c) => c.length === 0);
    expect(emptyCols).toHaveLength(DEFAULT_CONFIG.emptyCols);

    const nonEmptyCols = puzzle.filter((c) => c.length > 0);
    expect(nonEmptyCols).toHaveLength(DEFAULT_CONFIG.cols - DEFAULT_CONFIG.emptyCols);

    for (const col of nonEmptyCols) {
      expect(col).toHaveLength(DEFAULT_CONFIG.levels);
    }
  });

  it("contains the exact required count of each ball color", () => {
    const puzzle = generatePuzzle(DEFAULT_CONFIG);
    const totalColors = DEFAULT_CONFIG.cols - DEFAULT_CONFIG.emptyCols;
    const colorCounts = new Map<number, number>();

    for (const col of puzzle) {
      for (const color of col) {
        colorCounts.set(color, (colorCounts.get(color) ?? 0) + 1);
      }
    }

    expect(colorCounts.size).toBe(totalColors);
    for (let color = 0; color < totalColors; color++) {
      expect(colorCounts.get(color)).toBe(DEFAULT_CONFIG.levels);
    }
  });

  it("supports custom game configurations", () => {
    const customConfig: GameConfig = {
      cols: 6,
      emptyCols: 2,
      levels: 3,
      steps: 50,
    };

    const puzzle = generatePuzzle(customConfig);
    expect(puzzle).toHaveLength(6);

    const emptyCols = puzzle.filter((c) => c.length === 0);
    expect(emptyCols).toHaveLength(2);

    const nonEmptyCols = puzzle.filter((c) => c.length > 0);
    expect(nonEmptyCols).toHaveLength(4);
    for (const col of nonEmptyCols) {
      expect(col).toHaveLength(3);
    }
  });
});
