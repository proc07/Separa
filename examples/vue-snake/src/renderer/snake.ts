import type { Snake } from "@separa/example-snake-shared";
import { getIndexByPosition } from "@separa/example-snake-shared";
import { drawSquare, renderText } from "./shapes";

export function renderSnake({
  context,
  snake,
  indexesVisible = false,
  gridW,
  cellSize = 20,
  borderSize = 1,
}: {
  context: CanvasRenderingContext2D;
  snake: Snake;
  indexesVisible?: boolean;
  gridW: number;
  cellSize?: number;
  borderSize?: number;
}): void {
  for (let i = 0; i < snake.body.length; i++) {
    const isHead = i === snake.body.length - 1;
    const color = isHead ? snake.colors.head : snake.colors.tail;
    const crashedColor = isHead ? "rgba(0, 0, 0, 0.9)" : "rgba(0, 0, 0, 0.4)";
    const seg = snake.body[i]!;

    drawSquare({
      context,
      position: seg,
      color: snake.isCrash ? crashedColor : color,
      cellSize,
      borderSize,
    });

    if (isHead && indexesVisible) {
      renderText({
        context,
        text: getIndexByPosition(seg, gridW).toString(),
        position: seg,
        cellSize,
      });
    }
  }
}
