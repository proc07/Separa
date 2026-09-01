import { describe, it, expect, beforeEach } from "vitest";
import { defineDecoratedService, getReactiveController } from "@separa/core";
import { createContainer } from "@separa/ioc-inversify";
import { BallcraftService } from "../src/ballcraft.service";
import type { ColorId } from "../src/types";

describe("BallcraftService (examples/ballcraft-shared)", () => {
  let service: BallcraftService;

  beforeEach(() => {
    service = new BallcraftService();
    service.onInit();
  });

  describe("Lifecycle & Initialization", () => {
    it("initializes a full game on onInit()", () => {
      expect(service.columns).toHaveLength(14);
      expect(service.moves).toBe(0);
      expect(service.pickedBall).toBeNull();
      expect(service.history).toEqual([]);
      expect(service.historyPos).toBe(-1);
      expect(service.showGameOver).toBe(false);
      expect(service.showDeadlock).toBe(false);
      expect(service.hint).toBeNull();
      expect(service.hintMessage).toBeNull();
      expect(service.extraTubesCount).toBe(0);
      expect(service.canUndo).toBe(false);
      expect(service.canRedo).toBe(false);
      expect(service.canAddTube).toBe(true);
      expect(service.fromStartMoves).toBe(0);
    });

    it("resets state when calling newGame()", () => {
      // column 0 may be empty after generatePuzzle — find a non-empty column
      const nonEmptyIdx = service.columns.findIndex((c) => c.length > 0);
      expect(nonEmptyIdx).toBeGreaterThanOrEqual(0);
      service.selectColumn(nonEmptyIdx); // Pick a ball
      expect(service.pickedBall).not.toBeNull();

      service.newGame();
      expect(service.pickedBall).toBeNull();
      expect(service.moves).toBe(0);
      expect(service.history).toEqual([]);
    });
  });

  describe("Column Selection & Move Mechanics", () => {
    it("ignores selection on an empty column when no ball is held", () => {
      service.columns = [
        [],
        [1, 2, 3, 4],
      ];
      service.selectColumn(0);
      expect(service.pickedBall).toBeNull();
    });

    it("picks top ball from a non-empty column", () => {
      service.columns = [
        [0, 1, 2],
        [3, 4],
      ];
      service.selectColumn(0);
      expect(service.pickedBall).toEqual({ from: 0, color: 2 });
      expect(service.columns[0]).toEqual([0, 1]);
      expect(service.currentFullColumns[0]).toEqual([0, 1, 2]);
    });

    it("unpicks ball when clicking the source column again", () => {
      service.columns = [
        [0, 1, 2],
        [3, 4],
      ];
      service.selectColumn(0); // pick
      expect(service.pickedBall).toEqual({ from: 0, color: 2 });

      service.selectColumn(0); // unpick
      expect(service.pickedBall).toBeNull();
      expect(service.columns[0]).toEqual([0, 1, 2]);
      expect(service.moves).toBe(0);
    });

    it("places ball into a valid target column and updates history", () => {
      service.columns = [
        [0, 1],
        [],
      ];
      service.selectColumn(0); // pick ball 1 from col 0
      service.selectColumn(1); // place into col 1 (empty)

      expect(service.pickedBall).toBeNull();
      expect(service.columns[0]).toEqual([0]);
      expect(service.columns[1]).toEqual([1]);
      expect(service.moves).toBe(1);
      expect(service.history).toEqual([{ from: 0, to: 1, color: 1 }]);
      expect(service.historyPos).toBe(0);
      expect(service.canUndo).toBe(true);
    });

    it("places ball into matching top color tube with remaining capacity", () => {
      service.columns = [
        [0, 1],
        [2, 1],
      ];
      service.selectColumn(0); // pick ball 1
      service.selectColumn(1); // place onto tube with top ball 1

      expect(service.pickedBall).toBeNull();
      expect(service.columns[1]).toEqual([2, 1, 1]);
    });

    it("performs friendly re-selection when clicking an invalid non-empty tube", () => {
      service.columns = [
        [0, 1],
        [2, 3],
      ];
      service.selectColumn(0); // picks ball 1 from col 0
      expect(service.pickedBall).toEqual({ from: 0, color: 1 });

      service.selectColumn(1); // target top is 3 (mismatch), should drop 1 back to col 0 and pick 3 from col 1
      expect(service.columns[0]).toEqual([0, 1]);
      expect(service.columns[1]).toEqual([2]);
      expect(service.pickedBall).toEqual({ from: 1, color: 3 });
    });

    it("computes validTargetIndices accurately", () => {
      service.columns = [
        [0, 1], // col 0: source
        [],     // col 1: empty -> valid
        [2, 1], // col 2: top=1 -> valid
        [3, 2], // col 3: top=2 -> invalid
      ];
      expect(service.validTargetIndices).toEqual([]);

      service.selectColumn(0); // pick 1
      expect(service.validTargetIndices).toEqual([1, 2]);
    });
  });

  describe("Undo & Redo", () => {
    it("correctly undoes and redoes moves", () => {
      service.columns = [
        [0, 1],
        [],
      ];

      service.selectColumn(0);
      service.selectColumn(1); // move 1 to col 1
      expect(service.columns[0]).toEqual([0]);
      expect(service.columns[1]).toEqual([1]);
      expect(service.moves).toBe(1);

      service.undo();
      expect(service.columns[0]).toEqual([0, 1]);
      expect(service.columns[1]).toEqual([]);
      expect(service.canUndo).toBe(false);
      expect(service.canRedo).toBe(true);
      expect(service.moves).toBe(2);

      service.redo();
      expect(service.columns[0]).toEqual([0]);
      expect(service.columns[1]).toEqual([1]);
      expect(service.canUndo).toBe(true);
      expect(service.canRedo).toBe(false);
      expect(service.moves).toBe(3);
    });

    it("puts held ball back before performing undo or redo", () => {
      service.columns = [
        [0, 1],
        [],
      ];
      service.selectColumn(0);
      service.selectColumn(1); // move 1 to col 1

      service.selectColumn(0); // pick ball 0 (currently held)
      expect(service.pickedBall).not.toBeNull();

      service.undo(); // should drop ball 0 back first, then undo move
      expect(service.pickedBall).toBeNull();
      expect(service.columns[0]).toEqual([0, 1]);
      expect(service.columns[1]).toEqual([]);
    });

    it("truncates redo stack when a new move is executed after undo", () => {
      service.columns = [
        [0, 1],
        [],
        [],
      ];
      service.selectColumn(0);
      service.selectColumn(1); // move 1 to col 1

      service.undo(); // undo move
      expect(service.canRedo).toBe(true);

      service.selectColumn(0);
      service.selectColumn(2); // new move 1 to col 2 instead
      expect(service.canRedo).toBe(false);
      expect(service.history).toHaveLength(1);
      expect(service.history[0]).toEqual({ from: 0, to: 2, color: 1 });
    });
  });

  describe("Extra Tubes & Hints", () => {
    it("adds extra tubes up to the limit of 2", () => {
      const initialColsCount = service.columns.length;
      expect(service.extraTubesCount).toBe(0);
      expect(service.canAddTube).toBe(true);

      expect(service.addExtraTube()).toBe(true);
      expect(service.columns).toHaveLength(initialColsCount + 1);
      expect(service.extraTubesCount).toBe(1);

      expect(service.addExtraTube()).toBe(true);
      expect(service.columns).toHaveLength(initialColsCount + 2);
      expect(service.extraTubesCount).toBe(2);

      expect(service.canAddTube).toBe(false);
      expect(service.addExtraTube()).toBe(false);
    });

    it("requests and clears hints", () => {
      service.columns = [
        [0, 1],
        [1, 0],
        [],
      ];
      service.config = { ...service.config, levels: 2 };

      const hint = service.requestHint();
      expect(hint).not.toBeNull();
      expect(service.hint).toEqual(hint);
      expect(service.hintMessage).toContain("推荐步骤");

      service.clearHint();
      expect(service.hint).toBeNull();
      expect(service.hintMessage).toBeNull();
    });
  });

  describe("Win Detection & Modals", () => {
    it("detects win condition and sets showGameOver", () => {
      service.config = {
        cols: 3,
        emptyCols: 1,
        levels: 2,
        steps: 10,
      };
      service.columns = [
        [0, 0],
        [1],
        [1],
      ];
      service.moves = 1;

      service.selectColumn(2); // pick 1
      service.selectColumn(1); // place onto col 1 -> [0,0], [1,1], [] (WIN)

      expect(service.isGameOver).toBe(true);
      expect(service.showGameOver).toBe(true);

      service.closeGameOver();
      expect(service.showGameOver).toBe(false);
    });

    it("allows closing deadlock modal", () => {
      service.showDeadlock = true;
      service.closeDeadlockModal();
      expect(service.showDeadlock).toBe(false);
    });
  });

  describe("Separa IoC & Reactive Enhancement Integration", () => {
    it("functions smoothly with Separa container and reactive controller", () => {
      const container = createContainer({
        definitions: [
          defineDecoratedService(BallcraftService, [
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
          ]),
        ],
      });

      const game = container.get(BallcraftService);
      const controller = getReactiveController(game);
      expect(controller).toBeDefined();

      let notified = false;
      const unsubscribe = controller!.subscribe(() => {
        notified = true;
      });

      const colWithBall = game.columns.findIndex((c) => c.length > 0);
      game.selectColumn(colWithBall >= 0 ? colWithBall : 0);
      expect(notified).toBe(true);

      unsubscribe();
    });
  });
});
