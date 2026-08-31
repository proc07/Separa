/** 单个球的颜色 ID (0 ~ 11) */
export type ColorId = number;

/** 被选中的悬浮球信息 */
export interface PickedBall {
  readonly from: number;
  readonly color: ColorId;
}

/** 移动历史记录项 */
export interface MoveHistoryItem {
  readonly from: number;
  readonly to: number;
  readonly color: ColorId;
}

/** 提示移动推荐项 */
export interface HintMove {
  readonly from: number;
  readonly to: number;
}

/** 游戏配置 */
export interface GameConfig {
  readonly cols: number;
  readonly emptyCols: number;
  readonly levels: number;
  readonly steps: number;
}

