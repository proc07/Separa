import { TodoInput } from "./components/TodoInput";
import { TodoList } from "./components/TodoList";
import { TodoFooter } from "./components/TodoFooter";
import styles from "./App.module.css";

export default function App() {
  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1 className={styles.title}>Separa · React TodoList</h1>
        <p className={styles.subtitle}>业务逻辑与 Vue 版本完全共享</p>
      </header>
      <main className={styles.main}>
        <TodoInput />
        <TodoList />
        <TodoFooter />
      </main>
    </div>
  );
}
