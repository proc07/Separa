import { Service } from "@separa/core";
import { DEFAULT_CONFIG } from "./constants";
import { generatePuzzle } from "./generator";
import { findBestHint, hasAnyLegalMove, solvePuzzle } from "./solver";
import type { ColorId, GameConfig, HintMove, MoveHistoryItem, PickedBall } from "./types";

/**
 * Ballcraft 游戏核心业务服务。
 * 纯 TypeScript 编写，完全与 UI 框架解耦，通过 @separa/core 注入并增强响应式。
 */
@Service({ scope: "singleton" })
export class BallcraftService {
  columns: ColorId[][] = [];
  pickedBall: PickedBall | null = null;
  moves = 0;
  history: MoveHistoryItem[] = [];
  historyPos = -1;
  showGameOver = false;
  showDeadlock = false;
  hint: HintMove | null = null;
  hintMessage: string | null = null;
  extraTubesCount = 0;
  config: GameConfig = { ...DEFAULT_CONFIG };

  /** 服务初始化时自动生成新对局 */
  onInit(): void {
    this.newGame();
  }

  /** 开始新游戏 */
  newGame(): void {
    this.config = { ...DEFAULT_CONFIG };
    this.columns = generatePuzzle(this.config);
    this.pickedBall = null;
    this.moves = 0;
    this.history = [];
    this.historyPos = -1;
    this.showGameOver = false;
    this.showDeadlock = false;
    this.hint = null;
    this.hintMessage = null;
    this.extraTubesCount = 0;
  }

  /**
   * 获取包含当前手上球在内的完整列状态快照
   */
  get currentFullColumns(): ColorId[][] {
    if (!this.pickedBall) return this.columns;
    const { from, color } = this.pickedBall;
    return this.columns.map((col, idx) => (idx === from ? [...col, color] : col));
  }

  /**
   * 点击/选择某列球管
   */
  selectColumn(columnIndex: number): void {
    const col = this.columns[columnIndex];
    if (!col) return;

    // 清除当前的提示信息
    if (this.hint || this.hintMessage) {
      this.hint = null;
      this.hintMessage = null;
    }

    // 1. 当前未选中球：若该列非空，则取出顶部的球
    if (!this.pickedBall) {
      if (col.length === 0) return;
      const newColumns = this.columns.map((c, idx) => (idx === columnIndex ? [...c] : c));
      const poppedColor = newColumns[columnIndex]!.pop()!;
      this.columns = newColumns;
      this.pickedBall = { from: columnIndex, color: poppedColor };
      return;
    }

    const { from, color } = this.pickedBall;

    // 2. 点击原列：放回（取消选中）
    if (columnIndex === from) {
      const newColumns = this.columns.map((c, idx) => (idx === columnIndex ? [...c] : c));
      newColumns[columnIndex]!.push(color);
      this.columns = newColumns;
      this.pickedBall = null;
      return;
    }

    // 3. 点击其他列：检查是否为合法目标
    const isValidTarget =
      col.length === 0 ||
      (col.length < this.config.levels && col[col.length - 1] === color);

    if (isValidTarget) {
      // 合法放置：放入目标列，记录历史，增加步数
      const newColumns = this.columns.map((c, idx) => (idx === columnIndex ? [...c] : c));
      newColumns[columnIndex]!.push(color);
      this.columns = newColumns;

      // 截断历史并追加新记录
      this.history = [
        ...this.history.slice(0, this.historyPos + 1),
        { from, to: columnIndex, color },
      ];
      this.historyPos += 1;
      this.moves += 1;
      this.pickedBall = null;

      // 检查是否胜利或死局
      if (this.isGameOver) {
        this.showGameOver = true;
        this.showDeadlock = false;
      } else if (this.isDeadlock) {
        this.showDeadlock = true;
      }
    } else {
      // 若目标列不合法但有球，则将原球放回并改选当前列顶部的球（友好重选）
      if (col.length > 0) {
        const newColumns = this.columns.map((c, idx) => {
          if (idx === from) return [...c, color];
          if (idx === columnIndex) return [...c];
          return c;
        });
        const poppedColor = newColumns[columnIndex]!.pop()!;
        this.columns = newColumns;
        this.pickedBall = { from: columnIndex, color: poppedColor };
      } else {
        // 空列但不可放置（理论上空列总能放置，防御性放回）
        const newColumns = this.columns.map((c, idx) => (idx === from ? [...c, color] : c));
        this.columns = newColumns;
        this.pickedBall = null;
      }
    }
  }

  /** 撤销一步 */
  undo(): void {
    // 清除当前提示
    this.hint = null;
    this.hintMessage = null;

    // 若当前手上有球，先放回
    if (this.pickedBall) {
      const { from, color } = this.pickedBall;
      const newColumns = this.columns.map((c, idx) => (idx === from ? [...c, color] : c));
      this.columns = newColumns;
      this.pickedBall = null;
    }

    if (!this.canUndo) return;

    const item = this.history[this.historyPos]!;
    const newColumns = this.columns.map((c, idx) => {
      if (idx === item.to) {
        const next = [...c];
        next.pop();
        return next;
      }
      if (idx === item.from) {
        return [...c, item.color];
      }
      return c;
    });

    this.columns = newColumns;
    this.historyPos -= 1;
    this.moves += 1;
    this.showGameOver = false;

    // 撤销后如果解开了死局，关闭死局弹窗
    if (!this.isDeadlock) {
      this.showDeadlock = false;
    }
  }

  /** 重做一步 */
  redo(): void {
    this.hint = null;
    this.hintMessage = null;

    if (this.pickedBall) {
      const { from, color } = this.pickedBall;
      const newColumns = this.columns.map((c, idx) => (idx === from ? [...c, color] : c));
      this.columns = newColumns;
      this.pickedBall = null;
    }

    if (!this.canRedo) return;

    const item = this.history[this.historyPos + 1]!;
    const newColumns = this.columns.map((c, idx) => {
      if (idx === item.from) {
        const next = [...c];
        next.pop();
        return next;
      }
      if (idx === item.to) {
        return [...c, item.color];
      }
      return c;
    });

    this.columns = newColumns;
    this.historyPos += 1;
    this.moves += 1;

    if (this.isGameOver) {
      this.showGameOver = true;
      this.showDeadlock = false;
    } else if (this.isDeadlock) {
      this.showDeadlock = true;
    }
  }

  /**
   * 请求下一步提示
   */
  requestHint(): HintMove | null {
    if (this.isGameOver) return null;

    // 若手上有球先放回
    if (this.pickedBall) {
      const { from, color } = this.pickedBall;
      this.columns = this.columns.map((c, idx) => (idx === from ? [...c, color] : c));
      this.pickedBall = null;
    }

    const move = findBestHint(this.columns, this.config.levels);
    if (move) {
      this.hint = move;
      this.hintMessage = "💡 已高亮显示推荐步骤（从发光源管移至目标管）";
    } else {
      this.hint = null;
      this.hintMessage = "⚠️ 当前局面无法推导通关路径，建议点击撤销回退或添加辅助管！";
    }
    return move;
  }

  /** 清除提示状态 */
  clearHint(): void {
    this.hint = null;
    this.hintMessage = null;
  }

  /**
   * 添加 1 根空辅助管 (上限 2 根)
   */
  addExtraTube(): boolean {
    if (!this.canAddTube) return false;

    // 若手上有球先放回
    if (this.pickedBall) {
      const { from, color } = this.pickedBall;
      this.columns = this.columns.map((c, idx) => (idx === from ? [...c, color] : c));
      this.pickedBall = null;
    }

    this.columns = [...this.columns, []];
    this.extraTubesCount += 1;
    this.config = {
      ...this.config,
      cols: this.columns.length,
      emptyCols: this.config.emptyCols + 1,
    };
    this.showDeadlock = false;
    this.hint = null;
    this.hintMessage = null;
    return true;
  }

  closeGameOver(): void {
    this.showGameOver = false;
  }

  closeDeadlockModal(): void {
    this.showDeadlock = false;
  }

  /** 计算当前哪些列可以接收手中选中的球 */
  get validTargetIndices(): number[] {
    if (!this.pickedBall) return [];
    const { from, color } = this.pickedBall;

    return this.columns
      .map((col, idx) => {
        if (idx === from) return -1;
        if (col.length === 0) return idx;
        if (col.length < this.config.levels && col[col.length - 1] === color) return idx;
        return -1;
      })
      .filter((idx) => idx !== -1);
  }

  /** 判断是否通关 */
  get isGameOver(): boolean {
    if (this.moves === 0) return false;
    const nonEmptyCols = this.columns.filter((c) => c.length > 0);
    const expectedNonEmpty = this.config.cols - this.config.emptyCols;

    if (nonEmptyCols.length !== expectedNonEmpty) return false;

    return nonEmptyCols.every(
      (c) => c.length === this.config.levels && c.every((color) => color === c[0]),
    );
  }

  /** 判断是否陷入死局 */
  get isDeadlock(): boolean {
    if (this.moves === 0 || this.isGameOver) return false;
    return !hasAnyLegalMove(this.currentFullColumns, this.config.levels);
  }

  /** 是否可添加辅助管 */
  get canAddTube(): boolean {
    return this.extraTubesCount < 2 && !this.isGameOver;
  }

  get canUndo(): boolean {
    return this.historyPos >= 0;
  }

  get canRedo(): boolean {
    return this.historyPos < this.history.length - 1;
  }

  get fromStartMoves(): number {
    return this.historyPos + 1;
  }
}
