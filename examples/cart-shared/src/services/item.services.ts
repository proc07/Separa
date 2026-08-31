import { createToken, Inject, Service } from "@separa/core";
import { provide, SeparaContainer } from "@separa/ioc-inversify";
import { CartLogService, CurrencyService, TaxService } from "./global.services";
import type { CartItemInitialProps } from "../types";

/** ItemService 的专属 Token，用于在子容器中唯一定位当前行的状态实例 */
export const ItemToken = createToken<ItemService>("ItemService");

/**
 * 单个商品行的状态服务（在每个商品行的子容器 Child Scope 中动态注册并独立存在）
 */
export class ItemService {
  id: string;
  name: string;
  price: number;
  quantity: number;
  discountRate: number; // 单品特惠折扣 (0 ~ 0.5)
  category: string;
  image: string;
  isSelected = true;

  constructor(
    props: CartItemInitialProps,
    private logService: CartLogService,
  ) {
    this.id = props.id;
    this.name = props.name;
    this.price = props.price;
    this.quantity = props.quantity;
    this.discountRate = 0;
    this.category = props.category;
    this.image = props.image || "📦";
  }

  setQuantity(qty: number): void {
    const next = Math.max(1, Math.min(99, qty));
    if (this.quantity === next) return;
    this.quantity = next;
    this.logService.log(`🔢 修改 [${this.name}] 购买数量为: ${this.quantity}`);
  }

  setPrice(newPrice: number): void {
    const next = Math.max(0, newPrice);
    if (this.price === next) return;
    this.price = next;
    this.logService.log(`💰 调整 [${this.name}] 单价为: ¥${this.price.toFixed(2)}`);
  }

  setDiscountRate(rate: number): void {
    this.discountRate = Math.max(0, Math.min(0.9, rate));
    this.logService.log(`🏷️ 设置 [${this.name}] 单品折扣为: ${(this.discountRate * 100).toFixed(0)}% OFF`);
  }

  toggleSelected(): void {
    this.isSelected = !this.isSelected;
    this.logService.log(`🔘 [${this.name}] 切换勾选状态: ${this.isSelected ? "已选中" : "取消选中"}`);
  }
}

/**
 * 单行核价计算引擎（声明为瞬态服务，在子容器解析时自动注入当前 Scope 的 ItemService 与全局父级服务）
 */
@Service({ scope: "transient" })
export class ItemCalculatorService {
  constructor(
    @Inject(ItemToken) readonly item: ItemService,
    @Inject(TaxService) readonly taxService: TaxService,
    @Inject(CurrencyService) readonly currencyService: CurrencyService,
  ) {}

  /** 原始小计 (未扣折、未含税) */
  get rawSubtotalCNY(): number {
    return this.item.price * this.item.quantity;
  }

  /** 单品折扣减免金额 */
  get itemDiscountAmountCNY(): number {
    return this.rawSubtotalCNY * this.item.discountRate;
  }

  /** 折后金额 */
  get discountedSubtotalCNY(): number {
    return this.rawSubtotalCNY - this.itemDiscountAmountCNY;
  }

  /** 该行产生的税费 */
  get taxAmountCNY(): number {
    return this.discountedSubtotalCNY * this.taxService.rate;
  }

  /** 该行最终结算金额 (含税) */
  get finalTotalCNY(): number {
    return this.discountedSubtotalCNY + this.taxAmountCNY;
  }

  /** 格式化原始单价 (根据全局货币汇率) */
  get formattedUnitPrice(): string {
    return this.currencyService.format(this.item.price);
  }

  /** 格式化折后金额 */
  get formattedDiscountedSubtotal(): string {
    return this.currencyService.format(this.discountedSubtotalCNY);
  }

  /** 格式化税金 */
  get formattedTaxAmount(): string {
    return this.currencyService.format(this.taxAmountCNY);
  }

  /** 格式化最终含税小计 */
  get formattedFinalTotal(): string {
    return this.currencyService.format(this.finalTotalCNY);
  }
}

/**
 * 核心工厂函数：为每个商品项构建独立的子容器 (Child Container)
 *
 * 1. 实例化 ItemService 原生对象
 * 2. 通过 provide(ItemToken).useValue(item) 绑定到子作用域
 * 3. 容器生命周期全自动处理响应式代理与跨层依赖组装
 */
export function createItemScope(
  rootContainer: SeparaContainer,
  props: CartItemInitialProps,
): { container: SeparaContainer; item: ItemService; calculator: ItemCalculatorService } {
  const logService = rootContainer.get(CartLogService);
  const item = new ItemService(props, logService);

  // 1. 创建子容器并覆盖 ItemToken
  const child = rootContainer.createScope({
    overrides: [provide(ItemToken).useValue(item)],
  });

  // 2. 自动从子容器解析 ItemCalculatorService（注入当前 child 的 ItemToken 和 parent 的 Tax/Currency）
  const calculator = child.get(ItemCalculatorService);

  return { container: child, item: child.get(ItemToken), calculator };
}
