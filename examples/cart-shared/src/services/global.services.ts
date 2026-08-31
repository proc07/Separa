import { Autowired, Service } from "@separa/core";
import { AVAILABLE_COUPONS, CURRENCIES, TAX_REGIONS } from "../constants";
import type { Coupon, CurrencyCode, CurrencyInfo, TaxRegion, TaxRegionInfo } from "../types";

/**
 * 全局审计与计算日志服务（Root Singleton 单例，所有商品行和结算引擎共用）
 */
@Service({ scope: "singleton" })
export class CartLogService {
  logs: string[] = [];

  log(message: string): void {
    const time = new Date().toLocaleTimeString();
    const entry = `[${time}] ${message}`;
    // 保持最近 50 条日志
    this.logs = [entry, ...this.logs.slice(0, 49)];
  }

  clear(): void {
    this.logs = [];
  }
}

/**
 * 全局多币种与汇率服务（Root Singleton 单例）
 */
@Service({ scope: "singleton" })
export class CurrencyService {
  currentCurrency: CurrencyCode = "CNY";

  @Autowired()
  private logService!: CartLogService;

  setCurrency(code: CurrencyCode): void {
    if (this.currentCurrency === code) return;
    this.currentCurrency = code;
    this.logService?.log(`🌐 切换全局结算货币为: ${code} (${this.info.symbol}), 汇率: ${this.info.rateAgainstCNY}`);
  }

  get info(): CurrencyInfo {
    return CURRENCIES[this.currentCurrency];
  }

  /** 将 CNY 价格换算为当前货币 */
  convert(cnyAmount: number): number {
    return cnyAmount * this.info.rateAgainstCNY;
  }

  /** 格式化金额 (附带货币符号) */
  format(cnyAmount: number): string {
    const converted = this.convert(cnyAmount);
    return `${this.info.symbol}${converted.toLocaleString("zh-CN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
}

/**
 * 全局地区税率规则服务（Root Singleton 单例）
 */
@Service({ scope: "singleton" })
export class TaxService {
  currentRegion: TaxRegion = "CN";

  @Autowired()
  private logService!: CartLogService;

  setRegion(region: TaxRegion): void {
    if (this.currentRegion === region) return;
    this.currentRegion = region;
    this.logService?.log(`🏛️ 切换税区为: ${this.info.name}, 标准税率: ${(this.info.standardRate * 100).toFixed(2)}%`);
  }

  get info(): TaxRegionInfo {
    return TAX_REGIONS[this.currentRegion];
  }

  get rate(): number {
    return this.info.standardRate;
  }
}

/**
 * 全局优惠券与满减服务（Root Singleton 单例）
 */
@Service({ scope: "singleton" })
export class CouponService {
  selectedCouponId = "none";

  @Autowired()
  private logService!: CartLogService;

  selectCoupon(couponId: string): void {
    if (this.selectedCouponId === couponId) return;
    this.selectedCouponId = couponId;
    this.logService?.log(`🎟️ 应用优惠券: ${this.currentCoupon.name}`);
  }

  get currentCoupon(): Coupon {
    return AVAILABLE_COUPONS.find((c) => c.id === this.selectedCouponId) || AVAILABLE_COUPONS[0]!;
  }
}
