import { TriangleAlert as AlertTriangle } from 'lucide-react';

interface ConfidenceMeterProps {
  confidence: number;
  best?: boolean;
  size?: 'sm' | 'md';
  showWarning?: boolean;
}

export function ConfidenceMeter({ confidence, best, size = 'md', showWarning = false }: ConfidenceMeterProps) {
  const color = confidence >= 85 ? 'bg-emerald-500' : confidence >= 70 ? 'bg-lime-500' : confidence >= 50 ? 'bg-amber-500' : 'bg-rose-500';
  const textColor = confidence >= 85 ? 'text-emerald-700' : confidence >= 70 ? 'text-lime-700' : confidence >= 50 ? 'text-amber-700' : 'text-rose-700';
  const label = confidence >= 90 ? 'Excellent' : confidence >= 75 ? 'Great' : confidence >= 55 ? 'Fair' : 'Poor';
  const h = size === 'sm' ? 'h-1.5' : 'h-2';
  const isLow = confidence > 0 && confidence < 55;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2.5">
        <div className={`flex-1 ${h} rounded-full bg-neutral-100 overflow-hidden`} role="progressbar" aria-valuenow={confidence} aria-valuemin={0} aria-valuemax={100}>
          <div
            className={`${h} ${color} rounded-full transition-all duration-700 ease-out`}
            style={{ width: `${confidence}%` }}
          />
        </div>
        <span className={`text-xs font-medium ${textColor} whitespace-nowrap ${best ? 'min-w-[80px]' : 'min-w-[70px] text-right'}`}>
          {confidence}% · {label}
        </span>
      </div>
      {showWarning && isLow && (
        <p className="flex items-center gap-1 text-[11px] text-amber-700 leading-tight">
          <AlertTriangle size={11} className="flex-shrink-0" />
          Low confidence — consider trying another size
        </p>
      )}
    </div>
  );
}
