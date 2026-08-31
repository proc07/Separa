import { Autowired, Service } from "@separa/core";
import { SeparaContainer } from "@separa/ioc-inversify";
import { INITIAL_CART_ITEMS } from "../constants";
import { CartLogService, CouponService, CurrencyService, TaxService } from "./global.services";
import { createItemScope, ItemCalculatorService, ItemService } from "./item.services";
import type { CartItemInitialProps } from "../types";

export interface ItemScopeEntry {
  readonly id: string;
  readonly item: ItemService;
  readonly calculator: ItemCalculatorService;
}

/**
 * 购物车主仓储管理服务（Root Singleton 单例）
 * 维护所有的商品行子容器，并进行全单金额聚合。
 */
@Service({ scope: "singleton" })
export class CartStoreService {
  itemScopes: ItemScopeEntry[] = [];

  /** 各商品行专属子容器的索引账本 (Key: 商品ID, Value: 子容器) */
  private _childContainers = new Map<string, SeparaContainer>();

  @Autowired()
  private logService!: CartLogService;

  @Autowired()
  private currencyService!: CurrencyService;

  @Autowired()
  private taxService!: TaxService;

  @Autowired()
  private couponService!: CouponService;

  /** 根容器自身，用于调用 rootContainer.createScope() 派生子容器 */
  @Autowired()
  private rootContainer!: SeparaContainer;

  /** 获取指定商品行所绑定的子容器实例 */
  getChildContainer(id: string): SeparaContainer | undefined {
    return this._childContainers.get(id);
  }

  /** 兼容旧版命名调用 */
  getContainer(id: string): SeparaContainer | undefined {
    return this.getChildContainer(id);
  }

  /**
   * 生命周期钩子：容器解析该服务时自动初始化默认商品
   */
  onInit(): void {
    if (this.itemScopes.length > 0) return;
    for (const itemProps of INITIAL_CART_ITEMS) {
      this.addItem(itemProps);
    }
  }

  /**
   * 兼容手动初始化调用
   */
  init(): void {
    this.onInit();
  }

  /**
   * 向购物车新增一件商品（由 Store 内部根容器自动创建专属子容器，无需 UI 传入容器）
   */
  addItem(props: CartItemInitialProps): ItemScopeEntry {
    const scope = createItemScope(this.rootContainer, props);
    this._childContainers.set(props.id, scope.container);

    const entry: ItemScopeEntry = {
      id: props.id,
      item: scope.item,
      calculator: scope.calculator,
    };

    this.itemScopes = [...this.itemScopes, entry];
    this.logService.log(`🛒 添加商品: [${props.name}], 初始单价: ¥${props.price}`);
    return entry;
  }

  /**
   * 移除商品并销毁该商品行的子容器（释放资源）
   */
  async removeItem(id: string): Promise<void> {
    const child = this._childContainers.get(id);
    if (child) {
      this._childContainers.delete(id);
      await child.dispose();
    }

    const target = this.itemScopes.find((s) => s.id === id);
    if (target) {
      this.logService.log(`🗑️ 移除商品 [${target.item.name}], 销毁对应子容器 Scope`);
    }

    this.itemScopes = this.itemScopes.filter((s) => s.id !== id);
  }

  /**
   * 清空购物车并释放所有子容器资源
   */
  async clear(): Promise<void> {
    for (const child of this._childContainers.values()) {
      await child.dispose();
    }
    this._childContainers.clear();
    this.itemScopes = [];
  }

  /**
   * 全选 / 全不选
   */
  toggleSelectAll(): void {
    const allSelected = this.selectedScopes.length === this.itemScopes.length;
    for (const scope of this.itemScopes) {
      scope.item.isSelected = !allSelected;
    }
    this.logService.log(`☑️ 全选切换: ${!allSelected ? "全部选中" : "全部取消"}`);
  }

  get selectedScopes(): ItemScopeEntry[] {
    return this.itemScopes.filter((s) => s.item.isSelected);
  }

  /** 选中商品的原价合计 (CNY) */
  get rawSubtotalCNY(): number {
    return this.selectedScopes.reduce((sum, s) => sum + s.calculator.rawSubtotalCNY, 0);
  }

  /** 选中商品的单品特惠折扣合计 (CNY) */
  get itemDiscountTotalCNY(): number {
    return this.selectedScopes.reduce((sum, s) => sum + s.calculator.itemDiscountAmountCNY, 0);
  }

  /** 选中商品折后净额 (未计税、未计全单优惠券) */
  get netSubtotalCNY(): number {
    return this.rawSubtotalCNY - this.itemDiscountTotalCNY;
  }

  /** 全单优惠券优惠金额 (CNY) */
  get couponDeductionCNY(): number {
    const coupon = this.couponService.currentCoupon;
    if (coupon.discountRate) {
      return this.netSubtotalCNY * coupon.discountRate;
    }
    if (coupon.threshold && coupon.deduction && this.netSubtotalCNY >= coupon.threshold) {
      return coupon.deduction;
    }
    return 0;
  }

  /** 优惠券扣减后的应税金额 (CNY) */
  get taxableAmountCNY(): number {
    return Math.max(0, this.netSubtotalCNY - this.couponDeductionCNY);
  }

  /** 全单总税额 (CNY) */
  get totalTaxCNY(): number {
    return this.taxableAmountCNY * this.taxService.rate;
  }

  /** 全单最终应付总额 (含税) (CNY) */
  get grandTotalCNY(): number {
    return this.taxableAmountCNY + this.totalTaxCNY;
  }

  /** 格式化全单商品原价 */
  get formattedRawSubtotal(): string {
    return this.currencyService.format(this.rawSubtotalCNY);
  }

  /** 格式化单品折扣总计 */
  get formattedItemDiscountTotal(): string {
    return this.currencyService.format(this.itemDiscountTotalCNY);
  }

  /** 格式化优惠券抵扣 */
  get formattedCouponDeduction(): string {
    return this.currencyService.format(this.couponDeductionCNY);
  }

  /** 格式化总税金 */
  get formattedTotalTax(): string {
    return this.currencyService.format(this.totalTaxCNY);
  }

  /** 格式化最终应付金额 */
  get formattedGrandTotal(): string {
    return this.currencyService.format(this.grandTotalCNY);
  }

  get totalItemsCount(): number {
    return this.selectedScopes.reduce((sum, s) => sum + s.item.quantity, 0);
  }
}
