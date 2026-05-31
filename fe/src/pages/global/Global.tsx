import { useState, useEffect, useMemo } from "react";
import { api, type ProductSummary } from "../../api/client";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import { KpiCard } from "../../components/KPICard";

const PLATFORM_COLORS: Record<string, string> = {
  Amazon:  "#FF9900",
  Jumia:   "#FF6B35",
  Hmizate: "#7C3AED",
};

function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60)    return `${secs}s ago`;
  if (secs < 3600)  return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-stone-100 rounded-xl ${className}`} />;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Skeleton className="h-60" />
        <Skeleton className="h-60" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <Skeleton className="h-72 lg:col-span-3" />
        <Skeleton className="h-72 lg:col-span-2" />
      </div>
    </div>
  );
}

function computeStats(summaries: ProductSummary[]) {
  const withDiscount = summaries.filter(s => s.discount_pct > 0);
  const withRating   = summaries.filter(s => s.stars !== null);
  const bestDeal     = [...withDiscount].sort((a, b) => b.discount_pct - a.discount_pct)[0] ?? null;

  const byPlatform = summaries.reduce<Record<string, { count: number; prices: number[]; ratings: number[]; discounted: number }>>(
    (acc, s) => {
      const key = s.platform ?? "Unknown";
      if (!acc[key]) acc[key] = { count: 0, prices: [], ratings: [], discounted: 0 };
      acc[key].count++;
      if (s.price !== null) acc[key].prices.push(s.price);
      if (s.stars !== null) acc[key].ratings.push(s.stars);
      if (s.discount_pct > 0) acc[key].discounted++;
      return acc;
    }, {}
  );

  const platformData = Object.entries(byPlatform).map(([name, d]) => {
    const avgPrice  = d.prices.length  ? Math.round(d.prices.reduce((a, b) => a + b, 0) / d.prices.length)       : 0;
    const avgRating = d.ratings.length ? +(d.ratings.reduce((a, b) => a + b, 0) / d.ratings.length).toFixed(1) : 0;
    return { name, count: d.count, discounted: d.discounted, avgPrice, avgRating };
  });

  const buckets = [
    { range: "1 – 10%",  min: 0,  max: 10  },
    { range: "10 – 25%", min: 10, max: 25  },
    { range: "25 – 50%", min: 25, max: 50  },
    { range: "50% +",    min: 50, max: Infinity },
  ].map(b => ({
    range: b.range,
    count: withDiscount.filter(s => s.discount_pct > b.min && s.discount_pct <= b.max).length,
  }));

  const topDeals = [...withDiscount].sort((a, b) => b.discount_pct - a.discount_pct).slice(0, 8);

  const recentlyUpdated = [...summaries]
    .filter(s => s.last_updated)
    .sort((a, b) => new Date(b.last_updated!).getTime() - new Date(a.last_updated!).getTime())
    .slice(0, 6);

  const avgRating = withRating.length
    ? +(withRating.reduce((a, s) => a + (s.stars ?? 0), 0) / withRating.length).toFixed(1)
    : null;

  return {
    total: summaries.length,
    discountedCount: withDiscount.length,
    discountedPct:   Math.round((withDiscount.length / summaries.length) * 100),
    bestDeal,
    avgRating,
    ratedCount: withRating.length,
    platformData,
    buckets,
    topDeals,
    recentlyUpdated,
  };
}

export function GlobalDashboard() {
  const [summaries, setSummaries] = useState<ProductSummary[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const products = await api.getProducts();
        const sums = await Promise.all(products.map(p => api.getSummary(p._id)));
        setSummaries(sums);
      } catch {
        setError("Could not load dashboard — check that the API is running.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const stats = useMemo(() => (summaries.length ? computeStats(summaries) : null), [summaries]);

  if (loading) return <LoadingSkeleton />;

  if (error || !stats) {
    return (
      <div className="flex flex-col items-center justify-center py-28 text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
          <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <p className="text-sm font-bold text-stone-600 mb-1">{error ?? "No products in database"}</p>
        <p className="text-xs text-stone-400">Scrape some products first to see your dashboard</p>
      </div>
    );
  }

  const BUCKET_COLORS = ["#86efac", "#4ade80", "#22c55e", "#16a34a"];

  return (
    <div className="space-y-6">

      {/* ── KPI row ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Tracked Products"
          value={stats.total.toLocaleString()}
          sub={`Across ${stats.platformData.length} platform${stats.platformData.length !== 1 ? "s" : ""}`}
          icon="◈"
          accent="text-stone-800"
        />
        <KpiCard
          label="On Sale Now"
          value={stats.discountedCount.toLocaleString()}
          sub={`${stats.discountedPct}% of the catalog discounted`}
          icon="⬇"
          accent="text-emerald-600"
        />
        <KpiCard
          label="Best Deal"
          value={stats.bestDeal ? `-${Math.round(stats.bestDeal.discount_pct)}%` : "—"}
          sub={stats.bestDeal
            ? (stats.bestDeal.name ?? "Unknown").split(" ").slice(0, 5).join(" ")
            : "No discounts found"}
          icon="★"
          accent="text-amber-500"
        />
        <KpiCard
          label="Avg Rating"
          value={stats.avgRating !== null ? `${stats.avgRating} / 5` : "—"}
          sub={`${stats.ratedCount} products have ratings`}
          icon="◉"
          accent="text-indigo-600"
        />
      </div>

      {/* ── Platform summary cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.platformData.map(p => {
          const color    = PLATFORM_COLORS[p.name] ?? "#78716c";
          const discPct  = p.count > 0 ? Math.round((p.discounted / p.count) * 100) : 0;
          return (
            <div key={p.name} className="group bg-white rounded-2xl border border-stone-200/60 shadow-sm p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105"
                style={{ backgroundColor: `${color}18` }}
              >
                <span className="text-lg font-black" style={{ color }}>{p.name[0]}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <p className="text-sm font-bold text-stone-800">{p.name}</p>
                  <span className="text-xs text-stone-400 font-medium">{p.count} products</span>
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-stone-500 mb-2">
                  {p.avgPrice > 0 && (
                    <span>Avg <span className="font-semibold text-stone-700">{p.avgPrice.toLocaleString()} MAD</span></span>
                  )}
                  <span>Sale <span className="font-semibold text-emerald-600">{discPct}%</span></span>
                  {p.avgRating > 0 && (
                    <span>★ <span className="font-semibold text-amber-500">{p.avgRating}</span></span>
                  )}
                </div>
                <div className="h-1 bg-stone-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${discPct}%`, backgroundColor: color }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Charts row ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl p-5 border border-stone-100 shadow-sm">
          <h3 className="text-sm font-bold text-stone-800">Average Price by Platform</h3>
          <p className="text-xs text-stone-400 mt-0.5 mb-5">Computed from current scraped prices · MAD</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats.platformData} barSize={44} margin={{ top: 0, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#a8a29e" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#a8a29e" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: 10, border: "1px solid #e7e5e4", fontSize: 12, boxShadow: "0 4px 16px rgba(0,0,0,.07)" }}
                formatter={(v: number) => [`${v.toLocaleString()} MAD`, "Avg Price"]}
                cursor={{ fill: "#f5f5f4" }}
              />
              <Bar dataKey="avgPrice" radius={[7, 7, 0, 0]}>
                {stats.platformData.map(p => (
                  <Cell key={p.name} fill={PLATFORM_COLORS[p.name] ?? "#78716c"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-stone-100 shadow-sm">
          <h3 className="text-sm font-bold text-stone-800">Discount Depth Distribution</h3>
          <p className="text-xs text-stone-400 mt-0.5 mb-5">How deep are discounts across the catalog</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats.buckets} barSize={44} margin={{ top: 0, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" vertical={false} />
              <XAxis dataKey="range" tick={{ fontSize: 11, fill: "#a8a29e" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#a8a29e" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ borderRadius: 10, border: "1px solid #e7e5e4", fontSize: 12 }}
                formatter={(v: number) => [v, "Products"]}
                cursor={{ fill: "#f5f5f4" }}
              />
              <Bar dataKey="count" radius={[7, 7, 0, 0]}>
                {stats.buckets.map((b, i) => (
                  <Cell key={b.range} fill={BUCKET_COLORS[i]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Leaderboard + Activity ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* Top deals leaderboard */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-stone-800">Top Deals Leaderboard</h3>
              <p className="text-xs text-stone-400 mt-0.5">Ranked by highest discount percentage right now</p>
            </div>
            {stats.discountedCount > 0 && (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                {stats.discountedCount} on sale
              </span>
            )}
          </div>

          {stats.topDeals.length === 0 ? (
            <div className="py-14 text-center text-stone-400 text-sm">No discounts detected yet</div>
          ) : (
            <div>
              {stats.topDeals.map((s, i) => {
                const pColor = PLATFORM_COLORS[s.platform ?? ""] ?? "#78716c";
                const rankColor = i === 0 ? "text-amber-400" : i === 1 ? "text-stone-400" : i === 2 ? "text-orange-400" : "text-stone-200";
                return (
                  <div key={s.id} className="flex items-center gap-3 px-5 py-3.5 border-b border-stone-100 last:border-0 hover:bg-stone-50/60 transition-colors">
                    <span className={`text-sm font-black w-5 text-center tabular-nums ${rankColor}`}>{i + 1}</span>

                    {s.img_url ? (
                      <img src={s.img_url} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0 bg-stone-100" loading="lazy" />
                    ) : (
                      <div className="w-9 h-9 rounded-lg bg-stone-100 flex-shrink-0" />
                    )}

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-stone-800 truncate">{s.name ?? "Unnamed"}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: `${pColor}15`, color: pColor }}>
                          {s.platform}
                        </span>
                        {s.price !== null && (
                          <span className="text-xs text-stone-500">
                            <span className="font-bold text-stone-700">{s.price.toLocaleString()} MAD</span>
                            {s.old_price && (
                              <span className="line-through ml-1 text-stone-400">{s.old_price.toLocaleString()}</span>
                            )}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex-shrink-0 flex flex-col items-end gap-1">
                      <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700">
                        -{Math.round(s.discount_pct)}%
                      </span>
                      <div className="w-16 h-1 bg-stone-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-400 rounded-full"
                          style={{ width: `${Math.min(s.discount_pct, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recently scraped activity */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-stone-100">
            <h3 className="text-sm font-bold text-stone-800">Scrape Activity</h3>
            <p className="text-xs text-stone-400 mt-0.5">Most recently updated products</p>
          </div>

          {stats.recentlyUpdated.length === 0 ? (
            <div className="flex-1 flex items-center justify-center py-14 text-stone-400 text-sm">
              No updates yet
            </div>
          ) : (
            <div className="flex-1 divide-y divide-stone-100">
              {stats.recentlyUpdated.map((s, i) => {
                const pColor = PLATFORM_COLORS[s.platform ?? ""] ?? "#78716c";
                return (
                  <div key={s.id ?? i} className="px-5 py-3.5 flex items-start gap-3 hover:bg-stone-50/50 transition-colors">
                    <div className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ backgroundColor: pColor }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-stone-700 truncate">{s.name ?? "Product"}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] font-bold" style={{ color: pColor }}>{s.platform}</span>
                        <span className="text-xs text-stone-400">{timeAgo(s.last_updated)}</span>
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      {s.price !== null && (
                        <p className="text-xs font-bold text-stone-700">{s.price.toLocaleString()} MAD</p>
                      )}
                      {s.discount_pct > 0 && (
                        <p className="text-[11px] font-semibold text-emerald-600">-{Math.round(s.discount_pct)}%</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="px-5 py-3 border-t border-stone-100 bg-stone-50/60">
            <p className="text-xs text-stone-400 text-center">
              {stats.total} products tracked · last checked {timeAgo(stats.recentlyUpdated[0]?.last_updated ?? null)}
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
