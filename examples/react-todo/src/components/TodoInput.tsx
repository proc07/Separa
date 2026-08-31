import { useRef, type KeyboardEvent } from "react";
import { useService } from "@separa/react";
import { TodoService } from "@separa/example-todo-shared";
import styles from "./TodoInput.module.css";

/**
 * TodoInput — 新增 Todo 的输入框组件。
 * 通过 useService 直接获取共享的 TodoService，按下 Enter 或点击按钮新增。
 */
export function TodoInput() {
  const todo = useService(TodoService);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleAdd() {
    const value = inputRef.current?.value ?? "";
    todo.addTodo(value);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") handleAdd();
  }

  function handleToggleAll() {
    todo.toggleAll();
  }

  return (
    <div className={styles.inputRow}>
      {todo.totalCount > 0 && (
        <button
          className={`${styles.toggleAll} ${todo.allDone ? styles.allDone : ""}`}
          onClick={handleToggleAll}
          title="全部切换完成状态"
          aria-label="全选/全取消"
        >
          ❯
        </button>
      )}
      <input
        ref={inputRef}
        className={styles.input}
        type="text"
        placeholder="今天要做什么？按 Enter 新增"
        onKeyDown={handleKeyDown}
        autoFocus
      />
      <button className={styles.addBtn} onClick={handleAdd}>
        添加
      </button>
    </div>
  );
}
