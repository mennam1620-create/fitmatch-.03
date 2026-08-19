import type { Product } from '@/types';
import { matchProduct } from '@/lib/matchEngine';
import type { SizingProfile } from '@/types';
import { ConfidenceMeter } from './ConfidenceMeter';
import { Badge } from './ui/Badge';
import { colorHex } from '@/lib/colors';

interface ProductCardProps {
  product: Product;
  profile: SizingProfile | null;
  onNavigate: (to: string) => void;
}

export function ProductCard({ product, profile, onNavigate }: ProductCardProps) {
  const hasMeasurements = profile && Object.values(profile.measurements).some((v) => typeof v === 'number');
  let bestSize: string | null = null;
  let bestConfidence = 0;

  if (hasMeasurements && profile) {
    const results = matchProduct(product, profile);
    const best = results.find((r) => r.isBest);
    if (best && best.confidence > 0) {
      bestSize = best.size;
      bestConfidence = best.confidence;
    }
  }

  return (
    <button
      onClick={() => onNavigate(`/product?id=${product.id}`)}
      className="group text-left bg-white rounded-2xl border border-neutral-200 overflow-hidden hover:shadow-card-hover hover:border-neutral-300 transition-all duration-300 w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
      aria-label={`View ${product.name}`}
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-neutral-100">
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        {bestSize && (
          <div className="absolute top-3 left-3 animate-scale-in">
            <Badge variant="neutral">Your size: {bestSize}</Badge>
          </div>
        )}
      </div>
      <div className="p-4">
        <p className="text-[10px] uppercase tracking-[0.15em] text-neutral-400 font-medium">{product.brand}</p>
        <h3 className="mt-1.5 font-serif text-base text-neutral-900 leading-snug">{product.name}</h3>
        <p className="mt-1 text-xs text-neutral-500">{product.fit}</p>
        <div className="mt-3.5 flex items-center justify-between">
          <span className="text-sm font-medium text-neutral-900">${product.price}</span>
          <div className="flex gap-1" role="img" aria-label={`Available colors: ${product.colors.join(', ')}`}>
            {product.colors.slice(0, 3).map((c) => (
              <span
                key={c}
                className="h-3.5 w-3.5 rounded-full border border-neutral-200 shadow-sm"
                style={{ backgroundColor: colorHex(c) }}
                title={c}
              />
            ))}
          </div>
        </div>
        {bestSize && (
          <div className="mt-3 pt-3 border-t border-neutral-100">
            <ConfidenceMeter confidence={bestConfidence} best size="sm" />
          </div>
        )}
      </div>
    </button>
  );
}
