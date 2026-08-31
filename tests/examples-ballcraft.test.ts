import { describe, it, expect } from "vitest";
import { createContainer } from "@separa/ioc-inversify";
import { defineDecoratedService } from "@separa/core";
import {
  BallcraftService,
  generatePuzzle,
  DEFAULT_CONFIG,
  hasAnyLegalMove,
  solvePuzzle,
  findBestHint,
} from "@separa/example-ballcraft-shared";

describe("Ballcraft Game Logic & Service", () => {
  const serviceKeys = [
    "columns",
    "pickedBall",
    "moves",
    "history",
    "historyPos",
    "showGameOver",
    "showDeadlock",
    "hint",
    "hintMessage",
    "extraTubesCount",
    "config",
  ] as const;


  it("generates a valid puzzle with 14 columns and 2 empty columns", () => {
    const puzzle = generatePuzzle(DEFAULT_CONFIG);
    expect(puzzle).toHaveLength(14);
    const emptyCols = puzzle.filter((col) => col.length === 0);
    expect(emptyCols).toHaveLength(2);

    const nonEmptyCols = puzzle.filter((col) => col.length > 0);
    expect(nonEmptyCols).toHaveLength(12);
    for (const col of nonEmptyCols) {
      expect(col).toHaveLength(4);
    }
  });

  it("initializes game on container resolution via onInit hook", () => {
    const container = createContainer({
      definitions: [defineDecoratedService(BallcraftService, serviceKeys)],
    });

    const game = container.get(BallcraftService);
    expect(game.columns).toHaveLength(14);
    expect(game.moves).toBe(0);
    expect(game.pickedBall).toBeNull();
    expect(game.canUndo).toBe(false);
    expect(game.canRedo).toBe(false);
    expect(game.canAddTube).toBe(true);
    expect(game.extraTubesCount).toBe(0);
    expect(game.hint).toBeNull();
    expect(game.showDeadlock).toBe(false);
  });

  it("handles pick, unpick, and valid placement", () => {
    const container = createContainer({
      definitions: [defineDecoratedService(BallcraftService, serviceKeys)],
    });

    const game = container.get(BallcraftService);
    const nonEmptyIdx = game.columns.findIndex((c) => c.length > 0);
    const emptyIdx = game.columns.findIndex((c) => c.length === 0);

    const initialColor = game.columns[nonEmptyIdx]![game.columns[nonEmptyIdx]!.length - 1];

    // Pick top ball
    game.selectColumn(nonEmptyIdx);
    expect(game.pickedBall).toEqual({ from: nonEmptyIdx, color: initialColor });
    expect(game.columns[nonEmptyIdx]!.length).toBe(3);

    // Unpick (click same column)
    game.selectColumn(nonEmptyIdx);
    expect(game.pickedBall).toBeNull();
    expect(game.columns[nonEmptyIdx]!.length).toBe(4);

    // Pick again and put into empty column
    game.selectColumn(nonEmptyIdx);
    game.selectColumn(emptyIdx);

    expect(game.pickedBall).toBeNull();
    expect(game.columns[emptyIdx]!).toEqual([initialColor]);
    expect(game.moves).toBe(1);
    expect(game.canUndo).toBe(true);
    expect(game.fromStartMoves).toBe(1);
  });

  it("handles undo and redo correctly", () => {
    const container = createContainer({
      definitions: [defineDecoratedService(BallcraftService, serviceKeys)],
    });

    const game = container.get(BallcraftService);
    const nonEmptyIdx = game.columns.findIndex((c) => c.length > 0);
    const emptyIdx = game.columns.findIndex((c) => c.length === 0);

    const ballColor = game.columns[nonEmptyIdx]![game.columns[nonEmptyIdx]!.length - 1];

    game.selectColumn(nonEmptyIdx);
    game.selectColumn(emptyIdx);

    expect(game.columns[emptyIdx]).toEqual([ballColor]);

    // Undo
    game.undo();
    expect(game.columns[emptyIdx]).toEqual([]);
    expect(game.columns[nonEmptyIdx]!.length).toBe(4);
    expect(game.canUndo).toBe(false);
    expect(game.canRedo).toBe(true);

    // Redo
    game.redo();
    expect(game.columns[emptyIdx]).toEqual([ballColor]);
    expect(game.columns[nonEmptyIdx]!.length).toBe(3);
    expect(game.canUndo).toBe(true);
    expect(game.canRedo).toBe(false);
  });

  it("detects game over when all 12 tubes are monochromatic and full", () => {
    const container = createContainer({
      definitions: [defineDecoratedService(BallcraftService, serviceKeys)],
    });

    const game = container.get(BallcraftService);

    // Manually create solved board (12 full same-color columns, 2 empty columns)
    game.columns = [
      ...Array.from({ length: 12 }, (_, i) => [i, i, i, i]),
      [],
      [],
    ];
    game.moves = 10;

    expect(game.isGameOver).toBe(true);
    expect(game.isDeadlock).toBe(false);
  });

  it("detects deadlock when no legal moves remain", () => {
    const container = createContainer({
      definitions: [defineDecoratedService(BallcraftService, serviceKeys)],
    });

    const game = container.get(BallcraftService);

    // Construct a deadlock board:
    // Tubes with no matching tops and no empty tubes
    game.columns = [
      [0, 1, 0, 1],
      [1, 0, 1, 0],
    ];
    game.moves = 5;

    expect(hasAnyLegalMove(game.columns, 4)).toBe(false);
    expect(game.isDeadlock).toBe(true);
  });

  it("solves simple puzzle and calculates hint", () => {
    // Board 1 move away from solved
    // Tube 0 has 3 reds [0, 0, 0]
    // Tube 1 has 3 blues + 1 red [1, 1, 1, 0]
    // Tube 2 has 1 blue [1]
    // Tube 3 is empty []
    const board = [
      [0, 0, 0],
      [1, 1, 1, 0],
      [1],
      [],
    ];

    const hint = findBestHint(board, 4);
    expect(hint).not.toBeNull();
    // Moving top red from tube 1 to tube 0 completes red tube
    expect(hint).toEqual({ from: 1, to: 0 });

    const solution = solvePuzzle(board, 4);
    expect(solution).not.toBeNull();
    expect(solution!.length).toBeGreaterThanOrEqual(2);
  });

  it("handles requestHint and clearHint via service", () => {
    const container = createContainer({
      definitions: [defineDecoratedService(BallcraftService, serviceKeys)],
    });

    const game = container.get(BallcraftService);
    game.columns = [
      [0, 0, 0],
      [1, 1, 1, 0],
      [1],
      [],
    ];
    game.moves = 3;

    const hint = game.requestHint();
    expect(hint).toEqual({ from: 1, to: 0 });
    expect(game.hint).toEqual({ from: 1, to: 0 });
    expect(game.hintMessage).toContain("推荐步骤");

    game.clearHint();
    expect(game.hint).toBeNull();
    expect(game.hintMessage).toBeNull();
  });

  it("handles addExtraTube correctly up to max limit of 2", () => {
    const container = createContainer({
      definitions: [defineDecoratedService(BallcraftService, serviceKeys)],
    });

    const game = container.get(BallcraftService);
    const initialColCount = game.columns.length;

    // Add first extra tube
    expect(game.canAddTube).toBe(true);
    const addedFirst = game.addExtraTube();
    expect(addedFirst).toBe(true);
    expect(game.columns).toHaveLength(initialColCount + 1);
    expect(game.columns[game.columns.length - 1]).toEqual([]);
    expect(game.extraTubesCount).toBe(1);
    expect(game.canAddTube).toBe(true);

    // Add second extra tube
    const addedSecond = game.addExtraTube();
    expect(addedSecond).toBe(true);
    expect(game.columns).toHaveLength(initialColCount + 2);
    expect(game.extraTubesCount).toBe(2);
    expect(game.canAddTube).toBe(false);

    // Third attempt should be rejected
    const addedThird = game.addExtraTube();
    expect(addedThird).toBe(false);
    expect(game.columns).toHaveLength(initialColCount + 2);
    expect(game.extraTubesCount).toBe(2);
  });
});
