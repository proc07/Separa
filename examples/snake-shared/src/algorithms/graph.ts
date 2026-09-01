import { PLACE_TYPE } from "../types";

export type VertexValue =
  | { type: PLACE_TYPE.EMPTY }
  | { type: PLACE_TYPE.BRICK }
  | { type: PLACE_TYPE.GAME_OBJECT; snakeId: string }
  | { type: PLACE_TYPE.FOOD; foodId: string };

export type Vertex = {
  neigbors: number[];
  value: VertexValue;
  index: number;
};

function filterNeigbors(neigbors: Array<number | undefined>): number[] {
  return neigbors.filter((i): i is number => typeof i !== "undefined");
}

export class Graph {
  w: number;
  h: number;
  withBounds: boolean;
  emptyGraph: Vertex[];
  graph: Vertex[];

  constructor({
    w,
    h,
    withBounds = false,
    emptyGraph,
    graph,
  }: {
    w: number;
    h: number;
    withBounds?: boolean;
    emptyGraph?: Vertex[];
    graph?: Vertex[];
  }) {
    this.w = w;
    this.h = h;
    this.withBounds = withBounds;
    this.emptyGraph =
      typeof emptyGraph !== "undefined"
        ? emptyGraph
        : Array.from({ length: w * h }, (_, index) => ({
            neigbors: filterNeigbors([
              this.getTopNeigbour(index),
              this.getLeftNeigbour(index),
              this.getDownNeigbour(index),
              this.getRightNeigbour(index),
            ]),
            value: { type: PLACE_TYPE.EMPTY },
            index,
          }));
    this.graph = typeof graph !== "undefined" ? graph : this.emptyGraph.slice();
  }

  static extend(graph: Graph): Graph {
    return new Graph({
      w: graph.w,
      h: graph.h,
      withBounds: graph.withBounds,
      graph: graph.graph.slice(),
      emptyGraph: graph.emptyGraph.slice(),
    });
  }

  private getTopNeigbour(index: number): number | undefined {
    const hasTopNeighbour = Math.floor(index / this.w) > 0;
    if (hasTopNeighbour) {
      return index - this.w;
    }
    return this.withBounds ? undefined : this.w * (this.h - 1) + (index % this.w);
  }

  private getLeftNeigbour(index: number): number | undefined {
    const hasLeftNeighbour = index % this.w > 0;
    if (hasLeftNeighbour) {
      return index - 1;
    }
    return this.withBounds ? undefined : index + (this.w - 1);
  }

  private getRightNeigbour(index: number): number | undefined {
    const hasRightNeighbour = index % this.w < this.w - 1;
    if (hasRightNeighbour) {
      return index + 1;
    }
    return this.withBounds ? undefined : index - (this.w - 1);
  }

  private getDownNeigbour(index: number): number | undefined {
    const hasDownNeighbour = Math.floor(index / this.w) < this.h - 1;
    if (hasDownNeighbour) {
      return index + this.w;
    }
    return this.withBounds ? undefined : index % this.w;
  }

  getVertex(index: number | undefined): Vertex | undefined {
    if (typeof index !== "undefined") {
      return this.graph[index];
    }
    return undefined;
  }

  setValueByIndex(index: number, value: VertexValue): void {
    if (this.graph[index]) {
      this.graph[index] = { ...this.graph[index]!, value };
    }
  }

  getVertexes(): Vertex[] {
    return this.graph;
  }

  clear(): void {
    this.graph = this.emptyGraph.slice();
  }
}
