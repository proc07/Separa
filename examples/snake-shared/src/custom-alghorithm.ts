export const DEFAULT_EDITOR_CODE = `
/* Instruction

Algorithm is called on every tick.
Input and output take specific types.
Write the body of the function directly.

declare type TraverseAlgorithmProps<G, V> = {
  startIndex: number // Snake head Coords index
  endIndex: number // Target closest food index
  graph: G
  canTraverse: (arg0: V) => boolean
  getCostByIndex: (arg0: V) => number
  withLogger: boolean
  heuristic: HeuristicFunction
} as params in global

Utilities:
utils = {
  getPositionByIndex: (index: number) => [x, y],
  getIndexByPosition: (coords: [x, y]) => number
}

Result:
return {
  path: Array<number>,
  processed: Array<number>
}
*/

const { startIndex, endIndex, graph } = params;
const { getPositionByIndex } = utils;

function manhattanDistance({ p: [x, y], p1: [x1, y1] }) {
  return Math.abs(x1 - x) + Math.abs(y1 - y);
}

let path = [];
let processed = [];

const vertex = graph.getVertex(startIndex);

if (vertex) {
  const positions = vertex.neigbors
    .filter((index) => {
      const nvertex = graph.getVertex(index);
      return nvertex && (nvertex.value.type === 0 || nvertex.value.type === 3);
    })
    .map((index) => {
      return [
        index,
        manhattanDistance({ p: getPositionByIndex(index), p1: getPositionByIndex(endIndex) }),
      ];
    })
    .sort((a, b) => a[1] - b[1]);

  path = positions[0] ? [positions[0][0]] : path;
  processed = vertex.neigbors;
}

return {
  path,
  processed,
};
`;

export const EDITOR_THEMES = [
  "monokai",
  "github",
  "tomorrow",
  "kuroir",
  "twilight",
  "xcode",
  "textmate",
  "solarized_dark",
  "terminal",
];
