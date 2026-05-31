import React from 'react';

interface KpiCardProps {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
  icon?: string;
  trend?: number; // positive = went up, negative = went down
}

export function KpiCard({
  label,
  value,
  sub,
  accent = 'text-stone-900',
  icon,
  trend,
}: KpiCardProps) {
  const isTrendPositive = trend !== undefined && trend >= 0;

  return (
    <div className="group relative bg-white rounded-xl border border-stone-200/60 p-5 shadow-sm transition-all duration-300 hover:shadow-lg hover:shadow-stone-200/40 hover:-translate-y-1">
      <div className="flex flex-col gap-4">
        {/* Header: Icon & Label */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {icon && (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-50 text-stone-600 transition-colors group-hover:bg-stone-100">
                <span className="text-base">{icon}</span>
              </div>
            )}
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
              {label}
            </span>
          </div>
        </div>

        {/* Body: Main Value & Trend */}
        <div className="flex items-baseline justify-between gap-2">
          <h3 className={`text-3xl font-bold tracking-tight ${accent}`}>
            {value}
          </h3>
          
          {trend !== undefined && (
            <div
              className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-bold ring-1 ring-inset ${
                isTrendPositive
                  ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                  : 'bg-rose-50 text-rose-700 ring-rose-600/20'
              }`}
            >
              <span>{isTrendPositive ? '↑' : '↓'}</span>
              <span>{Math.abs(trend).toFixed(1)}%</span>
            </div>
          )}
        </div>

        {/* Footer: Subtext */}
        {sub && (
          <div className="border-t border-stone-100 pt-3">
            <p className="text-xs font-medium text-stone-400">
              {sub}
            </p>
          </div>
        )}
      </div>
      
      {/* Decorative accent for high-end feel */}
      <div className={`absolute top-0 left-0 h-1 w-0 rounded-t-xl transition-all duration-500 group-hover:w-full ${accent.replace('text', 'bg')}`} style={{ opacity: 0.1 }} />
    </div>
  );
}