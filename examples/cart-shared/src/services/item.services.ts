import { Autowired, Service } from "@separa/core";
import { SeparaContainer } from "@separa/ioc-inversify";
import { CartLogService, CurrencyService, TaxService } from "./global.services";
import type { CartItemInitialProps } from "../types";

/**
 * 单个商品行的状态服务（在每个商品行的子容器 Child Scope 中动态注册并独立存在）
 */
export class ItemService {
  id: string;
  name: string;
  price: number;
  quantity: number;
  discountRate = 0; // 单品特惠折扣 (0 ~ 0.5)
  category: string;
  image: string;
  isSelected = true;

  // 🚀 Spring 风格零参数自动装配：自动根据 TS 类型反射注入 CartLogService
  @Autowired()
  private logService!: CartLogService;

  constructor(props: CartItemInitialProps) {
    this.id = props.id;
    this.name = props.name;
    this.price = props.price;
    this.quantity = props.quantity;
    this.category = props.category;
    this.image = props.image || "📦";
  }

  setQuantity(qty: number): void {
    const next = Math.max(1, Math.min(99, qty));
    if (this.quantity === next) return;
    this.quantity = next;
    this.logService?.log(`🔢 修改 [${this.name}] 购买数量为: ${this.quantity}`);
  }

  setPrice(newPrice: number): void {
    const next = Math.max(0, newPrice);
    if (this.price === next) return;
    this.price = next;
    this.logService?.log(`💰 调整 [${this.name}] 单价为: ¥${this.price.toFixed(2)}`);
  }

  setDiscountRate(rate: number): void {
    this.discountRate = Math.max(0, Math.min(0.9, rate));
    this.logService?.log(`🏷️ 设置 [${this.name}] 单品折扣为: ${(this.discountRate * 100).toFixed(0)}% OFF`);
  }

  toggleSelected(): void {
    this.isSelected = !this.isSelected;
    this.logService?.log(`🔘 [${this.name}] 切换勾选状态: ${this.isSelected ? "已选中" : "取消选中"}`);
  }
}

/**
 * ItemService 的别名 Token，用于兼容旧版使用方式
 */
export const ItemToken = ItemService;

/**
 * 单行核价计算引擎（由子容器自动装配）
 */
@Service({ scope: "transient" })
export class ItemCalculatorService {
  @Autowired()
  readonly item!: ItemService;

  @Autowired()
  readonly taxService!: TaxService;

  @Autowired()
  readonly currencyService!: CurrencyService;

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
 */
export function createItemScope(
  rootContainer: SeparaContainer,
  props: CartItemInitialProps,
): { container: SeparaContainer; item: ItemService; calculator: ItemCalculatorService } {
  // 1. 实例化商品对象（只传 props，logService 由容器自动注入）
  const item = new ItemService(props);

  // 2. 一行创建子作用域并注入 item（零 Token，零嵌套 DSL）
  const child = rootContainer.createScope(item);

  // 3. 从子容器解析计算引擎（自动注入 child 的 item 和 parent 的 Tax/Currency）
  const calculator = child.get(ItemCalculatorService);

  return { container: child, item, calculator };
}
