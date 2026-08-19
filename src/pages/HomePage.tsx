import { Sparkles, Ruler, Shirt, TrendingUp, ArrowRight } from 'lucide-react';
import type { Product, SizingProfile } from '@/types';
import { ProductCard } from '@/components/ProductCard';
import { Button } from '@/components/ui/Button';

interface HomePageProps {
  products: Product[];
  profile: SizingProfile | null;
  onNavigate: (to: string) => void;
}

export function HomePage({ products, profile, onNavigate }: HomePageProps) {
  const featured = products.slice(0, 4);
  const hasProfile = profile && Object.values(profile.measurements).some((v) => typeof v === 'number');

  return (
    <div>
      {/* Hero */}
      <section className="relative bg-neutral-900 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-25">
          <img
            src="https://images.pexels.com/photos/11911863/pexels-photo-11911863.jpeg?auto=compress&cs=tinysrgb&h=650&w=940"
            alt=""
            className="h-full w-full object-cover"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-neutral-950 via-neutral-950/85 to-neutral-900/40" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-20 sm:py-28 lg:py-32">
          <div className="max-w-xl animate-fade-in-up">
            <p className="text-xs uppercase tracking-[0.25em] text-neutral-300 mb-5 font-medium">
              Your perfect size, every time
            </p>
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl leading-[1.05] tracking-tight">
              Stop guessing.<br />Start with your measurements.
            </h1>
            <p className="mt-6 text-neutral-300 leading-relaxed text-base sm:text-lg max-w-md">
              FitMatch compares your body measurements to each brand's size chart and tells you
              exactly which size fits — with a confidence score and a plain-English explanation.
            </p>
            <div className="mt-9 flex flex-col sm:flex-row gap-3">
              <Button
                size="lg"
                variant="secondary"
                className="bg-white text-neutral-900 hover:bg-neutral-100"
                onClick={() => onNavigate(hasProfile ? '/find-my-size' : '/profile')}
                icon={<Sparkles size={16} />}
                iconRight={<ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />}
              >
                {hasProfile ? 'Find My FitMatch Size' : 'Create your sizing profile'}
              </Button>
              <Button
                size="lg"
                className="border border-white/25 bg-transparent text-white hover:bg-white/10"
                onClick={() => onNavigate('/catalog')}
              >
                Browse catalog
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <div className="text-center mb-12">
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-400 font-medium mb-3">How it works</p>
          <h2 className="font-serif text-3xl text-neutral-900 tracking-tight">Three steps to a perfect fit</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: Ruler, title: 'Save your measurements', body: 'Enter your bust, waist, hips, and inseam in centimeters once. They stay on this device.', step: '01' },
            { icon: Shirt, title: 'Browse the catalog', body: "See your best size and a confidence score right on each product.", step: '02' },
            { icon: TrendingUp, title: 'Get a confidence score', body: 'Every match comes with a percentage and a plain explanation of why it fits.', step: '03' },
          ].map((s, i) => (
            <div
              key={s.title}
              className="relative bg-white rounded-2xl border border-neutral-200 p-7 shadow-card hover:shadow-card-hover transition-all duration-300 animate-fade-in-up"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <span className="absolute top-7 right-7 font-serif text-3xl text-neutral-200" aria-hidden="true">{s.step}</span>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-100 text-neutral-800">
                <s.icon size={20} />
              </div>
              <h3 className="mt-5 font-serif text-xl text-neutral-900">{s.title}</h3>
              <p className="mt-2 text-sm text-neutral-500 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pb-24">
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-neutral-400 font-medium mb-2">Featured</p>
            <h2 className="font-serif text-3xl text-neutral-900 tracking-tight">Pieces worth measuring for</h2>
          </div>
          <button
            onClick={() => onNavigate('/catalog')}
            className="group inline-flex items-center gap-1 text-sm text-neutral-600 hover:text-neutral-900 font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 rounded-full"
          >
            View all
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {featured.map((p, i) => (
            <div key={p.id} className="animate-fade-in-up" style={{ animationDelay: `${i * 60}ms` }}>
              <ProductCard product={p} profile={profile} onNavigate={onNavigate} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
