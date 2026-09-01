import { Inject, Service } from "@separa/core";
import {
  DIRECTIONS,
  GAME_STATE,
  type Coords,
  type Snake,
  type SnakeSettings,
} from "./types";
import { SettingsService } from "./services/settings.service";
import { BoardService } from "./services/board.service";
import { EditorService } from "./services/editor.service";
import { AlgorithmEngineService } from "./services/algorithm-engine.service";
import {
  generateColors,
  getNextPositionByDirection,
  randomPosition,
} from "./utils";

export const DEFAULT_SNAKE_SETTINGS: SnakeSettings = {
  activeAlgorithm: "breadth-first-search",
  activeHeuristic: "manhattan",
  showAIPathToTarget: true,
  showProcessedCells: false,
};

@Service({ scope: "singleton" })
export class SnakeGameService {
  @Inject(SettingsService)
  settings!: SettingsService;

  @Inject(BoardService)
  board!: BoardService;

  @Inject(EditorService)
  editor!: EditorService;

  @Inject(AlgorithmEngineService)
  engine!: AlgorithmEngineService;

  gameState: GAME_STATE = GAME_STATE.IS_PLAY;
  snakes: Snake[] = [];
  tickCount = 0;

  private timer: ReturnType<typeof setInterval> | null = null;

  // Delegated Reactive Getters to sub-services
  get fps(): number {
    return this.settings?.fps ?? 15;
  }
  get isEnabledCollisionDetect(): boolean {
    return this.settings?.isEnabledCollisionDetect ?? true;
  }
  get isUserInGame(): boolean {
    return this.settings?.isUserInGame ?? false;
  }
  get indexesVisible(): boolean {
    return this.settings?.indexesVisible ?? false;
  }
  get needFillEmptyGraphsCells(): boolean {
    return this.settings?.needFillEmptyGraphsCells ?? false;
  }
  get isLoggerEnabled(): boolean {
    return this.settings?.isLoggerEnabled ?? false;
  }
  get customCodeIsEnabled(): boolean {
    return this.settings?.customCodeIsEnabled ?? false;
  }
  get isVisibleBoard(): boolean {
    return this.settings?.isVisibleBoard ?? true;
  }

  get w(): number {
    return this.board?.w ?? 40;
  }
  get h(): number {
    return this.board?.h ?? 25;
  }
  get cellSize(): number {
    return this.board?.cellSize ?? 20;
  }
  get borderSize(): number {
    return this.board?.borderSize ?? 1;
  }
  get foodCount(): number {
    return this.board?.foodCount ?? 40;
  }
  get foods() {
    return this.board?.foods ?? [];
  }
  get bricks() {
    return this.board?.bricks ?? [];
  }

  get editorCode(): string {
    return this.editor?.code ?? "";
  }
  get editorTheme(): string {
    return this.editor?.theme ?? "xcode";
  }
  get isEditorOpen(): boolean {
    return this.editor?.isOpen ?? false;
  }

  onInit(): void {
    this.initGame();
  }

  onDispose(): void {
    this.stopTimer();
  }

  setDimensions(widthPx: number, heightPx: number): void {
    const resized = this.board.setDimensions(widthPx, heightPx);
    if (resized) {
      this.restart();
    }
  }

  initGame(): void {
    this.stopTimer();
    this.gameState = GAME_STATE.IS_PLAY;
    this.tickCount = 0;
    this.board.clearBoard();

    // Add initial AI snake
    const initialSnake = this.createSnake("ai-1", true, 0);
    this.snakes = [initialSnake];

    this.board.spawnFoods(this.snakes);
    this.startTimer();
  }

  restart(): void {
    this.stopTimer();
    this.gameState = GAME_STATE.IS_PLAY;
    this.tickCount = 0;
    this.board.foods = [];

    // Reset snakes to new random positions
    this.snakes = this.snakes.map((snake) => {
      const startPos = randomPosition(this.board.w, this.board.h);
      return {
        ...snake,
        body: [startPos],
        direction: DIRECTIONS.RIGHT,
        nextDirection: DIRECTIONS.RIGHT,
        isCrash: false,
        score: 0,
        meta: { path: [], processed: [] },
      };
    });

    this.board.spawnFoods(this.snakes);
    this.startTimer();
  }

  play(): void {
    this.gameState = GAME_STATE.IS_PLAY;
    this.startTimer();
  }

  stop(): void {
    this.gameState = GAME_STATE.IS_PAUSE;
    this.stopTimer();
  }

  togglePlayPause(): void {
    if (this.gameState === GAME_STATE.IS_PLAY) {
      this.stop();
    } else {
      this.play();
    }
  }

  changeFps(newFps: number): void {
    this.settings.changeFps(newFps);
    if (this.gameState === GAME_STATE.IS_PLAY) {
      this.startTimer();
    }
  }

  setCollisionState(): void {
    this.settings.toggleCollision();
  }

  setIndexesVisible(): void {
    this.settings.toggleIndexesVisible();
  }

  fillEmptyGraphCells(): void {
    this.settings.toggleFillEmptyCells();
  }

  setLoggerState(): void {
    this.settings.toggleLogger();
  }

  toggleCustomCode(): void {
    this.settings.toggleCustomCode();
  }

  changeEditorCode(code: string): void {
    this.editor.changeCode(code);
  }

  changeTheme(theme: string): void {
    this.editor.changeTheme(theme);
  }

  toggleEditor(open?: boolean): void {
    this.editor.toggle(open);
  }

  toggleBoardVisible(visible?: boolean): void {
    this.settings.toggleBoardVisible(visible);
  }

  addUserToGame(): void {
    if (this.settings.isUserInGame) return;
    this.settings.toggleUserInGame(true);

    const userSnake: Snake = {
      id: "user",
      body: [randomPosition(this.board.w, this.board.h)],
      direction: DIRECTIONS.RIGHT,
      nextDirection: DIRECTIONS.RIGHT,
      isCrash: false,
      isAi: false,
      score: 0,
      colors: { head: "#f43f5e", tail: "#fda4af" },
      settings: { ...DEFAULT_SNAKE_SETTINGS },
      meta: { path: [], processed: [] },
    };

    this.snakes = [userSnake, ...this.snakes.filter((s) => s.id !== "user")];
  }

  removeUserFromGame(): void {
    this.settings.toggleUserInGame(false);
    this.snakes = this.snakes.filter((s) => s.id !== "user");
  }

  addSnake(options?: { snakeId?: string; isAi?: boolean }): Snake {
    const isAi = options?.isAi !== undefined ? options.isAi : true;
    const snakeId = options?.snakeId || `ai-${this.snakes.length + 1}`;
    const newSnake = this.createSnake(snakeId, isAi, this.snakes.length);
    this.snakes = [...this.snakes, newSnake];
    return newSnake;
  }

  removeSnake(id: string): void {
    this.snakes = this.snakes.filter((s) => s.id !== id);
    if (id === "user") {
      this.settings.toggleUserInGame(false);
    }
  }

  updateSettingForSnake(snakeId: string, settings: Partial<SnakeSettings>): void {
    this.snakes = this.snakes.map((s) => {
      if (s.id === snakeId) {
        return {
          ...s,
          settings: { ...s.settings, ...settings },
        };
      }
      return s;
    });
  }

  toggleBrick(pos: Coords): void {
    this.board.toggleBrick(pos);
  }

  clearBricks(): void {
    this.board.clearBricks();
  }

  handleKeyDown(key: string): void {
    if (key === " " || key === "Space") {
      this.togglePlayPause();
      return;
    }
    if (key === "r" || key === "R") {
      this.restart();
      return;
    }

    const user = this.snakes.find((s) => s.id === "user" && !s.isCrash);
    if (!user) return;

    let nextDir: DIRECTIONS | null = null;
    if (key === "ArrowUp" || key === "w" || key === "W") nextDir = DIRECTIONS.TOP;
    else if (key === "ArrowDown" || key === "s" || key === "S") nextDir = DIRECTIONS.DOWN;
    else if (key === "ArrowLeft" || key === "a" || key === "A") nextDir = DIRECTIONS.LEFT;
    else if (key === "ArrowRight" || key === "d" || key === "D") nextDir = DIRECTIONS.RIGHT;

    if (!nextDir) return;

    // Prevent immediate 180-degree turn
    if (
      (user.direction === DIRECTIONS.LEFT && nextDir === DIRECTIONS.RIGHT) ||
      (user.direction === DIRECTIONS.RIGHT && nextDir === DIRECTIONS.LEFT) ||
      (user.direction === DIRECTIONS.TOP && nextDir === DIRECTIONS.DOWN) ||
      (user.direction === DIRECTIONS.DOWN && nextDir === DIRECTIONS.TOP)
    ) {
      return;
    }

    user.nextDirection = nextDir;
  }

  /**
   * Main game tick running AI engine, User movement, collisions, and food ingestion.
   */
  tick(): void {
    if (this.snakes.length === 0) return;

    const graph = this.board.buildPopulatedGraph(this.snakes);

    // 1. Compute next positions & directions for all alive snakes
    const updatedSnakes: Snake[] = [];

    for (const snake of this.snakes) {
      if (snake.isCrash) {
        updatedSnakes.push(snake);
        continue;
      }

      const head = snake.body[snake.body.length - 1]!;

      if (snake.isAi) {
        const { nextPosition, nextDirection, meta } = this.engine.computeNextMove({
          snake,
          graph,
          foods: this.board.foods,
          w: this.board.w,
          h: this.board.h,
          isEnabledCollisionDetect: this.settings.isEnabledCollisionDetect,
          customCodeIsEnabled: this.settings.customCodeIsEnabled,
          editorCode: this.editor.code,
          isLoggerEnabled: this.settings.isLoggerEnabled,
        });

        updatedSnakes.push({
          ...snake,
          direction: nextDirection,
          meta,
          nextPositionTemp: nextPosition,
        } as any);
      } else {
        // User snake
        const nextDir = snake.nextDirection;
        const nextPos = getNextPositionByDirection(head, nextDir, this.board.w, this.board.h);
        updatedSnakes.push({
          ...snake,
          direction: nextDir,
          nextPositionTemp: nextPos,
        } as any);
      }
    }

    // 2. Perform movement, collisions, and food eating
    const finalSnakes: Snake[] = [];

    for (let i = 0; i < updatedSnakes.length; i++) {
      const snake = updatedSnakes[i]!;
      if (snake.isCrash) {
        finalSnakes.push(snake);
        continue;
      }

      const nextPos = (snake as any).nextPositionTemp as Coords;
      const [nx, ny] = nextPos;

      // Collision checks (if enabled)
      let crashed = false;
      if (this.settings.isEnabledCollisionDetect) {
        // Hit brick
        const hitBrick = this.board.bricks.some(([bx, by]) => bx === nx && by === ny);
        if (hitBrick) crashed = true;

        // Hit self body
        const hitSelf = snake.body.some(
          ([sx, sy], idx) => idx > 0 && sx === nx && sy === ny,
        );
        if (hitSelf) crashed = true;

        // Hit another snake's body
        for (let j = 0; j < updatedSnakes.length; j++) {
          if (i === j) continue;
          const other = updatedSnakes[j]!;
          if (other.isCrash) continue;
          const hitOther = other.body.some(([ox, oy]) => ox === nx && oy === ny);
          if (hitOther) {
            crashed = true;
            break;
          }
        }
      }

      if (crashed) {
        finalSnakes.push({
          ...snake,
          isCrash: true,
          meta: { path: [], processed: [] },
        });
        continue;
      }

      // Check food consumption
      const ateFood = this.board.consumeFoodAt(nextPos);

      let newBody: Coords[];
      let newScore = snake.score;

      if (ateFood) {
        newScore += 1;
        newBody = [...snake.body, nextPos];
      } else {
        newBody = [...snake.body.slice(1), nextPos];
      }

      finalSnakes.push({
        ...snake,
        body: newBody,
        score: newScore,
      });
    }

    this.snakes = finalSnakes;
    this.tickCount++;

    // Replenish foods on board
    this.board.spawnFoods(this.snakes);
  }

  private createSnake(id: string, isAi: boolean, colorIndex = 0): Snake {
    const startPos = randomPosition(this.board.w, this.board.h);
    return {
      id,
      body: [startPos],
      direction: DIRECTIONS.RIGHT,
      nextDirection: DIRECTIONS.RIGHT,
      isCrash: false,
      isAi,
      score: 0,
      colors: generateColors(colorIndex),
      settings: { ...DEFAULT_SNAKE_SETTINGS },
      meta: { path: [], processed: [] },
    };
  }

  private startTimer(): void {
    this.stopTimer();
    const intervalMs = Math.floor(1000 / this.fps);
    this.timer = setInterval(() => {
      this.tick();
    }, intervalMs);
  }

  private stopTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
