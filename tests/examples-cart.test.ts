import { describe, expect, it } from "vitest";
import { defineDecoratedService } from "@separa/core";
import { createContainer, SeparaContainer } from "@separa/ioc-inversify";
import {
  CartLogService,
  CartStoreService,
  CouponService,
  CurrencyService,
  ItemCalculatorService,
  ItemService,
  ItemToken,
  TaxService,
} from "@separa/example-cart-shared";

describe("Scoped Shopping Cart (Child Containers)", () => {
  function buildRootContainer() {
    return createContainer({
      definitions: [
        defineDecoratedService(CartLogService, ["logs"]),
        defineDecoratedService(CurrencyService, ["currentCurrency"]),
        defineDecoratedService(TaxService, ["currentRegion"]),
        defineDecoratedService(CouponService, ["selectedCouponId"]),
        defineDecoratedService(CartStoreService, ["itemScopes"]),
        defineDecoratedService(ItemCalculatorService, []),
      ],
    });
  }

  it("creates child scopes with isolated ItemService instances sharing parent services", async () => {
    const root = buildRootContainer();
    const cartStore = root.get(CartStoreService);
    const currency = root.get(CurrencyService);
    const tax = root.get(TaxService);
    const log = root.get(CartLogService);

    // 0. Start with clean cart
    await cartStore.clear();

    // 1. Add two items
    const scope1 = cartStore.addItem({
      id: "item-1",
      name: "MacBook Pro",
      price: 20000,
      quantity: 1,
      category: "Laptop",
    });

    const scope2 = cartStore.addItem({
      id: "item-2",
      name: "iPhone",
      price: 8000,
      quantity: 2,
      category: "Phone",
    });

    // 2. Verify child containers resolve their respective ItemService
    expect(cartStore.getChildContainer(scope1.id)!.get(ItemService).name).toBe("MacBook Pro");
    expect(cartStore.getChildContainer(scope2.id)!.get(ItemService).name).toBe("iPhone");

    // 3. Verify calculators resolve the correct item & parent services
    // Item 1: 20000 * 1 = 20000 CNY, Tax (13%) = 2600 CNY, Total = 22600 CNY
    expect(scope1.calculator.rawSubtotalCNY).toBe(20000);
    expect(scope1.calculator.taxAmountCNY).toBe(2600);
    expect(scope1.calculator.finalTotalCNY).toBe(22600);

    // Item 2: 8000 * 2 = 16000 CNY, Tax (13%) = 2080 CNY, Total = 18080 CNY
    expect(scope2.calculator.rawSubtotalCNY).toBe(16000);
    expect(scope2.calculator.taxAmountCNY).toBe(2080);
    expect(scope2.calculator.finalTotalCNY).toBe(18080);

    // 4. Verify parent service (CurrencyService) change affects both child calculators
    currency.setCurrency("USD"); // Rate = 0.14
    expect(scope1.calculator.formattedFinalTotal).toBe("$3,164.00");
    expect(scope2.calculator.formattedFinalTotal).toBe("$2,531.20");

    // 5. Verify parent service (TaxService) change affects both child calculators
    tax.setRegion("US"); // Rate = 0.0725
    expect(scope1.calculator.taxAmountCNY).toBe(1450);
    expect(scope2.calculator.taxAmountCNY).toBe(1160);

    // 6. Verify item price modification in scope1 only affects scope1
    scope1.item.setPrice(22000);
    expect(scope1.calculator.rawSubtotalCNY).toBe(22000);
    expect(scope2.calculator.rawSubtotalCNY).toBe(16000);

    // 7. Verify global audit logs recorded all events
    expect(log.logs.length).toBeGreaterThan(3);
  });

  it("calculates grand total and supports disposing child scopes", async () => {
    const root = buildRootContainer();
    const cartStore = root.get(CartStoreService);
    const couponService = root.get(CouponService);

    // 0. Start with clean cart
    await cartStore.clear();

    const s1 = cartStore.addItem({
      id: "a",
      name: "Item A",
      price: 1000,
      quantity: 1,
      category: "Test",
    });

    const s2 = cartStore.addItem({
      id: "b",
      name: "Item B",
      price: 2000,
      quantity: 1,
      category: "Test",
    });

    // Subtotal = 3000 CNY
    expect(cartStore.rawSubtotalCNY).toBe(3000);

    // Apply Coupon: Full ¥2000 - ¥300
    couponService.selectCoupon("full2000_300");
    expect(cartStore.couponDeductionCNY).toBe(300);
    // Taxable = 2700, Tax (13%) = 351, Grand = 3051
    expect(cartStore.taxableAmountCNY).toBe(2700);
    expect(cartStore.totalTaxCNY).toBe(351);
    expect(cartStore.grandTotalCNY).toBe(3051);

    // Remove item A (disposes its child container)
    await cartStore.removeItem("a");
    expect(cartStore.itemScopes).toHaveLength(1);
    expect(cartStore.rawSubtotalCNY).toBe(2000);
  });
});
