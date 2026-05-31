import type { ApiProduct, ProductSummary } from '../api/client';
import { StarRating } from './StarRating';

const PLATFORM_DOT: Record<string, string> = {
  Amazon:  'bg-yellow-400',
  Jumia:   'bg-orange-500',
  Hmizate: 'bg-pink-500',
};

function PlatformPill({ name }: { name: string }) {
  const dot = PLATFORM_DOT[name] ?? 'bg-stone-400';
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {name}
    </span>
  );
}

function fmt(n: number | null | undefined, currency: string | null | undefined) {
  if (n == null) return '—';
  const cur = currency ?? '';
  return `${cur} ${n.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`.trim();
}

function timeAgo(iso: string | null) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

interface Props {
  product: ApiProduct;
  summary: ProductSummary | null;
  onClick: () => void;
}

export function ProductCard({ product, summary, onClick }: Props) {
  const name = product.name ?? 'Unknown product';
  const platform = product.platform ?? '';
  const price = summary?.price;
  const discountPct = summary?.discount_pct ?? 0;

  return (
    <button
      onClick={onClick}
      className="group bg-white rounded-2xl border border-stone-100 shadow-sm hover:shadow-md hover:border-stone-300 transition-all text-left w-full overflow-hidden flex flex-col"
    >
      {/* Image */}
      <div className="relative w-full aspect-[4/3] bg-stone-50 overflow-hidden">
        {product.img_url ? (
          <img
            src={product.img_url}
            alt={name}
            className="w-full h-full object-contain p-3 group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-stone-300">
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        {discountPct > 0 && (
          <span className="absolute top-2 right-2 bg-emerald-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-lg">
            -{discountPct.toFixed(0)}%
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-4 flex flex-col gap-2 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-stone-800 leading-snug line-clamp-2 flex-1">{name}</p>
          <svg className="w-4 h-4 text-stone-300 group-hover:text-stone-600 transition-colors shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>

        <PlatformPill name={platform} />

        <div className="mt-auto pt-2 flex items-end justify-between">
          <div>
            {summary ? (
              <>
                <p className="text-xl font-black text-stone-800">
                  {fmt(price, null)}
                </p>
                {summary.old_price && (
                  <p className="text-xs text-stone-400 line-through">{fmt(summary.old_price, null)}</p>
                )}
              </>
            ) : (
              <div className="h-6 w-20 bg-stone-100 rounded animate-pulse" />
            )}
          </div>
          <div className="text-right">
            {summary?.stars != null ? (
              <StarRating rating={summary.stars} />
            ) : (
              <div className="h-4 w-16 bg-stone-100 rounded animate-pulse" />
            )}
            <p className="text-[10px] text-stone-400 mt-0.5">{timeAgo(product.last_updated)}</p>
          </div>
        </div>
      </div>
    </button>
  );
}
