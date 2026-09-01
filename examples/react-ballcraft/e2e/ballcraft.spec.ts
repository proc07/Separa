import { test, expect } from "@playwright/test";

test.describe("React Ballcraft E2E", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("initial game board has 14 tubes, 0 moves, and stats", async ({ page }) => {
    await expect(page.locator(".title")).toHaveText("Ballcraft");
    await expect(page.locator(".badge")).toContainText("Separa · React");

    // 14 columns by default
    const tubes = page.locator(".game-field .column-slot");
    await expect(tubes).toHaveCount(14);

    // 12 full columns (4 balls each) and 2 empty columns
    const totalBalls = page.locator(".game-field .tube .ball");
    await expect(totalBalls).toHaveCount(48); // 12 * 4

    // Stats
    await expect(page.locator(".stats span:has-text('总步数') strong")).toHaveText("0");
    await expect(page.locator(".stats span:has-text('有效步数') strong")).toHaveText("0");

    // Button states
    await expect(page.locator("button:has-text('撤销')")).toBeDisabled();
    await expect(page.locator("button:has-text('重做')")).toBeDisabled();
    await expect(page.locator("button:has-text('+1 空管')")).toBeEnabled();
  });

  test("picks, unpicks, and moves a ball to empty tube with move counter & undo/redo", async ({ page }) => {
    const tubes = page.locator(".game-field .column-slot");
    const count = await tubes.count();
    let sourceIdx = -1;
    let targetIdx = -1;

    for (let i = 0; i < count; i++) {
      const ballCount = await tubes.nth(i).locator(".tube .ball").count();
      if (ballCount > 0 && sourceIdx === -1) sourceIdx = i;
      if (ballCount === 0 && targetIdx === -1) targetIdx = i;
    }

    const sourceTube = tubes.nth(sourceIdx);
    const targetTube = tubes.nth(targetIdx);

    // 1. Pick top ball
    await sourceTube.click();
    await expect(sourceTube.locator(".hover-slot .ball")).toBeVisible();
    await expect(sourceTube.locator(".tube")).toHaveClass(/picked-from/);
    await expect(targetTube.locator(".tube")).toHaveClass(/valid/);

    // 2. Unpick (click same tube)
    await sourceTube.click();
    await expect(sourceTube.locator(".hover-slot .ball")).not.toBeVisible();
    await expect(sourceTube.locator(".tube")).not.toHaveClass(/picked-from/);

    // 3. Pick again and place in empty tube
    await sourceTube.click();
    await targetTube.click();

    // Verify ball placed in target index tube
    await expect(targetTube.locator(".tube .ball")).toHaveCount(1);
    await expect(page.locator(".stats span:has-text('总步数') strong")).toHaveText("1");
    await expect(page.locator(".stats span:has-text('有效步数') strong")).toHaveText("1");

    // 4. Undo
    const undoBtn = page.locator("button:has-text('撤销')");
    const redoBtn = page.locator("button:has-text('重做')");
    await expect(undoBtn).toBeEnabled();
    await expect(redoBtn).toBeDisabled();

    await undoBtn.click();
    await expect(targetTube.locator(".tube .ball")).toHaveCount(0);
    await expect(page.locator(".stats span:has-text('有效步数') strong")).toHaveText("0");
    await expect(undoBtn).toBeDisabled();
    await expect(redoBtn).toBeEnabled();

    // 5. Redo
    await redoBtn.click();
    await expect(targetTube.locator(".tube .ball")).toHaveCount(1);
    await expect(page.locator(".stats span:has-text('有效步数') strong")).toHaveText("1");
    await expect(undoBtn).toBeEnabled();
    await expect(redoBtn).toBeDisabled();
  });

  test("requests and clears hint with UI visual highlights", async ({ page }) => {
    const hintBtn = page.locator("button:has-text('提示')");
    await hintBtn.click();

    // Hint banner appears
    const hintBanner = page.locator(".hint-banner");
    await expect(hintBanner).toBeVisible();
    await expect(hintBanner.locator(".hint-text")).toBeVisible();

    // Clear hint
    await page.locator(".hint-close-btn").click();
    await expect(hintBanner).not.toBeVisible();
    await expect(page.locator(".tube-hint-tag")).toHaveCount(0);
  });

  test("adds extra tubes up to limit of 2", async ({ page }) => {
    const addTubeBtn = page.locator("button:has-text('+1 空管')");
    const tubes = page.locator(".game-field .column-slot");

    await expect(tubes).toHaveCount(14);

    // 1st extra tube
    await addTubeBtn.click();
    await expect(tubes).toHaveCount(15);
    await expect(addTubeBtn).toContainText("(1/2)");
    await expect(addTubeBtn).toBeEnabled();

    // 2nd extra tube
    await addTubeBtn.click();
    await expect(tubes).toHaveCount(16);
    await expect(addTubeBtn).toContainText("(2/2)");
    await expect(addTubeBtn).toBeDisabled();
  });

  test("resets game on New Game button click", async ({ page }) => {
    const tubes = page.locator(".game-field .column-slot");
    const count = await tubes.count();
    let sourceIdx = -1;
    let targetIdx = -1;

    for (let i = 0; i < count; i++) {
      const ballCount = await tubes.nth(i).locator(".tube .ball").count();
      if (ballCount > 0 && sourceIdx === -1) sourceIdx = i;
      if (ballCount === 0 && targetIdx === -1) targetIdx = i;
    }

    // Make a move
    await tubes.nth(sourceIdx).click();
    await tubes.nth(targetIdx).click();

    await expect(page.locator(".stats span:has-text('总步数') strong")).toHaveText("1");

    // Click New Game
    await page.locator("button:has-text('新游戏')").click();
    await expect(page.locator(".stats span:has-text('总步数') strong")).toHaveText("0");
    await expect(page.locator(".stats span:has-text('有效步数') strong")).toHaveText("0");
    await expect(page.locator("button:has-text('撤销')")).toBeDisabled();
  });
});
