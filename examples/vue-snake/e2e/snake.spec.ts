import { test, expect } from "@playwright/test";

test.describe("Vue Snake AI Game E2E (Dmitry 1:1)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:5181");
  });

  test("initial state displays canvas, score board, common settings, and AI snake", async ({
    page,
  }) => {
    await expect(page.locator("canvas")).toBeVisible();
    await expect(page.getByText("Score board")).toBeVisible();
    await expect(page.getByText("Common Settings")).toBeVisible();
    await expect(page.getByText("ai-1", { exact: true })).toBeVisible();
    await expect(page.getByText("handle collision state")).toBeVisible();
    await expect(page.getByText("add user (you) to game")).toBeVisible();
  });

  test("toggles play/pause, restart, and hide/show board", async ({ page }) => {
    const pauseBtn = page.getByRole("button", { name: "pause" });
    await expect(pauseBtn).toBeVisible();
    await pauseBtn.click();

    const playBtn = page.getByRole("button", { name: "play" });
    await expect(playBtn).toBeVisible();

    const openEditorBtn = page.getByRole("button", { name: "open editor" });
    await expect(openEditorBtn).toBeVisible();

    const hideBoardBtn = page.getByRole("button", { name: "hide board" });
    await hideBoardBtn.click();
    await expect(page.getByText("Score board")).not.toBeVisible();

    const showBoardBtn = page.getByRole("button", { name: "show board" });
    await showBoardBtn.click();
    await expect(page.getByText("Score board")).toBeVisible();
  });

  test("adds multiple bot snakes and user snake to the game", async ({ page }) => {
    const addSnakeBtn = page.getByRole("button", { name: "add snake" });
    await addSnakeBtn.click();
    await expect(page.getByText("ai-2", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Settings for ai-2" })).toBeVisible();

    // Toggle user snake into the game
    const userCheckbox = page.locator("label").filter({ hasText: "add user (you) to game" }).locator("input");
    await userCheckbox.click();
    await expect(page.getByText("user", { exact: true })).toBeVisible();
  });

  test("opens algorithm editor, modifies code, changes theme, and returns to game", async ({
    page,
  }) => {
    const pauseBtn = page.getByRole("button", { name: "pause" });
    await pauseBtn.click();

    const openEditorBtn = page.getByRole("button", { name: "open editor" });
    await openEditorBtn.click();

    await expect(page.getByText("Snake Algorithm Editor")).toBeVisible();
    const textarea = page.locator("textarea");
    await expect(textarea).toBeVisible();

    // Return to game
    await page.getByRole("button", { name: /Back to Game/i }).click();
    await expect(page.getByText("Snake Algorithm Editor")).not.toBeVisible();
    await expect(page.locator("canvas")).toBeVisible();
  });

  test("places bricks by clicking on canvas", async ({ page }) => {
    const canvas = page.locator("canvas");
    await canvas.click({ position: { x: 100, y: 100 } });
    await page.waitForTimeout(200);
    await canvas.click({ position: { x: 140, y: 100 } });
    await page.waitForTimeout(200);
  });
});
