import { test, expect } from "@playwright/test";

test.describe("Vue TodoList E2E", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("initial state displays empty state and hides footer", async ({ page }) => {
    await expect(page.locator("header h1")).toContainText("Separa · Vue TodoList");
    await expect(page.locator("input.input")).toBeVisible();
    await expect(page.locator("button.add-btn")).toBeVisible();
    await expect(page.locator("li.empty")).toContainText("还没有任何待办事项");
    await expect(page.locator("footer.footer")).not.toBeVisible();
    await expect(page.locator("button.toggle-all")).not.toBeVisible();
  });

  test("adds new todos with Enter key and Add button, trimming whitespace", async ({ page }) => {
    const input = page.locator("input.input");
    const addBtn = page.locator("button.add-btn");

    // 1. Try empty / whitespace input -> should not add
    await input.fill("   ");
    await addBtn.click();
    await expect(page.locator("li.empty")).toContainText("还没有任何待办事项");

    // 2. Add first todo using Enter
    await input.fill("学习 Separa 响应式核心");
    await input.press("Enter");

    await expect(input).toHaveValue("");
    const items = page.locator("ul.list li.item");
    await expect(items).toHaveCount(1);
    await expect(items.first().locator("span.text")).toHaveText("学习 Separa 响应式核心");

    // Footer appears
    await expect(page.locator("footer.footer")).toBeVisible();
    await expect(page.locator("footer.footer span.count")).toContainText("1 项未完成");

    // 3. Add second todo using Add button
    await input.fill("体验 React 与 Vue 状态共享");
    await addBtn.click();

    await expect(items).toHaveCount(2);
    await expect(items.nth(1).locator("span.text")).toHaveText("体验 React 与 Vue 状态共享");
    await expect(page.locator("footer.footer span.count")).toContainText("2 项未完成");
  });

  test("toggles single todo completion status with UI & counter updates", async ({ page }) => {
    const input = page.locator("input.input");
    await input.fill("任务一");
    await input.press("Enter");
    await input.fill("任务二");
    await input.press("Enter");

    const firstItem = page.locator("ul.list li.item").first();
    const firstCheckBtn = firstItem.locator("button.check");

    // Initially active
    await expect(firstCheckBtn).toHaveText("○");
    await expect(firstItem).not.toHaveClass(/done/);
    await expect(page.locator("footer.footer span.count")).toContainText("2 项未完成");

    // Click to complete
    await firstCheckBtn.click();
    await expect(firstCheckBtn).toHaveText("✓");
    await expect(firstItem).toHaveClass(/done/);
    await expect(page.locator("footer.footer span.count")).toContainText("1 项未完成");
    await expect(page.locator("button.clear-btn")).toBeVisible();
    await expect(page.locator("button.clear-btn")).toContainText("清除已完成 (1)");

    // Click again to uncheck
    await firstCheckBtn.click();
    await expect(firstCheckBtn).toHaveText("○");
    await expect(firstItem).not.toHaveClass(/done/);
    await expect(page.locator("footer.footer span.count")).toContainText("2 项未完成");
    await expect(page.locator("button.clear-btn")).not.toBeVisible();
  });

  test("toggles all todos with toggle-all button", async ({ page }) => {
    const input = page.locator("input.input");
    await input.fill("任务A");
    await input.press("Enter");
    await input.fill("任务B");
    await input.press("Enter");

    const toggleAllBtn = page.locator("button.toggle-all");
    await expect(toggleAllBtn).toBeVisible();

    // Toggle all to done
    await toggleAllBtn.click();
    await expect(page.locator("footer.footer span.count")).toContainText("0 项未完成");
    await expect(page.locator("button.clear-btn")).toBeVisible();
    await expect(page.locator("button.clear-btn")).toContainText("清除已完成 (2)");
    await expect(page.locator("ul.list li.item.done")).toHaveCount(2);

    // Toggle all to active
    await toggleAllBtn.click();
    await expect(page.locator("footer.footer span.count")).toContainText("2 项未完成");
    await expect(page.locator("ul.list li.item.done")).toHaveCount(0);
  });

  test("filters todos by all / active / completed", async ({ page }) => {
    const input = page.locator("input.input");
    await input.fill("未完成事项");
    await input.press("Enter");
    await input.fill("已完成事项");
    await input.press("Enter");

    // Complete the second item
    await page.locator("ul.list li.item").nth(1).locator("button.check").click();

    // Filter: 待完成 (active)
    await page.getByRole("button", { name: "待完成", exact: true }).click();
    await expect(page.locator("ul.list li.item")).toHaveCount(1);
    await expect(page.locator("ul.list li.item span.text")).toHaveText("未完成事项");

    // Filter: 已完成 (completed)
    await page.getByRole("button", { name: "已完成", exact: true }).click();
    await expect(page.locator("ul.list li.item")).toHaveCount(1);
    await expect(page.locator("ul.list li.item span.text")).toHaveText("已完成事项");

    // Filter: 全部 (all)
    await page.getByRole("button", { name: "全部", exact: true }).click();
    await expect(page.locator("ul.list li.item")).toHaveCount(2);
  });

  test("clears completed todos", async ({ page }) => {
    const input = page.locator("input.input");
    await input.fill("保留项");
    await input.press("Enter");
    await input.fill("待清除项1");
    await input.press("Enter");
    await input.fill("待清除项2");
    await input.press("Enter");

    // Mark 2 items as completed
    await page.locator("ul.list li.item").nth(1).locator("button.check").click();
    await page.locator("ul.list li.item").nth(2).locator("button.check").click();

    const clearBtn = page.locator("button.clear-btn");
    await expect(clearBtn).toContainText("清除已完成 (2)");
    await clearBtn.click();

    await expect(page.locator("ul.list li.item")).toHaveCount(1);
    await expect(page.locator("ul.list li.item span.text")).toHaveText("保留项");
    await expect(page.locator("footer.footer span.count")).toContainText("1 项未完成");
    await expect(page.locator("button.clear-btn")).not.toBeVisible();
  });

  test("deletes individual todo item and resets to empty state", async ({ page }) => {
    const input = page.locator("input.input");
    await input.fill("删除测试");
    await input.press("Enter");

    await expect(page.locator("ul.list li.item")).toHaveCount(1);

    // Delete item
    await page.locator("ul.list li.item button.remove").click();

    // Reverts to empty state
    await expect(page.locator("li.empty")).toContainText("还没有任何待办事项");
    await expect(page.locator("footer.footer")).not.toBeVisible();
  });
});
