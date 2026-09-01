import React, { useEffect, useRef } from "react";
import type { Coords, Food, Snake } from "@separa/example-snake-shared";
import { convertGlobalPositionToLocal } from "@separa/example-snake-shared";
import {
  buildGrid,
  loadAssets,
  renderBricks,
  renderFoods,
  renderPath,
  renderProcessed,
  renderSnake,
} from "../renderer";

interface GameBoardProps {
  w: number;
  h: number;
  cellSize: number;
  borderSize: number;
  snakes: Snake[];
  foods: Food[];
  bricks: Coords[];
  indexesVisible: boolean;
  onToggleBrick: (pos: Coords) => void;
  onSetDimensions: (wPx: number, hPx: number) => void;
}

export const GameBoard: React.FC<GameBoardProps> = ({
  w,
  h,
  cellSize,
  borderSize,
  snakes,
  foods,
  bricks,
  indexesVisible,
  onToggleBrick,
  onSetDimensions,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isMouseDownRef = useRef(false);
  const lastToggledTile = useRef<string | null>(null);

  // Initialize assets and resize handling
  useEffect(() => {
    loadAssets();

    const handleResize = () => {
      onSetDimensions(window.innerWidth, window.innerHeight);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [onSetDimensions]);

  // Main Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const globalW = w * cellSize;
    const globalH = h * cellSize;

    // Clear frame
    ctx.clearRect(0, 0, globalW, globalH);

    // 1. Draw Grid
    const { grid, applyStyles } = buildGrid(ctx, w, h, cellSize, borderSize);
    applyStyles();
    ctx.stroke(grid);

    // 2. Draw Processed (visited nodes) for AI snakes
    for (const snake of snakes) {
      if (snake.isCrash || !snake.settings.showProcessedCells) continue;
      renderProcessed({
        context: ctx,
        processed: snake.meta.processed,
        color: "rgba(250, 204, 21, 0.2)",
        cellSize,
        borderSize,
      });
    }

    // 3. Draw Path (yellow lines to food) for AI snakes
    for (const snake of snakes) {
      if (snake.isCrash || !snake.settings.showAIPathToTarget) continue;
      renderPath({
        context: ctx,
        path: snake.meta.path,
        color: snake.colors.head,
        cellSize,
      });
    }

    // 4. Draw Foods (Apples)
    renderFoods({
      context: ctx,
      foods,
      indexesVisible,
      gridW: w,
      cellSize,
      borderSize,
    });

    // 5. Draw Bricks (Obstacles)
    renderBricks({
      context: ctx,
      bricks,
      indexesVisible,
      gridW: w,
      cellSize,
      borderSize,
    });

    // 6. Draw Snakes
    for (const snake of snakes) {
      renderSnake({
        context: ctx,
        snake,
        indexesVisible,
        gridW: w,
        cellSize,
        borderSize,
      });
    }
  }, [w, h, cellSize, borderSize, snakes, foods, bricks, indexesVisible]);

  // Canvas Mouse Interaction for Bricks Drawing
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const [tileX, tileY] = convertGlobalPositionToLocal([x, y], cellSize);
    onToggleBrick([tileX, tileY]);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isMouseDownRef.current = true;
    handleCanvasClick(e);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isMouseDownRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const [tileX, tileY] = convertGlobalPositionToLocal([x, y], cellSize);
    const key = `${tileX},${tileY}`;
    if (lastToggledTile.current !== key) {
      lastToggledTile.current = key;
      onToggleBrick([tileX, tileY]);
    }
  };

  const handleMouseUp = () => {
    isMouseDownRef.current = false;
    lastToggledTile.current = null;
  };

  return (
    <div
      className="fixed inset-0 w-full h-full overflow-hidden bg-white dark:bg-[#19212b] cursor-crosshair"
      onMouseUp={handleMouseUp}
    >
      <canvas
        ref={canvasRef}
        width={w * cellSize}
        height={h * cellSize}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        className="block"
      />
    </div>
  );
};
