import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  to?: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  onNavigate: (to: string) => void;
  children?: ReactNode;
}

export function PageHeader({ title, subtitle, breadcrumbs, onNavigate, children }: PageHeaderProps) {
  return (
    <div className="border-b border-neutral-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-7 pb-9">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="mb-5 flex items-center gap-1 text-xs text-neutral-400">
            {breadcrumbs.map((b, i) => (
              <span key={i} className="flex items-center gap-1">
                {b.to ? (
                  <button
                    onClick={() => onNavigate(b.to!)}
                    className="hover:text-neutral-900 transition-colors"
                  >
                    {b.label}
                  </button>
                ) : (
                  <span className="text-neutral-700">{b.label}</span>
                )}
                {i < breadcrumbs.length - 1 && <ChevronRight size={12} className="text-neutral-300" />}
              </span>
            ))}
          </nav>
        )}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-serif text-neutral-900 tracking-tight">{title}</h1>
            {subtitle && <p className="mt-2 text-sm text-neutral-500 max-w-2xl leading-relaxed">{subtitle}</p>}
          </div>
          {children && <div className="flex-shrink-0">{children}</div>}
        </div>
      </div>
    </div>
  );
}
