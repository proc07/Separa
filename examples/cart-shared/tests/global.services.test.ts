import { describe, it, expect, beforeEach } from "vitest";
import { defineDecoratedService } from "@separa/core";
import { createContainer } from "@separa/ioc-inversify";
import {
  CartLogService,
  CurrencyService,
  TaxService,
  CouponService,
} from "../src/services/global.services";
import { AVAILABLE_COUPONS, CURRENCIES, TAX_REGIONS } from "../src/constants";

describe("Global Cart Services (examples/cart-shared)", () => {
  describe("CartLogService", () => {
    let logService: CartLogService;

    beforeEach(() => {
      logService = new CartLogService();
    });

    it("starts with empty logs", () => {
      expect(logService.logs).toEqual([]);
    });

    it("adds timestamped logs in reverse chronological order", () => {
      logService.log("First action");
      logService.log("Second action");

      expect(logService.logs).toHaveLength(2);
      expect(logService.logs[0]).toContain("Second action");
      expect(logService.logs[1]).toContain("First action");
    });

    it("caps logs at a maximum of 50 entries", () => {
      for (let i = 0; i < 60; i++) {
        logService.log(`Log ${i}`);
      }
      expect(logService.logs).toHaveLength(50);
      expect(logService.logs[0]).toContain("Log 59");
    });

    it("clears logs upon calling clear()", () => {
      logService.log("Message");
      logService.clear();
      expect(logService.logs).toEqual([]);
    });
  });

  describe("CurrencyService", () => {
    it("converts and formats CNY amounts across different currencies", () => {
      const container = createContainer({
        definitions: [
          defineDecoratedService(CartLogService, ["logs"]),
          defineDecoratedService(CurrencyService, ["currentCurrency"]),
        ],
      });

      const currency = container.get(CurrencyService);
      const log = container.get(CartLogService);

      // Default: CNY
      expect(currency.currentCurrency).toBe("CNY");
      expect(currency.info).toEqual(CURRENCIES.CNY);
      expect(currency.convert(100)).toBe(100);
      expect(currency.format(100)).toBe("¥100.00");

      // Switch to USD
      currency.setCurrency("USD");
      expect(currency.currentCurrency).toBe("USD");
      expect(currency.info).toEqual(CURRENCIES.USD);
      expect(currency.convert(100)).toBeCloseTo(14, 2);
      expect(currency.format(100)).toBe("$14.00");
      expect(log.logs[0]).toContain("切换全局结算货币为: USD");

      // Switch to EUR
      currency.setCurrency("EUR");
      expect(currency.currentCurrency).toBe("EUR");
      expect(currency.convert(100)).toBeCloseTo(13, 2);
      expect(currency.format(100)).toBe("€13.00");

      // Switch to JPY
      currency.setCurrency("JPY");
      expect(currency.currentCurrency).toBe("JPY");
      expect(currency.convert(100)).toBe(2150);
      expect(currency.format(100)).toBe("円2,150.00");

      // Setting same currency is no-op
      const logCount = log.logs.length;
      currency.setCurrency("JPY");
      expect(log.logs.length).toBe(logCount);
    });
  });

  describe("TaxService", () => {
    it("updates region tax rates and provides rate information", () => {
      const container = createContainer({
        definitions: [
          defineDecoratedService(CartLogService, ["logs"]),
          defineDecoratedService(TaxService, ["currentRegion"]),
        ],
      });

      const tax = container.get(TaxService);
      const log = container.get(CartLogService);

      // Default: CN (13%)
      expect(tax.currentRegion).toBe("CN");
      expect(tax.info).toEqual(TAX_REGIONS.CN);
      expect(tax.rate).toBe(0.13);

      // Switch to US (7.25%)
      tax.setRegion("US");
      expect(tax.currentRegion).toBe("US");
      expect(tax.rate).toBe(0.0725);
      expect(log.logs[0]).toContain("切换税区为: 美国加州");

      // Switch to EU (20%)
      tax.setRegion("EU");
      expect(tax.currentRegion).toBe("EU");
      expect(tax.rate).toBe(0.20);

      // Switch to JP (10%)
      tax.setRegion("JP");
      expect(tax.currentRegion).toBe("JP");
      expect(tax.rate).toBe(0.10);
    });
  });

  describe("CouponService", () => {
    it("manages active coupon selection", () => {
      const container = createContainer({
        definitions: [
          defineDecoratedService(CartLogService, ["logs"]),
          defineDecoratedService(CouponService, ["selectedCouponId"]),
        ],
      });

      const couponService = container.get(CouponService);
      const log = container.get(CartLogService);

      // Default: none
      expect(couponService.selectedCouponId).toBe("none");
      expect(couponService.currentCoupon.id).toBe("none");

      // Select VIP 90
      couponService.selectCoupon("vip90");
      expect(couponService.selectedCouponId).toBe("vip90");
      expect(couponService.currentCoupon.name).toContain("VIP 会员全场 9 折");
      expect(log.logs[0]).toContain("应用优惠券");

      // Select full 500 minus 50
      couponService.selectCoupon("full500_50");
      expect(couponService.currentCoupon.threshold).toBe(500);
      expect(couponService.currentCoupon.deduction).toBe(50);

      // Unknown coupon falls back to default
      couponService.selectCoupon("invalid-id");
      expect(couponService.currentCoupon.id).toBe("none");
    });
  });
});
