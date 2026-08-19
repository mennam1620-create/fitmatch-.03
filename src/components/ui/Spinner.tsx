import { Loader as Loader2 } from 'lucide-react';

interface SpinnerProps {
  size?: number | 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_MAP: Record<string, number> = { sm: 14, md: 20, lg: 28 };

export function Spinner({ size = 20, className = '' }: SpinnerProps) {
  const px = typeof size === 'number' ? size : SIZE_MAP[size] ?? 20;
  return <Loader2 size={px} className={`animate-spin text-neutral-400 ${className}`} />;
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-neutral-200 rounded-lg ${className}`} />;
}
