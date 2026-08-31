<script setup lang="ts">
defineProps<{
  show: boolean;
  canAddTube: boolean;
  canUndo: boolean;
}>();

const emit = defineEmits<{
  (e: "undo"): void;
  (e: "addTube"): void;
  (e: "newGame"): void;
  (e: "close"): void;
}>();
</script>

<template>
  <div v-if="show" class="modal-overlay" @click="emit('close')">
    <div class="modal-content deadlock-content" @click.stop>
      <h2 class="modal-title deadlock-title">⚠️ 陷入死局</h2>
      <p class="modal-text">
        当前盘面已无任何可用移动步骤。
      </p>
      <div class="modal-actions-group">
        <button
          v-if="canUndo"
          class="btn btn-primary modal-btn"
          @click="
            emit('close');
            emit('undo');
          "
        >
          ⏪ 撤销一步
        </button>
        <button
          v-if="canAddTube"
          class="btn btn-accent modal-btn"
          @click="
            emit('close');
            emit('addTube');
          "
        >
          🧪 +1 辅助管
        </button>
        <button
          class="btn modal-btn"
          @click="
            emit('close');
            emit('newGame');
          "
        >
          🔄 重新开局
        </button>
      </div>
    </div>
  </div>
</template>
