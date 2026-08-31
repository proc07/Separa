<script setup lang="ts">
import { ref } from "vue";
import { useService } from "@separa/vue";
import { TodoService } from "@separa/example-todo-shared";

/**
 * TodoInput — 新增 Todo 的输入框组件。
 * 解构 useService 获取顶层 Ref 与方法，模板中无需写 .value。
 */
const { totalCount, allDone, addTodo, toggleAll } = useService(TodoService);
const inputText = ref("");

function handleAdd() {
  addTodo(inputText.value);
  inputText.value = "";
}

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === "Enter") handleAdd();
}
</script>

<template>
  <div class="input-row">
    <button
      v-if="totalCount > 0"
      class="toggle-all"
      :class="{ 'all-done': allDone }"
      @click="toggleAll()"
      title="全部切换完成状态"
      aria-label="全选/全取消"
    >
      ❯
    </button>
    <input
      v-model="inputText"
      class="input"
      type="text"
      placeholder="今天要做什么？按 Enter 新增"
      @keydown="handleKeyDown"
      autofocus
    />
    <button class="add-btn" @click="handleAdd">添加</button>
  </div>
</template>

<style scoped>
.input-row {
  display: flex;
  align-items: center;
  padding: 0 12px 0 0;
  border-bottom: 1px solid #ededed;
}

.toggle-all {
  flex-shrink: 0;
  width: 44px;
  height: 52px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.1rem;
  color: #ccc;
  transform: rotate(90deg);
  transition: color 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.toggle-all.all-done {
  color: #737373;
}

.toggle-all:hover {
  color: #737373;
}

.input {
  flex: 1;
  padding: 16px 12px;
  font-size: 1.1rem;
  border: none;
  outline: none;
  background: transparent;
  color: #333;
}

.input::placeholder {
  color: #ccc;
  font-style: italic;
}

.add-btn {
  flex-shrink: 0;
  padding: 8px 16px;
  background: #42b883;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background 0.2s;
}

.add-btn:hover {
  background: #33a06f;
}
</style>
