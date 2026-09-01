<script setup lang="ts">
import { computed } from "vue";
import type { Snake, SnakeSettings } from "@separa/example-snake-shared";
import { algorithms, heuristics } from "@separa/example-snake-shared";

const props = defineProps<{
  snake: Snake;
}>();

const emit = defineEmits<{
  (e: "updateSettings", snakeId: string, settings: Partial<SnakeSettings>): void;
  (e: "removeSnake", snakeId: string): void;
}>();

const currentAlgo = computed(() =>
  algorithms.find((a) => a.id === props.snake.settings.activeAlgorithm),
);
</script>

<template>
  <div class="mb-3 p-2.5 rounded bg-neutral-900/80 border border-neutral-800 text-xs">
    <div className="flex items-center justify-between mb-2">
      <h4 class="font-bold tracking-wide" :style="{ color: snake.colors.head }">
        Settings for {{ snake.id }}
      </h4>
      <button
        class="text-neutral-400 hover:text-red-400 p-0.5 rounded transition-colors text-sm font-bold"
        title="Remove snake"
        @click="emit('removeSnake', snake.id)"
      >
        ✕
      </button>
    </div>

    <div class="space-y-2">
      <label class="flex items-center gap-2 cursor-pointer text-neutral-300 select-none">
        <input
          type="checkbox"
          :checked="snake.settings.showAIPathToTarget"
          :disabled="snake.isCrash"
          class="rounded border-neutral-700 bg-neutral-800 text-emerald-500"
          @change="(e) => emit('updateSettings', snake.id, { showAIPathToTarget: (e.target as HTMLInputElement).checked })"
        />
        <span :style="{ color: snake.colors.tail }">Show ai path to target</span>
      </label>

      <label class="flex items-center gap-2 cursor-pointer text-neutral-300 select-none">
        <input
          type="checkbox"
          :checked="snake.settings.showProcessedCells"
          :disabled="snake.isCrash"
          class="rounded border-neutral-700 bg-neutral-800 text-emerald-500"
          @change="(e) => emit('updateSettings', snake.id, { showProcessedCells: (e.target as HTMLInputElement).checked })"
        />
        <span :style="{ color: snake.colors.tail }">Show processed cells</span>
      </label>

      <div class="flex flex-col gap-1.5 pt-1">
        <select
          :value="snake.settings.activeAlgorithm"
          :disabled="snake.isCrash"
          class="px-2 py-1 rounded bg-neutral-800 border border-neutral-700 text-neutral-200 focus:outline-none focus:border-emerald-500 text-xs"
          @change="(e) => emit('updateSettings', snake.id, { activeAlgorithm: (e.target as HTMLSelectElement).value })"
        >
          <option v-for="alg in algorithms" :key="alg.id" :value="alg.id">
            {{ alg.name }}
          </option>
        </select>

        <select
          v-if="currentAlgo?.hasHeuristic"
          :value="snake.settings.activeHeuristic"
          :disabled="snake.isCrash"
          class="px-2 py-1 rounded bg-neutral-800 border border-neutral-700 text-neutral-200 focus:outline-none focus:border-emerald-500 text-xs"
          @change="(e) => emit('updateSettings', snake.id, { activeHeuristic: (e.target as HTMLSelectElement).value })"
        >
          <option v-for="h in heuristics" :key="h.id" :value="h.id">
            {{ h.name }}
          </option>
        </select>
      </div>
    </div>
  </div>
</template>
