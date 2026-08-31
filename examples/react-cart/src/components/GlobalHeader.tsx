import React from "react";
import { useService } from "@separa/react";
import {
  AVAILABLE_COUPONS,
  CouponService,
  CURRENCIES,
  CurrencyCode,
  CurrencyService,
  TAX_REGIONS,
  TaxRegion,
  TaxService,
} from "@separa/example-cart-shared";

export function GlobalHeader() {
  const currencyService = useService(CurrencyService);
  const taxService = useService(TaxService);
  const couponService = useService(CouponService);

  return (
    <header className="app-header">
      <div className="header-title-row">
        <div className="header-title">
          <span>🛒 动态多币种核价购物车</span>
          <span className="tag-badge">Separa · Scoped Container</span>
        </div>
        <div style={{ fontSize: "0.85rem", color: "#64748b" }}>
          基于子容器隔离的单品核价与全局汇率/税则联动
        </div>
      </div>

      <div className="global-controls">
        {/* 全局结算货币 */}
        <div className="control-item">
          <label className="control-label">🌐 结算货币 (Parent Scope)</label>
          <select
            className="control-select"
            value={currencyService.currentCurrency}
            onChange={(e) => currencyService.setCurrency(e.target.value as CurrencyCode)}
          >
            {Object.values(CURRENCIES).map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} ({c.symbol}) - 汇率 {c.rateAgainstCNY}
              </option>
            ))}
          </select>
        </div>

        {/* 全局地区税率 */}
        <div className="control-item">
          <label className="control-label">🏛️ 收货税区 (Parent Scope)</label>
          <select
            className="control-select"
            value={taxService.currentRegion}
            onChange={(e) => taxService.setRegion(e.target.value as TaxRegion)}
          >
            {Object.values(TAX_REGIONS).map((r) => (
              <option key={r.region} value={r.region}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        {/* 全局促销优惠券 */}
        <div className="control-item">
          <label className="control-label">🎟️ 全场优惠券 (Parent Scope)</label>
          <select
            className="control-select"
            value={couponService.selectedCouponId}
            onChange={(e) => couponService.selectCoupon(e.target.value)}
          >
            {AVAILABLE_COUPONS.map((coupon) => (
              <option key={coupon.id} value={coupon.id}>
                {coupon.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </header>
  );
}
