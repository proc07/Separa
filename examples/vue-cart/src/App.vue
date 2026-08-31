<script setup lang="ts">
import { onMounted } from "vue";
import { useContainer, useService } from "@separa/vue";
import { CartStoreService, type SeparaContainer } from "@separa/example-cart-shared";
import GlobalHeader from "./components/GlobalHeader.vue";
import CartItemRow from "./components/CartItemRow.vue";
import CartSummary from "./components/CartSummary.vue";
import ScopedItemProvider from "./components/ScopedItemProvider.vue";
import "./App.css";

const rootContainer = useContainer() as SeparaContainer;
const cartStore = useService(CartStoreService);

const { itemScopes, selectedScopes, toggleSelectAll, addItem, removeItem } = cartStore;

onMounted(() => {
  cartStore.init(rootContainer);
});

function handleAddNewItem() {
  const id = `item-${Date.now().toString().slice(-4)}`;
  addItem(rootContainer, {
    id,
    name: `新增订制商品 #${id}`,
    price: Math.floor(Math.random() * 2000) + 100,
    quantity: 1,
    category: "自定义配件",
    image: "🎁",
  });
}
</script>

<template>
  <div class="cart-app">
    <!-- 顶部全局控制栏 (Parent Scope) -->
    <GlobalHeader />

    <div class="cart-layout">
      <!-- 商品列表卡片 -->
      <main class="items-card">
        <div class="items-header">
          <button class="select-all-btn" @click="toggleSelectAll()">
            <input
              type="checkbox"
              class="item-checkbox"
              :checked="
                itemScopes.length > 0 &&
                selectedScopes.length === itemScopes.length
              "
              readonly
            />
            <span>全选 ({{ selectedScopes.length }}/{{ itemScopes.length }})</span>
          </button>
          <button
            class="control-select"
            style="padding: 6px 12px; background: #ecfdf5; color: #047857; border: none"
            @click="handleAddNewItem"
          >
            + 动态增加商品 (创建子容器)
          </button>
        </div>

        <div class="items-list">
          <div
            v-if="itemScopes.length === 0"
            style="padding: 40px; text-align: center; color: #94a3b8"
          >
            购物车空空如也，点击上方按钮新增商品
          </div>
          <template v-else>
            <!-- 💡 关键：通过 ScopedItemProvider 为每个商品行绑定其独立的子容器 (Child Scope) -->
            <template
              v-for="scopeEntry in itemScopes"
              :key="scopeEntry.id"
            >
              <ScopedItemProvider
                v-if="cartStore.getContainer(scopeEntry.id)"
                :container="cartStore.getContainer(scopeEntry.id)!"
              >
                <CartItemRow :on-remove="(id) => removeItem(id)" />
              </ScopedItemProvider>
            </template>
          </template>
        </div>
      </main>

      <!-- 结算侧边栏 -->
      <CartSummary />
    </div>
  </div>
</template>
