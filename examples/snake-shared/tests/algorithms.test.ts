import { describe, expect, it } from "vitest";
import {
  aStar,
  breadthFirstSearch,
  depthFirstSearch,
  dijkstra,
  greedy,
  Graph,
  heuristics,
  manhattanDistance,
  PLACE_TYPE,
  getIndexByPosition,
} from "../src";

describe("Dmitry Snake AI Algorithms", () => {
  const w = 10;
  const h = 10;

  it("calculates heuristics correctly", () => {
    expect(manhattanDistance({ p: [0, 0], p1: [3, 4] })).toBe(7);
  });

  it("builds Graph with correct toroidal neighbors", () => {
    const graph = new Graph({ w, h, withBounds: false });
    const topLeft = graph.getVertex(0);
    expect(topLeft).toBeDefined();
    // 0 has right (1), down (10), top (wrapped to 90), left (wrapped to 9)
    expect(topLeft!.neigbors).toContain(1);
    expect(topLeft!.neigbors).toContain(10);
    expect(topLeft!.neigbors).toContain(90);
    expect(topLeft!.neigbors).toContain(9);
  });

  const algorithmFns = [
    { name: "breadthFirstSearch", fn: breadthFirstSearch },
    { name: "aStar", fn: aStar },
    { name: "dijkstra", fn: dijkstra },
    { name: "greedy", fn: greedy },
    { name: "depthFirstSearch", fn: depthFirstSearch },
  ];

  for (const { name, fn } of algorithmFns) {
    it(`${name} finds path from start to goal in open graph`, () => {
      const graph = new Graph({ w, h, withBounds: false });
      const startIndex = getIndexByPosition([1, 1], w);
      const endIndex = getIndexByPosition([4, 5], w);

      const result = fn({
        startIndex,
        endIndex,
        graph,
        canTraverse: () => true,
        getCostByIndex: () => 1,
        heuristic: heuristics[0]!.fn,
      });

      expect(result.path.length).toBeGreaterThan(0);
      expect(result.path[result.path.length - 1]).toBe(endIndex);
      expect(result.processed.length).toBeGreaterThan(0);
    });
  }

  it("navigates around a brick obstacle with aStar", () => {
    const graph = new Graph({ w, h, withBounds: false });
    const startIndex = getIndexByPosition([0, 2], w);
    const endIndex = getIndexByPosition([4, 2], w);

    // Place vertical wall of bricks at x=2, y=0..3
    for (let y = 0; y <= 3; y++) {
      graph.setValueByIndex(getIndexByPosition([2, y], w), { type: PLACE_TYPE.BRICK });
    }

    const canTraverse = (vertex: any) => vertex.value.type === PLACE_TYPE.EMPTY;

    const result = aStar({
      startIndex,
      endIndex,
      graph,
      canTraverse,
      getCostByIndex: () => 1,
      heuristic: heuristics[0]!.fn,
    });

    expect(result.path.length).toBeGreaterThan(0);
    expect(result.path[result.path.length - 1]).toBe(endIndex);

    // Ensure path does not step on any BRICK vertex
    for (const step of result.path) {
      expect(graph.getVertex(step)?.value.type).not.toBe(PLACE_TYPE.BRICK);
    }
  });
});
