<script setup lang="ts">
import { computed } from "vue";
import { GAME_STATE } from "@separa/example-snake-shared";

const props = defineProps<{
  gameState: GAME_STATE;
  isVisibleBoard: boolean;
}>();

const emit = defineEmits<{
  (e: "togglePlayPause"): void;
  (e: "restart"): void;
  (e: "addSnake"): void;
  (e: "toggleBoardVisible"): void;
  (e: "openEditor"): void;
}>();

const isPlay = computed(() => props.gameState === GAME_STATE.IS_PLAY);
</script>

<template>
  <div class="mt-3 p-3 rounded-lg bg-neutral-950/80 backdrop-blur border border-neutral-800 shadow-xl flex flex-wrap gap-2">
    <button
      class="px-3 py-1.5 rounded text-xs font-semibold bg-neutral-200/80 text-neutral-950 hover:bg-white transition-colors cursor-pointer"
      @click="emit('togglePlayPause')"
    >
      {{ isPlay ? "pause" : "play" }}
    </button>

    <button
      class="px-3 py-1.5 rounded text-xs font-semibold bg-neutral-200/80 text-neutral-950 hover:bg-white transition-colors cursor-pointer"
      @click="emit('restart')"
    >
      restart
    </button>

    <button
      class="px-3 py-1.5 rounded text-xs font-semibold bg-neutral-200/80 text-neutral-950 hover:bg-white transition-colors cursor-pointer"
      @click="emit('addSnake')"
    >
      add snake
    </button>

    <button
      class="px-3 py-1.5 rounded text-xs font-semibold bg-neutral-200/80 text-neutral-950 hover:bg-white transition-colors cursor-pointer"
      @click="emit('toggleBoardVisible')"
    >
      {{ isVisibleBoard ? "hide board" : "show board" }}
    </button>

    <button
      v-if="!isPlay"
      class="w-full mt-1 px-3 py-2 rounded text-xs font-semibold bg-emerald-600/90 text-white hover:bg-emerald-500 transition-colors cursor-pointer text-center"
      @click="emit('openEditor')"
    >
      open editor
    </button>
  </div>
</template>
