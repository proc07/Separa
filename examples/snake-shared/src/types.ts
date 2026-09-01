export type Coords = [number, number];

export type Food = [Coords, string]; // [position, foodId]

export enum DIRECTIONS {
  LEFT = "LEFT",
  RIGHT = "RIGHT",
  TOP = "TOP",
  DOWN = "DOWN",
}

export enum GAME_STATE {
  IS_PLAY = 0,
  IS_PAUSE = 1,
}

export enum PLACE_TYPE {
  EMPTY = 0,
  GAME_OBJECT = 1,
  BRICK = 2,
  FOOD = 3,
}

export type HeuristicProps = {
  p: Coords;
  p1: Coords;
};

export type HeuristicFunction = (props: HeuristicProps) => number;

export type TraverseAlgorithmProps<G, V> = {
  startIndex: number;
  endIndex: number;
  graph: G;
  canTraverse: (arg0: V) => boolean;
  getCostByIndex: (arg0: V) => number;
  withLogger?: boolean;
  heuristic?: HeuristicFunction;
};

export type TraverseAlgorithmResult = {
  path: Array<number>;
  processed: Array<number>;
};

export type TraverseAlgorithmFunction<G, V> = (
  props: TraverseAlgorithmProps<G, V>,
) => TraverseAlgorithmResult;

export type AlgorithmItem = {
  id: string;
  name: string;
  hasHeuristic?: boolean;
};

export type HeuristicItem = {
  id: string;
  name: string;
};

export type SnakeColors = {
  head: string;
  tail: string;
};

export type SnakeSettings = {
  activeAlgorithm: string;
  activeHeuristic: string;
  showAIPathToTarget: boolean;
  showProcessedCells: boolean;
};

export type SnakeMeta = {
  path: Coords[];
  processed: Coords[];
};

export type Snake = {
  id: string;
  body: Coords[];
  direction: DIRECTIONS;
  nextDirection: DIRECTIONS;
  isCrash: boolean;
  isAi: boolean;
  score: number;
  colors: SnakeColors;
  settings: SnakeSettings;
  meta: SnakeMeta;
};

export const colorScheme = {
  emptyCells: "#0080007d",
  borderColor: "rgba(0, 0, 0, 0.2)",
  foodColor: "rgb(238, 68, 0)",
};
