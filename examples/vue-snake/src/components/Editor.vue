<script setup lang="ts">
import { EDITOR_THEMES } from "@separa/example-snake-shared";

defineProps<{
  code: string;
  theme: string;
}>();

const emit = defineEmits<{
  (e: "changeCode", code: string): void;
  (e: "changeTheme", theme: string): void;
  (e: "close"): void;
}>();
</script>

<template>
  <div class="fixed inset-0 bg-[#1e1e1e] text-white z-50 flex flex-col font-mono">
    <!-- Top Header -->
    <div class="flex items-center justify-between px-4 py-2.5 bg-neutral-900 border-b border-neutral-800">
      <div class="flex items-center gap-3">
        <span class="font-bold text-emerald-400 text-sm">🐍 Snake Algorithm Editor</span>
        <span class="text-xs text-neutral-400">
          Write your custom AI search algorithm in JavaScript
        </span>
      </div>

      <div class="flex items-center gap-3">
        <label class="text-xs text-neutral-300 flex items-center gap-1.5">
          <span>Theme:</span>
          <select
            :value="theme"
            class="px-2 py-1 rounded bg-neutral-800 border border-neutral-700 text-neutral-200 text-xs focus:outline-none focus:border-emerald-500"
            @change="(e) => emit('changeTheme', (e.target as HTMLSelectElement).value)"
          >
            <option v-for="t in EDITOR_THEMES" :key="t" :value="t">
              {{ t }}
            </option>
          </select>
        </label>

        <button
          class="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-sans text-xs font-semibold transition-colors cursor-pointer"
          @click="emit('close')"
        >
          Back to Game 🎮
        </button>
      </div>
    </div>

    <!-- Code Editor TextArea -->
    <div class="flex-1 p-4 bg-[#141414] overflow-hidden flex flex-col">
      <textarea
        :value="code"
        spellcheck="false"
        class="w-full h-full p-4 bg-transparent text-emerald-300 font-mono text-sm leading-relaxed focus:outline-none resize-none selection:bg-emerald-900/60 selection:text-white"
        @input="(e) => emit('changeCode', (e.target as HTMLTextAreaElement).value)"
      />
    </div>
  </div>
</template>
