import { createOperationLogger } from "../utils";
import type { Graph, Vertex } from "./graph";
import { restorePathFromMap } from "./restore-path";
import type { TraverseAlgorithmProps, TraverseAlgorithmResult } from "../types";

export function breadthFirstSearch({
  startIndex,
  endIndex,
  graph,
  canTraverse,
  withLogger = false,
}: TraverseAlgorithmProps<Graph, Vertex>): TraverseAlgorithmResult {
  const queue = [startIndex];
  const processed = new Map([[startIndex, true]]);
  const parent = new Map<number, number>();

  let path: Array<number> = [];
  let isTraverse = false;

  const logger = createOperationLogger("breadthFirstSearch");

  while (!isTraverse && queue.length > 0) {
    const currentIndex = queue.shift()!;
    const vertex = graph.getVertex(currentIndex);

    for (let i = 0; vertex && i < vertex.neigbors.length; i++) {
      const nextIndex = vertex.neigbors[i]!;
      const nextVertex = graph.getVertex(nextIndex);

      if (nextVertex && canTraverse(nextVertex) && !processed.has(nextIndex)) {
        queue.push(nextIndex);
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
