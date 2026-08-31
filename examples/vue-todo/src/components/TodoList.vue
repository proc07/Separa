<script setup lang="ts">
import { useService } from "@separa/vue";
import { TodoService } from "@separa/example-todo-shared";

/**
 * TodoList — 渲染当前筛选条件下的 Todo 列表。
 * 解构 useService 返回的 Ref Facade，使各个状态成为顶层 Ref，
 * Vue 模板会自动解包，完全无需写 .value。
 */
const { filteredTodos, totalCount, toggleTodo, removeTodo } = useService(TodoService);
</script>

<template>
  <ul class="list">
    <template v-if="filteredTodos.length === 0">
      <li class="empty">
        {{ totalCount === 0 ? "还没有任何待办事项" : "当前筛选下没有项目" }}
      </li>
    </template>
    <template v-else>
      <li
        v-for="item in filteredTodos"
        :key="item.id"
        class="item"
        :class="{ done: item.done }"
      >
        <button
          class="check"
          @click="toggleTodo(item.id)"
          :aria-label="item.done ? '标记为未完成' : '标记为完成'"
        >
          {{ item.done ? "✓" : "○" }}
        </button>
        <span class="text">{{ item.text }}</span>
        <button class="remove" @click="removeTodo(item.id)" aria-label="删除">
          ×
        </button>
      </li>
    </template>
  </ul>
</template>

<style scoped>
.list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.empty {
  padding: 24px 16px;
  text-align: center;
  color: #aaa;
  font-style: italic;
  font-size: 0.95rem;
}

.item {
  display: flex;
  align-items: center;
  padding: 0 12px 0 4px;
  border-bottom: 1px solid #ededed;
  min-height: 52px;
  gap: 4px;
  transition: background 0.1s;
}

.item:last-child {
  border-bottom: none;
}

.item:hover {
  background: #fafafa;
}

.item:hover .remove {
  opacity: 1;
}

.check {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.1rem;
  color: #ccc;
  border-radius: 50%;
  transition: color 0.2s, background 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.check:hover {
  background: #f0f0f0;
}

.done .check {
  color: #42b883;
}

.text {
  flex: 1;
  font-size: 1rem;
  line-height: 1.5;
  word-break: break-all;
  padding: 8px 4px;
}

.done .text {
  text-decoration: line-through;
  color: #bbb;
}

.remove {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.3rem;
  color: #cc9a9a;
  opacity: 0;
  border-radius: 50%;
  transition: color 0.2s, opacity 0.2s, background 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.remove:hover {
  color: #42b883;
  background: #ebf7f1;
}
</style>
