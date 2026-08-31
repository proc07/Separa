import React from "react";
import { useService } from "@separa/react";
import { CartLogService, CartStoreService } from "@separa/example-cart-shared";

export function CartSummary() {
  const cartStore = useService(CartStoreService);
  const logService = useService(CartLogService);

  return (
    <aside className="summary-card">
      <h2 className="summary-title">订单结算汇总</h2>

      <div className="summary-rows">
        <div className="summary-row">
          <span>选中商品原价 ({cartStore.totalItemsCount} 件):</span>
          <span>{cartStore.formattedRawSubtotal}</span>
        </div>

        {cartStore.itemDiscountTotalCNY > 0 && (
          <div className="summary-row discount">
            <span>单品特惠立减:</span>
            <span>-{cartStore.formattedItemDiscountTotal}</span>
          </div>
        )}

        {cartStore.couponDeductionCNY > 0 && (
          <div className="summary-row discount">
            <span>全场优惠券抵扣:</span>
            <span>-{cartStore.formattedCouponDeduction}</span>
          </div>
        )}

        <div className="summary-row">
          <span>预估消费/增值税:</span>
          <span>+{cartStore.formattedTotalTax}</span>
        </div>

        <div className="summary-row total">
          <span>最终应付总额:</span>
          <span className="grand-price">{cartStore.formattedGrandTotal}</span>
        </div>
      </div>

      <button
        className="checkout-btn"
        disabled={cartStore.selectedScopes.length === 0}
        onClick={() => {
          alert(`结算成功！共支付: ${cartStore.formattedGrandTotal}`);
          logService.log(`💳 提交订单结算完成，实付: ${cartStore.formattedGrandTotal}`);
        }}
      >
        立即结算 ({cartStore.selectedScopes.length} 款)
      </button>

      {/* 实时 DI 审计流水日志 */}
      <div className="log-box">
        <div className="log-title">
          <span>📝 容器计算与状态审计日志</span>
          {logService.logs.length > 0 && (
            <span className="log-clear" onClick={() => logService.clear()}>
              清空
            </span>
          )}
        </div>
        {logService.logs.length === 0 ? (
          <div style={{ color: "#475569" }}>暂无日志记录...</div>
        ) : (
          logService.logs.map((log, i) => (
            <div key={i} className="log-entry">
              {log}
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
