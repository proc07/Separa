import { colorScheme } from "@separa/example-snake-shared";

export function buildGrid(
  context: CanvasRenderingContext2D,
  w: number,
  h: number,
  cellSize = 20,
  borderSize = 1,
): {
  grid: Path2D;
  applyStyles: () => void;
} {
  const grid = new Path2D();
  const globalW = w * cellSize;
  const globalH = h * cellSize;

  for (let i = 0; i <= w; i++) {
    grid.moveTo(i * cellSize + borderSize, 0);
    grid.lineTo(i * cellSize + borderSize, globalH);
  }

  for (let i = 0; i <= h; i++) {
    grid.moveTo(0, i * cellSize + borderSize);
    grid.lineTo(globalW, i * cellSize + borderSize);
  }

  return {
    grid,
    applyStyles: () => {
      context.lineWidth = borderSize;
      context.strokeStyle = colorScheme.borderColor;
    },
  };
}
