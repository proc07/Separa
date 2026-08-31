<script setup lang="ts">
defineProps<{
  show: boolean;
  moves: number;
}>();

const emit = defineEmits<{
  (e: "newGame"): void;
  (e: "close"): void;
}>();
</script>

<template>
  <div v-if="show" class="modal-overlay" @click="emit('close')">
    <div class="modal-content" @click.stop>
      <h2 class="modal-title">🎉 恭喜通关！</h2>
      <p class="modal-text">
        你的成绩是 <strong>{{ moves }}</strong> 步！
      </p>
      <button
        class="btn btn-primary modal-btn"
        @click="
          emit('close');
          emit('newGame');
        "
      >
        再玩一局
      </button>
    </div>
  </div>
</template>
