<script setup lang="ts">
import { useService } from "@separa/vue";
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

const currencyService = useService(CurrencyService);
const taxService = useService(TaxService);
const couponService = useService(CouponService);

const { currentCurrency, setCurrency } = currencyService;
const { currentRegion, setRegion } = taxService;
const { selectedCouponId, selectCoupon } = couponService;
</script>

<template>
  <header class="app-header">
    <div class="header-title-row">
      <div class="header-title">
        <span>🛒 动态多币种核价购物车</span>
        <span class="tag-badge">Separa · Scoped Container</span>
      </div>
      <div style="font-size: 0.85rem; color: #64748b">
        基于子容器隔离的单品核价与全局汇率/税则联动 (Vue 3 版本)
      </div>
    </div>

    <div class="global-controls">
      <!-- 全局结算货币 -->
      <div class="control-item">
        <label class="control-label">🌐 结算货币 (Parent Scope)</label>
        <select
          class="control-select"
          :value="currentCurrency"
          @change="(e) => setCurrency((e.target as HTMLSelectElement).value as CurrencyCode)"
        >
          <option
            v-for="c in Object.values(CURRENCIES)"
            :key="c.code"
            :value="c.code"
          >
            {{ c.code }} ({{ c.symbol }}) - 汇率 {{ c.rateAgainstCNY }}
          </option>
        </select>
      </div>

      <!-- 全局地区税率 -->
      <div class="control-item">
        <label class="control-label">🏛️ 收货税区 (Parent Scope)</label>
        <select
          class="control-select"
          :value="currentRegion"
          @change="(e) => setRegion((e.target as HTMLSelectElement).value as TaxRegion)"
        >
          <option
            v-for="r in Object.values(TAX_REGIONS)"
            :key="r.region"
            :value="r.region"
          >
            {{ r.name }}
          </option>
        </select>
      </div>

      <!-- 全局促销优惠券 -->
      <div class="control-item">
        <label class="control-label">🎟️ 全场优惠券 (Parent Scope)</label>
        <select
          class="control-select"
          :value="selectedCouponId"
          @change="(e) => selectCoupon((e.target as HTMLSelectElement).value)"
        >
          <option
            v-for="coupon in AVAILABLE_COUPONS"
            :key="coupon.id"
            :value="coupon.id"
          >
            {{ coupon.name }}
          </option>
        </select>
      </div>
    </div>
  </header>
</template>
