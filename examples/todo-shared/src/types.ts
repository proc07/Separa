/** 单个 Todo 项的数据结构。 */
export interface Todo {
  readonly id: string;
  readonly text: string;
  readonly done: boolean;
}

/** Todo 筛选视图枚举。 */
export type TodoFilter = "all" | "active" | "completed";
