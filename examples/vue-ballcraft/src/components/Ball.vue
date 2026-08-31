<script setup lang="ts">
import { computed } from "vue";
import { PALETTE, type ColorId } from "@separa/example-ballcraft-shared";

const props = withDefaults(
  defineProps<{
    color: ColorId;
    isFloating?: boolean;
  }>(),
  {
    isFloating: false,
  },
);

const backgroundColor = computed(() => PALETTE[props.color] || "#ccc");
</script>

<template>
  <div
    class="ball"
    :class="{ floating: isFloating }"
    :style="{ backgroundColor }"
  />
</template>
