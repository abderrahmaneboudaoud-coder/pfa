// ─── Types ───────────────────────────────────────────────────────────────────
export type Platform = "Jumia" | "Amazon" | "AliExpress";
export type AlertType = "price_drop" | "out_of_stock" | "promotion";

export interface Product {
  id: number;
  name: string;
  category: string;
  platforms: { name: Platform; price: number; rating: number; reviews: number; inStock: boolean; seller: string }[];
  priceHistory: { date: string; Jumia: number; Amazon: number; AliExpress: number }[];
  views: number;
  avgRating: number;
}

export interface Seller {
  name: string;
  platform: Platform;
  avgPrice: number;
  stockRate: number;
  rating: number;
  products: number;
}

export interface Alert {
  id: number;
  type: AlertType;
  product: string;
  platform: Platform;
  message: string;
  time: string;
  read: boolean;
}