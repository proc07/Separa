import { createOperationLogger, getPositionByIndex } from "../utils";
import type { Graph, Vertex } from "./graph";
import { restorePathFromMap } from "./restore-path";
import { manhattanDistance } from "./heuristic";
import type { TraverseAlgorithmProps, TraverseAlgorithmResult } from "../types";

export function greedy({
  startIndex,
  endIndex,
  graph,
  canTraverse,
  withLogger = false,
  heuristic = manhattanDistance,
}: TraverseAlgorithmProps<Graph, Vertex>): TraverseAlgorithmResult {
  const queue: Array<[number, number]> = [[startIndex, 0]];
  const processed = new Map<number, boolean>([[startIndex, true]]);
  const parent = new Map<number, number>();
  const goal = getPositionByIndex(endIndex, graph.w);

  let isTraverse = false;
  let path: Array<number> = [];

  const logger = createOperationLogger("greedy");

  while (!isTraverse && queue.length > 0) {
    queue.sort((a, b) => a[1] - b[1]);
    const [currentIndex] = queue.shift()!;
    const vertex = graph.getVertex(currentIndex);

    for (let i = 0; vertex && i < vertex.neigbors.length; i++) {
      const nextIndex = vertex.neigbors[i]!;
      const nextVertex = graph.getVertex(nextIndex);

      if (nextVertex && canTraverse(nextVertex) && !processed.has(nextIndex)) {
        const nextCost = heuristic({
          p1: goal,
          p: getPositionByIndex(nextIndex, graph.w),
        });

        queue.push([nextIndex, nextCost]);
        processed.set(nextIndex, true);
        parent.set(nextIndex, currentIndex);

        if (endIndex === nextIndex) {
          isTraverse = true;
          break;
        }

        logger.increment();
      }
    }
  }

  if (isTraverse) {
    path = restorePathFromMap({ end: endIndex, start: startIndex, parent });
  }

  if (withLogger) {
    logger.log();
  }

  return {
    path,
    processed: [...processed.keys()],
  };
}
