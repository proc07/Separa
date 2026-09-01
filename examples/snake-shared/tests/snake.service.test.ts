import { describe, expect, it } from "vitest";
import { defineDecoratedService, getReactiveController } from "@separa/core";
import { createContainer } from "@separa/ioc-inversify";
import {
  SnakeGameService,
  SettingsService,
  BoardService,
  EditorService,
  AlgorithmEngineService,
  GAME_STATE,
} from "../src";

function createTestContainer() {
  return createContainer({
    definitions: [
      defineDecoratedService(SettingsService, [
        "fps",
        "isEnabledCollisionDetect",
        "isUserInGame",
        "indexesVisible",
        "needFillEmptyGraphsCells",
        "isLoggerEnabled",
        "customCodeIsEnabled",
        "isVisibleBoard",
      ]),
      defineDecoratedService(BoardService, [
        "w",
        "h",
        "cellSize",
        "borderSize",
        "foodCount",
        "foods",
        "bricks",
      ]),
      defineDecoratedService(EditorService, ["code", "theme", "isOpen"]),
      defineDecoratedService(AlgorithmEngineService, []),
      defineDecoratedService(SnakeGameService, ["gameState", "snakes", "tickCount"]),
    ],
  });
}

describe("SnakeGameService (Multi-Service IoC Architecture)", () => {
  it("injects SettingsService, BoardService, EditorService, and AlgorithmEngineService via IoC Container", () => {
    const container = createTestContainer();
    const game = container.get(SnakeGameService);
    const settings = container.get(SettingsService);
    const board = container.get(BoardService);
    const editor = container.get(EditorService);
    const engine = container.get(AlgorithmEngineService);

    expect(game.settings).toBe(settings);
    expect(game.board).toBe(board);
    expect(game.editor).toBe(editor);
    expect(game.engine).toBe(engine);

    game.onDispose();
  });

  it("cascades reactive sub-service property updates to SnakeGameService", () => {
    const container = createTestContainer();
    const game = container.get(SnakeGameService);
    const settings = container.get(SettingsService);

    const controller = getReactiveController(game)!;
    expect(controller).toBeDefined();

    let notified = false;
    const unsub = controller.subscribe(() => {
      notified = true;
    });

    settings.changeFps(60);
    expect(notified).toBe(true);
    expect(game.fps).toBe(60);

    notified = false;
    settings.toggleCollision();
    expect(notified).toBe(true);
    expect(game.isEnabledCollisionDetect).toBe(false);

    unsub();
    game.onDispose();
  });

  it("handles play, stop, and restart with multi-service coordination", () => {
    const container = createTestContainer();
    const game = container.get(SnakeGameService);

    game.stop();
    expect(game.gameState).toBe(GAME_STATE.IS_PAUSE);

    game.play();
    expect(game.gameState).toBe(GAME_STATE.IS_PLAY);

    game.restart();
    expect(game.gameState).toBe(GAME_STATE.IS_PLAY);
    expect(game.snakes[0]!.score).toBe(0);

    game.onDispose();
  });

  it("adds and removes user snake coordinating with SettingsService", () => {
    const container = createTestContainer();
    const game = container.get(SnakeGameService);

    game.addUserToGame();
    expect(game.isUserInGame).toBe(true);
    expect(game.snakes.some((s) => s.id === "user")).toBe(true);

    game.removeUserFromGame();
    expect(game.isUserInGame).toBe(false);
    expect(game.snakes.some((s) => s.id === "user")).toBe(false);

    game.onDispose();
  });

  it("manages board bricks and food consumption via BoardService", () => {
    const container = createTestContainer();
    const game = container.get(SnakeGameService);

    game.toggleBrick([5, 5]);
    expect(game.bricks).toEqual([[5, 5]]);

    game.toggleBrick([5, 5]);
    expect(game.bricks).toHaveLength(0);

    game.onDispose();
  });

  it("manages code editor via EditorService", () => {
    const container = createTestContainer();
    const game = container.get(SnakeGameService);

    expect(game.isEditorOpen).toBe(false);
    game.toggleEditor(true);
    expect(game.isEditorOpen).toBe(true);

    game.changeTheme("monokai");
    expect(game.editorTheme).toBe("monokai");

    game.onDispose();
  });
});
