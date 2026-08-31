import React from "react";
import { useService } from "@separa/react";
import { ItemCalculatorService, ItemToken } from "@separa/example-cart-shared";

interface CartItemRowProps {
  onRemove: (id: string) => void;
}

export function CartItemRow({ onRemove }: CartItemRowProps) {
  // 💡 关键：从当前子容器解析该商品行特有的 ItemService 和专属核价引擎 CalculatorService
  const item = useService(ItemToken);
  const calculator = useService(ItemCalculatorService);

  return (
    <div className={`item-row ${!item.isSelected ? "opacity-60" : ""}`}>
      {/* 勾选框 */}
      <input
        type="checkbox"
        className="item-checkbox"
        checked={item.isSelected}
        onChange={() => item.toggleSelected()}
        aria-label="选择商品"
      />

      {/* 商品图标 */}
      <div className="item-image">{item.image}</div>

      {/* 商品信息与单价编辑 */}
      <div className="item-info">
        <div className="item-name">{item.name}</div>
        <div className="item-meta">
          <span className="item-badge-di">Scope: #{item.id}</span>
          <span>分类: {item.category}</span>
          <div className="item-price-edit">
            <span>基准单价: ¥</span>
            <input
              type="number"
              className="price-input"
              value={item.price}
              onChange={(e) => item.setPrice(Number(e.target.value))}
            />
          </div>
        </div>
      </div>

      {/* 数量调节器 */}
      <div className="item-qty-controls">
        <button
          className="qty-btn"
          onClick={() => item.setQuantity(item.quantity - 1)}
          disabled={item.quantity <= 1}
        >
          -
        </button>
        <span className="qty-val">{item.quantity}</span>
        <button
          className="qty-btn"
          onClick={() => item.setQuantity(item.quantity + 1)}
        >
          +
        </button>
      </div>

      {/* 单品专享折扣 */}
      <div className="item-discount-selector">
        <select
          className="discount-select"
          value={item.discountRate}
          onChange={(e) => item.setDiscountRate(Number(e.target.value))}
        >
          <option value={0}>无单品特惠</option>
          <option value={0.05}>95折 (-5%)</option>
          <option value={0.1}>9折 (-10%)</option>
          <option value={0.2}>8折 (-20%)</option>
        </select>
      </div>

      {/* 单品小计 (由当前子容器的 Calculator 计算得出) */}
      <div className="item-subtotal-block">
        <div className="subtotal-val">{calculator.formattedFinalTotal}</div>
        <div className="tax-hint">
          含税: {calculator.formattedTaxAmount}
          {item.discountRate > 0 && ` (省 ${calculator.currencyService.format(calculator.itemDiscountAmountCNY)})`}
        </div>
      </div>

      {/* 删除按钮 */}
      <button
        className="delete-btn"
        onClick={() => onRemove(item.id)}
        title="移除此商品并销毁子容器"
        aria-label="删除"
      >
        ×
      </button>
    </div>
  );
}
