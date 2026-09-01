<script setup lang="ts">
import { ref } from "vue";
import type { Snake, SnakeSettings } from "@separa/example-snake-shared";
import { GAME_STATE } from "@separa/example-snake-shared";
import ScoreBoard from "./ScoreBoard.vue";
import CommonSettings from "./CommonSettings.vue";
import SnakeSettingsItem from "./SnakeSettingsItem.vue";
import ControlPanel from "./ControlPanel.vue";

defineProps<{
  snakes: Snake[];
  gameState: GAME_STATE;
  isEnabledCollisionDetect: boolean;
  isUserInGame: boolean;
  indexesVisible: boolean;
  needFillEmptyGraphsCells: boolean;
  isLoggerEnabled: boolean;
  customCodeIsEnabled: boolean;
  fps: number;
  isVisibleBoard: boolean;
}>();

const emit = defineEmits<{
  (e: "togglePlayPause"): void;
  (e: "restart"): void;
  (e: "addSnake"): void;
  (e: "removeSnake", snakeId: string): void;
  (e: "updateSnakeSettings", snakeId: string, settings: Partial<SnakeSettings>): void;
  (e: "toggleBoardVisible"): void;
  (e: "toggleCollision"): void;
  (e: "toggleUserInGame"): void;
  (e: "toggleIndexesVisible"): void;
  (e: "toggleFillEmptyCells"): void;
  (e: "toggleLogger"): void;
  (e: "toggleCustomCode"): void;
  (e: "changeFps", fps: number): void;
  (e: "openEditor"): void;
}>();

const position = ref({ x: 20, y: 20 });
let isDragging = false;
let dragStart = { mouseX: 0, mouseY: 0, startX: 0, startY: 0 };

const handleMouseDown = (e: MouseEvent) => {
  const target = e.target as HTMLElement;
  if (["input", "select", "button", "textarea"].includes(target.tagName.toLowerCase())) {
    return;
  }
  isDragging = true;
  dragStart = {
    mouseX: e.clientX,
    mouseY: e.clientY,
    startX: position.value.x,
    startY: position.value.y,
  };

  const handleMouseMove = (ev: MouseEvent) => {
    if (!isDragging) return;
    const dx = ev.clientX - dragStart.mouseX;
    const dy = ev.clientY - dragStart.mouseY;
    position.value = {
      x: Math.max(10, dragStart.startX - dx),
      y: Math.max(10, dragStart.startY + dy),
    };
  };

  const handleMouseUp = () => {
    isDragging = false;
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mouseup", handleMouseUp);
  };

  window.addEventListener("mousemove", handleMouseMove);
  window.addEventListener("mouseup", handleMouseUp);
};
</script>

<template>
  <div
    :style="{
      position: 'fixed',
      top: `${position.y}px`,
      right: `${position.x}px`,
      width: '320px',
      zIndex: 50,
    }"
    class="select-none"
  >
    <div class="cursor-move" @mousedown="handleMouseDown">
      <div
        v-if="isVisibleBoard"
        class="p-4 rounded-xl bg-black/75 hover:bg-black/95 backdrop-blur-md text-white border border-neutral-800/80 shadow-2xl transition-all duration-300 max-h-[75vh] overflow-y-auto"
      >
        <ScoreBoard :snakes="snakes" />

        <CommonSettings
          :is-enabled-collision-detect="isEnabledCollisionDetect"
          :is-user-in-game="isUserInGame"
          :indexes-visible="indexesVisible"
          :need-fill-empty-graphs-cells="needFillEmptyGraphsCells"
          :is-logger-enabled="isLoggerEnabled"
          :custom-code-is-enabled="customCodeIsEnabled"
          :fps="fps"
          @toggle-collision="emit('toggleCollision')"
          @toggle-user-in-game="emit('toggleUserInGame')"
          @toggle-indexes-visible="emit('toggleIndexesVisible')"
          @toggle-fill-empty-cells="emit('toggleFillEmptyCells')"
          @toggle-logger="emit('toggleLogger')"
          @toggle-custom-code="emit('toggleCustomCode')"
          @change-fps="(fps) => emit('changeFps', fps)"
        />

        <template v-for="snake in snakes" :key="snake.id">
          <SnakeSettingsItem
            v-if="snake.id !== 'user'"
            :snake="snake"
            @update-settings="(id, s) => emit('updateSnakeSettings', id, s)"
            @remove-snake="(id) => emit('removeSnake', id)"
          />
        </template>
      </div>

      <ControlPanel
        :game-state="gameState"
        :is-visible-board="isVisibleBoard"
        @toggle-play-pause="emit('togglePlayPause')"
        @restart="emit('restart')"
        @add-snake="emit('addSnake')"
        @toggle-board-visible="emit('toggleBoardVisible')"
        @open-editor="emit('openEditor')"
      />
    </div>
  </div>
</template>
