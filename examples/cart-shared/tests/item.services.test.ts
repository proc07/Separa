import { describe, it, expect, beforeEach } from "vitest";
import { defineDecoratedService } from "@separa/core";
import { createContainer, SeparaContainer } from "@separa/ioc-inversify";
import {
  CartLogService,
  CurrencyService,
  TaxService,
} from "../src/services/global.services";
import {
  createItemScope,
  ItemCalculatorService,
  ItemService,
  ItemToken,
} from "../src/services/item.services";
import type { CartItemInitialProps } from "../src/types";

describe("Item Services & Scope (examples/cart-shared)", () => {
  let rootContainer: SeparaContainer;

  beforeEach(() => {
    rootContainer = createContainer({
      definitions: [
        defineDecoratedService(CartLogService, ["logs"]),
        defineDecoratedService(CurrencyService, ["currentCurrency"]),
        defineDecoratedService(TaxService, ["currentRegion"]),
      ],
    });
  });

  const testItemProps: CartItemInitialProps = {
    id: "item-test",
    name: "Test Laptop",
    price: 10000,
    quantity: 2,
    category: "Computers",
    image: "💻",
  };

  describe("ItemService", () => {
    it("initializes with provided props and allows mutations", () => {
      const scope = createItemScope(rootContainer, testItemProps);
      const item = scope.item;

      expect(item.id).toBe("item-test");
      expect(item.name).toBe("Test Laptop");
      expect(item.price).toBe(10000);
      expect(item.quantity).toBe(2);
      expect(item.discountRate).toBe(0);
      expect(item.category).toBe("Computers");
      expect(item.image).toBe("💻");
      expect(item.isSelected).toBe(true);

      // setPrice
      item.setPrice(12000);
      expect(item.price).toBe(12000);

      // setQuantity (with minimum 1 protection)
      item.setQuantity(5);
      expect(item.quantity).toBe(5);
      item.setQuantity(0);
      expect(item.quantity).toBe(1);

      // setDiscountRate
      item.setDiscountRate(0.1);
      expect(item.discountRate).toBe(0.1);

      // toggleSelected
      item.toggleSelected();
      expect(item.isSelected).toBe(false);
      item.toggleSelected();
      expect(item.isSelected).toBe(true);
    });
  });

  describe("ItemCalculatorService", () => {
    it("computes subtotals, single-item discounts, taxes, and formatted totals accurately", () => {
      const scope = createItemScope(rootContainer, {
        ...testItemProps,
        price: 10000,
        quantity: 2,
      });

      const item = scope.item;
      const calculator = scope.calculator;
      const tax = rootContainer.get(TaxService);
      const currency = rootContainer.get(CurrencyService);

      // 1. Initial: price = 10000, quantity = 2, discount = 0, tax = 13% (CN)
      // raw = 20000, discount = 0, discounted = 20000, tax = 2600, total = 22600
      expect(calculator.rawSubtotalCNY).toBe(20000);
      expect(calculator.itemDiscountAmountCNY).toBe(0);
      expect(calculator.discountedSubtotalCNY).toBe(20000);
      expect(calculator.taxAmountCNY).toBe(2600);
      expect(calculator.finalTotalCNY).toBe(22600);
      expect(calculator.formattedUnitPrice).toBe("¥10,000.00");
      expect(calculator.formattedDiscountedSubtotal).toBe("¥20,000.00");
      expect(calculator.formattedTaxAmount).toBe("¥2,600.00");
      expect(calculator.formattedItemDiscount).toBe("¥0.00");
      expect(calculator.formattedFinalTotal).toBe("¥22,600.00");

      // 2. Apply 10% discount: rate = 0.1
      // raw = 20000, discount = 2000, discounted = 18000, tax = 2340 (18000 * 0.13), total = 20340
      item.setDiscountRate(0.1);
      expect(calculator.rawSubtotalCNY).toBe(20000);
      expect(calculator.itemDiscountAmountCNY).toBe(2000);
      expect(calculator.discountedSubtotalCNY).toBe(18000);
      expect(calculator.taxAmountCNY).toBe(2340);
      expect(calculator.finalTotalCNY).toBe(20340);
      expect(calculator.formattedItemDiscount).toBe("¥2,000.00");
      expect(calculator.formattedFinalTotal).toBe("¥20,340.00");

      // 3. Switch global tax region to US (7.25%)
      // tax = 18000 * 0.0725 = 1305, total = 19305
      tax.setRegion("US");
      expect(calculator.taxAmountCNY).toBe(1305);
      expect(calculator.finalTotalCNY).toBe(19305);
      expect(calculator.formattedTaxAmount).toBe("¥1,305.00");

      // 4. Switch global currency to USD (0.14 rate)
      currency.setCurrency("USD");
      expect(calculator.formattedUnitPrice).toBe("$1,400.00");
      expect(calculator.formattedFinalTotal).toBe(`$${(19305 * 0.14).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    });
  });

  describe("createItemScope Isolation", () => {
    it("creates isolated item instances in child containers that share parent services", () => {
      const scope1 = createItemScope(rootContainer, {
        id: "item-1",
        name: "Item 1",
        price: 100,
        quantity: 1,
        category: "Test",
      });

      const scope2 = createItemScope(rootContainer, {
        id: "item-2",
        name: "Item 2",
        price: 200,
        quantity: 3,
        category: "Test",
      });

      expect(scope1.item).not.toBe(scope2.item);
      expect(scope1.calculator).not.toBe(scope2.calculator);

      // Child containers resolve ItemToken correctly
      expect(scope1.container.get(ItemToken).name).toBe("Item 1");
      expect(scope2.container.get(ItemToken).name).toBe("Item 2");

      // Both calculators share the same root CurrencyService & TaxService
      expect(scope1.calculator.currencyService).toBe(rootContainer.get(CurrencyService));
      expect(scope2.calculator.currencyService).toBe(rootContainer.get(CurrencyService));
    });
  });
});
