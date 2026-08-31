import type { GameConfig } from "./types";

export const DEFAULT_CONFIG: GameConfig = {
  cols: 14,
  emptyCols: 2,
  levels: 4,
  steps: 1500,
};

/** 12 种球体的主题调色板 */
export const PALETTE = [
  "#e74c3c", // 0: 红色
  "#27ae60", // 1: 绿色
  "#2980b9", // 2: 蓝色
  "#e67e22", // 3: 橙色
  "#1abc9c", // 4: 青色
  "#fd79a8", // 5: 粉色
  "#a8e6cf", // 6: 浅绿
  "#2d3436", // 7: 黑色
  "#8d6e63", // 8: 棕色
  "#f1c40f", // 9: 黄色
  "#7f8c8d", // 10: 灰色
  "#8e44ad", // 11: 紫色
] as const;
