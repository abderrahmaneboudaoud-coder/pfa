import { useEffect, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  api,
  type Insights, type PriceHistoryEntry,
  type ReviewTimelineEntry, type Review, type SentimentResult,
} from '../../api/client';
import { Spinner } from '../../components/Spinner';
import { StarRating } from '../../components/StarRating';
import { KpiCard } from '../../components/KPICard';
import { AuthenticityModal } from './AuthenticityModal';

// ── helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number | null | undefined, currency?: string | null) {
  if (n == null) return '—';
  const cur = currency ? `${currency} ` : '';
  return `${cur}${n.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtNum(n: number | null | undefined) {
  if (n == null) return '—';
  return n.toLocaleString('en');
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en', {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function pctLabel(n: number | null | undefined) {
  if (n == null) return null;
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

const CHART_STYLE = { borderRadius: 12, border: '1px solid #e7e5e4', fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.06)' };
const TICK_STYLE  = { fontSize: 11, fill: '#a8a29e' };
const GRID_STROKE = '#f5f3f0';

// ── sub-components ────────────────────────────────────────────────────────────

function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
      <div className="px-5 pt-5 pb-4 border-b border-stone-50">
        <h3 className="text-sm font-bold text-stone-800">{title}</h3>
        {subtitle && <p className="text-[11px] text-stone-400 mt-0.5">{subtitle}</p>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function StarBar({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="w-6 text-right text-stone-500 shrink-0 font-medium">{label}</span>
      <div className="flex-1 h-2.5 bg-stone-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-amber-300 to-amber-500 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-8 text-stone-400 shrink-0 tabular-nums">{count}</span>
    </div>
  );
}

function Avatar({ name }: { name: string }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const hue = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return (
    <div
      className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black text-white shrink-0"
      style={{ background: `hsl(${hue}, 55%, 52%)` }}
    >
      {initials || '?'}
    </div>
  );
}

const SENTIMENT_CFG = {
  positive: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', bar: 'bg-emerald-400', emoji: '😊' },
  neutral:  { bg: 'bg-stone-50',   border: 'border-stone-200',   text: 'text-stone-600',   bar: 'bg-stone-300',   emoji: '😐' },
  negative: { bg: 'bg-red-50',     border: 'border-red-200',     text: 'text-red-600',     bar: 'bg-red-400',     emoji: '😞' },
} as const;

function SentimentBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-semibold text-stone-600 w-16 shrink-0 capitalize">{label}</span>
      <div className="flex-1 h-2.5 bg-stone-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-stone-500 w-8 text-right tabular-nums shrink-0">{pct.toFixed(0)}%</span>
      <span className="text-xs text-stone-400 w-10 text-right tabular-nums shrink-0">({count})</span>
    </div>
  );
}

function SentimentQuote({ label, text, username, confidence, variant }: {
  label: string; text: string; username: string; confidence: number;
  variant: 'positive' | 'negative';
}) {
  const cfg = SENTIMENT_CFG[variant];
  return (
    <div className={`rounded-xl border p-4 space-y-2 ${cfg.bg} ${cfg.border}`}>
      <div className="flex items-center justify-between gap-2">
        <span className={`text-[10px] font-bold uppercase tracking-wider ${cfg.text}`}>{label}</span>
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${cfg.bg} ${cfg.text} border ${cfg.border}`}>
          {(confidence * 100).toFixed(0)}% confidence
        </span>
      </div>
      <p className="text-xs text-stone-700 leading-relaxed line-clamp-3">"{text}"</p>
      <p className="text-[10px] text-stone-400">— {username}</p>
    </div>
  );
}

function ReviewCard({ review }: { review: Review }) {
  return (
    <div className="bg-stone-50 hover:bg-stone-100/80 transition-colors rounded-xl p-4 space-y-2 border border-stone-100">
      <div className="flex items-center gap-2.5">
        <Avatar name={review.username} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-stone-700 truncate">{review.username}</p>
          <p className="text-[10px] text-stone-400">{review.date}</p>
        </div>
        <StarRating rating={review.stars} />
      </div>
      {review.title && (
        <p className="text-xs font-semibold text-stone-600 leading-snug">{review.title}</p>
      )}
      <p className="text-xs text-stone-500 leading-relaxed line-clamp-3">{review.comment}</p>
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────────────

interface Props {
  productId: string;
  onBack: () => void;
}

const REVIEWS_PAGE = 6;

export function ProductDetail({ productId, onBack }: Props) {
  const [insights,       setInsights]       = useState<Insights | null>(null);
  const [priceHistory,   setPriceHistory]   = useState<PriceHistoryEntry[]>([]);
  const [reviewTimeline, setReviewTimeline] = useState<ReviewTimelineEntry[]>([]);
  const [latestReviews,  setLatestReviews]  = useState<Review[]>([]);
  const [sentiment,      setSentiment]      = useState<SentimentResult | null>(null);
  const [sentimentLoading, setSentimentLoading] = useState(false);
  const [visibleCount,   setVisibleCount]   = useState(REVIEWS_PAGE);
  const [showAuthModal,  setShowAuthModal]  = useState(false);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setSentiment(null);
    setVisibleCount(REVIEWS_PAGE);

    // Main data — loads fast
    Promise.all([
      api.getInsights(productId),
      api.getPriceHistory(productId),
      api.getReviewTimeline(productId),
      api.getLatestReviews(productId),   // default limit=50
    ])
      .then(([ins, hist, timeline, reviews]) => {
        setInsights(ins);
        setPriceHistory(hist);
        setReviewTimeline(timeline);
        setLatestReviews(reviews);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });

    // Sentiment — runs ML inference, loads independently after main content
    setSentimentLoading(true);
    api.getSentiment(productId)
      .then(s => { setSentiment(s); setSentimentLoading(false); })
      .catch(() => setSentimentLoading(false));
  }, [productId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4 text-stone-400">
        <Spinner size={10} />
        <p className="text-sm">Loading product analysis…</p>
      </div>
    );
  }

  if (error || !insights) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3 text-stone-500">
        <p className="text-3xl">⚠</p>
        <p className="text-sm font-semibold">Could not load product data</p>
        <p className="text-xs text-stone-400">{error}</p>
        <button onClick={onBack} className="mt-2 text-xs text-stone-500 underline">← Go back</button>
      </div>
    );
  }

  const { product, price_analysis: pa, rating_analysis: ra, review_analysis: rva } = insights;
  const currency = priceHistory.find(h => h.currency)?.currency ?? null;

  const priceChartData = priceHistory.map(h => ({
    date: fmtDate(h.scraped_at),
    Price: h.price,
    'Old Price': h.old_price,
  }));

  const ratingChartData = priceHistory
    .filter(h => h.stars != null)
    .map(h => ({
      date: fmtDate(h.scraped_at),
      Stars: h.stars,
    }));

  const { star_distribution: sd } = rva;
  const starDistData = [
    { star: '5★', count: sd.five  },
    { star: '4★', count: sd.four  },
    { star: '3★', count: sd.three },
    { star: '2★', count: sd.two   },
    { star: '1★', count: sd.one   },
  ];

  const priceTrend  = pa.price_change_pct;
  const priceDown   = priceTrend != null && priceTrend < 0;

  return (
    <div className="space-y-6">

      {/* Back */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800 transition-colors font-medium"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to products
      </button>

      {/* Product header card */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row">
          {/* Image */}
          <div className="w-full sm:w-52 bg-gradient-to-br from-stone-50 to-stone-100 flex items-center justify-center p-8 shrink-0">
            {product.img_url ? (
              <img src={product.img_url} alt={product.name ?? ''} className="max-h-40 object-contain drop-shadow-sm" />
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-stone-200 flex items-center justify-center text-stone-400">
                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
          </div>

          {/* Meta */}
          <div className="flex-1 p-6 border-t sm:border-t-0 sm:border-l border-stone-100">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-stone-800 text-white">
                {product.platform}
              </span>
              <span className="text-[10px] text-stone-400 bg-stone-50 px-2 py-1 rounded-full border border-stone-100">
                {pa.total_records} scrape{pa.total_records !== 1 ? 's' : ''} recorded
              </span>
            </div>

            <h2 className="text-2xl font-black text-stone-900 leading-snug mb-4">{product.name}</h2>

            <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-xs text-stone-400">
              {product.last_updated && (
                <span>Last scraped: <strong className="text-stone-600">{new Date(product.last_updated).toLocaleString()}</strong></span>
              )}
              {product.url && (
                <a href={product.url} target="_blank" rel="noopener noreferrer"
                  className="hover:text-stone-700 underline underline-offset-2 transition-colors truncate max-w-sm">
                  View on {product.platform} ↗
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Price section ───────────────────────────────────────────────────── */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-3 px-1">Price Analysis</p>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard
            icon="💰"
            label="Current Price"
            value={fmt(pa.current_price, currency)}
            sub={pctLabel(priceTrend) ? `${pctLabel(priceTrend)} vs first scrape` : undefined}
            accent={priceDown ? 'text-emerald-600' : 'text-stone-800'}
            trend={priceTrend ?? undefined}
          />
          <KpiCard icon="↓" label="Min Price" value={fmt(pa.min_price, currency)} accent="text-emerald-600"
            sub="Lowest recorded" />
          <KpiCard icon="↑" label="Max Price" value={fmt(pa.max_price, currency)} accent="text-red-500"
            sub="Highest recorded" />
          <KpiCard icon="≈" label="Avg Price" value={fmt(pa.avg_price, currency)} accent="text-indigo-500"
            sub={`Over ${pa.total_records} records`} />
        </div>
      </div>

      {/* Price history chart */}
      {priceChartData.length > 0 && (
        <SectionCard title="Price History" subtitle="Tracked price over all scrape sessions">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={priceChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
              <XAxis dataKey="date" tick={TICK_STYLE} interval="preserveStartEnd" />
              <YAxis tick={TICK_STYLE} />
              <Tooltip contentStyle={CHART_STYLE} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="Price"     stroke="#6366f1" strokeWidth={2.5} dot={{ r: 3, fill: '#6366f1' }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="Old Price" stroke="#d1d5db" strokeWidth={1.5} strokeDasharray="5 3" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </SectionCard>
      )}

      {/* ── Rating section ──────────────────────────────────────────────────── */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-3 px-1">Rating Analysis</p>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <KpiCard icon="⭐" label="Current Stars"
            value={ra.current_stars != null ? `${ra.current_stars.toFixed(1)}` : '—'}
            accent="text-amber-500" sub="Latest scrape" />
          <KpiCard icon="∅" label="Avg Stars"
            value={ra.avg_stars != null ? `${ra.avg_stars.toFixed(2)}` : '—'}
            accent="text-amber-400" sub={`Over ${ra.total_records} records`} />
          <KpiCard icon="↓" label="Min Stars"
            value={ra.min_stars != null ? `${ra.min_stars.toFixed(1)}` : '—'}
            accent="text-stone-500" sub="Lowest recorded" />
          <KpiCard
            icon="💬"
            label="Platform Reviews"
            value={fmtNum(ra.current_reviews_count)}
            accent="text-violet-600"
            sub="Total reviews on platform"
          />
        </div>

        {ratingChartData.length > 0 && (
          <SectionCard title="Rating Over Time" subtitle="Star rating tracked across scrape sessions">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={ratingChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                <XAxis dataKey="date" tick={TICK_STYLE} interval="preserveStartEnd" />
                <YAxis domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} tick={TICK_STYLE} />
                <Tooltip contentStyle={CHART_STYLE} />
                <Line type="monotone" dataKey="Stars" stroke="#f59e0b" strokeWidth={2.5}
                  dot={{ r: 3, fill: '#f59e0b' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </SectionCard>
        )}
      </div>

      {/* ── Review section ──────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Review Analysis</p>
          <button
            onClick={() => setShowAuthModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-800 text-white text-xs font-bold hover:bg-stone-700 transition-colors shadow-sm"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
            Review Authenticity Analysis
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">

          {/* Star distribution (progress bars) */}
          <SectionCard title="Review Distribution" subtitle="Breakdown of scraped customer reviews by star rating">
            <div className="flex items-center gap-5 mb-6">
              <div className="text-center">
                <p className="text-5xl font-black text-stone-800 leading-none">
                  {rva.avg_stars != null ? rva.avg_stars.toFixed(1) : '—'}
                </p>
                <p className="text-[10px] text-stone-400 mt-1 font-medium">out of 5</p>
              </div>
              <div className="flex-1">
                {rva.avg_stars != null && <StarRating rating={rva.avg_stars} />}
                <p className="text-xs text-stone-400 mt-2">
                  Based on <strong className="text-stone-600">{rva.total_reviews}</strong> scraped reviews
                </p>
              </div>
            </div>
            <div className="space-y-2.5">
              <StarBar label="5" count={sd.five}  total={rva.total_reviews} />
              <StarBar label="4" count={sd.four}  total={rva.total_reviews} />
              <StarBar label="3" count={sd.three} total={rva.total_reviews} />
              <StarBar label="2" count={sd.two}   total={rva.total_reviews} />
              <StarBar label="1" count={sd.one}   total={rva.total_reviews} />
            </div>
          </SectionCard>

          {/* Bar chart */}
          <SectionCard title="Star Breakdown" subtitle="Visual count per rating">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={starDistData} layout="vertical" barSize={16}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
                <XAxis type="number" tick={TICK_STYLE} />
                <YAxis type="category" dataKey="star" tick={{ ...TICK_STYLE, fontWeight: 600 }} width={32} />
                <Tooltip contentStyle={CHART_STYLE} />
                <Bar dataKey="count" radius={[0, 6, 6, 0]}
                  fill="url(#starGrad)"
                  label={{ position: 'insideRight', fontSize: 10, fill: '#fff', fontWeight: 700 }}
                />
                <defs>
                  <linearGradient id="starGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%"   stopColor="#fbbf24" />
                    <stop offset="100%" stopColor="#f59e0b" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </SectionCard>
        </div>

        {/* Review timeline */}
        {reviewTimeline.length > 0 && (
          <SectionCard title="Review Volume Over Time" subtitle="Monthly scraped review count and average rating">
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={reviewTimeline}>
                <defs>
                  <linearGradient id="reviewGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                <XAxis dataKey="period" tick={TICK_STYLE} />
                <YAxis yAxisId="left"  tick={TICK_STYLE} />
                <YAxis yAxisId="right" orientation="right" domain={[0, 5]} ticks={[1,2,3,4,5]} tick={TICK_STYLE} />
                <Tooltip contentStyle={CHART_STYLE} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area yAxisId="left"  type="monotone" dataKey="count"     stroke="#6366f1" strokeWidth={2} fill="url(#reviewGrad)" name="Reviews" />
                <Line yAxisId="right" type="monotone" dataKey="avg_stars" stroke="#f59e0b" strokeWidth={2} dot={false} name="Avg Stars" />
              </AreaChart>
            </ResponsiveContainer>
          </SectionCard>
        )}

        {/* ── Sentiment section ─────────────────────────────────────────── */}
        <div className="mt-5">
          <SectionCard
            title="Sentiment Analysis"
            subtitle={
              sentimentLoading
                ? 'Running multilingual model (EN · AR · FR · ES)…'
                : sentiment
                  ? `Analyzed ${sentiment.total_analyzed} comments · EN · AR · FR · ES supported`
                  : 'Multilingual sentiment analysis'
            }
          >
            {sentimentLoading && (
              <div className="flex items-center gap-3 py-6 justify-center text-stone-400">
                <Spinner size={5} />
                <p className="text-sm">Analyzing comment sentiments…</p>
              </div>
            )}

            {!sentimentLoading && sentiment && sentiment.total_analyzed > 0 && (() => {
              const cfg = SENTIMENT_CFG[sentiment.overall_label];
              const total = sentiment.total_analyzed;
              const { positive, neutral, negative } = sentiment.distribution;
              return (
                <div className="space-y-6">
                  {/* Overall badge */}
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl border ${cfg.bg} ${cfg.border}`}>
                      {cfg.emoji}
                    </div>
                    <div>
                      <p className={`text-xl font-black capitalize ${cfg.text}`}>{sentiment.overall_label}</p>
                      <p className="text-xs text-stone-400 mt-0.5">
                        Compound score: <strong className="text-stone-600">{sentiment.avg_compound.toFixed(3)}</strong>
                        {' · '}{total} comments analyzed
                      </p>
                    </div>
                  </div>

                  {/* Distribution bars */}
                  <div className="space-y-2.5">
                    <SentimentBar label="Positive" count={positive} total={total} color={SENTIMENT_CFG.positive.bar} />
                    <SentimentBar label="Neutral"  count={neutral}  total={total} color={SENTIMENT_CFG.neutral.bar}  />
                    <SentimentBar label="Negative" count={negative} total={total} color={SENTIMENT_CFG.negative.bar} />
                  </div>

                  {/* Top quotes */}
                  {(sentiment.top_positive || sentiment.top_negative) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                      {sentiment.top_positive && (
                        <SentimentQuote
                          label="Most positive"
                          variant="positive"
                          text={sentiment.top_positive.comment}
                          username={sentiment.top_positive.username}
                          confidence={sentiment.top_positive.confidence}
                        />
                      )}
                      {sentiment.top_negative && (
                        <SentimentQuote
                          label="Most negative"
                          variant="negative"
                          text={sentiment.top_negative.comment}
                          username={sentiment.top_negative.username}
                          confidence={sentiment.top_negative.confidence}
                        />
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            {!sentimentLoading && sentiment && sentiment.total_analyzed === 0 && (
              <p className="text-sm text-stone-400 py-4 text-center">No comments available to analyze.</p>
            )}
          </SectionCard>
        </div>

        {/* ── Latest reviews with See More ──────────────────────────────── */}
        {latestReviews.length > 0 && (
          <div className="mt-5">
            <SectionCard
              title="Customer Reviews"
              subtitle={`Showing ${Math.min(visibleCount, latestReviews.length)} of ${latestReviews.length} scraped comments`}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {latestReviews.slice(0, visibleCount).map(r => (
                  <ReviewCard key={r._id} review={r} />
                ))}
              </div>

              {visibleCount < latestReviews.length && (
                <div className="mt-5 flex justify-center">
                  <button
                    onClick={() => setVisibleCount(v => v + REVIEWS_PAGE)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-stone-200 bg-white text-sm font-semibold text-stone-600 hover:bg-stone-50 hover:border-stone-300 hover:text-stone-800 transition-all shadow-sm"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    Show {Math.min(REVIEWS_PAGE, latestReviews.length - visibleCount)} more reviews
                  </button>
                </div>
              )}

              {visibleCount >= latestReviews.length && latestReviews.length > REVIEWS_PAGE && (
                <div className="mt-4 flex justify-center">
                  <button
                    onClick={() => setVisibleCount(REVIEWS_PAGE)}
                    className="text-xs text-stone-400 hover:text-stone-600 transition-colors underline underline-offset-2"
                  >
                    Collapse reviews
                  </button>
                </div>
              )}
            </SectionCard>
          </div>
        )}
      </div>

      {/* ── Authenticity modal (portal-free, rendered inside layout) ──── */}
      {showAuthModal && (
        <AuthenticityModal
          productId={productId}
          onClose={() => setShowAuthModal(false)}
        />
      )}
    </div>
  );
}
