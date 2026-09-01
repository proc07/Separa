import { describe, it, expect, beforeEach } from "vitest";
import { defineDecoratedService, getReactiveController } from "@separa/core";
import { createContainer } from "@separa/ioc-inversify";
import { TodoService } from "../src/todo.service";

describe("TodoService (examples/todo-shared)", () => {
  let service: TodoService;

  beforeEach(() => {
    service = new TodoService();
  });

  describe("Initial State", () => {
    it("starts with empty todos and 'all' filter", () => {
      expect(service.todos).toEqual([]);
      expect(service.filter).toBe("all");
      expect(service.totalCount).toBe(0);
      expect(service.activeCount).toBe(0);
      expect(service.completedCount).toBe(0);
      expect(service.allDone).toBe(false);
      expect(service.filteredTodos).toEqual([]);
    });
  });

  describe("addTodo", () => {
    it("adds a valid todo with auto-incremented string ID", () => {
      service.addTodo("Buy milk");
      expect(service.todos).toHaveLength(1);
      expect(service.todos[0]).toEqual({ id: "1", text: "Buy milk", done: false });

      service.addTodo("Write tests");
      expect(service.todos).toHaveLength(2);
      expect(service.todos[1]).toEqual({ id: "2", text: "Write tests", done: false });
    });

    it("trims whitespace from text", () => {
      service.addTodo("   Learn TypeScript   ");
      expect(service.todos[0]?.text).toBe("Learn TypeScript");
    });

    it("ignores empty or whitespace-only strings", () => {
      service.addTodo("");
      service.addTodo("   ");
      service.addTodo("\t\n");
      expect(service.todos).toHaveLength(0);
      expect(service.totalCount).toBe(0);
    });
  });

  describe("toggleTodo", () => {
    it("toggles the done status of a specific todo", () => {
      service.addTodo("Task 1");
      service.addTodo("Task 2");

      service.toggleTodo("1");
      expect(service.todos.find((t) => t.id === "1")?.done).toBe(true);
      expect(service.todos.find((t) => t.id === "2")?.done).toBe(false);

      service.toggleTodo("1");
      expect(service.todos.find((t) => t.id === "1")?.done).toBe(false);
    });

    it("does nothing when toggling a non-existent ID", () => {
      service.addTodo("Task 1");
      service.toggleTodo("999");
      expect(service.todos).toHaveLength(1);
      expect(service.todos[0]?.done).toBe(false);
    });
  });

  describe("removeTodo", () => {
    it("removes a todo by ID", () => {
      service.addTodo("Task 1");
      service.addTodo("Task 2");
      service.addTodo("Task 3");

      service.removeTodo("2");
      expect(service.todos.map((t) => t.id)).toEqual(["1", "3"]);
      expect(service.totalCount).toBe(2);
    });

    it("does nothing when removing a non-existent ID", () => {
      service.addTodo("Task 1");
      service.removeTodo("999");
      expect(service.todos).toHaveLength(1);
    });
  });

  describe("clearCompleted", () => {
    it("removes only completed todos and keeps active ones", () => {
      service.addTodo("Task 1");
      service.addTodo("Task 2");
      service.addTodo("Task 3");

      service.toggleTodo("1");
      service.toggleTodo("3");

      service.clearCompleted();
      expect(service.todos).toHaveLength(1);
      expect(service.todos[0]).toEqual({ id: "2", text: "Task 2", done: false });
    });

    it("does nothing if there are no completed todos", () => {
      service.addTodo("Task 1");
      service.addTodo("Task 2");
      service.clearCompleted();
      expect(service.todos).toHaveLength(2);
    });
  });

  describe("toggleAll", () => {
    it("marks all as completed when some are active", () => {
      service.addTodo("Task 1");
      service.addTodo("Task 2");
      service.toggleTodo("1"); // 1 done, 2 active

      service.toggleAll();
      expect(service.todos.every((t) => t.done)).toBe(true);
      expect(service.allDone).toBe(true);
    });

    it("marks all as active when all are currently completed", () => {
      service.addTodo("Task 1");
      service.addTodo("Task 2");
      service.toggleTodo("1");
      service.toggleTodo("2");
      expect(service.allDone).toBe(true);

      service.toggleAll();
      expect(service.todos.every((t) => !t.done)).toBe(true);
      expect(service.allDone).toBe(false);
    });

    it("does nothing on an empty list", () => {
      service.toggleAll();
      expect(service.todos).toEqual([]);
      expect(service.allDone).toBe(false);
    });
  });

  describe("setFilter & filteredTodos", () => {
    beforeEach(() => {
      service.addTodo("Task 1 (active)");
      service.addTodo("Task 2 (completed)");
      service.addTodo("Task 3 (active)");
      service.toggleTodo("2");
    });

    it("filters correctly for 'all'", () => {
      service.setFilter("all");
      expect(service.filter).toBe("all");
      expect(service.filteredTodos).toHaveLength(3);
    });

    it("filters correctly for 'active'", () => {
      service.setFilter("active");
      expect(service.filter).toBe("active");
      expect(service.filteredTodos.map((t) => t.id)).toEqual(["1", "3"]);
    });

    it("filters correctly for 'completed'", () => {
      service.setFilter("completed");
      expect(service.filter).toBe("completed");
      expect(service.filteredTodos.map((t) => t.id)).toEqual(["2"]);
    });
  });

  describe("Count & Status Getters", () => {
    it("computes activeCount, completedCount, totalCount and allDone accurately", () => {
      expect(service.activeCount).toBe(0);
      expect(service.completedCount).toBe(0);
      expect(service.totalCount).toBe(0);
      expect(service.allDone).toBe(false);

      service.addTodo("A");
      service.addTodo("B");
      expect(service.activeCount).toBe(2);
      expect(service.completedCount).toBe(0);
      expect(service.totalCount).toBe(2);
      expect(service.allDone).toBe(false);

      service.toggleTodo("1");
      expect(service.activeCount).toBe(1);
      expect(service.completedCount).toBe(1);
      expect(service.allDone).toBe(false);

      service.toggleTodo("2");
      expect(service.activeCount).toBe(0);
      expect(service.completedCount).toBe(2);
      expect(service.allDone).toBe(true);
    });
  });

  describe("Separa IoC & Reactive Enhancement Integration", () => {
    it("functions correctly inside a Separa IoC Container with reactive state subscriptions", () => {
      const container = createContainer({
        definitions: [defineDecoratedService(TodoService, ["todos", "filter"])],
      });

      const todoService = container.get(TodoService);
      const controller = getReactiveController(todoService);
      expect(controller).toBeDefined();

      let changeCount = 0;
      const unsubscribe = controller!.subscribe(() => {
        changeCount++;
      });

      todoService.addTodo("DI Todo");
      expect(changeCount).toBeGreaterThan(0);
      expect(todoService.todos).toHaveLength(1);
      expect(todoService.todos[0]?.text).toBe("DI Todo");

      const countBeforeFilter = changeCount;
      todoService.setFilter("completed");
      expect(changeCount).toBeGreaterThan(countBeforeFilter);
      expect(todoService.filter).toBe("completed");

      unsubscribe();
    });
  });
});
