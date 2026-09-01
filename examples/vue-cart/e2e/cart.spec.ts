import { test, expect } from "@playwright/test";

test.describe("Vue Scoped Cart E2E", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("initial cart displays 4 items with correct calculations and parent controls", async ({ page }) => {
    await expect(page.locator(".header-title")).toContainText("动态多币种核价购物车");
    await expect(page.locator(".tag-badge")).toContainText("Separa · Scoped Container");

    // 4 default item rows
    const items = page.locator(".items-list .item-row");
    await expect(items).toHaveCount(4);

    // Initial summary verification (CNY, 13% tax, no coupon)
    // 24999*1 + 2499*2 + 1199*1 + 9980*1 = 41176 CNY
    // Tax = 41176 * 0.13 = 5352.88, Grand = 46528.88
    await expect(page.locator(".summary-row:has-text('选中商品原价')")).toContainText("¥41,176.00");
    await expect(page.locator(".summary-row:has-text('选中商品原价')")).toContainText("5 件");
    await expect(page.locator(".summary-row:has-text('预估消费/增值税')")).toContainText("+¥5,352.88");
    await expect(page.locator(".summary-row.total .grand-price")).toContainText("¥46,528.88");
    await expect(page.locator(".checkout-btn")).toContainText("立即结算 (4 款)");
    await expect(page.locator(".checkout-btn")).toBeEnabled();
  });

  test("switches currency in Parent Scope and cascades to all child items & summary", async ({ page }) => {
    const currencySelect = page.locator(".control-item:has-text('结算货币') select");

    // Switch to USD (rate 0.14)
    await currencySelect.selectOption("USD");

    // Summary reflects USD formatting
    await expect(page.locator(".summary-row:has-text('选中商品原价')")).toContainText("$5,764.64");
    await expect(page.locator(".summary-row.total .grand-price")).toContainText("$6,514.04");

    // Item row subtotal reflects USD formatting
    const firstItemSubtotal = page.locator(".items-list .item-row").first().locator(".subtotal-val");
    await expect(firstItemSubtotal).toContainText("$3,954.84");

    // Switch back to CNY
    await currencySelect.selectOption("CNY");
    await expect(page.locator(".summary-row.total .grand-price")).toContainText("¥46,528.88");
  });

  test("switches tax region and applies coupons in Parent Scope", async ({ page }) => {
    const taxSelect = page.locator(".control-item:has-text('收货税区') select");
    const couponSelect = page.locator(".control-item:has-text('全场优惠券') select");

    // 1. Switch tax to US (7.25%)
    await taxSelect.selectOption("US");
    // Tax = 41176 * 0.0725 = 2985.26, Grand = 44161.26
    await expect(page.locator(".summary-row:has-text('预估消费/增值税')")).toContainText("+¥2,985.26");
    await expect(page.locator(".summary-row.total .grand-price")).toContainText("¥44,161.26");

    // 2. Select VIP 90% coupon (vip90: 10% discount)
    await couponSelect.selectOption("vip90");
    // Coupon deduction = 4117.60, Taxable = 37058.40, Tax (7.25%) = 2686.73, Grand = 39745.13
    await expect(page.locator(".summary-row.discount:has-text('全场优惠券抵扣')")).toContainText("-¥4,117.60");
    await expect(page.locator(".summary-row.total .grand-price")).toContainText("¥39,745.13");

    // Reset tax & coupon
    await taxSelect.selectOption("CN");
    await couponSelect.selectOption("none");
    await expect(page.locator(".summary-row.discount:has-text('全场优惠券抵扣')")).not.toBeVisible();
  });

  test("modifies child item quantity, price, and item discount rate", async ({ page }) => {
    const secondItem = page.locator(".items-list .item-row").nth(1); // Sony headset (qty: 2, price: 2499)

    // 1. Increase quantity to 3
    const plusBtn = secondItem.locator(".qty-btn:has-text('+')");
    await plusBtn.click();
    await expect(secondItem.locator(".qty-val")).toHaveText("3");
    await expect(page.locator(".summary-row:has-text('选中商品原价')")).toContainText("6 件");

    // 2. Decrease quantity to 1 -> '-' button disabled
    const minusBtn = secondItem.locator(".qty-btn:has-text('-')");
    await minusBtn.click();
    await minusBtn.click();
    await expect(secondItem.locator(".qty-val")).toHaveText("1");
    await expect(minusBtn).toBeDisabled();

    // 3. Price input edit
    const thirdItem = page.locator(".items-list .item-row").nth(2); // Keychron (1199)
    const priceInput = thirdItem.locator(".price-input");
    await priceInput.fill("1500");
    await expect(thirdItem.locator(".subtotal-val")).toContainText("¥1,695.00"); // 1500 * 1.13

    // 4. Single item discount
    const firstItem = page.locator(".items-list .item-row").first(); // MacBook Pro (24999)
    const discountSelect = firstItem.locator(".discount-select");
    await discountSelect.selectOption("0.1"); // 9折 (-10%)

    await expect(firstItem.locator(".tax-hint")).toContainText("省 ¥2,499.90");
    await expect(page.locator(".summary-row.discount:has-text('单品特惠立减')")).toContainText("-¥2,499.90");
  });

  test("handles item selection toggles and Select All button", async ({ page }) => {
    const firstItem = page.locator(".items-list .item-row").first();
    const firstCheckbox = firstItem.locator(".item-checkbox");
    const selectAllBtn = page.locator(".select-all-btn");

    // 1. Uncheck first item
    await firstCheckbox.click();
    await expect(firstItem).toHaveClass(/opacity-60/);
    await expect(selectAllBtn).toContainText("全选 (3/4)");
    await expect(page.locator(".checkout-btn")).toContainText("立即结算 (3 款)");

    // 2. Click Select All -> all selected (4/4)
    await selectAllBtn.click();
    await expect(firstItem).not.toHaveClass(/opacity-60/);
    await expect(selectAllBtn).toContainText("全选 (4/4)");
    await expect(page.locator(".checkout-btn")).toContainText("立即结算 (4 款)");

    // 3. Click Select All again -> all unselected (0/4)
    await selectAllBtn.click();
    await expect(selectAllBtn).toContainText("全选 (0/4)");
    await expect(page.locator(".checkout-btn")).toBeDisabled();

    // 4. Select All again -> back to 4/4
    await selectAllBtn.click();
    await expect(selectAllBtn).toContainText("全选 (4/4)");
    await expect(page.locator(".checkout-btn")).toBeEnabled();
  });

  test("dynamically creates and disposes Child Scope containers on Add / Remove", async ({ page }) => {
    const addCustomBtn = page.locator("button:has-text('+ 动态增加商品')");

    // Add 1 custom item
    await addCustomBtn.click();
    await expect(page.locator(".items-list .item-row")).toHaveCount(5);
    await expect(page.locator(".log-box .log-entry").first()).toContainText("添加商品");

    // Delete the newly added 5th item
    const fifthItemDeleteBtn = page.locator(".items-list .item-row").nth(4).locator(".delete-btn");
    await fifthItemDeleteBtn.click();

    await expect(page.locator(".items-list .item-row")).toHaveCount(4);
    await expect(page.locator(".log-box .log-entry").first()).toContainText("销毁对应子容器 Scope");
  });

  test("checkout action and log clearing", async ({ page }) => {
    let dialogMessage = "";
    page.on("dialog", async (dialog) => {
      dialogMessage = dialog.message();
      await dialog.accept();
    });

    // Checkout
    await page.locator(".checkout-btn").click();
    expect(dialogMessage).toContain("结算成功！共支付: ¥46,528.88");
    await expect(page.locator(".log-box .log-entry").first()).toContainText("提交订单结算完成");

    // Clear logs
    const clearLogBtn = page.locator(".log-clear");
    await expect(clearLogBtn).toBeVisible();
    await clearLogBtn.click();
    await expect(page.locator(".log-box")).toContainText("暂无日志记录...");
  });
});
