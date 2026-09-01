import { Service } from "@separa/core";

@Service({ scope: "singleton" })
export class SettingsService {
  fps = 15;
  isEnabledCollisionDetect = true;
  isUserInGame = false;
  indexesVisible = false;
  needFillEmptyGraphsCells = false;
  isLoggerEnabled = false;
  customCodeIsEnabled = false;
  isVisibleBoard = true;

  changeFps(newFps: number): void {
    this.fps = Math.max(1, Math.min(120, Number(newFps) || 15));
  }

  toggleCollision(): void {
    this.isEnabledCollisionDetect = !this.isEnabledCollisionDetect;
  }

  toggleUserInGame(state?: boolean): void {
    this.isUserInGame = state !== undefined ? state : !this.isUserInGame;
  }

  toggleIndexesVisible(): void {
    this.indexesVisible = !this.indexesVisible;
  }

  toggleFillEmptyCells(): void {
    this.needFillEmptyGraphsCells = !this.needFillEmptyGraphsCells;
  }

  toggleLogger(): void {
    this.isLoggerEnabled = !this.isLoggerEnabled;
  }

  toggleCustomCode(): void {
    this.customCodeIsEnabled = !this.customCodeIsEnabled;
  }

  toggleBoardVisible(visible?: boolean): void {
    this.isVisibleBoard = visible !== undefined ? visible : !this.isVisibleBoard;
  }
}
