import { describe, it, expect } from "vitest";
import {
  isColumnComplete,
  isColumnMonochromatic,
  isBoardSolved,
  hasAnyLegalMove,
  solvePuzzle,
  findBestHint,
} from "../src/solver";
import type { ColorId } from "../src/types";

describe("Ballcraft Solver & Board Evaluation (examples/ballcraft-shared)", () => {
  describe("isColumnComplete", () => {
    it("returns true for a full column with identical colors", () => {
      expect(isColumnComplete([1, 1, 1, 1], 4)).toBe(true);
      expect(isColumnComplete([0, 0, 0], 3)).toBe(true);
    });

    it("returns false if column is not full", () => {
      expect(isColumnComplete([1, 1, 1], 4)).toBe(false);
      expect(isColumnComplete([], 4)).toBe(false);
    });

    it("returns false if column has mixed colors", () => {
      expect(isColumnComplete([1, 1, 1, 2], 4)).toBe(false);
      expect(isColumnComplete([2, 1, 1, 1], 4)).toBe(false);
    });
  });

  describe("isColumnMonochromatic", () => {
    it("returns true for any non-empty column with single color", () => {
      expect(isColumnMonochromatic([2])).toBe(true);
      expect(isColumnMonochromatic([2, 2])).toBe(true);
      expect(isColumnMonochromatic([2, 2, 2, 2])).toBe(true);
    });

    it("returns false for empty columns and mixed columns", () => {
      expect(isColumnMonochromatic([])).toBe(false);
      expect(isColumnMonochromatic([1, 2])).toBe(false);
      expect(isColumnMonochromatic([1, 1, 2])).toBe(false);
    });
  });

  describe("isBoardSolved", () => {
    it("returns true when all non-empty columns are complete", () => {
      const solvedBoard: ColorId[][] = [
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [],
        [],
      ];
      expect(isBoardSolved(solvedBoard, 4)).toBe(true);
    });

    it("returns false when any non-empty column is incomplete or mixed", () => {
      const incompleteBoard: ColorId[][] = [
        [0, 0, 0],
        [1, 1, 1, 1],
        [0],
        [],
      ];
      expect(isBoardSolved(incompleteBoard, 4)).toBe(false);
    });

    it("returns false if all columns are empty", () => {
      expect(isBoardSolved([[], []], 4)).toBe(false);
    });
  });

  describe("hasAnyLegalMove", () => {
    it("returns true when ball can be moved to an empty column from a mixed column", () => {
      const board: ColorId[][] = [
        [0, 1],
        [],
      ];
      expect(hasAnyLegalMove(board, 4)).toBe(true);
    });

    it("returns false when all tubes are complete or only pure tubes with empty ones", () => {
      // Pure tube moving to empty tube is redundant and considered no meaningful move
      const board: ColorId[][] = [
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [],
      ];
      expect(hasAnyLegalMove(board, 4)).toBe(false);
    });

    it("returns true when top balls match and target tube has space", () => {
      const board: ColorId[][] = [
        [1, 0],
        [2, 0],
      ];
      expect(hasAnyLegalMove(board, 4)).toBe(true);
    });

    it("returns false on complete deadlock with no space and no matching tops", () => {
      const deadlockBoard: ColorId[][] = [
        [0, 1, 2, 3],
        [3, 2, 1, 0],
        [1, 0, 3, 2],
        [2, 3, 0, 1],
      ];
      expect(hasAnyLegalMove(deadlockBoard, 4)).toBe(false);
    });
  });

  describe("solvePuzzle & findBestHint", () => {
    it("returns empty move list if board is already solved", () => {
      const solvedBoard: ColorId[][] = [
        [0, 0],
        [1, 1],
        [],
      ];
      expect(solvePuzzle(solvedBoard, 2)).toEqual([]);
      expect(findBestHint(solvedBoard, 2)).toBeNull();
    });

    it("finds a winning sequence of moves for solvable board", () => {
      // Tube 0: [0, 1], Tube 1: [1, 0], Tube 2: []
      // 1. Move 1 from tube 0 to tube 2 -> [0], [1, 0], [1]
      // 2. Move 0 from tube 1 to tube 0 -> [0, 0], [1], [1]
      // 3. Move 1 from tube 1 to tube 2 -> [0, 0], [], [1, 1] (Solved!)
      const initial: ColorId[][] = [
        [0, 1],
        [1, 0],
        [],
      ];
      const solution = solvePuzzle(initial, 2);
      expect(solution).not.toBeNull();
      expect(solution!.length).toBeGreaterThan(0);

      // Verify solution steps
      const sim = initial.map((col) => [...col]);
      for (const move of solution!) {
        const ball = sim[move.from]!.pop()!;
        sim[move.to]!.push(ball);
      }
      expect(isBoardSolved(sim, 2)).toBe(true);
    });

    it("findBestHint returns the first move of the optimal solution", () => {
      const initial: ColorId[][] = [
        [0, 1],
        [1, 0],
        [],
      ];
      const hint = findBestHint(initial, 2);
      expect(hint).not.toBeNull();
      expect(hint).toHaveProperty("from");
      expect(hint).toHaveProperty("to");
    });

    it("returns null when puzzle is unsolvable", () => {
      const deadlockBoard: ColorId[][] = [
        [0, 1, 2, 3],
        [3, 2, 1, 0],
      ];
      expect(solvePuzzle(deadlockBoard, 4)).toBeNull();
      expect(findBestHint(deadlockBoard, 4)).toBeNull();
    });
  });
});
