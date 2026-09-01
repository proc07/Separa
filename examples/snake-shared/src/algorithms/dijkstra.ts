import { createOperationLogger } from "../utils";
import type { Graph, Vertex } from "./graph";
import { restorePathFromMap } from "./restore-path";
import type { TraverseAlgorithmProps, TraverseAlgorithmResult } from "../types";

export function dijkstra({
  startIndex,
  endIndex,
  graph,
  canTraverse,
  getCostByIndex = () => 1,
  withLogger = false,
}: TraverseAlgorithmProps<Graph, Vertex>): TraverseAlgorithmResult {
  const queue: Array<[number, number]> = [[startIndex, 0]];
  const processed = new Map<number, boolean>([[startIndex, true]]);
  const parent = new Map<number, number>();
  const costFar = new Map<number, number>([[startIndex, 0]]);

  let isTraverse = false;
  let path: Array<number> = [];

  const logger = createOperationLogger("dijkstra");

  while (!isTraverse && queue.length > 0) {
    queue.sort((a, b) => a[1] - b[1]);
    const [currentIndex] = queue.shift()!;
    const vertex = graph.getVertex(currentIndex);

    for (let i = 0; vertex && i < vertex.neigbors.length; i++) {
      const nextIndex = vertex.neigbors[i]!;
      const nextVertex = graph.getVertex(nextIndex);

      if (nextVertex && canTraverse(nextVertex) && !processed.has(nextIndex)) {
        const currentCost = costFar.get(currentIndex) ?? 0;
        const nextCost = currentCost + getCostByIndex(nextVertex);
        const existingCost = costFar.get(nextIndex);
        const nextCostIsLower = existingCost === undefined || nextCost <= existingCost;

        if (nextCostIsLower) {
          queue.push([nextIndex, nextCost]);
          processed.set(nextIndex, true);
          costFar.set(nextIndex, nextCost);
          parent.set(nextIndex, currentIndex);

          if (endIndex === nextIndex) {
            isTraverse = true;
            break;
          }

          logger.increment();
        }
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
