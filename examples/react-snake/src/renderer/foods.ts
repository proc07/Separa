import type { Food } from "@separa/example-snake-shared";
import { convertLocalPositionToGlobal, getIndexByPosition } from "@separa/example-snake-shared";
import { assets } from "./loader";
import { renderText } from "./shapes";

export function renderFoods({
  context,
  foods,
  indexesVisible = false,
  gridW,
  cellSize = 20,
  borderSize = 1,
}: {
  context: CanvasRenderingContext2D;
  foods: Array<Food>;
  indexesVisible?: boolean;
  gridW: number;
  cellSize?: number;
  borderSize?: number;
}): void {
  for (const [position] of foods) {
    const [x, y] = convertLocalPositionToGlobal(position, cellSize);
    const size = cellSize - borderSize * 2;

    if (assets.loaded && assets.apple.complete) {
      context.drawImage(
        assets.apple,
        x + borderSize * 2,
        y + borderSize * 2,
        size,
        size,
      );
    } else {
      context.fillStyle = "#ef4444";
      context.beginPath();
      context.arc(x + cellSize / 2, y + cellSize / 2, size / 2.5, 0, Math.PI * 2);
      context.fill();
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
