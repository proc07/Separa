import { Service } from "@separa/core";
import { getAlgorithmById, heuristics, type Graph, type Vertex } from "../algorithms";
import {
  PLACE_TYPE,
  type Coords,
  type DIRECTIONS,
  type Food,
  type Snake,
} from "../types";
import {
  getDifferenceBetweenPositions,
  getDirectionByPosition,
  getIndexByPosition,
  getNextPositionByDirection,
  getPositionByIndex,
} from "../utils";

export interface ComputeMoveParams {
  snake: Snake;
  graph: Graph;
  foods: Food[];
  w: number;
  h: number;
  isEnabledCollisionDetect: boolean;
  customCodeIsEnabled: boolean;
  editorCode: string;
  isLoggerEnabled: boolean;
}

export interface ComputeMoveResult {
  nextPosition: Coords;
  nextDirection: DIRECTIONS;
  meta: { path: Coords[]; processed: Coords[] };
}

@Service({ scope: "singleton" })
export class AlgorithmEngineService {
  computeNextMove(params: ComputeMoveParams): ComputeMoveResult {
    const {
      snake,
      graph,
      foods,
      w,
      h,
      isEnabledCollisionDetect,
      customCodeIsEnabled,
      editorCode,
      isLoggerEnabled,
    } = params;

    const head = snake.body[snake.body.length - 1]!;
    const headIndex = getIndexByPosition(head, w);

    // Find nearest food
    let targetIndex: number | undefined;
    if (foods.length > 0) {
      let minDist = Infinity;
      for (const [fpos] of foods) {
        const dist = Math.abs(fpos[0] - head[0]) + Math.abs(fpos[1] - head[1]);
        if (dist < minDist) {
          minDist = dist;
          targetIndex = getIndexByPosition(fpos, w);
        }
      }
    }

    let pathIndices: number[] = [];
    let processedIndices: number[] = [];

    const canTraverse = (vertex: Vertex): boolean => {
      if (!isEnabledCollisionDetect) return true;
      return vertex.value.type === PLACE_TYPE.EMPTY || vertex.value.type === PLACE_TYPE.FOOD;
    };

    if (customCodeIsEnabled && editorCode.trim()) {
      try {
        const utils = {
          getPositionByIndex: (idx: number) => getPositionByIndex(idx, w),
          getIndexByPosition: (pos: Coords) => getIndexByPosition(pos, w),
        };
        const algoParams = {
          startIndex: headIndex,
          endIndex: targetIndex ?? headIndex,
          graph,
          canTraverse,
          getCostByIndex: () => 1,
          withLogger: isLoggerEnabled,
          heuristic: heuristics[0]!.fn,
        };
        const runner = new Function("params", "utils", editorCode);
        const res = runner(algoParams, utils);
        if (res && Array.isArray(res.path)) pathIndices = res.path;
        if (res && Array.isArray(res.processed)) processedIndices = res.processed;
      } catch (err) {
        if (isLoggerEnabled) {
          // eslint-disable-next-line no-console
          console.error("Custom algorithm execution error:", err);
        }
      }
    } else if (targetIndex !== undefined) {
      const traverseAlgo = getAlgorithmById(snake.settings.activeAlgorithm);
      const selectedHeuristic =
        heuristics.find((item) => item.id === snake.settings.activeHeuristic)?.fn || heuristics[0]!.fn;

      const result = traverseAlgo({
        startIndex: headIndex,
        endIndex: targetIndex,
        graph,
        canTraverse,
        getCostByIndex: () => 1,
        heuristic: selectedHeuristic,
        withLogger: isLoggerEnabled,
      });

      pathIndices = result.path;
      processedIndices = result.processed;
    }

    const pathPositions = pathIndices.map((idx) => getPositionByIndex(idx, w));
    const processedPositions = processedIndices.map((idx) => getPositionByIndex(idx, w));

    let nextPosition: Coords = getNextPositionByDirection(head, snake.direction, w, h);
    if (pathPositions.length > 0) {
      nextPosition = pathPositions[0]!;
    } else {
      const vertex = graph.getVertex(headIndex);
      let foundNeighbor = false;
      if (vertex) {
        const safeNeighbors = vertex.neigbors.filter((i) => {
          const v = graph.getVertex(i);
          return v ? canTraverse(v) : false;
        });
        if (safeNeighbors.length > 0) {
          nextPosition = getPositionByIndex(safeNeighbors[0]!, w);
          foundNeighbor = true;
        }
      }
      if (!foundNeighbor) {
        nextPosition = getNextPositionByDirection(head, snake.direction, w, h);
      }
    }

    const diff = getDifferenceBetweenPositions(head, nextPosition);
    const nextDirection = diff === 1 ? getDirectionByPosition(head, nextPosition) : snake.direction;

    return {
      nextPosition,
      nextDirection,
      meta: {
        path: snake.settings.showAIPathToTarget ? pathPositions : [],
        processed: snake.settings.showProcessedCells ? processedPositions : [],
      },
    };
  }
}
