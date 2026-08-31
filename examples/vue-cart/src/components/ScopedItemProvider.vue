<script setup lang="ts">
import { provideContainer } from "@separa/vue";
import type { SeparaContainer } from "@separa/example-cart-shared";

const props = defineProps<{
  container: SeparaContainer;
}>();

// 💡 关键：为当前组件子树绑定子容器
provideContainer(props.container);
</script>

<template>
  <slot />
</template>
