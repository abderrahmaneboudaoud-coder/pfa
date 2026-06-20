import { useState, useEffect, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import { api, type PlatformStat, type PlatformOverview } from "../../api/client";


// ── Constants ──────────────────────────────────────────────────────────────────

const PLATFORM_COLORS: Record<string, string> = {
  Amazon:  "#FF9900",
  Jumia:   "#FF6B35",
  Hmizate: "#7C3AED",
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function platformColor(name: string) {
  return PLATFORM_COLORS[name] ?? "#78716c";
}

function computeHealthScore(p: PlatformStat, maxReviews: number): number {
  const ratingScore = p.avg_rating !== null ? (p.avg_rating / 5) * 35 : 0;
  const saleScore   = (p.sale_pct / 100) * 25;
  const discScore   = (Math.min(p.avg_discount_pct, 50) / 50) * 20;
  const revScore    = maxReviews > 0 ? (p.total_review_volume / maxReviews) * 20 : 0;
  return Math.round(ratingScore + saleScore + discScore + revScore);
}

// ── Skeleton ───────────────────────────────────────────────────────────────────

function Sk({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-stone-100 rounded-xl ${className}`} />;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[0, 1, 2].map(i => <Sk key={i} className="h-64" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Sk className="h-64" />
        <Sk className="h-64" />
      </div>
      <Sk className="h-56" />
      <Sk className="h-60" />
      <Sk className="h-36" />
    </div>
  );
}

// ── Health Score Ring ──────────────────────────────────────────────────────────

function HealthRing({ score }: { score: number }) {
  const r    = 26;
  const circ = 2 * Math.PI * r;
  const off  = circ - (score / 100) * circ;
  const col  = score >= 65 ? "#10b981" : score >= 40 ? "#f59e0b" : "#f43f5e";
  return (
    <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={r} fill="none" stroke="#f5f5f4" strokeWidth="5" />
        <circle
          cx="32" cy="32" r={r} fill="none" stroke={col} strokeWidth="5"
          strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      <div className="relative text-center">
        <span className="text-sm font-black leading-none" style={{ color: col }}>{score}</span>
      </div>
    </div>
  );
}

// ── Platform Hero Card ─────────────────────────────────────────────────────────

function PlatformCard({ p, score }: { p: PlatformStat; score: number }) {
  const col = platformColor(p.name);
  const rangePct =
    p.min_price !== null && p.max_price !== null && p.max_price > p.min_price && p.avg_price !== null
      ? ((p.avg_price - p.min_price) / (p.max_price - p.min_price)) * 100
      : 50;

  return (
    <div className="bg-white rounded-2xl border border-stone-200/60 shadow-sm overflow-hidden flex flex-col">
      <div className="h-1.5" style={{ backgroundColor: col }} />

      <div className="p-5 flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center text-lg font-black text-white shrink-0"
              style={{ backgroundColor: col }}
            >
              {p.name[0]}
            </div>
            <div>
              <p className="text-sm font-black text-stone-800">{p.name}</p>
              <p className="text-xs text-stone-400">{p.total_products} products tracked</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="space-y-3.5 flex-1">

          {/* Price range */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-stone-400 font-medium">Price Range</span>
              <span className="text-xs font-bold text-stone-700">
                {p.avg_price !== null ? `${p.avg_price.toLocaleString()} MAD avg` : "—"}
              </span>
            </div>
            {p.min_price !== null && p.max_price !== null ? (
              <>
                <div className="relative h-2 bg-stone-100 rounded-full">
                  <div className="absolute inset-0 rounded-full opacity-20" style={{ backgroundColor: col }} />
                  <div
                    className="absolute w-3.5 h-3.5 rounded-full border-2 border-white shadow"
                    style={{
                      left: `${Math.min(93, Math.max(7, rangePct))}%`,
                      top: "50%",
                      transform: "translateX(-50%) translateY(-50%)",
                      backgroundColor: col,
                    }}
                  />
                </div>
                <div className="flex justify-between mt-1.5 text-[10px] text-stone-400">
                  <span>{p.min_price.toLocaleString()}</span>
                  <span>{p.max_price.toLocaleString()}</span>
                </div>
              </>
            ) : (
              <div className="h-2 bg-stone-100 rounded-full" />
            )}
          </div>

          {/* Rating */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-stone-400 font-medium">Avg Rating</span>
            {p.avg_rating !== null ? (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-amber-400">{"★".repeat(Math.round(p.avg_rating))}</span>
                <span className="text-xs font-bold text-stone-700">{p.avg_rating} / 5</span>
              </div>
            ) : (
              <span className="text-xs text-stone-300">—</span>
            )}
          </div>

          {/* On sale */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-stone-400 font-medium">On Sale</span>
              <span className="text-xs font-bold text-emerald-600">
                {p.products_on_sale} / {p.total_products} · {p.sale_pct}%
              </span>
            </div>
            <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${p.sale_pct}%` }} />
            </div>
          </div>

          {/* Avg discount */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-stone-400 font-medium">Avg Discount</span>
            <span className="text-xs font-bold" style={{ color: p.avg_discount_pct > 0 ? col : "#d6d3d1" }}>
              {p.avg_discount_pct > 0 ? `-${p.avg_discount_pct}%` : "—"}
            </span>
          </div>

          {/* Review volume */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-stone-400 font-medium">Review Volume</span>
            <span className="text-xs font-bold text-stone-700">{p.total_review_volume.toLocaleString()}</span>
          </div>

          {/* Active / inactive */}
          <div className="flex items-center justify-between pt-2 border-t border-stone-100">
            <span className="text-xs text-stone-400 font-medium">Active (7 days)</span>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-semibold text-stone-700">
                {p.active_products} active · {p.inactive_products} inactive
              </span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export function PlatformsPage() {
  const [data,       setData]       = useState<PlatformOverview | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [category,   setCategory]   = useState<string>("");

  useEffect(() => {
    api.getCategories()
      .then(r => setCategories(r.categories))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api.getPlatformOverview(category || undefined)
      .then(setData)
      .catch(() => setError("Failed to load platform data — check that the API is running."))
      .finally(() => setLoading(false));
  }, [category]);

  const derived = useMemo(() => {
    if (!data || data.platforms.length === 0) return null;
    const maxReviews  = Math.max(...data.platforms.map(p => p.total_review_volume), 1);
    const healthScores = Object.fromEntries(
      data.platforms.map(p => [p.name, computeHealthScore(p, maxReviews)])
    );
    const chartData = data.platforms.map(p => ({
      name:       p.name,
      avgPrice:   p.avg_price    ?? 0,
      avgRating:  p.avg_rating   ?? 0,
      salePct:    p.sale_pct,
      avgDisc:    p.avg_discount_pct,
      reviews:    p.total_review_volume,
    }));
    return { platforms: data.platforms, maxReviews, healthScores, chartData };
  }, [data]);

  if (loading && !data) return <LoadingSkeleton />;

  if (error || !derived) {
    return (
      <div className="flex flex-col items-center justify-center py-28 text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
          <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <p className="text-sm font-bold text-stone-600 mb-1">
          {error ?? "No platform data yet"}
        </p>
        <p className="text-xs text-stone-400">Scrape some products first to see platform insights</p>
      </div>
    );
  }

  const { platforms, maxReviews, healthScores, chartData } = derived;

  const PERFORMERS: {
    category: string;
    icon: string;
    getter: (p: PlatformStat) => typeof p.top_by_rating;
    metricFn: (p: PlatformStat) => string;
  }[] = [
    {
      category: "Highest Rated",
      icon: "★",
      getter: p => p.top_by_rating,
      metricFn: p => p.top_by_rating?.stars != null ? `${p.top_by_rating.stars} / 5` : "—",
    },
    {
      category: "Best Discount",
      icon: "⬇",
      getter: p => p.top_by_discount,
      metricFn: p => p.top_by_discount ? `-${Math.round(p.top_by_discount.discount_pct)}%` : "—",
    },
    {
      category: "Most Reviewed",
      icon: "◉",
      getter: p => p.top_by_reviews,
      metricFn: p => p.top_by_reviews?.reviews_count != null
        ? `${p.top_by_reviews.reviews_count.toLocaleString()} reviews`
        : "—",
    },
  ];

  return (
    <div className="space-y-6 max-w-5xl">

      {/* ── Category Filter Bar ──────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm px-5 py-4">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400 shrink-0">Filter by category</span>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setCategory("")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                !category
                  ? "bg-stone-800 text-white shadow-sm"
                  : "bg-stone-100 text-stone-500 hover:bg-stone-200 hover:text-stone-700"
              }`}
            >
              All Categories
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat === category ? "" : cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  category === cat
                    ? "bg-stone-800 text-white shadow-sm"
                    : "bg-stone-100 text-stone-500 hover:bg-stone-200 hover:text-stone-700"
                }`}
              >
                {cat}
              </button>
            ))}
            {categories.length === 0 && (
              <span className="text-xs text-stone-400 italic">No categories scraped yet — categories are extracted during scraping</span>
            )}
          </div>
          <div className="ml-auto flex items-center gap-2 shrink-0">
            {loading && data && (
              <svg className="w-3.5 h-3.5 text-stone-400 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" strokeLinecap="round" />
              </svg>
            )}
            {category && (
              <span className="text-xs text-stone-500">
                Showing <strong className="text-stone-700">{category}</strong>
                <button onClick={() => setCategory("")} className="ml-1.5 text-stone-400 hover:text-stone-600">✕</button>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Platform Hero Cards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {platforms.map(p => (
          <PlatformCard key={p.name} p={p} score={healthScores[p.name] ?? 0} />
        ))}
      </div>

      {/* ── Price + Rating Charts ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        <div className="bg-white rounded-2xl p-5 border border-stone-100 shadow-sm">
          <h3 className="text-sm font-bold text-stone-800">Average Price by Platform</h3>
          <p className="text-xs text-stone-400 mt-0.5 mb-5">Current scraped prices · MAD</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} barSize={48} margin={{ top: 0, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#a8a29e" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#a8a29e" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: 10, border: "1px solid #e7e5e4", fontSize: 12, boxShadow: "0 4px 16px rgba(0,0,0,.07)" }}
                formatter={(v: number) => [`${v.toLocaleString()} MAD`, "Avg Price"]}
                cursor={{ fill: "#f5f5f4" }}
              />
              <Bar dataKey="avgPrice" radius={[7, 7, 0, 0]}>
                {chartData.map(d => <Cell key={d.name} fill={platformColor(d.name)} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-stone-100 shadow-sm">
          <h3 className="text-sm font-bold text-stone-800">Average Rating Comparison</h3>
          <p className="text-xs text-stone-400 mt-0.5 mb-5">Mean star rating across all tracked products · / 5</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} layout="vertical" barSize={28} margin={{ top: 0, right: 24, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" horizontal={false} />
              <XAxis type="number" domain={[0, 5]} tick={{ fontSize: 11, fill: "#a8a29e" }} axisLine={false} tickLine={false} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 12, fill: "#a8a29e" }} axisLine={false} tickLine={false} width={62} />
              <Tooltip
                contentStyle={{ borderRadius: 10, border: "1px solid #e7e5e4", fontSize: 12, boxShadow: "0 4px 16px rgba(0,0,0,.07)" }}
                formatter={(v: number) => [`${v} / 5`, "Avg Rating"]}
                cursor={{ fill: "#f5f5f4" }}
              />
              <Bar dataKey="avgRating" radius={[0, 7, 7, 0]}>
                {chartData.map(d => <Cell key={d.name} fill={platformColor(d.name)} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

      </div>

      {/* ── Deals & Discounts ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100">
          <h3 className="text-sm font-bold text-stone-800">Deals & Discounts</h3>
          <p className="text-xs text-stone-400 mt-0.5">Discount activity and depth across platforms</p>
        </div>

        <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* % on sale */}
          <div>
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-3">% of Products On Sale</p>
            <div className="space-y-4">
              {platforms.map(p => {
                const col = platformColor(p.name);
                return (
                  <div key={p.name}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: col }} />
                        <span className="text-xs font-semibold text-stone-700">{p.name}</span>
                      </div>
                      <span className="text-xs font-bold text-stone-600">
                        {p.products_on_sale} products · {p.sale_pct}%
                      </span>
                    </div>
                    <div className="h-3 bg-stone-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${p.sale_pct}%`, backgroundColor: col }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Avg discount depth */}
          <div>
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-3">Avg Discount Depth</p>
            <div className="space-y-4">
              {platforms.map(p => {
                const col  = platformColor(p.name);
                const pct  = Math.min(100, (p.avg_discount_pct / 60) * 100);
                return (
                  <div key={p.name}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: col }} />
                        <span className="text-xs font-semibold text-stone-700">{p.name}</span>
                      </div>
                      <span className="text-xs font-bold" style={{ color: p.avg_discount_pct > 0 ? col : "#d6d3d1" }}>
                        {p.avg_discount_pct > 0 ? `-${p.avg_discount_pct}%` : "—"}
                      </span>
                    </div>
                    <div className="h-3 bg-stone-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: `${col}cc` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Best deal per platform */}
        <div className="px-5 pb-5 grid grid-cols-1 md:grid-cols-3 gap-3">
          {platforms.map(p => {
            const deal = p.top_by_discount;
            const col  = platformColor(p.name);
            return (
              <div key={p.name} className="rounded-xl border border-stone-100 overflow-hidden">
                <div className="px-3 py-2" style={{ backgroundColor: `${col}12` }}>
                  <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: col }}>
                    Best Deal · {p.name}
                  </span>
                </div>
                {deal ? (
                  <div className="p-3 flex items-center gap-3">
                    {deal.img_url ? (
                      <img src={deal.img_url} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0 bg-stone-100" loading="lazy" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center text-white text-xs font-black" style={{ backgroundColor: col }}>
                        {p.name[0]}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-stone-800 truncate">{deal.name ?? "Unnamed"}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {deal.price !== null && (
                          <span className="text-xs font-bold text-stone-700">{deal.price.toLocaleString()} MAD</span>
                        )}
                        <span className="text-xs font-black px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">
                          -{Math.round(deal.discount_pct)}%
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 text-xs text-stone-400 text-center">No discounts found</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Top Performers ───────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100">
          <h3 className="text-sm font-bold text-stone-800">Top Performers</h3>
          <p className="text-xs text-stone-400 mt-0.5">Best product per platform per category</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-100">
                <th className="text-left text-xs font-semibold text-stone-400 uppercase tracking-wider px-5 py-3 w-36">Category</th>
                {platforms.map(p => (
                  <th key={p.name} className="text-left text-xs font-bold uppercase tracking-wider px-4 py-3" style={{ color: platformColor(p.name) }}>
                    {p.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERFORMERS.map((row, i) => (
                <tr key={row.category} className={i % 2 === 0 ? "bg-white" : "bg-stone-50/40"}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs">{row.icon}</span>
                      <span className="text-xs font-semibold text-stone-500 whitespace-nowrap">{row.category}</span>
                    </div>
                  </td>
                  {platforms.map(p => {
                    const product = row.getter(p);
                    const metric  = row.metricFn(p);
                    const col     = platformColor(p.name);
                    return (
                      <td key={p.name} className="px-4 py-2.5">
                        {product ? (
                          <div className="flex items-center gap-2.5">
                            {product.img_url ? (
                              <img src={product.img_url} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0 bg-stone-100" loading="lazy" />
                            ) : (
                              <div className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-white text-[10px] font-black" style={{ backgroundColor: col }}>
                                {p.name[0]}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-stone-700 truncate max-w-40">{product.name ?? "Unnamed"}</p>
                              <p className="text-[11px] font-bold" style={{ color: col }}>{metric}</p>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-stone-300 pl-1">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Review Volume ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-5 border border-stone-100 shadow-sm">
        <h3 className="text-sm font-bold text-stone-800">Review Volume by Platform</h3>
        <p className="text-xs text-stone-400 mt-0.5 mb-5">
          Total reviews recorded across all products per platform
        </p>
        <div className="space-y-4">
          {[...platforms]
            .sort((a, b) => b.total_review_volume - a.total_review_volume)
            .map(p => {
              const col = platformColor(p.name);
              const pct = maxReviews > 0 ? (p.total_review_volume / maxReviews) * 100 : 0;
              return (
                <div key={p.name}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-black shrink-0" style={{ backgroundColor: col }}>
                        {p.name[0]}
                      </div>
                      <span className="text-sm font-semibold text-stone-700">{p.name}</span>
                    </div>
                    <span className="text-sm font-bold text-stone-700 tabular-nums">
                      {p.total_review_volume.toLocaleString()} reviews
                    </span>
                  </div>
                  <div className="h-3 bg-stone-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, backgroundColor: col }}
                    />
                  </div>
                </div>
              );
            })}
        </div>
      </div>

    </div>
  );
}
