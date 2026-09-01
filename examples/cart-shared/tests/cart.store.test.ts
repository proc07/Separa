import { describe, it, expect, beforeEach } from "vitest";
import { defineDecoratedService } from "@separa/core";
import { createContainer, SeparaContainer } from "@separa/ioc-inversify";
import {
  CartLogService,
  CurrencyService,
  TaxService,
  CouponService,
} from "../src/services/global.services";
import { ItemCalculatorService } from "../src/services/item.services";
import { CartStoreService } from "../src/services/cart.store";

describe("CartStoreService (examples/cart-shared)", () => {
  let rootContainer: SeparaContainer;
  let cartStore: CartStoreService;

  beforeEach(() => {
    rootContainer = createContainer({
      definitions: [
        defineDecoratedService(CartLogService, ["logs"]),
        defineDecoratedService(CurrencyService, ["currentCurrency"]),
        defineDecoratedService(TaxService, ["currentRegion"]),
        defineDecoratedService(CouponService, ["selectedCouponId"]),
        defineDecoratedService(CartStoreService, ["itemScopes"]),
        defineDecoratedService(ItemCalculatorService, []),
      ],
    });

    cartStore = rootContainer.get(CartStoreService);
  });

  describe("Initialization & Lifecycle", () => {
    it("initializes with default items upon onInit()", async () => {
      // Clear automatically loaded items to test onInit explicitly
      await cartStore.clear();
      expect(cartStore.itemScopes).toHaveLength(0);

      cartStore.onInit();
      expect(cartStore.itemScopes).toHaveLength(4);
      expect(cartStore.totalItemsCount).toBe(5); // 1 + 2 + 1 + 1 = 5 items
    });
  });

  describe("Item Scope Management", () => {
    it("adds items and manages child containers", async () => {
      await cartStore.clear();

      const entry = cartStore.addItem({
        id: "prod-1",
        name: "Test Phone",
        price: 5000,
        quantity: 1,
        category: "Mobile",
      });

      expect(cartStore.itemScopes).toHaveLength(1);
      expect(cartStore.itemScopes[0]?.id).toBe("prod-1");

      const child = cartStore.getChildContainer("prod-1");
      expect(child).toBeDefined();
    });

    it("removes an item and disposes its child container", async () => {
      await cartStore.clear();
      cartStore.addItem({
        id: "prod-1",
        name: "Test Phone",
        price: 5000,
        quantity: 1,
        category: "Test",
      });

      const child = cartStore.getChildContainer("prod-1");
      expect(child).toBeDefined();

      await cartStore.removeItem("prod-1");
      expect(cartStore.itemScopes).toHaveLength(0);
      expect(cartStore.getChildContainer("prod-1")).toBeUndefined();
    });

    it("clears all items and disposes all child containers", async () => {
      await cartStore.clear();
      cartStore.addItem({ id: "p1", name: "P1", price: 100, quantity: 1, category: "Test" });
      cartStore.addItem({ id: "p2", name: "P2", price: 200, quantity: 1, category: "Test" });
      expect(cartStore.itemScopes).toHaveLength(2);

      await cartStore.clear();
      expect(cartStore.itemScopes).toHaveLength(0);
      expect(cartStore.getChildContainer("p1")).toBeUndefined();
      expect(cartStore.getChildContainer("p2")).toBeUndefined();
    });
  });

  describe("Selection & Totals Aggregation", () => {
    it("toggles all selection states", async () => {
      await cartStore.clear();
      cartStore.addItem({ id: "p1", name: "P1", price: 100, quantity: 1, category: "Test" });
      cartStore.addItem({ id: "p2", name: "P2", price: 200, quantity: 1, category: "Test" });

      expect(cartStore.selectedScopes).toHaveLength(2);

      cartStore.toggleSelectAll(); // unselect all
      expect(cartStore.selectedScopes).toHaveLength(0);
      expect(cartStore.totalItemsCount).toBe(0);

      cartStore.toggleSelectAll(); // select all
      expect(cartStore.selectedScopes).toHaveLength(2);
      expect(cartStore.totalItemsCount).toBe(2);
    });

    it("calculates raw subtotals, item discounts, coupons, taxes and grand totals", async () => {
      await cartStore.clear();
      const entry1 = cartStore.addItem({
        id: "p1",
        name: "P1",
        price: 1000,
        quantity: 2, // 2000
        category: "Test",
      });
      const entry2 = cartStore.addItem({
        id: "p2",
        name: "P2",
        price: 3000,
        quantity: 1, // 3000
        category: "Test",
      });

      // 1. Raw total = 2000 + 3000 = 5000
      expect(cartStore.rawSubtotalCNY).toBe(5000);
      expect(cartStore.itemDiscountTotalCNY).toBe(0);
      expect(cartStore.netSubtotalCNY).toBe(5000);

      // 2. Add single item discount: 10% on entry1 (2000 * 0.1 = 200)
      entry1.item.setDiscountRate(0.1);
      expect(cartStore.itemDiscountTotalCNY).toBe(200);
      expect(cartStore.netSubtotalCNY).toBe(4800); // 5000 - 200

      // 3. Apply coupon full 2000 minus 300
      const couponService = rootContainer.get(CouponService);
      couponService.selectCoupon("full2000_300");
      expect(cartStore.couponDeductionCNY).toBe(300);
      expect(cartStore.taxableAmountCNY).toBe(4500); // 4800 - 300

      // 4. Tax: CN 13% of 4500 = 585
      expect(cartStore.totalTaxCNY).toBe(585);
      expect(cartStore.grandTotalCNY).toBe(5085); // 4500 + 585

      // 5. Formatted strings
      expect(cartStore.formattedRawSubtotal).toBe("¥5,000.00");
      expect(cartStore.formattedItemDiscountTotal).toBe("¥200.00");
      expect(cartStore.formattedCouponDeduction).toBe("¥300.00");
      expect(cartStore.formattedTotalTax).toBe("¥585.00");
      expect(cartStore.formattedGrandTotal).toBe("¥5,085.00");

      // 6. Rate coupon (vip90: 10% off net subtotal 4800 = 480)
      couponService.selectCoupon("vip90");
      expect(cartStore.couponDeductionCNY).toBe(480);
      expect(cartStore.taxableAmountCNY).toBe(4320); // 4800 - 480
    });
  });
});
