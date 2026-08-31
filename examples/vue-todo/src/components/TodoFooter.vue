<script setup lang="ts">
import { useService } from "@separa/vue";
import { TodoService, type TodoFilter } from "@separa/example-todo-shared";

/**
 * TodoFooter — 展示统计信息、筛选按钮与清除已完成操作。
 * 解构为顶层 Ref 后，模板中 totalCount、activeCount、completedCount、filter 均自动解包。
 */
const { totalCount, activeCount, completedCount, filter, setFilter, clearCompleted } =
  useService(TodoService);

const FILTERS: { label: string; value: TodoFilter }[] = [
  { label: "全部", value: "all" },
  { label: "待完成", value: "active" },
  { label: "已完成", value: "completed" },
];
</script>

<template>
  <footer v-if="totalCount > 0" class="footer">
    <span class="count">
      <strong>{{ activeCount }}</strong> 项未完成
    </span>
    <nav class="filters" aria-label="筛选">
      <button
        v-for="f in FILTERS"
        :key="f.value"
        class="filter-btn"
        :class="{ active: filter === f.value }"
        @click="setFilter(f.value)"
      >
        {{ f.label }}
      </button>
    </nav>
    <button
      v-if="completedCount > 0"
      class="clear-btn"
      @click="clearCompleted()"
    >
      清除已完成 ({{ completedCount }})
    </button>
  </footer>
</template>

<style scoped>
.footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px 16px;
  border-top: 1px solid #ededed;
  font-size: 0.85rem;
  color: #777;
  background: #fafafa;
}

.count {
  min-width: 80px;
}

.count strong {
  font-weight: 600;
  color: #555;
}

.filters {
  display: flex;
  gap: 4px;
}

.filter-btn {
  padding: 4px 10px;
  background: none;
  border: 1px solid transparent;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.83rem;
  color: inherit;
  transition: border-color 0.15s, color 0.15s;
}

.filter-btn:hover {
  border-color: #ccc;
}

.filter-btn.active {
  border-color: #42b883;
  color: #42b883;
}

.clear-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.83rem;
  color: #aaa;
  transition: color 0.15s;
  white-space: nowrap;
}

.clear-btn:hover {
  color: #42b883;
}
</style>
