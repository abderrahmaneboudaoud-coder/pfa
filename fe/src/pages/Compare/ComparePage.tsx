import { useState, useEffect, useRef, useMemo } from "react";
import {
  api,
  type ApiProduct,
  type ComparisonResult,
  type ComparisonSide,
  type PriceHistoryEntry,
  type Review,
  type SentimentResult,
} from "../../api/client";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";

// ── Constants ──────────────────────────────────────────────────────────────────

const PLATFORM_COLORS: Record<string, string> = {
  Amazon:  "#FF9900",
  Jumia:   "#FF6B35",
  Hmizate: "#7C3AED",
};

const COLOR_A = "#6366f1"; // indigo  — Product A
const COLOR_B = "#10b981"; // emerald — Product B

const SENTIMENT_CFG = {
  positive: { label: "Positive", bar: "bg-emerald-400", text: "text-emerald-700" },
  neutral:  { label: "Neutral",  bar: "bg-stone-300",   text: "text-stone-500"   },
  negative: { label: "Negative", bar: "bg-rose-400",    text: "text-rose-700"    },
} as const;

// ── Helpers ────────────────────────────────────────────────────────────────────

function mergePriceHistories(histA: PriceHistoryEntry[], histB: PriceHistoryEntry[]) {
  const map = new Map<string, { date: string; A: number | null; B: number | null }>();
  for (const h of histA) {
    const d = h.scraped_at.slice(0, 10);
    map.set(d, { ...( map.get(d) ?? { date: d, A: null, B: null }), A: h.price });
  }
  for (const h of histB) {
    const d = h.scraped_at.slice(0, 10);
    map.set(d, { ...( map.get(d) ?? { date: d, A: null, B: null }), B: h.price });
  }
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function mergeRatingHistories(histA: PriceHistoryEntry[], histB: PriceHistoryEntry[]) {
  const map = new Map<string, { date: string; A: number | null; B: number | null }>();
  for (const h of histA) {
    if (h.stars === null) continue;
    const d = h.scraped_at.slice(0, 10);
    map.set(d, { ...( map.get(d) ?? { date: d, A: null, B: null }), A: h.stars });
  }
  for (const h of histB) {
    if (h.stars === null) continue;
    const d = h.scraped_at.slice(0, 10);
    map.set(d, { ...( map.get(d) ?? { date: d, A: null, B: null }), B: h.stars });
  }
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

type WinSide = "a" | "b" | "tie" | "none";

function winner(aVal: number | null, bVal: number | null, dir: "lower" | "higher"): WinSide {
  if (aVal === null && bVal === null) return "none";
  if (aVal === null) return "b";
  if (bVal === null) return "a";
  if (Math.abs(aVal - bVal) < 0.001) return "tie";
  return (dir === "lower" ? aVal < bVal : aVal > bVal) ? "a" : "b";
}

function cellBg(side: "a" | "b", w: WinSide) {
  if (w === "none" || w === "tie") return "";
  return w === side ? "bg-emerald-50" : "bg-rose-50";
}

function cellText(side: "a" | "b", w: WinSide) {
  if (w === "none" || w === "tie") return "text-stone-700";
  return w === side ? "text-emerald-700 font-bold" : "text-rose-500";
}

function fmt(v: number | null, unit = "MAD", decimals = 0): string {
  if (v === null) return "—";
  return `${v.toLocaleString("en", { maximumFractionDigits: decimals })} ${unit}`.trim();
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-stone-100 rounded-xl ${className}`} />;
}

function PlatformBadge({ platform }: { platform: string | null }) {
  const color = PLATFORM_COLORS[platform ?? ""] ?? "#78716c";
  return (
    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${color}18`, color }}>
      {platform ?? "Unknown"}
    </span>
  );
}

// Searchable product selector dropdown
function ProductSelector({
  products, value, onChange, excludeId,
}: {
  products: ApiProduct[];
  value: string;
  onChange: (id: string) => void;
  excludeId?: string;
}) {
  const [open, setOpen]     = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = useMemo(() =>
    products
      .filter(p => p._id !== excludeId)
      .filter(p => {
        if (!search) return true;
        const q = search.toLowerCase();
        return p.name?.toLowerCase().includes(q) || p.platform?.toLowerCase().includes(q);
      })
      .slice(0, 30),
    [products, excludeId, search]
  );

  const selected = products.find(p => p._id === value);
  const pColor   = PLATFORM_COLORS[selected?.platform ?? ""] ?? "#78716c";

  return (
    <div className="min-w-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-white border border-stone-200 rounded-xl hover:border-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-200 transition-colors text-left"
      >
        {selected ? (
          <>
            {selected.img_url
              ? <img src={selected.img_url} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0 bg-stone-100" />
              : <div className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: pColor }}>{selected.platform?.[0] ?? "?"}</div>
            }
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-stone-800 truncate">{selected.name ?? "Unnamed"}</p>
              <PlatformBadge platform={selected.platform} />
            </div>
          </>
        ) : (
          <p className="text-sm text-stone-400 flex-1">Select a product…</p>
        )}
        <svg className={`w-4 h-4 text-stone-400 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-30 mt-1.5 w-full bg-white border border-stone-200 rounded-xl shadow-xl overflow-hidden" style={{ minWidth: 260 }}>
          <div className="p-2 border-b border-stone-100">
            <input
              autoFocus
              type="text"
              placeholder="Search products…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onClick={e => e.stopPropagation()}
              className="w-full px-3 py-2 text-sm bg-stone-50 rounded-lg focus:outline-none placeholder:text-stone-400"
            />
          </div>
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-xs text-stone-400 text-center py-4">No products found</p>
            ) : filtered.map(p => (
              <button
                key={p._id}
                type="button"
                className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left hover:bg-stone-50 transition-colors ${value === p._id ? "bg-stone-50" : ""}`}
                onClick={() => { onChange(p._id); setOpen(false); setSearch(""); }}
              >
                <div className="w-6 h-6 rounded-md flex-shrink-0 flex items-center justify-center text-white text-[10px] font-bold" style={{ backgroundColor: PLATFORM_COLORS[p.platform ?? ""] ?? "#78716c" }}>
                  {p.platform?.[0] ?? "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-800 truncate">{p.name ?? "Unnamed"}</p>
                  <p className="text-[11px] text-stone-400">{p.platform}</p>
                </div>
                {value === p._id && (
                  <svg className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <polyline points="1.5,6 4.5,9 10.5,3" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Hero card at the top of a comparison side
function ProductHeroCard({ data, color, label }: { data: ComparisonSide; color: string; label: string }) {
  const s = data.summary;
  const pColor = PLATFORM_COLORS[s.platform ?? ""] ?? "#78716c";
  return (
    <div className="flex-1 bg-white rounded-2xl border border-stone-200/60 shadow-sm p-5 flex items-start gap-4">
      <div className="relative flex-shrink-0">
        {s.img_url ? (
          <img src={s.img_url} alt="" className="w-16 h-16 rounded-xl object-cover bg-stone-100" />
        ) : (
          <div className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-black text-white" style={{ backgroundColor: pColor }}>{s.platform?.[0] ?? "?"}</div>
        )}
        <span className="absolute -top-1.5 -left-1.5 text-[10px] font-black px-1.5 py-0.5 rounded-md text-white" style={{ backgroundColor: color }}>{label}</span>
      </div>
      <div className="flex-1 min-w-0">
        <PlatformBadge platform={s.platform} />
        <p className="text-sm font-bold text-stone-800 mt-1 truncate">{s.name ?? "Unnamed"}</p>
        <div className="flex items-baseline gap-2 mt-1.5">
          {s.price !== null && <span className="text-xl font-black text-stone-900">{s.price.toLocaleString()} MAD</span>}
          {s.old_price !== null && <span className="text-sm text-stone-400 line-through">{s.old_price.toLocaleString()}</span>}
          {s.discount_pct > 0 && <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">-{Math.round(s.discount_pct)}%</span>}
        </div>
        {s.stars !== null && (
          <p className="text-xs text-stone-500 mt-1">
            ★ {s.stars} {s.reviews_count !== null && <span>· {s.reviews_count.toLocaleString()} reviews</span>}
          </p>
        )}
      </div>
    </div>
  );
}

// Key metrics comparison table
function MetricsTable({ cmp }: { cmp: ComparisonResult }) {
  const a = cmp.product_a, b = cmp.product_b;

  const rows: { label: string; aVal: number | null; bVal: number | null; display: (v: number | null) => string; dir: "lower" | "higher" }[] = [
    { label: "Current Price",   aVal: a.price_analysis.current_price,  bVal: b.price_analysis.current_price,  display: v => fmt(v, "MAD"),   dir: "lower"  },
    { label: "Lowest Price",    aVal: a.price_analysis.min_price,       bVal: b.price_analysis.min_price,       display: v => fmt(v, "MAD"),   dir: "lower"  },
    { label: "Highest Price",   aVal: a.price_analysis.max_price,       bVal: b.price_analysis.max_price,       display: v => fmt(v, "MAD"),   dir: "lower"  },
    { label: "Average Price",   aVal: a.price_analysis.avg_price,       bVal: b.price_analysis.avg_price,       display: v => fmt(v, "MAD"),   dir: "lower"  },
    { label: "Price Change",    aVal: a.price_analysis.price_change_pct, bVal: b.price_analysis.price_change_pct, display: v => v !== null ? `${v > 0 ? "+" : ""}${v}%` : "—", dir: "lower" },
    { label: "Discount",        aVal: a.summary.discount_pct,            bVal: b.summary.discount_pct,            display: v => v !== null && v > 0 ? `${Math.round(v)}%` : "None", dir: "higher" },
    { label: "Current Rating",  aVal: a.rating_analysis.current_stars,  bVal: b.rating_analysis.current_stars,  display: v => v !== null ? `${v} / 5` : "—", dir: "higher" },
    { label: "Avg Rating",      aVal: a.rating_analysis.avg_stars,      bVal: b.rating_analysis.avg_stars,      display: v => v !== null ? `${v} / 5` : "—", dir: "higher" },
    { label: "Review Count",    aVal: a.summary.reviews_count,           bVal: b.summary.reviews_count,           display: v => v !== null ? v.toLocaleString("en") : "—", dir: "higher" },
    { label: "Scraped Records", aVal: a.price_analysis.total_records,   bVal: b.price_analysis.total_records,   display: v => v !== null ? String(v) : "—", dir: "higher" },
  ];

  return (
    <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-stone-100 flex items-center gap-3">
        <h3 className="text-sm font-bold text-stone-800 flex-1">Key Metrics</h3>
        <div className="flex items-center gap-3 text-xs font-semibold">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />Better</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-400 inline-block" />Worse</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-stone-50">
              <th className="text-left text-xs font-semibold text-stone-400 uppercase tracking-wider px-5 py-3 w-40">Metric</th>
              <th className="text-center text-xs font-semibold uppercase tracking-wider px-5 py-3" style={{ color: COLOR_A }}>Product A</th>
              <th className="text-center text-xs font-semibold uppercase tracking-wider px-5 py-3" style={{ color: COLOR_B }}>Product B</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const w = winner(row.aVal, row.bVal, row.dir);
              return (
                <tr key={row.label} className={i % 2 === 0 ? "bg-white" : "bg-stone-50/40"}>
                  <td className="px-5 py-3 text-xs font-semibold text-stone-500 whitespace-nowrap">{row.label}</td>
                  <td className={`px-5 py-3 text-center text-sm ${cellBg("a", w)} ${cellText("a", w)}`}>
                    {row.display(row.aVal)}
                    {w === "a" && <span className="ml-1 text-[10px]">▲</span>}
                  </td>
                  <td className={`px-5 py-3 text-center text-sm ${cellBg("b", w)} ${cellText("b", w)}`}>
                    {row.display(row.bVal)}
                    {w === "b" && <span className="ml-1 text-[10px]">▲</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Overlay line chart for price or rating history
function OverlayChart({
  data, dataKeyA, dataKeyB, label, nameA, nameB, yFormatter,
}: {
  data: Array<{ date: string; A: number | null; B: number | null }>;
  dataKeyA: string; dataKeyB: string;
  label: string; nameA: string; nameB: string;
  yFormatter?: (v: number) => string;
}) {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5 flex items-center justify-center h-52">
        <p className="text-sm text-stone-400">Not enough data</p>
      </div>
    );
  }
  return (
    <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
      <h3 className="text-sm font-bold text-stone-800 mb-4">{label}</h3>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#a8a29e" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 10, fill: "#a8a29e" }} axisLine={false} tickLine={false} tickFormatter={yFormatter} width={50} />
          <Tooltip
            contentStyle={{ borderRadius: 10, border: "1px solid #e7e5e4", fontSize: 12, boxShadow: "0 4px 16px rgba(0,0,0,.07)" }}
            formatter={(v: number, name: string) => [yFormatter ? yFormatter(v) : v, name]}
          />
          <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
          <Line type="monotone" dataKey={dataKeyA} name={nameA} stroke={COLOR_A} strokeWidth={2} dot={false} connectNulls />
          <Line type="monotone" dataKey={dataKeyB} name={nameB} stroke={COLOR_B} strokeWidth={2} dot={false} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// Sentiment bars for one product
function SentimentPanel({ sentiment, label, color }: { sentiment: SentimentResult; label: string; color: string }) {
  const total = sentiment.total_analyzed;
  const pct   = (n: number) => total ? Math.round((n / total) * 100) : 0;
  const posPct = pct(sentiment.distribution.positive);
  const neuPct = pct(sentiment.distribution.neutral);
  const negPct = pct(sentiment.distribution.negative);

  const overallCfg = SENTIMENT_CFG[sentiment.overall_label];

  return (
    <div className="flex-1 bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
        <p className="text-sm font-bold text-stone-800">{label}</p>
        <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${overallCfg.text} bg-stone-50`}>
          {sentiment.overall_label}
        </span>
      </div>

      <div className="space-y-3">
        {(["positive", "neutral", "negative"] as const).map(key => {
          const cfg  = SENTIMENT_CFG[key];
          const pct_ = key === "positive" ? posPct : key === "neutral" ? neuPct : negPct;
          return (
            <div key={key}>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-semibold ${cfg.text}`}>{cfg.label}</span>
                <span className="text-xs font-bold text-stone-600 tabular-nums">{pct_}%</span>
              </div>
              <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${cfg.bar}`} style={{ width: `${pct_}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-stone-400 mt-3 text-right">{total} comments analyzed</p>
    </div>
  );
}

// Two review cards for one product
function ReviewPanel({ reviews, label, color }: { reviews: Review[]; label: string; color: string }) {
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
        <p className="text-sm font-bold text-stone-700">{label}</p>
      </div>
      {reviews.length === 0 ? (
        <div className="bg-stone-50 rounded-xl p-4 text-xs text-stone-400 text-center">No reviews scraped</div>
      ) : (
        <div className="space-y-3">
          {reviews.map((r, i) => (
            <div key={r._id ?? i} className="bg-white rounded-xl border border-stone-100 p-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-stone-700">{r.username || "Anonymous"}</span>
                <span className="text-xs text-amber-500 font-semibold">{"★".repeat(Math.min(5, Math.round(r.stars ?? 0)))}</span>
              </div>
              {r.title && <p className="text-xs font-semibold text-stone-800 mb-1">{r.title}</p>}
              <p className="text-xs text-stone-500 line-clamp-3">{r.comment}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Loading skeleton while comparison is running
function ComparisonSkeleton() {
  return (
    <div className="space-y-5 mt-2">
      <div className="flex gap-4">
        <Skeleton className="flex-1 h-28" />
        <div className="w-10 flex items-center justify-center flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-stone-100 animate-pulse" />
        </div>
        <Skeleton className="flex-1 h-28" />
      </div>
      <Skeleton className="h-72" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-52" />
        <Skeleton className="h-52" />
      </div>
      <div className="flex gap-4">
        <Skeleton className="flex-1 h-36" />
        <Skeleton className="flex-1 h-36" />
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export function ComparePage() {
  const [allProducts, setAllProducts] = useState<ApiProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [selectedA, setSelectedA] = useState("");
  const [selectedB, setSelectedB] = useState("");
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [comparing,  setComparing]  = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  useEffect(() => {
    api.getProducts()
      .then(setAllProducts)
      .catch(() => {})
      .finally(() => setLoadingProducts(false));
  }, []);

  const nameA = allProducts.find(p => p._id === selectedA)?.name ?? "Product A";
  const nameB = allProducts.find(p => p._id === selectedB)?.name ?? "Product B";

  async function handleCompare() {
    if (!selectedA || !selectedB) return;
    setComparing(true);
    setError(null);
    setComparison(null);
    try {
      setComparison(await api.compare(selectedA, selectedB));
    } catch {
      setError("Failed to load comparison. Ensure both products have scraped data.");
    } finally {
      setComparing(false);
    }
  }

  const canCompare = !!selectedA && !!selectedB && selectedA !== selectedB;
  const sameProduct = !!selectedA && selectedA === selectedB;

  const priceChart  = useMemo(() => comparison ? mergePriceHistories( comparison.product_a.price_history, comparison.product_b.price_history) : [], [comparison]);
  const ratingChart = useMemo(() => comparison ? mergeRatingHistories(comparison.product_a.price_history, comparison.product_b.price_history) : [], [comparison]);

  return (
    <div className="space-y-5 max-w-5xl">

      {/* ── Selector card ───────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-stone-200/60 shadow-sm p-5">
        <h3 className="text-sm font-bold text-stone-800 mb-1">Select Products</h3>
        <p className="text-xs text-stone-400 mb-5">Choose two products to compare side by side</p>

        {/* Labels row — perfectly aligned above each selector */}
        <div className="flex gap-3 mb-2">
          <div className="flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: COLOR_A }}>Product A</p>
          </div>
          <div className="w-10 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: COLOR_B }}>Product B</p>
          </div>
        </div>

        {/* Selectors + swap button — all on the same baseline */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <ProductSelector
              products={allProducts}
              value={selectedA}
              onChange={setSelectedA}
              excludeId={selectedB}
            />
          </div>

          <div className="shrink-0">
            <button
              type="button"
              title="Swap products"
              onClick={() => {
                const tmp = selectedA;
                setSelectedA(selectedB);
                setSelectedB(tmp);
                setComparison(null);
              }}
              disabled={!selectedA && !selectedB}
              className="w-10 h-10 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center transition-colors disabled:opacity-30"
            >
              <svg className="w-4 h-4 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </button>
          </div>

          <div className="relative flex-1">
            <ProductSelector
              products={allProducts}
              value={selectedB}
              onChange={setSelectedB}
              excludeId={selectedA}
            />
          </div>
        </div>

        {sameProduct && (
          <p className="mt-3 text-xs text-amber-600 font-medium">Select two different products to compare.</p>
        )}

        <div className="mt-4 flex justify-end">
          <button
            onClick={handleCompare}
            disabled={!canCompare || comparing || loadingProducts}
            className="flex items-center gap-2 px-6 py-2.5 bg-stone-800 text-white text-sm font-bold rounded-xl hover:bg-stone-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
          >
            {comparing ? (
              <>
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" strokeLinecap="round" />
                </svg>
                Analyzing…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Compare
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Error ───────────────────────────────────────────────────────── */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 font-medium">{error}</div>
      )}

      {/* ── Skeleton while loading ───────────────────────────────────────── */}
      {comparing && <ComparisonSkeleton />}

      {/* ── Empty state ─────────────────────────────────────────────────── */}
      {!comparison && !comparing && !error && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-stone-100 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-stone-500">No comparison loaded</p>
          <p className="text-xs text-stone-400 mt-1">Select two products above and click Compare</p>
        </div>
      )}

      {/* ── Comparison results ───────────────────────────────────────────── */}
      {comparison && !comparing && (
        <>
          {/* Hero product cards */}
          <div className="flex gap-4">
            <ProductHeroCard data={comparison.product_a} color={COLOR_A} label="A" />
            <div className="flex items-center justify-center flex-shrink-0 w-10">
              <span className="text-lg font-black text-stone-300">vs</span>
            </div>
            <ProductHeroCard data={comparison.product_b} color={COLOR_B} label="B" />
          </div>

          {/* Metrics table */}
          <MetricsTable cmp={comparison} />

          {/* Price + Rating history charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <OverlayChart
              data={priceChart}
              dataKeyA="A" dataKeyB="B"
              label="Price History"
              nameA={nameA} nameB={nameB}
              yFormatter={v => `${v.toLocaleString()} MAD`}
            />
            <OverlayChart
              data={ratingChart}
              dataKeyA="A" dataKeyB="B"
              label="Rating Over Time"
              nameA={nameA} nameB={nameB}
              yFormatter={v => `${v} ★`}
            />
          </div>

          {/* Sentiment comparison */}
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-100">
              <h3 className="text-sm font-bold text-stone-800">Sentiment Analysis</h3>
              <p className="text-xs text-stone-400 mt-0.5">Multilingual model — Arabic, English, French, Spanish and more</p>
            </div>
            <div className="flex gap-4 p-5">
              <SentimentPanel sentiment={comparison.product_a.sentiment} label={nameA} color={COLOR_A} />
              <SentimentPanel sentiment={comparison.product_b.sentiment} label={nameB} color={COLOR_B} />
            </div>
          </div>

          {/* Reviews side by side */}
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-100">
              <h3 className="text-sm font-bold text-stone-800">Review Highlights</h3>
              <p className="text-xs text-stone-400 mt-0.5">Most recent reviews for each product</p>
            </div>
            <div className="flex gap-6 p-5">
              <ReviewPanel reviews={comparison.product_a.top_reviews} label={nameA} color={COLOR_A} />
              <div className="w-px bg-stone-100 flex-shrink-0" />
              <ReviewPanel reviews={comparison.product_b.top_reviews} label={nameB} color={COLOR_B} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
