import { useEffect, useRef, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import { api, type AuthenticityResult, type AuthenticityFlag } from "../../api/client";
import { Spinner } from "../../components/Spinner";

// ── Constants & helpers ───────────────────────────────────────────────────────

const RISK_CFG = {
  low:     { label: "Low Risk",     bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", ring: "#10b981" },
  medium:  { label: "Medium Risk",  bg: "bg-amber-50",   border: "border-amber-200",   text: "text-amber-700",   ring: "#f59e0b" },
  high:    { label: "High Risk",    bg: "bg-red-50",     border: "border-red-200",     text: "text-red-600",     ring: "#f43f5e" },
  unknown: { label: "Unknown",      bg: "bg-stone-50",   border: "border-stone-200",   text: "text-stone-500",   ring: "#a8a29e" },
} as const;

const SEVERITY_CFG = {
  high:   { dot: "bg-red-500",    badge: "bg-red-50 text-red-600 border-red-200",     icon: "⬤" },
  medium: { dot: "bg-amber-400",  badge: "bg-amber-50 text-amber-700 border-amber-200", icon: "⬤" },
  low:    { dot: "bg-stone-300",  badge: "bg-stone-50 text-stone-500 border-stone-200", icon: "⬤" },
} as const;

const FLAG_LABELS: Record<string, string> = {
  rating_inflation:   "Rating Inflation",
  bimodal_distribution: "Bimodal Distribution",
  review_burst:       "Review Burst",
  short_reviews:      "Short Reviews",
  generic_wording:    "Generic Wording",
  suspicious_usernames: "Suspicious Usernames",
  review_count_spike: "Review Count Spike",
};

// ── Score ring SVG ────────────────────────────────────────────────────────────

function ScoreRing({ score, riskLevel }: { score: number | null; riskLevel: keyof typeof RISK_CFG }) {
  const r    = 46;
  const circ = 2 * Math.PI * r;
  const col  = RISK_CFG[riskLevel].ring;
  const off  = score !== null ? circ - (score / 100) * circ : circ;

  return (
    <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 112 112">
        <circle cx="56" cy="56" r={r} fill="none" stroke="#f5f5f4" strokeWidth="8" />
        <circle
          cx="56" cy="56" r={r} fill="none" stroke={col} strokeWidth="8"
          strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.9s ease" }}
        />
      </svg>
      <div className="relative text-center">
        {score !== null ? (
          <>
            <p className="text-3xl font-black leading-none" style={{ color: col }}>{score}</p>
            <p className="text-[10px] text-stone-400 mt-0.5 font-medium">/ 100</p>
          </>
        ) : (
          <p className="text-sm text-stone-400 font-medium px-2">N/A</p>
        )}
      </div>
    </div>
  );
}

// ── Section card wrapper ──────────────────────────────────────────────────────

function Card({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="bg-stone-50 rounded-xl border border-stone-100 overflow-hidden">
      <div className="px-4 py-3 border-b border-stone-100 flex items-center gap-2">
        <span className="text-sm">{icon}</span>
        <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider">{title}</h4>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

// ── Metric row inside a card ──────────────────────────────────────────────────

function MetricRow({ label, value, bar, barColor, note }: {
  label: string; value: string | number; bar?: number; barColor?: string; note?: string;
}) {
  return (
    <div className="mb-3 last:mb-0">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-stone-500 font-medium">{label}</span>
        <span className="text-xs font-bold text-stone-800 tabular-nums">{value}</span>
      </div>
      {bar !== undefined && (
        <div className="h-2 bg-stone-200 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${Math.min(100, bar)}%`, backgroundColor: barColor ?? "#6366f1" }}
          />
        </div>
      )}
      {note && <p className="text-[10px] text-stone-400 mt-0.5">{note}</p>}
    </div>
  );
}

// ── Flag item ─────────────────────────────────────────────────────────────────

function FlagItem({ flag }: { flag: AuthenticityFlag }) {
  const cfg = SEVERITY_CFG[flag.severity];
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-stone-100 last:border-0">
      <span className={`w-2 h-2 rounded-full mt-1 shrink-0 ${cfg.dot}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-stone-700">
            {FLAG_LABELS[flag.type] ?? flag.type}
          </span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border capitalize ${cfg.badge}`}>
            {flag.severity}
          </span>
        </div>
        <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">{flag.detail}</p>
      </div>
    </div>
  );
}

// ── Main Modal ────────────────────────────────────────────────────────────────

interface Props {
  productId: string;
  onClose:   () => void;
}

export function AuthenticityModal({ productId, onClose }: Props) {
  const [data,    setData]    = useState<AuthenticityResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.getAuthenticity(productId)
      .then(setData)
      .catch(() => setError("Failed to load authenticity analysis."))
      .finally(() => setLoading(false));
  }, [productId]);

  // Close on overlay click
  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === overlayRef.current) onClose();
  }

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const riskLevel = data?.risk_level ?? "unknown";
  const riskCfg   = RISK_CFG[riskLevel];

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* ── Sticky header ─────────────────────────────────────────────── */}
        <div className="px-6 py-4 border-b border-stone-100 flex items-start justify-between shrink-0">
          <div>
            <h2 className="text-base font-black text-stone-800">Review Authenticity Analysis</h2>
            <p className="text-xs text-stone-400 mt-0.5">
              Statistical anomaly detection · Z-score · distribution analysis
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-500 hover:text-stone-800 transition-colors text-lg font-bold shrink-0 ml-4"
          >
            ×
          </button>
        </div>

        {/* ── Scrollable body ───────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-stone-400">
              <Spinner size={8} />
              <p className="text-sm">Running authenticity analysis…</p>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600 text-center">
              {error}
            </div>
          )}

          {/* Not enough data */}
          {!loading && data && data.score === null && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <div className="w-14 h-14 rounded-2xl bg-stone-100 flex items-center justify-center text-2xl">🔍</div>
              <p className="text-sm font-bold text-stone-600">Not enough data</p>
              <p className="text-xs text-stone-400 max-w-xs">{data.message ?? "Minimum 3 reviews are needed to run a reliable analysis."}</p>
            </div>
          )}

          {/* Results */}
          {!loading && data && data.score !== null && (() => {
            const d    = data.details;
            const rd   = d.rating_distribution;
            const temp = d.temporal;
            const cq   = d.content_quality;
            const up   = d.username_patterns;

            // Trim daily distribution to last 60 entries for chart readability
            const chartData = (temp?.daily_distribution ?? []).slice(-60);

            return (
              <>


                {/* ── Flags ───────────────────────────────────────────── */}
                {data.flags.length > 0 && (
                  <Card title="Detected Issues" icon="⚠">
                    <div>
                      {data.flags.map((f, i) => <FlagItem key={i} flag={f} />)}
                    </div>
                  </Card>
                )}

                {data.flags.length === 0 && (
                  <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                    <span className="text-emerald-500 text-lg">✓</span>
                    <p className="text-sm font-semibold text-emerald-700">No suspicious patterns detected</p>
                  </div>
                )}

                {/* ── Rating Distribution ─────────────────────────────── */}
                {rd && (
                  <Card title="Rating Distribution Analysis" icon="★">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <MetricRow
                          label="5★ reviews"
                          value={`${rd.five_star_pct}%`}
                          bar={rd.five_star_pct}
                          barColor={rd.five_star_pct > 70 ? "#f43f5e" : rd.five_star_pct > 55 ? "#f59e0b" : "#10b981"}
                          note={rd.five_star_pct > 70 ? "⚠ Unusually high" : rd.five_star_pct > 55 ? "Slightly elevated" : "Normal range"}
                        />
                        <MetricRow
                          label="Middle ratings (2–4★)"
                          value={`${rd.mid_star_pct}%`}
                          bar={rd.mid_star_pct}
                          barColor="#6366f1"
                          note={rd.mid_star_pct < 15 ? "⚠ Very low — bimodal signal" : "Expected range"}
                        />
                      </div>
                      <div className="space-y-2">
                        <MetricRow
                          label="1★ reviews"
                          value={`${rd.one_star_pct}%`}
                          bar={rd.one_star_pct}
                          barColor="#f43f5e"
                        />
                        <MetricRow
                          label="Extreme ratings (1★ + 5★)"
                          value={`${rd.extreme_pct}%`}
                          bar={rd.extreme_pct}
                          barColor={rd.extreme_pct > 80 ? "#f43f5e" : rd.extreme_pct > 70 ? "#f59e0b" : "#10b981"}
                          note={rd.extreme_pct > 80 ? "⚠ Bimodal — possible manipulation" : rd.extreme_pct > 70 ? "Polarised" : "Normal"}
                        />
                      </div>
                    </div>
                  </Card>
                )}


                {/* ── Content Quality ──────────────────────────────────── */}
                {cq && (
                  <Card title="Content Quality" icon="✍">
                    <div className="grid grid-cols-2 gap-4">
                      <MetricRow
                        label="Very short reviews (< 3 words)"
                        value={`${cq.short_review_pct}%`}
                        bar={cq.short_review_pct}
                        barColor={cq.short_review_pct > 30 ? "#f43f5e" : cq.short_review_pct > 15 ? "#f59e0b" : "#10b981"}
                        note={`${cq.short_review_count} of ${data.total_reviews} reviews`}
                      />
                      <MetricRow
                        label="Generic / non-descriptive"
                        value={`${cq.generic_wording_pct}%`}
                        bar={cq.generic_wording_pct}
                        barColor={cq.generic_wording_pct > 25 ? "#f43f5e" : cq.generic_wording_pct > 15 ? "#f59e0b" : "#10b981"}
                        note={`${cq.generic_review_count} of ${data.total_reviews} reviews`}
                      />
                    </div>
                    <p className="text-[10px] text-stone-400 mt-3">
                      Generic wording check flags reviews using only common words (good, nice, great…) with no specific detail.
                    </p>
                  </Card>
                )}

                {/* ── Username Patterns ────────────────────────────────── */}
                {up && (
                  <Card title="Username Patterns" icon="👤">
                    <MetricRow
                      label="Generic / auto-generated usernames"
                      value={`${up.generic_username_pct}%`}
                      bar={up.generic_username_pct}
                      barColor={up.generic_username_pct > 25 ? "#f59e0b" : "#10b981"}
                      note={`${up.generic_username_count} of ${data.total_reviews} reviewers match patterns like "user123", "anonymous", "customer"`}
                    />
                  </Card>
                )}

                {/* ── Disclaimer ───────────────────────────────────────── */}
                <p className="text-[10px] text-stone-400 text-center pb-1 leading-relaxed">
                  This analysis uses statistical heuristics and does not constitute definitive proof of fake reviews.
                  Low scores indicate patterns worth investigating further.
                </p>
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
