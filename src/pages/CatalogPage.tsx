import { useState, useEffect, useMemo } from 'react';
import type { Product, SizingProfile } from '@/types';
import { CATEGORY_LABELS } from '@/lib/catalog';
import { ProductCard } from '@/components/ProductCard';
import { PageHeader } from '@/components/PageHeader';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Shirt, Search } from 'lucide-react';

interface CatalogPageProps {
  products: Product[];
  profile: SizingProfile | null;
  onNavigate: (to: string) => void;
  initialCategory?: string;
}

type Filter = 'all' | keyof typeof CATEGORY_LABELS;
type SortKey = 'featured' | 'price-asc' | 'price-desc';

export function CatalogPage({ products, profile, onNavigate, initialCategory }: CatalogPageProps) {
  const [filter, setFilter] = useState<Filter>(
    initialCategory && initialCategory in CATEGORY_LABELS ? (initialCategory as Filter) : 'all',
  );
  const [sort, setSort] = useState<SortKey>('featured');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (initialCategory && initialCategory in CATEGORY_LABELS) {
      setFilter(initialCategory as Filter);
    }
  }, [initialCategory]);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 200);
    return () => clearTimeout(t);
  }, [filter, sort, searchQuery]);

  const list = useMemo(() => {
    let l = products;
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      l = l.filter((p) => 
        p.name.toLowerCase().includes(q) || 
        p.brand.toLowerCase().includes(q)
      );
    }
    
    if (filter !== 'all') {
      l = l.filter((p) => p.category === filter);
    }

    if (sort === 'price-asc') l = [...l].sort((a, b) => a.price - b.price);
    if (sort === 'price-desc') l = [...l].sort((a, b) => b.price - a.price);
    return l;
  }, [products, filter, sort, searchQuery]);

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'dresses', label: CATEGORY_LABELS.dresses },
    { key: 'tops', label: CATEGORY_LABELS.tops },
    { key: 'jeans', label: CATEGORY_LABELS.jeans },
    { key: 'skirts', label: CATEGORY_LABELS.skirts },
  ];

  return (
    <div>
      <PageHeader
        title="Catalog"
        subtitle="A demo collection of women's clothing with real size charts. Your best size appears on each piece once your profile is set."
        breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'Catalog' }]}
        onNavigate={onNavigate}
      />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 space-y-4">
          <div className="relative max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-neutral-400" />
            </div>
            <input
              type="text"
              placeholder="Search products or brands..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-colors"
              aria-label="Search products"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filter by category">
            {filters.map((f) => (
              <button
                key={f.key}
                role="tab"
                aria-selected={filter === f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3.5 py-1.5 text-xs rounded-full border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 ${
                  filter === f.key
                    ? 'bg-neutral-900 text-white border-neutral-900'
                    : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <Select
            label="Sort products"
            value={sort}
            onChange={(v) => setSort(v as SortKey)}
            options={[
              { value: 'featured', label: 'Featured' },
              { value: 'price-asc', label: 'Price: Low to High' },
              { value: 'price-desc', label: 'Price: High to Low' },
            ]}
          />
        </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
                <Skeleton className="aspect-[3/4] rounded-none" />
                <div className="p-4 space-y-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : list.length === 0 ? (
          <EmptyState
            icon={<Shirt size={24} />}
            title={searchQuery.trim() ? "No search results" : "No products in this category"}
            description={searchQuery.trim() ? `We couldn't find anything matching "${searchQuery}". Try adjusting your search or filters.` : "Try selecting a different category to browse the full catalog."}
          />
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {list.map((p, i) => (
              <div key={p.id} className="animate-fade-in-up" style={{ animationDelay: `${i * 40}ms` }}>
                <ProductCard product={p} profile={profile} onNavigate={onNavigate} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
