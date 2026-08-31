import { NonReactive, Service } from "@separa/core";
import type { Todo, TodoFilter } from "./types";

/**
 * TodoService — 框架无关的业务逻辑。
 *
 * - `todos` 是响应式状态（通过 @separa/vite-plugin 自动识别），
 *   React 端通过 useSyncExternalStore 订阅，Vue 端转换为 Ref Facade。
 * - `filter` 同样是响应式状态，用于切换视图过滤条件。
 * - `nextId` 使用 @NonReactive() 标注，只作为内部计数器，不触发 UI 更新。
 */
@Service({ scope: "singleton" })
export class TodoService {
  todos: Todo[] = [];
  filter: TodoFilter = "all";

  @NonReactive()
  private nextId = 1;

  /** 新增一条 Todo，自动去除首尾空白，空字符串忽略。 */
  addTodo(text: string): void {
    const trimmed = text.trim();
    if (!trimmed) return;
    this.todos = [
      ...this.todos,
      { id: String(this.nextId++), text: trimmed, done: false },
    ];
  }

  /** 切换指定 Todo 的完成状态。 */
  toggleTodo(id: string): void {
    this.todos = this.todos.map((todo) =>
      todo.id === id ? { ...todo, done: !todo.done } : todo,
    );
  }

  /** 删除指定 Todo。 */
  removeTodo(id: string): void {
    this.todos = this.todos.filter((todo) => todo.id !== id);
  }

  /** 删除所有已完成的 Todo。 */
  clearCompleted(): void {
    this.todos = this.todos.filter((todo) => !todo.done);
  }

  /** 将所有 Todo 标记为完成；若全部已完成则反转为未完成。 */
  toggleAll(): void {
    const allDone = this.todos.every((todo) => todo.done);
    this.todos = this.todos.map((todo) => ({ ...todo, done: !allDone }));
  }

  /** 修改当前筛选视图。 */
  setFilter(filter: TodoFilter): void {
    this.filter = filter;
  }

  /** 根据当前 filter 返回需要展示的 Todo 列表。 */
  get filteredTodos(): Todo[] {
    switch (this.filter) {
      case "active":
        return this.todos.filter((t) => !t.done);
      case "completed":
        return this.todos.filter((t) => t.done);
      default:
        return this.todos;
    }
  }

  get activeCount(): number {
    return this.todos.filter((t) => !t.done).length;
  }

  get completedCount(): number {
    return this.todos.filter((t) => t.done).length;
  }

  get totalCount(): number {
    return this.todos.length;
  }

  get allDone(): boolean {
    return this.todos.length > 0 && this.todos.every((t) => t.done);
  }
}
