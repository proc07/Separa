export type CurrencyCode = "CNY" | "USD" | "EUR" | "JPY";

export interface CurrencyInfo {
  readonly code: CurrencyCode;
  readonly symbol: string;
  readonly rateAgainstCNY: number; // 基础汇率 (以 CNY 为基准 1.0)
}

export type TaxRegion = "CN" | "US" | "EU" | "JP";

export interface TaxRegionInfo {
  readonly region: TaxRegion;
  readonly name: string;
  readonly standardRate: number; // 如 0.13 (13%)
}

export interface Coupon {
  readonly id: string;
  readonly name: string;
  readonly discountRate?: number; // 如 0.10 (9折)
  readonly threshold?: number; // 满减门槛
  readonly deduction?: number; // 满减金额
}

export interface CartItemInitialProps {
  readonly id: string;
  readonly name: string;
  readonly price: number;
  readonly quantity: number;
  readonly category: string;
  readonly image?: string;
}
