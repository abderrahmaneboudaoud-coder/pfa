import { CartesianGrid, Legend, Line, LineChart, PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PLATFORM_COLORS } from "../../data/mockData";
import type { Platform, Product } from "../../types/types";
import { PlatformBadge } from "../../components/PlatformBadge";
import { useState } from "react";
import { StarRating } from "../../components/StarRating";

export function ProductAnalysis({ products }: { products: Product[] }) {
  const [selected, setSelected] = useState(products[0].id);
  const product = products.find(p => p.id === selected)!;

  return (
    <div className="space-y-5">
      {/* Product Selector */}
      <div className="flex gap-3 flex-wrap">
        {products.map(p => (
          <button key={p.id} onClick={() => setSelected(p.id)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${
              selected === p.id
                ? "bg-stone-800 text-white border-stone-800 shadow"
                : "bg-white text-stone-600 border-stone-200 hover:border-stone-400"
            }`}>
            {p.name}
          </button>
        ))}
      </div>

      {/* Price History */}
      <div className="bg-white rounded-2xl p-5 border border-stone-100 shadow-sm">
        <h3 className="text-sm font-bold text-stone-700 mb-4">Price History · {product.name}</h3>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={product.priceHistory}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0ede8" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#a8a29e" }} />
            <YAxis tick={{ fontSize: 11, fill: "#a8a29e" }} />
            <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #e7e5e4", fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {(["Jumia", "Amazon", "AliExpress"] as Platform[]).map(pl => (
              <Line key={pl} type="monotone" dataKey={pl} stroke={PLATFORM_COLORS[pl]}
                strokeWidth={2.5} dot={{ r: 5, fill: PLATFORM_COLORS[pl] }} activeDot={{ r: 7 }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Platform Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {product.platforms.map(pl => (
          <div key={pl.name} className="bg-white rounded-2xl p-5 border border-stone-100 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <PlatformBadge name={pl.name} />
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${pl.inStock ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"}`}>
                {pl.inStock ? "In Stock" : "Out of Stock"}
              </span>
            </div>
            <p className="text-3xl font-black text-stone-800 mt-2">${pl.price}</p>
            <div className="mt-3 space-y-1.5">
              <StarRating rating={pl.rating} />
              <p className="text-xs text-stone-400">{pl.reviews.toLocaleString()} reviews</p>
              <p className="text-xs text-stone-500">Seller: <span className="font-semibold text-stone-700">{pl.seller}</span></p>
            </div>
          </div>
        ))}
      </div>

      {/* Radar comparison */}
      <div className="bg-white rounded-2xl p-5 border border-stone-100 shadow-sm">
        <h3 className="text-sm font-bold text-stone-700 mb-4">Platform Score Comparison</h3>
        <ResponsiveContainer width="100%" height={240}>
          <RadarChart data={[
            { metric: "Price", Jumia: 70, Amazon: 85, AliExpress: 95 },
            { metric: "Rating", Jumia: product.platforms[0].rating * 20, Amazon: product.platforms[1].rating * 20, AliExpress: product.platforms[2].rating * 20 },
            { metric: "Reviews", Jumia: 30, Amazon: 95, AliExpress: 15 },
            { metric: "Availability", Jumia: product.platforms[0].inStock ? 100 : 0, Amazon: product.platforms[1].inStock ? 100 : 0, AliExpress: product.platforms[2].inStock ? 100 : 0 },
          ]}>
            <PolarGrid stroke="#e7e5e4" />
            <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: "#78716c" }} />
            {(["Jumia", "Amazon", "AliExpress"] as Platform[]).map(pl => (
              <Radar key={pl} name={pl} dataKey={pl} stroke={PLATFORM_COLORS[pl]}
                fill={PLATFORM_COLORS[pl]} fillOpacity={0.12} strokeWidth={2} />
            ))}
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
