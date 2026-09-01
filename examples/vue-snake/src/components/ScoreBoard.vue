<script setup lang="ts">
import type { Snake } from "@separa/example-snake-shared";

defineProps<{
  snakes: Snake[];
}>();
</script>

<template>
  <div class="mb-4">
    <h3 class="text-base font-bold mb-2 pb-1 border-b border-neutral-700 text-neutral-200">
      Score board
    </h3>
    <ul class="space-y-1.5 max-h-48 overflow-y-auto pr-1">
      <li
        v-for="snake in snakes"
        :key="snake.id"
        class="relative flex items-center justify-between px-2 py-1 rounded bg-neutral-900/60 border border-neutral-800"
        :class="{ 'line-through opacity-70': snake.isCrash }"
        :style="{ color: snake.colors.head }"
      >
        <div
          v-if="snake.isCrash"
          class="absolute inset-0 flex items-center justify-center bg-red-950/80 text-red-200 font-bold text-xs rounded z-10"
        >
          Dropped out !
        </div>
        <span class="font-semibold text-xs tracking-wide">{{ snake.id }}</span>
        <span class="font-mono text-xs px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300">
          {{ snake.score }}
        </span>
      </li>
    </ul>
  </div>
</template>
