import type { CartItemInitialProps, Coupon, CurrencyCode, CurrencyInfo, TaxRegion, TaxRegionInfo } from "./types";

export const CURRENCIES: Record<CurrencyCode, CurrencyInfo> = {
  CNY: { code: "CNY", symbol: "¥", rateAgainstCNY: 1.0 },
  USD: { code: "USD", symbol: "$", rateAgainstCNY: 0.14 }, // 1 CNY = 0.14 USD
  EUR: { code: "EUR", symbol: "€", rateAgainstCNY: 0.13 }, // 1 CNY = 0.13 EUR
  JPY: { code: "JPY", symbol: "円", rateAgainstCNY: 21.5 }, // 1 CNY = 21.5 JPY
};

export const TAX_REGIONS: Record<TaxRegion, TaxRegionInfo> = {
  CN: { region: "CN", name: "中国 (增值税 13%)", standardRate: 0.13 },
  US: { region: "US", name: "美国加州 (消费税 7.25%)", standardRate: 0.0725 },
  EU: { region: "EU", name: "欧洲联盟 (标准 VAT 20%)", standardRate: 0.20 },
  JP: { region: "JP", name: "日本 (消费税 10%)", standardRate: 0.10 },
};

export const AVAILABLE_COUPONS: Coupon[] = [
  { id: "none", name: "不使用优惠券" },
  { id: "vip90", name: "VIP 会员全场 9 折", discountRate: 0.10 },
  { id: "full500_50", name: "满 ¥500 减 ¥50", threshold: 500, deduction: 50 },
  { id: "full2000_300", name: "大额满减 满 ¥2000 减 ¥300", threshold: 2000, deduction: 300 },
];

export const INITIAL_CART_ITEMS: CartItemInitialProps[] = [
  {
    id: "item-1",
    name: "MacBook Pro 16 M3 Max",
    price: 24999,
    quantity: 1,
    category: "数码电子",
    image: "💻",
  },
  {
    id: "item-2",
    name: "Sony WH-1000XM5 无线降噪耳机",
    price: 2499,
    quantity: 2,
    category: "影音外设",
    image: "🎧",
  },
  {
    id: "item-3",
    name: "Keychron Q1 Pro 机械键盘",
    price: 1199,
    quantity: 1,
    category: "数码配件",
    image: "⌨️",
  },
  {
    id: "item-4",
    name: "Herman Miller Aeron 人体工学椅",
    price: 9980,
    quantity: 1,
    category: "办公家具",
    image: "💺",
  },
];
