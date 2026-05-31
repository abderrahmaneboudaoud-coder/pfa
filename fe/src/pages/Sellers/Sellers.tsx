import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PlatformBadge } from "../../components/PlatformBadge";
import type { Seller } from "../../types/types";
import { StarRating } from "../../components/StarRating";

export function SellersPage({ sellers }: { sellers: Seller[] }) {
  const sorted = [...sellers].sort((a, b) => b.rating - a.rating);
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Lowest Avg Price", key: "avgPrice" as const, icon: "💰", sort: (a: Seller, b: Seller) => a.avgPrice - b.avgPrice },
          { label: "Best Stock Rate", key: "stockRate" as const, icon: "📦", sort: (a: Seller, b: Seller) => b.stockRate - a.stockRate },
          { label: "Highest Rating", key: "rating" as const, icon: "⭐", sort: (a: Seller, b: Seller) => b.rating - a.rating },
        ].map(({ label, key, icon, sort }) => {
          const top = [...sellers].sort(sort)[0];
          return (
            <div key={label} className="bg-white rounded-2xl p-5 border border-stone-100 shadow-sm">
              <p className="text-2xl mb-2">{icon}</p>
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">{label}</p>
              <p className="text-xl font-black text-stone-800 mt-1">{top.name}</p>
              <PlatformBadge name={top.platform} />
              <p className="text-stone-500 text-sm mt-2">
                {key === "avgPrice" && `$${top.avgPrice} avg`}
                {key === "stockRate" && `${top.stockRate}% in stock`}
                {key === "rating" && `${top.rating} / 5.0`}
              </p>
            </div>
          );
        })}
      </div>

      {/* Sellers Table */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100">
          <h3 className="text-sm font-bold text-stone-700">All Sellers</h3>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-stone-50">
            <tr>
              {["Seller", "Platform", "Avg Price", "Stock Rate", "Rating", "Products"].map(h => (
                <th key={h} className="text-left text-xs font-semibold text-stone-400 uppercase tracking-wider px-5 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((s, i) => (
              <tr key={s.name} className={i % 2 === 0 ? "bg-white" : "bg-stone-50/50"}>
                <td className="px-5 py-3 font-semibold text-stone-800">{s.name}</td>
                <td className="px-5 py-3"><PlatformBadge name={s.platform} /></td>
                <td className="px-5 py-3 font-bold text-stone-700">${s.avgPrice}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${s.stockRate}%` }} />
                    </div>
                    <span className="text-stone-600">{s.stockRate}%</span>
                  </div>
                </td>
                <td className="px-5 py-3"><StarRating rating={s.rating} /></td>
                <td className="px-5 py-3 text-stone-500">{s.products}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bar chart */}
      <div className="bg-white rounded-2xl p-5 border border-stone-100 shadow-sm">
        <h3 className="text-sm font-bold text-stone-700 mb-4">Seller Rating vs Stock Rate</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={sellers} barSize={16}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0ede8" />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#a8a29e" }} />
            <YAxis tick={{ fontSize: 11, fill: "#a8a29e" }} />
            <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #e7e5e4", fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="rating" name="Rating" fill="#6366f1" radius={[4, 4, 0, 0]} />
            <Bar dataKey="stockRate" name="Stock %" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}