export { BallcraftService } from "./ballcraft.service";
export { DEFAULT_CONFIG, PALETTE } from "./constants";
export { generatePuzzle } from "./generator";
export {
  solvePuzzle,
  findBestHint,
  hasAnyLegalMove,
  isBoardSolved,
  isColumnComplete,
  isColumnMonochromatic,
} from "./solver";
export type { ColorId, GameConfig, HintMove, MoveHistoryItem, PickedBall } from "./types";
