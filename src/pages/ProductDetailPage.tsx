import { useState } from 'react';
import { Check, TriangleAlert as AlertTriangle, X, ArrowLeft, CircleAlert as AlertCircle, Info, Shirt, Waves } from 'lucide-react';
import type { Product, SizeMatchResult, SizingProfile } from '@/types';
import { SIZE_KEYS, MEASUREMENT_INFOS } from '@/types';
import { matchProduct } from '@/lib/matchEngine';
import { VERDICT_LABELS } from '@/lib/matchEngine';
import { CATEGORY_LABELS, FABRIC_STRETCH_LABELS, FIT_STYLE_LABELS } from '@/lib/catalog';
import { colorHex } from '@/lib/colors';
import { PageHeader } from '@/components/PageHeader';
import { ConfidenceMeter } from '@/components/ConfidenceMeter';
import { Button } from '@/components/ui/Button';

interface ProductDetailPageProps {
  product: Product;
  profile: SizingProfile | null;
  onNavigate: (to: string) => void;
}

const VERDICT_COLORS: Record<string, string> = {
  excellent: 'text-emerald-700',
  great: 'text-emerald-600',
  good: 'text-lime-600',
  fair: 'text-amber-600',
  relaxed: 'text-sky-600',
  snug: 'text-orange-600',
  poor: 'text-rose-600',
};

export function ProductDetailPage({ product, profile, onNavigate }: ProductDetailPageProps) {
  const [selectedColor, setSelectedColor] = useState(product.colors[0]);

  const hasMeasurements = profile && Object.values(profile.measurements).some((v) => typeof v === 'number');
  const results: SizeMatchResult[] = hasMeasurements && profile ? matchProduct(product, profile) : [];
  const best = results.find((r) => r.isBest);
  const bestSize = best?.confidence && best.confidence > 0 ? best.size : null;

  return (
    <div>
      <PageHeader
        title={product.name}
        breadcrumbs={[
          { label: 'Home', to: '/' },
          { label: 'Catalog', to: '/catalog' },
          { label: CATEGORY_LABELS[product.category], to: `/catalog?cat=${product.category}` },
          { label: product.name },
        ]}
        onNavigate={onNavigate}
      />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => onNavigate('/catalog')}
          className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900 mb-6 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 rounded"
        >
          <ArrowLeft size={14} /> Back to catalog
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Image */}
          <div className="bg-neutral-100 rounded-2xl overflow-hidden aspect-[3/4]">
            <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
          </div>

          {/* Info */}
          <div>
            <p className="text-xs uppercase tracking-wider text-neutral-400">{product.brand}</p>
            <h1 className="mt-1 font-serif text-2xl sm:text-3xl text-neutral-900">{product.name}</h1>
            <p className="mt-3 text-xl text-neutral-900 font-medium">${product.price}</p>
            <p className="mt-4 text-sm text-neutral-600 leading-relaxed">{product.description}</p>

            <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <dt className="text-xs text-neutral-400 uppercase tracking-wide">Fit</dt>
                <dd className="text-neutral-700 mt-0.5">{product.fit}</dd>
              </div>
              <div>
                <dt className="text-xs text-neutral-400 uppercase tracking-wide">Material</dt>
                <dd className="text-neutral-700 mt-0.5">{product.material}</dd>
              </div>
            </dl>

            {/* Fabric & fit attributes */}
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-600">
                <Shirt size={12} />
                {FIT_STYLE_LABELS[product.fitStyle]}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-600">
                <Waves size={12} />
                {FABRIC_STRETCH_LABELS[product.fabricStretch]}
              </span>
            </div>

            {/* Colors */}
            <div className="mt-6">
              <p className="text-xs font-medium text-neutral-600 mb-2">
                Color: <span className="text-neutral-900">{selectedColor}</span>
              </p>
              <div className="flex gap-2" role="radiogroup" aria-label="Color">
                {product.colors.map((c) => (
                  <button
                    key={c}
                    role="radio"
                    aria-checked={selectedColor === c}
                    aria-label={c}
                    onClick={() => setSelectedColor(c)}
                    title={c}
                    className={`h-8 w-8 rounded-full border-2 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 ${
                      selectedColor === c ? 'border-neutral-900 ring-2 ring-neutral-900 ring-offset-2' : 'border-neutral-200'
                    }`}
                    style={{ backgroundColor: colorHex(c) }}
                  />
                ))}
              </div>
            </div>

            {/* Best match banner */}
            {bestSize ? (
              <div className="mt-6 bg-emerald-50 border border-emerald-200 rounded-xl p-4 animate-fade-in" role="status">
                <p className="text-sm text-emerald-900">
                  <span className="font-medium">Your best size: {bestSize}</span> — {best!.confidence}% confidence · {VERDICT_LABELS[best!.verdict]}.
                </p>
                <p className="mt-1 text-xs text-emerald-700 leading-relaxed">{best!.explanation}</p>
                {!hasMeasurementsFor(product, profile) && (
                  <p className="mt-1 text-xs text-emerald-700">Based on the measurements you've entered so far.</p>
                )}
              </div>
            ) : hasMeasurements ? (
              <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4" role="status">
                <p className="text-sm text-amber-900">We couldn't compute a match for this product.</p>
                <button
                  onClick={() => onNavigate('/profile')}
                  className="mt-1 text-xs text-amber-800 underline underline-offset-2 hover:text-amber-900"
                >
                  Update your profile with {product.sizeChart.measurements.join(', ')} measurements
                </button>
              </div>
            ) : (
              <div className="mt-6 bg-neutral-50 border border-neutral-200 rounded-xl p-4" role="status">
                <p className="text-sm text-neutral-700">Save your measurements to see your best size here.</p>
                <div className="mt-2">
                  <Button size="sm" onClick={() => onNavigate('/profile')}>Create your sizing profile →</Button>
                </div>
              </div>
            )}

            {/* Add to Bag action */}
            <div className="mt-6">
              <Button 
                onClick={() => {
                  const btn = document.getElementById('add-to-bag-btn');
                  if (btn) {
                    btn.innerHTML = `<span class="flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Added to Bag</span>`;
                    btn.classList.add('bg-emerald-600', 'hover:bg-emerald-700', 'text-white', 'border-transparent');
                    setTimeout(() => {
                      btn.innerHTML = 'Add to Bag';
                      btn.classList.remove('bg-emerald-600', 'hover:bg-emerald-700', 'text-white', 'border-transparent');
                    }, 2000);
                  }
                }}
                id="add-to-bag-btn"
                className="w-full sm:w-auto transition-colors duration-300"
              >
                Add to Bag
              </Button>
            </div>

            {/* Warnings for best match */}
            {best && best.warnings.length > 0 && (
              <div className="mt-3 space-y-2">
                {best.warnings.map((w, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-2 rounded-lg p-3 text-xs ${
                      w.type === 'low-confidence'
                        ? 'bg-amber-50 text-amber-800 border border-amber-200'
                        : w.type === 'missing-measurement'
                        ? 'bg-sky-50 text-sky-800 border border-sky-200'
                        : 'bg-neutral-100 text-neutral-600 border border-neutral-200'
                    }`}
                    role="alert"
                  >
                    <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                    <span className="leading-relaxed">{w.message}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Detailed Size Analysis */}
            {hasMeasurements && results.length > 0 && (
              <div className="mt-8 space-y-4">
                <p className="text-xs font-medium text-neutral-600 mb-2">Size Analysis</p>
                {results.map((r) => (
                  <div key={r.size} className={`bg-neutral-50 rounded-xl border p-4 ${r.isBest && r.confidence > 0 ? 'border-emerald-300 ring-1 ring-emerald-300' : 'border-neutral-200'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-neutral-900">
                        Size {r.size} 
                        {r.isBest && r.confidence > 0 && <span className="ml-2 text-[10px] uppercase tracking-wider text-emerald-700 font-bold">Best Match</span>}
                        <span className={`ml-2 text-xs ${VERDICT_COLORS[r.verdict] ?? 'text-neutral-500'}`}>· {VERDICT_LABELS[r.verdict]}</span>
                      </span>
                      <span className="text-xs text-neutral-500">{r.confidence}% fit score</span>
                    </div>
                    <ConfidenceMeter confidence={r.confidence} showWarning />

                    <p className="mt-3 text-xs text-neutral-600 leading-relaxed">{r.explanation}</p>

                    {/* Per-measurement weighted breakdown */}
                    <div className="mt-4 border-t border-neutral-200 pt-3">
                      <p className="text-xs font-medium text-neutral-700 mb-2 flex items-center gap-1.5">
                        <Info size={12} className="text-neutral-400" />
                        Measurement breakdown
                      </p>
                      <div className="space-y-2.5">
                        {r.details.map((d) => (
                          <div key={d.measurement}>
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-neutral-600 capitalize flex items-center gap-1.5">
                                {d.fit === 'true' ? <Check size={11} className="text-emerald-600" /> : d.fit === 'snug' ? <AlertTriangle size={11} className="text-amber-600" /> : <X size={11} className="text-rose-600" />}
                                {d.measurement}
                                <span className="text-neutral-400">
                                  {d.available
                                    ? `${d.userValue} vs ${d.sizeValue} cm`
                                    : 'not provided'}
                                </span>
                              </span>
                              <span className="text-neutral-500 font-medium">
                                {d.available ? `${d.score}/100` : '—'}
                                <span className="text-neutral-300 ml-1">({Math.round(d.weight * 100)}% weight)</span>
                              </span>
                            </div>
                            {d.available && (
                              <div className="h-1 rounded-full bg-neutral-200 overflow-hidden">
                                <div
                                  className={`h-1 rounded-full transition-all duration-500 ${
                                    d.score >= 85 ? 'bg-emerald-500' : d.score >= 70 ? 'bg-lime-500' : d.score >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                                  }`}
                                  style={{ width: `${d.score}%` }}
                                />
                              </div>
                            )}
                            {d.available && (
                              <p className="mt-0.5 text-[11px] text-neutral-400 leading-relaxed">{d.reason}</p>
                            )}
                          </div>
                        ))}
                      </div>
                      <p className="mt-3 text-[11px] text-neutral-400 leading-relaxed">
                        Weights reflect how much each measurement matters for {CATEGORY_LABELS[product.category].toLowerCase()}.
                        Fabric stretch ({FABRIC_STRETCH_LABELS[product.fabricStretch].toLowerCase()}) and fit style ({FIT_STYLE_LABELS[product.fitStyle].toLowerCase()}) adjust the tolerance for each measurement.
                      </p>
                    </div>

                    {/* Warnings for this size */}
                    {r.warnings.length > 0 && (
                      <div className="mt-3 space-y-1.5">
                        {r.warnings.map((w, i) => (
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
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* All-sizes comparison table */}
        {hasMeasurements && results.length > 0 && (
          <div className="mt-12">
            <h2 className="font-serif text-xl text-neutral-900 mb-1">All sizes compared</h2>
            <p className="text-xs text-neutral-500 mb-4">Every size scored and explained, so you can compare side by side.</p>
            <div className="overflow-x-auto bg-white rounded-xl border border-neutral-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50">
                    <th scope="col" className="px-4 py-3 text-left font-medium text-neutral-600">Size</th>
                    <th scope="col" className="px-4 py-3 text-left font-medium text-neutral-600">Fit score</th>
                    <th scope="col" className="px-4 py-3 text-left font-medium text-neutral-600">Verdict</th>
                    <th scope="col" className="px-4 py-3 text-left font-medium text-neutral-600">Why</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r) => (
                    <tr key={r.size} className={`border-b border-neutral-100 last:border-0 ${r.isBest ? 'bg-emerald-50/50' : ''}`}>
                      <td className="px-4 py-3 font-medium text-neutral-900 whitespace-nowrap">
                        {r.size}
                        {r.isBest && <span className="ml-2 text-xs text-emerald-700">★ best</span>}
                      </td>
                      <td className="px-4 py-3 min-w-[140px]">
                        <ConfidenceMeter confidence={r.confidence} size="sm" />
                      </td>
                      <td className={`px-4 py-3 text-xs font-medium ${VERDICT_COLORS[r.verdict] ?? 'text-neutral-600'}`}>
                        {VERDICT_LABELS[r.verdict]}
                      </td>
                      <td className="px-4 py-3 text-xs text-neutral-600 leading-relaxed max-w-md">
                        {r.explanation}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Size chart table */}
        <div className="mt-12">
          <h2 className="font-serif text-xl text-neutral-900 mb-4">Size chart (cm)</h2>
          <div className="overflow-x-auto bg-white rounded-xl border border-neutral-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50">
                  <th scope="col" className="px-4 py-3 text-left font-medium text-neutral-600">Size</th>
                  {product.sizeChart.measurements.map((m) => (
                    <th key={m} scope="col" className="px-4 py-3 text-left font-medium text-neutral-600 capitalize">{m}</th>
                  ))}
                  {hasMeasurements && <th scope="col" className="px-4 py-3 text-left font-medium text-neutral-600">Match</th>}
                </tr>
              </thead>
              <tbody>
                {product.sizeChart.rows.map((row) => {
                  const r = results.find((x) => x.size === row.size);
                  const isBest = r?.isBest && r.confidence > 0;
                  return (
                    <tr key={row.size} className={`border-b border-neutral-100 last:border-0 ${isBest ? 'bg-emerald-50/50' : ''}`}>
                      <td className="px-4 py-3 font-medium text-neutral-900">
                        {row.size}
                        {isBest && <span className="ml-2 text-xs text-emerald-700">★ best</span>}
                      </td>
                      {product.sizeChart.measurements.map((m) => (
                        <td key={m} className="px-4 py-3 text-neutral-700">{row[m] ?? '—'}</td>
                      ))}
                      {hasMeasurements && (
                        <td className="px-4 py-3">
                          {r ? <ConfidenceMeter confidence={r.confidence} size="sm" /> : null}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
              {hasMeasurements && (
                <tfoot>
                  <tr className="bg-neutral-50 border-t-2 border-neutral-200">
                    <td className="px-4 py-3 text-xs font-medium text-neutral-500">You</td>
                    {product.sizeChart.measurements.map((m) => (
                      <td key={m} className="px-4 py-3 text-xs text-neutral-700">
                        {profile?.measurements[m] ?? '—'}
                      </td>
                    ))}
                    <td className="px-4 py-3" />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          <p className="mt-3 text-xs text-neutral-400">
            Body measurements in centimeters. {MEASUREMENT_INFOS.find((i) => i.key === product.sizeChart.measurements[0])?.description}
          </p>
        </div>
      </div>
    </div>
  );
}

function hasMeasurementsFor(product: Product, profile: SizingProfile | null): boolean {
  if (!profile) return false;
  return product.sizeChart.measurements.every((m) => typeof profile.measurements[m] === 'number');
}
