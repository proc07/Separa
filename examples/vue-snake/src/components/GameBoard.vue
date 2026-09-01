<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from "vue";
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

const props = defineProps<{
  w: number;
  h: number;
  cellSize: number;
  borderSize: number;
  snakes: Snake[];
  foods: Food[];
  bricks: Coords[];
  indexesVisible: boolean;
}>();

const emit = defineEmits<{
  (e: "toggleBrick", pos: Coords): void;
  (e: "setDimensions", wPx: number, hPx: number): void;
}>();

const canvasRef = ref<HTMLCanvasElement | null>(null);
let isMouseDown = false;
let lastToggledTile: string | null = null;

const render = () => {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const globalW = props.w * props.cellSize;
  const globalH = props.h * props.cellSize;

  // Clear frame
  ctx.clearRect(0, 0, globalW, globalH);

  // 1. Draw Grid
  const { grid, applyStyles } = buildGrid(
    ctx,
    props.w,
    props.h,
    props.cellSize,
    props.borderSize,
  );
  applyStyles();
  ctx.stroke(grid);

  // 2. Draw Processed (visited nodes) for AI snakes
  for (const snake of props.snakes) {
    if (snake.isCrash || !snake.settings.showProcessedCells) continue;
    renderProcessed({
      context: ctx,
      processed: snake.meta.processed,
      color: "rgba(250, 204, 21, 0.2)",
      cellSize: props.cellSize,
      borderSize: props.borderSize,
    });
  }

  // 3. Draw Path (yellow lines to food) for AI snakes
  for (const snake of props.snakes) {
    if (snake.isCrash || !snake.settings.showAIPathToTarget) continue;
    renderPath({
      context: ctx,
      path: snake.meta.path,
      color: snake.colors.head,
      cellSize: props.cellSize,
    });
  }

  // 4. Draw Foods (Apples)
  renderFoods({
    context: ctx,
    foods: props.foods,
    indexesVisible: props.indexesVisible,
    gridW: props.w,
    cellSize: props.cellSize,
    borderSize: props.borderSize,
  });

  // 5. Draw Bricks (Obstacles)
  renderBricks({
    context: ctx,
    bricks: props.bricks,
    indexesVisible: props.indexesVisible,
    gridW: props.w,
    cellSize: props.cellSize,
    borderSize: props.borderSize,
  });

  // 6. Draw Snakes
  for (const snake of props.snakes) {
    renderSnake({
      context: ctx,
      snake,
      indexesVisible: props.indexesVisible,
      gridW: props.w,
      cellSize: props.cellSize,
      borderSize: props.borderSize,
    });
  }
};

watch(
  () => [
    props.w,
    props.h,
    props.cellSize,
    props.borderSize,
    props.snakes,
    props.foods,
    props.bricks,
    props.indexesVisible,
  ],
  () => {
    render();
  },
  { deep: true },
);

const handleResize = () => {
  emit("setDimensions", window.innerWidth, window.innerHeight);
};

onMounted(() => {
  loadAssets().then(() => render());
  handleResize();
  window.addEventListener("resize", handleResize);
});

onUnmounted(() => {
  window.removeEventListener("resize", handleResize);
});

const handleCanvasClick = (e: MouseEvent) => {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const [tileX, tileY] = convertGlobalPositionToLocal([x, y], props.cellSize);
  emit("toggleBrick", [tileX, tileY]);
};

const handleMouseDown = (e: MouseEvent) => {
  isMouseDown = true;
  handleCanvasClick(e);
};

const handleMouseMove = (e: MouseEvent) => {
  if (!isMouseDown) return;
  const canvas = canvasRef.value;
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const [tileX, tileY] = convertGlobalPositionToLocal([x, y], props.cellSize);
  const key = `${tileX},${tileY}`;
  if (lastToggledTile !== key) {
    lastToggledTile = key;
    emit("toggleBrick", [tileX, tileY]);
  }
};

const handleMouseUp = () => {
  isMouseDown = false;
  lastToggledTile = null;
};
</script>

<template>
  <div
    class="fixed inset-0 w-full h-full overflow-hidden bg-white dark:bg-[#19212b] cursor-crosshair"
    @mouseup="handleMouseUp"
  >
    <canvas
      ref="canvasRef"
      :width="w * cellSize"
      :height="h * cellSize"
      class="block"
      @mousedown="handleMouseDown"
      @mousemove="handleMouseMove"
    />
  </div>
</template>
