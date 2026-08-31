import React, { useEffect } from "react";
import { SeparaProvider, useContainer, useService } from "@separa/react";
import { CartStoreService, SeparaContainer } from "@separa/example-cart-shared";
import { GlobalHeader } from "./components/GlobalHeader";
import { CartItemRow } from "./components/CartItemRow";
import { CartSummary } from "./components/CartSummary";
import "./App.css";

export default function App() {
  const rootContainer = useContainer() as SeparaContainer;
  const cartStore = useService(CartStoreService);

  // 初始化加载默认商品行
  useEffect(() => {
    cartStore.init(rootContainer);
  }, [cartStore, rootContainer]);

  function handleAddNewItem() {
    const id = `item-${Date.now().toString().slice(-4)}`;
    cartStore.addItem(rootContainer, {
      id,
      name: `新增订制商品 #${id}`,
      price: Math.floor(Math.random() * 2000) + 100,
      quantity: 1,
      category: "自定义配件",
      image: "🎁",
    });
  }

  return (
    <div className="cart-app">
      {/* 顶部全局控制栏 (Parent Scope) */}
      <GlobalHeader />

      <div className="cart-layout">
        {/* 商品列表卡片 */}
        <main className="items-card">
          <div className="items-header">
            <button
              className="select-all-btn"
              onClick={() => cartStore.toggleSelectAll()}
            >
              <input
                type="checkbox"
                className="item-checkbox"
                checked={
                  cartStore.itemScopes.length > 0 &&
                  cartStore.selectedScopes.length === cartStore.itemScopes.length
                }
                readOnly
              />
              <span>全选 ({cartStore.selectedScopes.length}/{cartStore.itemScopes.length})</span>
            </button>
            <button
              className="control-select"
              style={{ padding: "6px 12px", background: "#e0e7ff", color: "#4338ca", border: "none" }}
              onClick={handleAddNewItem}
            >
              + 动态增加商品 (创建子容器)
            </button>
          </div>

          <div className="items-list">
            {cartStore.itemScopes.length === 0 ? (
              <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>
                购物车空空如也，点击上方按钮新增商品
              </div>
            ) : (
              cartStore.itemScopes.map((scopeEntry) => {
                const childContainer = cartStore.getContainer(scopeEntry.id);
                if (!childContainer) return null;
                return (
                  // 💡 关键：为每个商品行注入其独立的子容器 (Child Scope)
                  <SeparaProvider key={scopeEntry.id} container={childContainer}>
                    <CartItemRow onRemove={(id) => cartStore.removeItem(id)} />
                  </SeparaProvider>
                );
              })
            )}
          </div>
        </main>

        {/* 结算侧边栏 */}
        <CartSummary />
      </div>
    </div>
  );
}
