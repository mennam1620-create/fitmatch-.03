import { useMemo, useState } from 'react';
import { Ruler, ChevronDown, ChevronUp, Sparkles, AlertCircle } from 'lucide-react';
import type { Product, SizingProfile } from '@/types';
import { matchProduct, VERDICT_LABELS } from '@/lib/matchEngine';
import { CATEGORY_LABELS } from '@/lib/catalog';
import { PageHeader } from '@/components/PageHeader';
import { ConfidenceMeter } from '@/components/ConfidenceMeter';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { EmptyState } from '@/components/ui/EmptyState';

interface FindMySizePageProps {
  products: Product[];
  profile: SizingProfile | null;
  onNavigate: (to: string) => void;
}

type SortKey = 'confidence' | 'price';

export function FindMySizePage({ products, profile, onNavigate }: FindMySizePageProps) {
  const [sort, setSort] = useState<SortKey>('confidence');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [category, setCategory] = useState<string>('all');

  const hasMeasurements = profile && Object.values(profile.measurements).some((v) => typeof v === 'number');

  const matches = useMemo(() => {
    if (!hasMeasurements || !profile) return [];
    let list = products.map((p) => ({ product: p, results: matchProduct(p, profile) }));
    if (category !== 'all') list = list.filter((x) => x.product.category === category);
    if (sort === 'confidence') {
      list.sort((a, b) => {
        const ab = a.results.find((r) => r.isBest)?.confidence ?? 0;
        const bb = b.results.find((r) => r.isBest)?.confidence ?? 0;
        return bb - ab;
      });
    } else {
      list.sort((a, b) => a.product.price - b.product.price);
    }
    return list;
  }, [products, profile, hasMeasurements, sort, category]);

  const profileSummary = Object.entries(profile?.measurements ?? {})
    .filter(([, v]) => typeof v === 'number')
    .map(([k, v]) => `${k} ${v} cm`)
    .join(' · ');

  return (
    <div>
      <PageHeader
        title="Find My FitMatch Size"
        subtitle="We compare your saved measurements against every product's size chart and rank the best matches across the catalog."
        breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'Find My Size' }]}
        onNavigate={onNavigate}
      />

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10">
        {!hasMeasurements ? (
          <EmptyState
            icon={<Sparkles size={24} />}
            title="Save your measurements first"
            description="Find My FitMatch Size compares your bust, waist, hips, and inseam to each product's size chart. Enter them once in your sizing profile and you'll get a confidence score for every piece."
            action={
              <Button onClick={() => onNavigate('/profile')} icon={<Ruler size={16} />}>
                Create your sizing profile
              </Button>
            }
          />
        ) : (
          <>
            {/* Profile summary */}
            <div className="bg-white rounded-2xl border border-neutral-200 p-5 mb-8 animate-fade-in">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 text-neutral-700">
                    <Ruler size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-900">
                      {profile?.name ? `${profile.name}'s measurements` : 'Your measurements'}
                    </p>
                    <p className="text-xs text-neutral-500 mt-0.5">{profileSummary}</p>
                  </div>
                </div>
                <button
                  onClick={() => onNavigate('/profile')}
                  className="text-sm text-neutral-600 hover:text-neutral-900 underline underline-offset-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 rounded"
                >
                  Edit profile
                </button>
              </div>
            </div>

            {/* Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
              <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filter by category">
                {['all', ...Object.keys(CATEGORY_LABELS)].map((c) => (
                  <button
                    key={c}
                    role="tab"
                    aria-selected={category === c}
                    onClick={() => setCategory(c)}
                    className={`px-3 py-1.5 text-xs rounded-full border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 ${
                      category === c ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400'
                    }`}
                  >
                    {c === 'all' ? 'All categories' : CATEGORY_LABELS[c]}
                  </button>
                ))}
              </div>
              <Select
                label="Sort by"
                value={sort}
                onChange={(v) => setSort(v as SortKey)}
                options={[
                  { value: 'confidence', label: 'Best confidence' },
                  { value: 'price', label: 'Price' },
                ]}
              />
            </div>

            {/* Results */}
            <div className="space-y-4">
              {matches.length === 0 ? (
                <EmptyState
                  icon={<Sparkles size={24} />}
                  title="No products in this category"
                  description="Try a different category filter to see your matches."
                />
              ) : (
                matches.map(({ product, results }) => {
                  const best = results.find((r) => r.isBest);
                  const confidence = best?.confidence ?? 0;
                  const isOpen = expanded === product.id;
                  const hasMatch = confidence > 0;
                  return (
                    <div key={product.id} className="bg-white rounded-2xl border border-neutral-200 overflow-hidden animate-fade-in-up">
                      <div className="flex flex-col sm:flex-row">
                        <button
                          onClick={() => onNavigate(`/product?id=${product.id}`)}
                          className="sm:w-32 flex-shrink-0 aspect-[4/5] sm:aspect-square overflow-hidden bg-neutral-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-inset"
                          aria-label={`View ${product.name}`}
                        >
                          <img src={product.image} alt={product.name} className="h-full w-full object-cover hover:scale-105 transition-transform duration-500" />
                        </button>
                        <div className="flex-1 p-5">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-[11px] uppercase tracking-wider text-neutral-400">{product.brand} · {CATEGORY_LABELS[product.category]}</p>
                              <button
                                onClick={() => onNavigate(`/product?id=${product.id}`)}
                                className="mt-0.5 font-serif text-lg text-neutral-900 hover:text-neutral-600 transition-colors text-left focus:outline-none focus-visible:underline"
                              >
                                {product.name}
                              </button>
                              <p className="text-sm text-neutral-500 mt-0.5">${product.price}</p>
                            </div>
                            {hasMatch ? (
                              <div className="text-right flex-shrink-0">
                                <p className="text-xs text-neutral-400">Your size</p>
                                <p className="font-serif text-2xl text-neutral-900">{best!.size}</p>
                                <p className="text-[11px] text-neutral-400 mt-0.5">{VERDICT_LABELS[best!.verdict]}</p>
                              </div>
                            ) : (
                              <div className="text-right flex-shrink-0">
                                <p className="text-xs text-neutral-400">No match</p>
                              </div>
                            )}
                          </div>

                          {hasMatch ? (
                            <>
                              <div className="mt-4 max-w-md">
                                <ConfidenceMeter confidence={confidence} best showWarning />
                                {best!.coverage < 1 && best!.coverage > 0 && (
                                  <p className="mt-1.5 text-[11px] text-sky-700">
                                    Based on {Math.round(best!.coverage * 100)}% of this garment's key measurements.
                                  </p>
                                )}
                              </div>
                              <button
                                onClick={() => setExpanded(isOpen ? null : product.id)}
                                className="mt-3 inline-flex items-center gap-1 text-xs text-neutral-600 hover:text-neutral-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 rounded"
                                aria-expanded={isOpen}
                              >
                                {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                {isOpen ? 'Hide details' : 'Why this size?'}
                              </button>
                            </>
                          ) : (
                            <p className="mt-4 text-xs text-amber-700">
                              This product's fit depends on {product.sizeChart.measurements.join(', ')} — add {missingMeasurements(product, profile)} to your profile for a match.
                            </p>
                          )}

                          {isOpen && hasMatch && (
                            <div className="mt-4 border-t border-neutral-100 pt-4 animate-fade-in">
                              <p className="text-sm text-neutral-700 leading-relaxed">{best!.explanation}</p>

                              {/* Warnings */}
                              {best!.warnings.length > 0 && (
                                <div className="mt-3 space-y-1.5">
                                  {best!.warnings.map((w, i) => (
                                    <div
                                      key={i}
                                      className={`flex items-start gap-1.5 rounded-lg p-2.5 text-[11px] ${
                                        w.type === 'low-confidence'
                                          ? 'bg-amber-50 text-amber-800'
                                          : w.type === 'missing-measurement'
                                          ? 'bg-sky-50 text-sky-800'
                                          : 'bg-neutral-100 text-neutral-600'
                                      }`}
                                      role="alert"
                                    >
                                      <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />
                                      <span className="leading-relaxed">{w.message}</span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              <div className="mt-4 overflow-x-auto">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="text-neutral-400">
                                      <th scope="col" className="text-left py-1.5 font-medium">Size</th>
                                      {product.sizeChart.measurements.map((m) => (
                                        <th key={m} scope="col" className="text-left py-1.5 font-medium capitalize">{m}</th>
                                      ))}
                                      <th scope="col" className="text-left py-1.5 font-medium">Score</th>
                                      <th scope="col" className="text-left py-1.5 font-medium">Verdict</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {results.map((r) => (
                                      <tr key={r.size} className={`border-t border-neutral-100 ${r.isBest ? 'bg-emerald-50/60' : ''}`}>
                                        <td className="py-2 font-medium text-neutral-900">
                                          {r.size}{r.isBest ? ' ★' : ''}
                                        </td>
                                        {product.sizeChart.measurements.map((m) => {
                                          const d = r.details.find((x) => x.measurement === m);
                                          return <td key={m} className="py-2 text-neutral-600">{d?.sizeValue ?? '—'}</td>;
                                        })}
                                        <td className="py-2"><ConfidenceMeter confidence={r.confidence} size="sm" /></td>
                                        <td className="py-2 text-[11px] text-neutral-600">{VERDICT_LABELS[r.verdict]}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function missingMeasurements(product: Product, profile: SizingProfile | null): string {
  const missing = product.sizeChart.measurements.filter((m) => !profile?.measurements[m]);
  return missing.join(', ');
}
