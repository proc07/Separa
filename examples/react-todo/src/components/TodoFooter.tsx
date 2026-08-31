import { useService, useServiceState } from "@separa/react";
import { TodoService, type TodoFilter } from "@separa/example-todo-shared";
import styles from "./TodoFooter.module.css";

const FILTERS: { label: string; value: TodoFilter }[] = [
  { label: "全部", value: "all" },
  { label: "待完成", value: "active" },
  { label: "已完成", value: "completed" },
];

/**
 * TodoFooter — 展示统计信息、筛选按钮与清除已完成操作。
 * 使用 useServiceState 分别订阅需要的字段，按需精细更新。
 */
export function TodoFooter() {
  const todo = useService(TodoService);
  const totalCount = useServiceState(TodoService, (s) => s.totalCount);
  const activeCount = useServiceState(TodoService, (s) => s.activeCount);
  const completedCount = useServiceState(TodoService, (s) => s.completedCount);
  const filter = useServiceState(TodoService, (s) => s.filter);

  if (totalCount === 0) return null;

  return (
    <footer className={styles.footer}>
      <span className={styles.count}>
        <strong>{activeCount}</strong> 项未完成
      </span>
      <nav className={styles.filters} aria-label="筛选">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            className={`${styles.filterBtn} ${filter === f.value ? styles.active : ""}`}
            onClick={() => todo.setFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </nav>
      {completedCount > 0 && (
        <button className={styles.clearBtn} onClick={() => todo.clearCompleted()}>
          清除已完成 ({completedCount})
        </button>
      )}
    </footer>
  );
}
