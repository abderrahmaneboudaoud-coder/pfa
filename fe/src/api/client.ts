async function get<T>(path: string): Promise<T> {
  const res = await fetch(`/api${path}`);
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
  return res.json();
}

async function post<T>(path: string): Promise<T> {
  const res = await fetch(`/api${path}`, { method: 'POST' });
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
  return res.json();
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
  return res.json();
}

// ── Response types ────────────────────────────────────────────────────────────

export interface ApiProduct {
  _id: string;
  name: string | null;
  img_url: string | null;
  platform: string | null;
  url: string | null;
  last_updated: string | null;
}

export interface ProductSummary {
  id: string;
  name: string | null;
  img_url: string | null;
  url: string | null;
  platform: string | null;
  last_updated: string | null;
  price: number | null;
  old_price: number | null;
  discount_rate: string | null;
  discount_pct: number;
  stars: number | null;
  reviews_count: number | null;
}

export interface PriceHistoryEntry {
  _id: string;
  url: string;
  price: number | null;
  old_price: number | null;
  discount_rate: string | null;
  currency: string | null;
  stars: number | null;
  reviews_count: number | null;
  scraped_at: string;
}

export interface PriceStats {
  current_price: number | null;
  min_price: number | null;
  max_price: number | null;
  avg_price: number | null;
  price_change: number | null;
  price_change_pct: number | null;
  total_records: number;
}

export interface RatingStats {
  current_stars: number | null;
  min_stars: number | null;
  max_stars: number | null;
  avg_stars: number | null;
  current_reviews_count: number | null;
  total_records: number;
}

export interface ReviewStats {
  total_reviews: number;
  avg_stars: number | null;
  star_distribution: { one: number; two: number; three: number; four: number; five: number };
}

export interface ReviewTimelineEntry {
  period: string;
  count: number;
  avg_stars: number;
}

export interface Review {
  _id: string;
  username: string;
  stars: number;
  title: string;
  comment: string;
  date: string;
  scraped_at: string;
}

export interface Insights {
  product: ProductSummary;
  price_analysis: PriceStats;
  rating_analysis: RatingStats;
  review_analysis: ReviewStats;
}

export interface SentimentHighlight {
  username: string;
  title: string;
  comment: string;
  confidence: number;
}

export interface SentimentResult {
  total_analyzed: number;
  overall_label: 'positive' | 'neutral' | 'negative';
  avg_compound: number;
  distribution: { positive: number; neutral: number; negative: number };
  top_positive: SentimentHighlight | null;
  top_negative: SentimentHighlight | null;
  word_cloud: { positive_image: string; negative_image: string };
}

export interface ComparisonSide {
  summary: ProductSummary;
  price_analysis: PriceStats;
  rating_analysis: RatingStats;
  review_analysis: ReviewStats;
  price_history: PriceHistoryEntry[];
  sentiment: SentimentResult;
  top_reviews: Review[];
}

export interface ComparisonResult {
  product_a: ComparisonSide;
  product_b: ComparisonSide;
}

export interface AuthenticityFlag {
  type: string;
  severity: "high" | "medium" | "low";
  detail: string;
}

export interface AuthenticityResult {
  total_reviews: number;
  score: number | null;
  risk_level: "low" | "medium" | "high" | "unknown";
  flags: AuthenticityFlag[];
  message?: string;
  details: {
    rating_distribution: {
      five_star_pct: number;
      one_star_pct:  number;
      mid_star_pct:  number;
      extreme_pct:   number;
    } | null;
    temporal: {
      days_with_reviews:   number;
      avg_reviews_per_day: number | null;
      max_reviews_per_day: number;
      peak_day:            string | null;
      burst_z_score:       number;
      daily_distribution:  Array<{ date: string; count: number }>;
    } | null;
    content_quality: {
      short_review_pct:     number;
      generic_wording_pct:  number;
      short_review_count:   number;
      generic_review_count: number;
    } | null;
    username_patterns: {
      generic_username_count: number;
      generic_username_pct:   number;
    } | null;
  };
}

export interface PlatformStat {
  name: string;
  total_products: number;
  avg_price: number | null;
  min_price: number | null;
  max_price: number | null;
  avg_rating: number | null;
  total_review_volume: number;
  products_on_sale: number;
  sale_pct: number;
  avg_discount_pct: number;
  active_products: number;
  inactive_products: number;
  top_by_rating: ProductSummary | null;
  top_by_discount: ProductSummary | null;
  top_by_reviews: ProductSummary | null;
}

export interface PlatformOverview {
  platforms: PlatformStat[];
}

export interface CategoriesResponse {
  categories: string[];
}

export interface ScrapeJob {
  message: string;
  task_id: string;
}

export interface ChatMessage {
  role:    "user" | "model";
  content: string;
}

export interface ChatResponse {
  response: string;
}

export type TaskState = 'PENDING' | 'STARTED' | 'SUCCESS' | 'FAILURE' | 'RETRY';

export interface TaskStatus {
  task_id: string;
  state: TaskState;
  result?: string;
  error?: string;
}

// ── API calls ─────────────────────────────────────────────────────────────────

export const api = {
  getProducts:       ()                   => get<ApiProduct[]>('/products/'),
  getSummary:        (id: string)         => get<ProductSummary>(`/products/${id}/summary`),
  getInsights:       (id: string)         => get<Insights>(`/products/${id}/insights`),
  getPriceHistory:   (id: string)         => get<PriceHistoryEntry[]>(`/products/${id}/price-history`),
  getReviewTimeline: (id: string)         => get<ReviewTimelineEntry[]>(`/products/${id}/reviews/timeline`),
  getLatestReviews:  (id: string, n = 50) => get<Review[]>(`/products/${id}/latest-reviews?limit=${n}`),
  getSentiment:      (id: string)         => get<SentimentResult>(`/products/${id}/sentiment`),
  getAuthenticity:     (id: string)    => get<AuthenticityResult>(`/products/${id}/authenticity`),
  getPlatformOverview: (category?: string) =>
    get<PlatformOverview>(category ? `/platforms/overview?category=${encodeURIComponent(category)}` : '/platforms/overview'),
  getCategories: () => get<CategoriesResponse>('/platforms/categories'),
  compare: (aId: string, bId: string) =>
    get<ComparisonResult>(`/products/compare?product_a_id=${aId}&product_b_id=${bId}`),
  startScrape:       (url: string, site: string) =>
    post<ScrapeJob>(`/scrape?url=${encodeURIComponent(url)}&site=${encodeURIComponent(site)}`),
  getTaskStatus:     (taskId: string)     => get<TaskStatus>(`/tasks/${taskId}`),
  chat: (messages: ChatMessage[], productId?: string) =>
    postJson<ChatResponse>('/chat', { messages, product_id: productId ?? null }),
};
