<script setup lang="ts">
defineProps<{
  isEnabledCollisionDetect: boolean;
  isUserInGame: boolean;
  indexesVisible: boolean;
  needFillEmptyGraphsCells: boolean;
  isLoggerEnabled: boolean;
  customCodeIsEnabled: boolean;
  fps: number;
}>();

const emit = defineEmits<{
  (e: "toggleCollision"): void;
  (e: "toggleUserInGame"): void;
  (e: "toggleIndexesVisible"): void;
  (e: "toggleFillEmptyCells"): void;
  (e: "toggleLogger"): void;
  (e: "toggleCustomCode"): void;
  (e: "changeFps", fps: number): void;
}>();
</script>

<template>
  <div class="mb-4">
    <h3 class="text-base font-bold mb-2 pb-1 border-b border-neutral-700 text-neutral-200">
      Common Settings
    </h3>
    <div class="space-y-2 text-xs text-neutral-300">
      <label class="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          :checked="isEnabledCollisionDetect"
          class="rounded border-neutral-700 bg-neutral-800 text-emerald-500"
          @change="emit('toggleCollision')"
        />
        <span>handle collision state</span>
      </label>

      <label class="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          :checked="isUserInGame"
          class="rounded border-neutral-700 bg-neutral-800 text-emerald-500"
          @change="emit('toggleUserInGame')"
        />
        <span>add user (you) to game</span>
      </label>

      <label class="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          :checked="indexesVisible"
          class="rounded border-neutral-700 bg-neutral-800 text-emerald-500"
          @change="emit('toggleIndexesVisible')"
        />
        <span>visible indexes</span>
      </label>

      <label class="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          :checked="needFillEmptyGraphsCells"
          class="rounded border-neutral-700 bg-neutral-800 text-emerald-500"
          @change="emit('toggleFillEmptyCells')"
        />
        <span>fill graph's empty cells</span>
      </label>

      <label class="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          :checked="isLoggerEnabled"
          class="rounded border-neutral-700 bg-neutral-800 text-emerald-500"
          @change="emit('toggleLogger')"
        />
        <span>show operations count in console</span>
      </label>

      <label class="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          :checked="customCodeIsEnabled"
          class="rounded border-neutral-700 bg-neutral-800 text-emerald-500"
          @change="emit('toggleCustomCode')"
        />
        <span>If it it enabled - your code will run</span>
      </label>

      <div class="flex items-center gap-2 pt-1">
        <input
          type="number"
          min="1"
          max="120"
          step="2"
          :value="fps"
          class="w-16 px-2 py-1 rounded bg-neutral-800 border border-neutral-700 text-neutral-200 text-center font-bold focus:outline-none focus:border-emerald-500"
          @input="(e) => emit('changeFps', parseInt((e.target as HTMLInputElement).value) || 15)"
        />
        <span class="font-semibold text-neutral-400">FPS</span>
      </div>
    </div>
  </div>
</template>
