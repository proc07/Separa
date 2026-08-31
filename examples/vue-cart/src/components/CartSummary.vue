<script setup lang="ts">
import { useService } from "@separa/vue";
import { CartLogService, CartStoreService } from "@separa/example-cart-shared";

const cartStore = useService(CartStoreService);
const logService = useService(CartLogService);

const {
  totalItemsCount,
  formattedRawSubtotal,
  itemDiscountTotalCNY,
  formattedItemDiscountTotal,
  couponDeductionCNY,
  formattedCouponDeduction,
  formattedTotalTax,
  formattedGrandTotal,
  selectedScopes,
} = cartStore;

const { logs, clear, log } = logService;

function handleCheckout() {
  alert(`结算成功！共支付: ${formattedGrandTotal.value}`);
  log(`💳 提交订单结算完成，实付: ${formattedGrandTotal.value}`);
}
</script>

<template>
  <aside class="summary-card">
    <h2 class="summary-title">订单结算汇总</h2>

    <div class="summary-rows">
      <div class="summary-row">
        <span>选中商品原价 ({{ totalItemsCount }} 件):</span>
        <span>{{ formattedRawSubtotal }}</span>
      </div>

      <div v-if="itemDiscountTotalCNY > 0" class="summary-row discount">
        <span>单品特惠立减:</span>
        <span>-{{ formattedItemDiscountTotal }}</span>
      </div>

      <div v-if="couponDeductionCNY > 0" class="summary-row discount">
        <span>全场优惠券抵扣:</span>
        <span>-{{ formattedCouponDeduction }}</span>
      </div>

      <div class="summary-row">
        <span>预估消费/增值税:</span>
        <span>+{{ formattedTotalTax }}</span>
      </div>

      <div class="summary-row total">
        <span>最终应付总额:</span>
        <span class="grand-price">{{ formattedGrandTotal }}</span>
      </div>
    </div>

    <button
      class="checkout-btn"
      :disabled="selectedScopes.length === 0"
      @click="handleCheckout"
    >
      立即结算 ({{ selectedScopes.length }} 款)
    </button>

    <!-- 实时 DI 审计流水日志 -->
    <div class="log-box">
      <div class="log-title">
        <span>📝 容器计算与状态审计日志</span>
        <span v-if="logs.length > 0" class="log-clear" @click="clear()">
          清空
        </span>
      </div>
      <div v-if="logs.length === 0" style="color: #475569">
        暂无日志记录...
      </div>
      <div
        v-for="(logItem, i) in logs"
        :key="i"
        class="log-entry"
      >
        {{ logItem }}
      </div>
    </div>
  </aside>
</template>
