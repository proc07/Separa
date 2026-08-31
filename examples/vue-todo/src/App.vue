<script setup lang="ts">
import TodoInput from "./components/TodoInput.vue";
import TodoList from "./components/TodoList.vue";
import TodoFooter from "./components/TodoFooter.vue";
</script>

<template>
  <div class="app">
    <header class="header">
      <h1 class="title">Separa · Vue TodoList</h1>
      <p class="subtitle">业务逻辑与 React 版本完全共享</p>
    </header>
    <main class="main">
      <TodoInput />
      <TodoList />
      <TodoFooter />
    </main>
  </div>
</template>

<style scoped>
.app {
  width: 100%;
  max-width: 560px;
}

.header {
  text-align: center;
  margin-bottom: 24px;
}

.title {
  font-size: 2rem;
  font-weight: 700;
  color: #42b883;
  letter-spacing: -0.5px;
}

.subtitle {
  margin-top: 4px;
  font-size: 0.85rem;
  color: #999;
}

.main {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 16px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}
</style>
