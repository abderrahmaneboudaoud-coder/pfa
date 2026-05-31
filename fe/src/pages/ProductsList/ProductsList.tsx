import { useEffect, useState } from 'react';
import { api, type ApiProduct, type ProductSummary } from '../../api/client';
import { ProductCard } from '../../components/ProductCard';
import { Spinner } from '../../components/Spinner';

interface Props {
  search: string;
  platformFilter: string;
  onSelectProduct: (id: string) => void;
}

export function ProductsList({ search, platformFilter, onSelectProduct }: Props) {
  const [products, setProducts]   = useState<ApiProduct[]>([]);
  const [summaries, setSummaries] = useState<Record<string, ProductSummary>>({});
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    api.getProducts()
      .then((prods) => {
        setProducts(prods);
        setLoading(false);

        // Fetch all summaries in parallel (non-blocking — fills in prices as they arrive)
        Promise.all(
          prods.map(p =>
            api.getSummary(p._id)
              .then(s => ({ id: p._id, s }))
              .catch(() => null)
          )
        ).then(results => {
          const map: Record<string, ProductSummary> = {};
          for (const r of results) {
            if (r) map[r.id] = r.s;
          }
          setSummaries(map);
        });
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-stone-400">
        <Spinner size={8} />
        <p className="text-sm">Loading scraped products…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-stone-500">
        <p className="text-2xl">⚠</p>
        <p className="text-sm font-semibold">Could not load products</p>
        <p className="text-xs text-stone-400">{error}</p>
      </div>
    );
  }

  const filtered = products.filter(p => {
    const matchSearch   = !search || (p.name ?? '').toLowerCase().includes(search.toLowerCase());
    const matchPlatform = platformFilter === 'all' || (p.platform ?? '') === platformFilter;
    return matchSearch && matchPlatform;
  });

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-stone-400">
        <p className="text-3xl">◎</p>
        <p className="text-sm font-semibold">No products found</p>
        <p className="text-xs">{products.length === 0 ? 'Trigger a scrape to populate the database.' : 'Try adjusting your filters.'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-stone-400">
        Showing <strong className="text-stone-600">{filtered.length}</strong> of {products.length} scraped products
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(p => (
          <ProductCard
            key={p._id}
            product={p}
            summary={summaries[p._id] ?? null}
            onClick={() => onSelectProduct(p._id)}
          />
        ))}
      </div>
    </div>
  );
}
