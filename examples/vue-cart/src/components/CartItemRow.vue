<script setup lang="ts">
import { useService } from "@separa/vue";
import { ItemCalculatorService, ItemToken } from "@separa/example-cart-shared";

defineProps<{
  onRemove: (id: string) => void;
}>();

// 💡 关键：从当前子容器解析该商品行特有的 ItemService 和专属核价引擎 CalculatorService
const item = useService(ItemToken);
const calculator = useService(ItemCalculatorService);

const {
  id,
  name,
  price,
  quantity,
  discountRate,
  category,
  image,
  isSelected,
  setQuantity,
  setPrice,
  setDiscountRate,
  toggleSelected,
} = item;

const {
  formattedFinalTotal,
  formattedTaxAmount,
  itemDiscountAmountCNY,
  currencyService,
} = calculator;
</script>

<template>
  <div class="item-row" :class="{ 'opacity-60': !isSelected }">
    <!-- 勾选框 -->
    <input
      type="checkbox"
      class="item-checkbox"
      :checked="isSelected"
      @change="toggleSelected()"
      aria-label="选择商品"
    />

    <!-- 商品图标 -->
    <div class="item-image">{{ image }}</div>

    <!-- 商品信息与单价编辑 -->
    <div class="item-info">
      <div class="item-name">{{ name }}</div>
      <div class="item-meta">
        <span class="item-badge-di">Scope: #{{ id }}</span>
        <span>分类: {{ category }}</span>
        <div class="item-price-edit">
          <span>基准单价: ¥</span>
          <input
            type="number"
            class="price-input"
            :value="price"
            @change="(e) => setPrice(Number((e.target as HTMLInputElement).value))"
          />
        </div>
      </div>
    </div>

    <!-- 数量调节器 -->
    <div class="item-qty-controls">
      <button
        class="qty-btn"
        :disabled="quantity <= 1"
        @click="setQuantity(quantity - 1)"
      >
        -
      </button>
      <span class="qty-val">{{ quantity }}</span>
      <button class="qty-btn" @click="setQuantity(quantity + 1)">+</button>
    </div>

    <!-- 单品专享折扣 -->
    <div class="item-discount-selector">
      <select
        class="discount-select"
        :value="discountRate"
        @change="(e) => setDiscountRate(Number((e.target as HTMLSelectElement).value))"
      >
        <option :value="0">无单品特惠</option>
        <option :value="0.05">95折 (-5%)</option>
        <option :value="0.1">9折 (-10%)</option>
        <option :value="0.2">8折 (-20%)</option>
      </select>
    </div>

    <!-- 单品小计 (由当前子容器的 Calculator 计算得出) -->
    <div class="item-subtotal-block">
      <div class="subtotal-val">{{ formattedFinalTotal }}</div>
      <div class="tax-hint">
        含税: {{ formattedTaxAmount }}
        <template v-if="discountRate > 0">
          (省 {{ currencyService.format(itemDiscountAmountCNY) }})
        </template>
      </div>
    </div>

    <!-- 删除按钮 -->
    <button
      class="delete-btn"
      title="移除此商品并销毁子容器"
      aria-label="删除"
      @click="onRemove(id)"
    >
      ×
    </button>
  </div>
</template>
