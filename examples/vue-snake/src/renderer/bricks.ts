import type { Coords } from "@separa/example-snake-shared";
import { convertLocalPositionToGlobal, getIndexByPosition } from "@separa/example-snake-shared";
import { assets } from "./loader";
import { renderText } from "./shapes";

export function renderBricks({
  context,
  bricks,
  indexesVisible = false,
  gridW,
  cellSize = 20,
  borderSize = 1,
}: {
  context: CanvasRenderingContext2D;
  bricks: Array<Coords>;
  indexesVisible?: boolean;
  gridW: number;
  cellSize?: number;
  borderSize?: number;
}): void {
  for (const position of bricks) {
    const [x, y] = convertLocalPositionToGlobal(position, cellSize);
    const size = cellSize - borderSize * 2;

    if (assets.loaded && assets.brick.complete) {
      context.drawImage(
        assets.brick,
        x + borderSize * 2,
        y + borderSize * 2,
        size,
        size,
      );
    } else {
      context.fillStyle = "#64748b";
      context.fillRect(x + borderSize * 2, y + borderSize * 2, size, size);
    }

    if (indexesVisible) {
      renderText({
        context,
        text: getIndexByPosition(position, gridW).toString(),
        position,
        cellSize,
      });
    }
  }
}
