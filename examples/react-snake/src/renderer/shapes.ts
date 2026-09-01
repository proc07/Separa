import type { Coords } from "@separa/example-snake-shared";
import { convertLocalPositionToGlobal, getDifferenceBetweenPositions } from "@separa/example-snake-shared";

export function drawSquare({
  color = "rgb(152, 251, 152)",
  position,
  context,
  cellSize = 20,
  borderSize = 1,
}: {
  color?: string;
  position: Coords;
  context: CanvasRenderingContext2D;
  cellSize?: number;
  borderSize?: number;
}): void {
  const [x, y] = convertLocalPositionToGlobal(position, cellSize);
  const size = cellSize - borderSize * 2;

  context.fillStyle = color;
  context.fillRect(x + borderSize * 2, y + borderSize * 2, size, size);
}

export function renderText({
  text,
  position,
  context,
  cellSize = 20,
}: {
  text: string;
  position: Coords;
  context: CanvasRenderingContext2D;
  cellSize?: number;
}): void {
  const { width } = context.measureText(text);
  const [x, y] = convertLocalPositionToGlobal(position, cellSize);

  context.fillStyle = "#94a3b8";
  context.font = "10px monospace";
  context.fillText(text, x + (cellSize - width) / 2, y + cellSize / 2 + 3);
}

function getNextPositionIfIsNear(pos1: Coords, pos2: Coords): Coords {
  const diff = getDifferenceBetweenPositions(pos1, pos2);
  if (diff !== 1) {
    return pos1;
  }
  return pos2;
}

export function renderPath({
  context,
  path = [],
  color = "rgb(255, 255, 0)",
  cellSize = 20,
}: {
  context: CanvasRenderingContext2D;
  path: Array<Coords>;
  color?: string;
  cellSize?: number;
}): void {
  if (path.length <= 1) return;
  for (let i = 0; i < path.length - 1; i++) {
    const [x, y] = convertLocalPositionToGlobal(path[i]!, cellSize);
    const [x1, y1] = convertLocalPositionToGlobal(
      getNextPositionIfIsNear(path[i]!, path[i + 1]!),
      cellSize,
    );

    context.beginPath();
    context.strokeStyle = color;
    context.lineWidth = 2;
    context.moveTo(x + cellSize / 2, y + cellSize / 2);
    context.lineTo(x1 + cellSize / 2, y1 + cellSize / 2);
    context.stroke();
  }
}

export function renderProcessed({
  context,
  processed = [],
  color = "rgba(255, 255, 0, 0.25)",
  cellSize = 20,
  borderSize = 1,
}: {
  context: CanvasRenderingContext2D;
  processed: Array<Coords>;
  color?: string;
  cellSize?: number;
  borderSize?: number;
}): void {
  for (const position of processed) {
    drawSquare({ color, context, position, cellSize, borderSize });
  }
}
