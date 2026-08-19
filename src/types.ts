export type SizeKey = 'XS' | 'S' | 'M' | 'L' | 'XL';

export const SIZE_KEYS: SizeKey[] = ['XS', 'S', 'M', 'L', 'XL'];

export type MeasurementKey = 'bust' | 'waist' | 'hips' | 'inseam';

export interface MeasurementInfo {
  key: MeasurementKey;
  label: string;
  unit: string;
  description: string;
  min: number;
  max: number;
  step: number;
}

// All body measurements and size charts are in centimeters.
export const MEASUREMENT_INFOS: MeasurementInfo[] = [
  { key: 'bust', label: 'Bust', unit: 'cm', description: 'Measure around the fullest part of your bust, keeping the tape level.', min: 70, max: 130, step: 0.5 },
  { key: 'waist', label: 'Waist', unit: 'cm', description: 'Measure around your natural waistline, the narrowest part of your torso.', min: 55, max: 115, step: 0.5 },
  { key: 'hips', label: 'Hips', unit: 'cm', description: 'Measure around the fullest part of your hips, about 20 cm below your waist.', min: 75, max: 140, step: 0.5 },
  { key: 'inseam', label: 'Inseam', unit: 'cm', description: 'Measure from the top of your inner thigh to your ankle bone.', min: 60, max: 95, step: 0.5 },
];

/** How the user likes their clothes to fit */
export type FitPreference = 'snug' | 'true-to-size' | 'relaxed';

export const FIT_PREFERENCE_INFOS: { value: FitPreference; label: string; description: string }[] = [
  { value: 'true-to-size', label: 'True to size', description: 'I want garments that match my measurements closely.' },
  { value: 'snug', label: 'Snug', description: 'I like a close, fitted look with minimal extra room.' },
  { value: 'relaxed', label: 'Relaxed', description: 'I prefer a looser fit with some breathing room.' },
];

export interface SizingProfile {
  name: string;
  measurements: Partial<Record<MeasurementKey, number>>;
  heightCm?: number;
  weightKg?: number;
  fitPreference?: FitPreference;
  notes?: string;
  updatedAt: string;
}

export interface SizeRow {
  size: SizeKey;
  // measurements in centimeters
  bust?: number;
  waist?: number;
  hips?: number;
  inseam?: number;
}

export interface ProductSizeChart {
  // Which measurements this product's fit depends on
  measurements: MeasurementKey[];
  rows: SizeRow[];
}

export type Category = 'dresses' | 'tops' | 'jeans' | 'skirts';

/** How much the fabric stretches — affects tolerance for snug fits */
export type FabricStretch = 'none' | 'low' | 'medium' | 'high';

/** How the garment is designed to fit — affects whether "loose" is good or bad */
export type FitStyle = 'fitted' | 'tailored' | 'relaxed' | 'oversized';

export interface Product {
  id: string;
  name: string;
  brand: string;
  category: Category;
  price: number;
  colors: string[];
  image: string;
  description: string;
  fit: string;
  material: string;
  /** Fabric stretch level — higher stretch means snug fits are more tolerable */
  fabricStretch: FabricStretch;
  /** How the garment is designed to sit on the body */
  fitStyle: FitStyle;
  sizeChart: ProductSizeChart;
}

export interface SizeMatchDetail {
  measurement: MeasurementKey;
  userValue: number;
  sizeValue: number;
  diff: number;
  fit: 'snug' | 'true' | 'loose';
  /** Individual 0–100 score for this measurement */
  score: number;
  /** Importance weight (0–1) for this measurement in this garment */
  weight: number;
  /** Whether the user has a value for this measurement */
  available: boolean;
  /** Ease in cm — positive = garment bigger than body, negative = garment smaller */
  ease: number;
  /** Plain-language explanation for this single measurement */
  reason: string;
}

export interface SizeMatchWarning {
  type: 'low-confidence' | 'missing-measurement' | 'no-match';
  message: string;
}

/** Overall verdict for a size */
export type FitVerdict = 'excellent' | 'great' | 'good' | 'fair' | 'relaxed' | 'snug' | 'poor';

export interface SizeMatchResult {
  size: SizeKey;
  /** Overall 0–100 fit score */
  confidence: number;
  /** Human-readable verdict label */
  verdict: FitVerdict;
  /** Ranking among all sizes (1 = best) */
  ranking: number;
  details: SizeMatchDetail[];
  explanation: string;
  isBest: boolean;
  /** Fraction (0–1) of required measurements the user has provided */
  coverage: number;
  warnings: SizeMatchWarning[];
}
