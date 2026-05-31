
import type { Alert, AlertType, Platform, Product, Seller } from "../types/types";

export const PRODUCTS: Product[] = [
  {
    id: 1, name: "Samsung Galaxy S24", category: "Smartphones",
    platforms: [
      { name: "Jumia", price: 899, rating: 4.3, reviews: 312, inStock: true, seller: "TechHub" },
      { name: "Amazon", price: 849, rating: 4.5, reviews: 1240, inStock: true, seller: "ElectroWorld" },
      { name: "AliExpress", price: 760, rating: 3.9, reviews: 88, inStock: false, seller: "ShenzhenTech" },
    ],
    priceHistory: [
      { date: "Jan", Jumia: 950, Amazon: 920, AliExpress: 810 },
      { date: "Feb", Jumia: 930, Amazon: 890, AliExpress: 800 },
      { date: "Mar", Jumia: 910, Amazon: 870, AliExpress: 785 },
      { date: "Apr", Jumia: 899, Amazon: 849, AliExpress: 760 },
    ],
    views: 4820, avgRating: 4.2,
  },
  {
    id: 2, name: "Sony WH-1000XM5", category: "Audio",
    platforms: [
      { name: "Jumia", price: 320, rating: 4.7, reviews: 204, inStock: true, seller: "SoundStore" },
      { name: "Amazon", price: 299, rating: 4.8, reviews: 3600, inStock: true, seller: "AudioDen" },
      { name: "AliExpress", price: 245, rating: 4.1, reviews: 55, inStock: true, seller: "GlobalSound" },
    ],
    priceHistory: [
      { date: "Jan", Jumia: 360, Amazon: 349, AliExpress: 280 },
      { date: "Feb", Jumia: 345, Amazon: 330, AliExpress: 268 },
      { date: "Mar", Jumia: 330, Amazon: 315, AliExpress: 255 },
      { date: "Apr", Jumia: 320, Amazon: 299, AliExpress: 245 },
    ],
    views: 3210, avgRating: 4.5,
  },
  {
    id: 3, name: "Apple MacBook Air M3", category: "Laptops",
    platforms: [
      { name: "Jumia", price: 1299, rating: 4.6, reviews: 98, inStock: false, seller: "AppleZone" },
      { name: "Amazon", price: 1099, rating: 4.7, reviews: 2100, inStock: true, seller: "TechGiant" },
      { name: "AliExpress", price: 980, rating: 3.8, reviews: 32, inStock: true, seller: "MacShop" },
    ],
    priceHistory: [
      { date: "Jan", Jumia: 1400, Amazon: 1250, AliExpress: 1100 },
      { date: "Feb", Jumia: 1380, Amazon: 1200, AliExpress: 1050 },
      { date: "Mar", Jumia: 1340, Amazon: 1150, AliExpress: 1010 },
      { date: "Apr", Jumia: 1299, Amazon: 1099, AliExpress: 980 },
    ],
    views: 6540, avgRating: 4.4,
  },
  {
    id: 4, name: "Nike Air Max 270", category: "Footwear",
    platforms: [
      { name: "Jumia", price: 145, rating: 4.2, reviews: 540, inStock: true, seller: "SportHub" },
      { name: "Amazon", price: 129, rating: 4.4, reviews: 870, inStock: true, seller: "NikeOfficial" },
      { name: "AliExpress", price: 89, rating: 3.5, reviews: 220, inStock: true, seller: "FashionPro" },
    ],
    priceHistory: [
      { date: "Jan", Jumia: 160, Amazon: 150, AliExpress: 110 },
      { date: "Feb", Jumia: 155, Amazon: 145, AliExpress: 100 },
      { date: "Mar", Jumia: 150, Amazon: 135, AliExpress: 94 },
      { date: "Apr", Jumia: 145, Amazon: 129, AliExpress: 89 },
    ],
    views: 2980, avgRating: 4.0,
  },
];

export const SELLERS: Seller[] = [
  { name: "ElectroWorld", platform: "Amazon", avgPrice: 849, stockRate: 98, rating: 4.8, products: 142 },
  { name: "AudioDen", platform: "Amazon", avgPrice: 299, stockRate: 95, rating: 4.7, products: 88 },
  { name: "TechHub", platform: "Jumia", avgPrice: 650, stockRate: 87, rating: 4.5, products: 64 },
  { name: "SoundStore", platform: "Jumia", avgPrice: 310, stockRate: 91, rating: 4.6, products: 55 },
  { name: "GlobalSound", platform: "AliExpress", avgPrice: 240, stockRate: 82, rating: 4.2, products: 200 },
  { name: "ShenzhenTech", platform: "AliExpress", avgPrice: 720, stockRate: 74, rating: 3.9, products: 310 },
];

export const ALERTS: Alert[] = [
  { id: 1, type: "price_drop", product: "Sony WH-1000XM5", platform: "Amazon", message: "Price dropped 14% in the last 24h", time: "2m ago", read: false },
  { id: 2, type: "out_of_stock", product: "Samsung Galaxy S24", platform: "AliExpress", message: "Product went out of stock", time: "18m ago", read: false },
  { id: 3, type: "promotion", product: "Nike Air Max 270", platform: "Jumia", message: "New 20% off promo detected", time: "1h ago", read: false },
  { id: 4, type: "price_drop", product: "Apple MacBook Air M3", platform: "Amazon", message: "Price dropped 8% — now $1,099", time: "3h ago", read: true },
  { id: 5, type: "out_of_stock", product: "Apple MacBook Air M3", platform: "Jumia", message: "Out of stock on Jumia", time: "5h ago", read: true },
];

export const PLATFORM_COLORS: Record<Platform, string> = {
  Jumia: "#FF6B35",
  Amazon: "#FF9900",
  AliExpress: "#E62E04",
};

export const ALERT_STYLES: Record<AlertType, { bg: string; icon: string; label: string }> = {
  price_drop:   { bg: "bg-emerald-50 border-emerald-200", icon: "↓", label: "Price Drop" },
  out_of_stock: { bg: "bg-red-50 border-red-200",         icon: "⊘", label: "Out of Stock" },
  promotion:    { bg: "bg-amber-50 border-amber-200",     icon: "★", label: "Promotion" },
};