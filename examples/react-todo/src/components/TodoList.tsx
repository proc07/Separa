import { useService, useServiceState } from "@separa/react";
import { TodoService } from "@separa/example-todo-shared";
import styles from "./TodoList.module.css";

/**
 * TodoList — 渲染当前筛选条件下的 Todo 列表。
 * 使用 useServiceState 选择器订阅，仅在 filteredTodos 变化时重渲染。
 */
export function TodoList() {
  const todo = useService(TodoService);
  const filteredTodos = useServiceState(TodoService, (s) => s.filteredTodos);

  if (filteredTodos.length === 0) {
    return (
      <ul className={styles.list}>
        <li className={styles.empty}>
          {todo.totalCount === 0 ? "还没有任何待办事项" : "当前筛选下没有项目"}
        </li>
      </ul>
    );
  }

  return (
    <ul className={styles.list}>
      {filteredTodos.map((item) => (
        <li key={item.id} className={`${styles.item} ${item.done ? styles.done : ""}`}>
          <button
            className={styles.check}
            onClick={() => todo.toggleTodo(item.id)}
            aria-label={item.done ? "标记为未完成" : "标记为完成"}
          >
            {item.done ? "✓" : "○"}
          </button>
          <span className={styles.text}>{item.text}</span>
          <button
            className={styles.remove}
            onClick={() => todo.removeTodo(item.id)}
            aria-label="删除"
          >
            ×
          </button>
        </li>
      ))}
    </ul>
  );
}
