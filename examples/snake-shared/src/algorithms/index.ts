import { aStar } from "./a-star";
import { breadthFirstSearch } from "./breadth-first-search";
import { depthFirstSearch } from "./depth-first-search";
import { dijkstra } from "./dijkstra";
import { greedy } from "./greedy";
import type { AlgorithmItem, TraverseAlgorithmFunction } from "../types";
import type { Graph, Vertex } from "./graph";

export * from "./graph";
export * from "./heuristic";
export * from "./restore-path";
export * from "./breadth-first-search";
export * from "./a-star";
export * from "./dijkstra";
export * from "./greedy";
export * from "./depth-first-search";

export const algorithms: AlgorithmItem[] = [
  {
    id: "breadth-first-search",
    name: "Breadth first search",
  },
  {
    id: "a-star",
    name: "A-Star",
    hasHeuristic: true,
  },
  {
    id: "depth-first-search",
    name: "Depth first search",
  },
  {
    id: "dijkstra",
    name: "Dijkstra",
  },
  {
    id: "greedy",
    name: "Greedy",
    hasHeuristic: true,
  },
];

export function getAlgorithmById(id: string): TraverseAlgorithmFunction<Graph, Vertex> {
  switch (id) {
    case "a-star":
      return aStar;
    case "breadth-first-search":
      return breadthFirstSearch;
    case "depth-first-search":
      return depthFirstSearch;
    case "dijkstra":
      return dijkstra;
    case "greedy":
      return greedy;
    default:
      return breadthFirstSearch;
  }
}
