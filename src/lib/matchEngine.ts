import type {
  Category,
  FabricStretch,
  FitPreference,
  FitStyle,
  FitVerdict,
  MeasurementKey,
  Product,
  ProductSizeChart,
  SizeKey,
  SizeMatchDetail,
  SizeMatchResult,
  SizeMatchWarning,
  SizingProfile,
} from '@/types';

// ──────────────────────────────────────────────────────────────
// Engine interface — designed so this can be swapped for an
// AI/ML model later without touching the UI.  Any replacement
// just needs to implement `SizeMatchEngine`.
// ──────────────────────────────────────────────────────────────

export interface SizeMatchEngine {
  match(product: Product, profile: SizingProfile): SizeMatchResult[];
}

// ──────────────────────────────────────────────────────────────
// Configuration tables
// ──────────────────────────────────────────────────────────────

/** Base tolerance in cm — how much ease/lack-of-ease is "true to size" */
const BASE_TOLERANCE: Record<MeasurementKey, number> = {
  bust: 3.8,
  waist: 3.8,
  hips: 3.8,
  inseam: 2.0,
};

/**
 * Per-measurement importance weights by garment category.
 * Values are relative — normalised to sum to 1 at runtime.
 */
const WEIGHTS: Record<Category, Partial<Record<MeasurementKey, number>>> = {
  dresses: { bust: 1.0, waist: 1.2, hips: 1.0, inseam: 0 },
  tops:    { bust: 1.5, waist: 0.8, hips: 0,   inseam: 0 },
  jeans:   { bust: 0,   waist: 1.0, hips: 1.2, inseam: 0.7 },
  skirts:  { bust: 0,   waist: 1.3, hips: 0.9, inseam: 0 },
};

/**
 * Fabric stretch multipliers — higher stretch widens the tolerance
 * for negative ease (snug fits), because the fabric can give.
 */
const STRETCH_MULTIPLIER: Record<FabricStretch, number> = {
  none: 1.0,
  low: 1.15,
  medium: 1.35,
  high: 1.6,
};

/**
 * Fit style adjustments — shifts how much ease is ideal.
 * For relaxed/oversized garments, more positive ease is desirable.
 * For fitted garments, less ease is ideal.
 *
 * These shift the *ideal ease* and the *score curve*.
 */
const STYLE_IDEAL_EASE: Record<FitStyle, number> = {
  fitted: 0,      // fitted garments want zero ease
  tailored: 1.0,  // tailored wants a touch of ease
  relaxed: 3.0,   // relaxed wants noticeable ease
  oversized: 6.0, // oversized wants lots of ease
};

/**
 * User fit preference — shifts the ideal ease.
 */
const PREFERENCE_IDEAL_EASE: Record<FitPreference, number> = {
  snug: -1.0,        // snug users want negative ease
  'true-to-size': 0,
  relaxed: 2.0,      // relaxed users want positive ease
};

/** Confidence below which we show a "low confidence" warning */
const LOW_CONFIDENCE_THRESHOLD = 45;

// ──────────────────────────────────────────────────────────────
// Scoring primitives
// ──────────────────────────────────────────────────────────────

/**
 * Effective tolerance for a measurement, factoring in fabric stretch.
 * Stretchy fabrics get more leeway for negative ease (snug fits).
 */
function effectiveTolerance(
  measurement: MeasurementKey,
  fabricStretch: FabricStretch,
): number {
  return BASE_TOLERANCE[measurement] * STRETCH_MULTIPLIER[fabricStretch];
}

/**
 * Classify fit for a single measurement based on ease.
 *
 * ease = sizeValue - userValue
 *   ease > tolerance  → garment is bigger than body → 'loose'
 *   ease < -tolerance → garment is smaller than body → 'snug'
 *   otherwise → 'true'
 */
function classifyFit(ease: number, tolerance: number): 'snug' | 'true' | 'loose' {
  if (ease < -tolerance) return 'snug';
  if (ease > tolerance) return 'loose';
  return 'true';
}

/**
 * Score a single measurement comparison on a 0–100 scale.
 *
 * Uses a bell-curve centred at the *ideal ease* (which shifts based
 * on garment style and user preference). The score decays as the
 * actual ease moves away from the ideal.
 *
 * Positive ease beyond the ideal is penalised less for relaxed styles;
 * negative ease (garment smaller than body) is penalised more for
 * non-stretch fabrics.
 */
function scoreOne(
  ease: number,
  tolerance: number,
  idealEase: number,
): number {
  // Distance from the ideal ease
  const deviation = ease - idealEase;
  const absDeviation = Math.abs(deviation);
  // Score decays based on how far the ease is from ideal, relative to tolerance
  const ratio = absDeviation / tolerance;
  const score = 100 * Math.exp(-ratio * 0.8);
  return Math.max(0, Math.round(score));
}

/**
 * Compute the ideal ease for a measurement, combining style + preference.
 */
function computeIdealEase(
  fitStyle: FitStyle,
  fitPreference: FitPreference,
): number {
  return STYLE_IDEAL_EASE[fitStyle] + PREFERENCE_IDEAL_EASE[fitPreference];
}

/**
 * Resolve the weight for a (category, measurement) pair.
 * Weights are normalised so only the measurements the garment
 * actually uses participate.
 */
function normalisedWeights(
  category: Category,
  usedMeasurements: MeasurementKey[],
): Record<MeasurementKey, number> {
  const raw: Record<MeasurementKey, number> = { bust: 0, waist: 0, hips: 0, inseam: 0 };
  let total = 0;
  for (const m of usedMeasurements) {
    const w = WEIGHTS[category]?.[m] ?? 0;
    raw[m] = w;
    total += w;
  }
  if (total === 0) {
    const each = 1 / usedMeasurements.length;
    usedMeasurements.forEach((m) => { raw[m] = each; });
    return raw;
  }
  for (const m of usedMeasurements) {
    raw[m] = raw[m] / total;
  }
  return raw;
}

// ──────────────────────────────────────────────────────────────
// Verdict computation
// ──────────────────────────────────────────────────────────────

/**
 * Determine the verdict for a size based on:
 * - overall score
 * - whether ANY measurement has negative ease (garment smaller than body)
 * - whether ALL measurements have positive ease (garment bigger than body)
 *
 * Key rules:
 *   - "relaxed" verdict: ONLY when ALL measurements have positive ease
 *     (garment bigger than body everywhere). If ANY measurement has
 *     negative ease, it can never be "relaxed".
 *   - "snug" verdict: when any measurement has negative ease but the
 *     overall score is still high enough to be wearable.
 *   - "poor": only when the garment truly won't fit — negative ease
 *     beyond what fabric stretch can compensate, or very low score.
 */
function verdictFor(
  score: number,
  hasNegativeEase: boolean,
  allPositiveEase: boolean,
): FitVerdict {
  // Poor: truly won't fit — very low score
  if (score < 20) return 'poor';

  // If ANY measurement has negative ease (garment smaller than body),
  // the size can NEVER be "relaxed" — it's either snug or worse.
  if (hasNegativeEase) {
    if (score >= 75) return 'snug';
    if (score >= 45) return 'snug';
    // Below 45 with negative ease — could be poor or snug depending on severity
    if (score >= 25) return 'snug';
    return 'poor';
  }

  // All measurements have positive ease (or zero) — garment is bigger
  // than or equal to body everywhere. This is where "relaxed" applies.
  if (allPositiveEase) {
    if (score >= 90) return 'excellent';
    if (score >= 75) return 'great';
    if (score >= 60) return 'good';
    if (score >= 45) return 'fair';
    // Score 20–45 with all positive ease → relaxed (loose but wearable)
    return 'relaxed';
  }

  // Mixed: some measurements at zero, none negative
  // This means the garment matches exactly on some, has ease on others
  if (score >= 90) return 'excellent';
  if (score >= 75) return 'great';
  if (score >= 60) return 'good';
  if (score >= 45) return 'fair';
  return 'relaxed';
}

export const VERDICT_LABELS: Record<FitVerdict, string> = {
  excellent: 'Excellent match',
  great: 'Great match',
  good: 'Good match',
  fair: 'Fair match',
  relaxed: 'Relaxed fit',
  snug: 'Snug fit',
  poor: 'Poor match',
};

// ──────────────────────────────────────────────────────────────
// Per-measurement reason generator
// ──────────────────────────────────────────────────────────────

function measurementReason(
  measurement: MeasurementKey,
  ease: number,
  fit: 'snug' | 'true' | 'loose',
  fitStyle: FitStyle,
): string {
  const label = measurement;
  const absEase = Math.round(Math.abs(ease) * 10) / 10;

  if (fit === 'true') {
    return `Your ${label} matches this size closely.`;
  }

  if (fit === 'snug') {
    // Negative ease — garment is smaller than body
    if (fitStyle === 'fitted' || fitStyle === 'tailored') {
      return `This size provides ${absEase} cm of negative ease at the ${label} — the garment is ${absEase} cm smaller than your body. The ${fitStyle} cut means it'll sit close, but it will feel tight.`;
    }
    return `This size provides ${absEase} cm of negative ease at the ${label} — the garment is ${absEase} cm smaller than your body, which may feel restrictive.`;
  }

  // loose — positive ease
  if (fitStyle === 'relaxed' || fitStyle === 'oversized') {
    return `This size provides ${absEase} cm of ease at the ${label}, creating a ${fitStyle} silhouette.`;
  }
  return `This size provides ${absEase} cm of ease at the ${label}, giving you some extra room.`;
}

// ──────────────────────────────────────────────────────────────
// Explanation generator
// ──────────────────────────────────────────────────────────────

function labelOf(m: MeasurementKey): string {
  return m;
}

function generateExplanation(
  size: SizeKey,
  verdict: FitVerdict,
  confidence: number,
  availableDetails: SizeMatchDetail[],
  coverage: number,
  fitStyle: FitStyle,
  fabricStretch: FabricStretch,
): string {
  if (coverage === 0) {
    return 'Add your measurements to your sizing profile to see how this size fits you.';
  }

  const stretchNote = fabricStretch !== 'none'
    ? ` The ${fabricStretch}-stretch fabric gives a little extra give.`
    : '';

  // Find the measurement with the most extreme ease (positive or negative)
  const sortedByEase = [...availableDetails].sort(
    (a, b) => Math.abs(b.ease) - Math.abs(a.ease),
  );
  const worst = sortedByEase[0];

  switch (verdict) {
    case 'excellent':
      return `Size ${size} is an excellent match — your measurements line up closely with this size.${stretchNote}`;

    case 'great': {
      const snug = availableDetails.find((d) => d.fit === 'snug');
      const loose = availableDetails.find((d) => d.fit === 'loose');
      if (snug) {
        return `Size ${size} is a great match overall, though it may fit slightly snug at the ${labelOf(snug.measurement)} — ${Math.abs(snug.ease)} cm of negative ease.${stretchNote}`;
      }
      if (loose) {
        return `Size ${size} is a great match overall, with ${loose.ease} cm of ease at the ${labelOf(loose.measurement)}.${stretchNote}`;
      }
      return `Size ${size} fits you well — all your measurements fall within the true-to-size range.${stretchNote}`;
    }

    case 'good': {
      if (worst && worst.ease < 0) {
        return `Size ${size} is a good match. The ${labelOf(worst.measurement)} has ${Math.abs(worst.ease)} cm of negative ease — the garment is smaller than your body here, but it's within a comfortable range.${stretchNote}`;
      }
      if (worst && worst.ease > 0) {
        return `Size ${size} is a good match. The ${labelOf(worst.measurement)} has ${worst.ease} cm of ease, giving you some extra room.${stretchNote}`;
      }
      return `Size ${size} is a good match for your measurements.${stretchNote}`;
    }

    case 'fair': {
      if (worst && worst.ease < 0) {
        return `Size ${size} is a fair match. The ${labelOf(worst.measurement)} has ${Math.abs(worst.ease)} cm of negative ease — the garment is smaller than your body here.`;
      }
      if (worst && worst.ease > 0) {
        return `Size ${size} is a fair match. The ${labelOf(worst.measurement)} has ${worst.ease} cm of ease.`;
      }
      return `Size ${size} is a fair match for your measurements.`;
    }

    case 'relaxed': {
      // All positive ease — describe the ease honestly
      const easeParts = availableDetails
        .filter((d) => d.ease > 0)
        .map((d) => `${d.ease} cm at the ${labelOf(d.measurement)}`);
      const easeDesc = easeParts.length > 0 ? ` This size provides ${easeParts.join(', ')}.` : '';
      return `Size ${size} would fit loosely on you, creating a relaxed silhouette.${easeDesc} It's wearable, especially given the ${fitStyle} style of this garment.`;
    }

    case 'snug': {
      // Some negative ease — garment is smaller than body in places
      const snugParts = availableDetails
        .filter((d) => d.ease < 0)
        .map((d) => `${Math.abs(d.ease)} cm at the ${labelOf(d.measurement)}`);
      const snugDesc = snugParts.length > 0 ? ` This size is smaller than your body by ${snugParts.join(', ')}.${stretchNote}` : `${stretchNote}`;
      return `Size ${size} would fit snugly on you.${snugDesc} It may work if you like a close fit, but it won't feel relaxed.`;
    }

    case 'poor': {
      if (worst && worst.ease < 0) {
        return `Size ${size} is a poor match — the ${labelOf(worst.measurement)} has ${Math.abs(worst.ease)} cm of negative ease, meaning the garment is significantly smaller than your body. It would not fit comfortably.`;
      }
      return `Size ${size} is a poor match for your measurements.`;
    }
  }
}

// ──────────────────────────────────────────────────────────────
// Warning generation
// ──────────────────────────────────────────────────────────────

function generateWarnings(
  confidence: number,
  coverage: number,
  usedMeasurements: MeasurementKey[],
  measurements: Partial<Record<MeasurementKey, number>>,
): SizeMatchWarning[] {
  const warnings: SizeMatchWarning[] = [];

  if (coverage === 0) {
    warnings.push({
      type: 'no-match',
      message: 'No measurements available for this garment. Add your measurements to get a size recommendation.',
    });
    return warnings;
  }

  const missing = usedMeasurements.filter((m) => typeof measurements[m] !== 'number');
  if (missing.length > 0) {
    warnings.push({
      type: 'missing-measurement',
      message: `Confidence may be inaccurate — you're missing ${missing.map(labelOf).join(' and ')}, which ${missing.length > 1 ? 'are' : 'is'} used by this garment's size chart.`,
    });
  }

  if (confidence > 0 && confidence < LOW_CONFIDENCE_THRESHOLD) {
    warnings.push({
      type: 'low-confidence',
      message: `Low confidence (${confidence}%). Consider trying a different size or checking your measurements for accuracy.`,
    });
  }

  return warnings;
}

// ──────────────────────────────────────────────────────────────
// Core engine
// ──────────────────────────────────────────────────────────────

export class ScoringMatchEngine implements SizeMatchEngine {
  match(product: Product, profile: SizingProfile): SizeMatchResult[] {
    return matchChart(
      product.category,
      product.sizeChart,
      profile.measurements,
      product.fabricStretch,
      product.fitStyle,
      profile.fitPreference ?? 'true-to-size',
    );
  }
}

/** Singleton instance used by the app — swappable for testing or future AI/ML */
const defaultEngine = new ScoringMatchEngine();

export function matchProduct(product: Product, profile: SizingProfile): SizeMatchResult[] {
  return defaultEngine.match(product, profile);
}

export function matchChart(
  category: Category,
  chart: ProductSizeChart,
  measurements: Partial<Record<MeasurementKey, number>>,
  fabricStretch: FabricStretch,
  fitStyle: FitStyle,
  fitPreference: FitPreference,
): SizeMatchResult[] {
  const usedMeasurements = chart.measurements;
  const weights = normalisedWeights(category, usedMeasurements);
  const availableMeasurements = usedMeasurements.filter((m) => typeof measurements[m] === 'number');
  const coverage = usedMeasurements.length > 0
    ? availableMeasurements.length / usedMeasurements.length
    : 0;

  const idealEase = computeIdealEase(fitStyle, fitPreference);

  const results = chart.rows.map((row) => {
    const details: SizeMatchDetail[] = usedMeasurements.map((m) => {
      const userValue = measurements[m];
      const sizeValue = row[m];
      const available = typeof userValue === 'number' && typeof sizeValue === 'number';
      const tolerance = effectiveTolerance(m, fabricStretch);
      // ease = sizeValue - userValue
      // positive = garment bigger than body (comfortable)
      // negative = garment smaller than body (tight)
      const ease = available ? sizeValue! - userValue! : 0;
      const fit = available ? classifyFit(ease, tolerance) : 'true';
      const score = available ? scoreOne(ease, tolerance, idealEase) : 0;
      const roundedEase = available ? Math.round(ease * 10) / 10 : 0;
      return {
        measurement: m,
        userValue: available ? userValue! : 0,
        sizeValue: typeof sizeValue === 'number' ? sizeValue : 0,
        diff: -roundedEase, // diff = userValue - sizeValue (for UI compat, negative of ease)
        ease: roundedEase,
        fit,
        score,
        weight: weights[m],
        available,
        reason: available
          ? measurementReason(m, ease, fit, fitStyle)
          : `You haven't provided your ${m} measurement.`,
      };
    });

    let weightedSum = 0;
    let weightSum = 0;
    for (const d of details) {
      if (d.available) {
        weightedSum += d.score * d.weight;
        weightSum += d.weight;
      }
    }
    const confidence = weightSum > 0 ? Math.round(weightedSum / weightSum) : 0;

    // Determine ease flags for verdict
    const availableDetails = details.filter((d) => d.available);
    const hasNegativeEase = availableDetails.some((d) => d.ease < 0);
    const allPositiveEase = availableDetails.every((d) => d.ease >= 0);

    const verdict = verdictFor(confidence, hasNegativeEase, allPositiveEase);
    const warnings = generateWarnings(confidence, coverage, usedMeasurements, measurements);

    return {
      size: row.size,
      confidence,
      verdict,
      ranking: 0, // assigned after sorting
      details,
      explanation: generateExplanation(
        row.size, verdict, confidence, availableDetails, coverage, fitStyle, fabricStretch,
      ),
      isBest: false,
      coverage,
      warnings,
    };
  });

  // Assign rankings: 1 = highest confidence
  const sorted = [...results].sort((a, b) => b.confidence - a.confidence);
  sorted.forEach((r, i) => {
    const original = results.find((x) => x.size === r.size)!;
    original.ranking = i + 1;
  });

  if (results.length > 0) {
    const best = results.reduce((a, b) => (b.confidence > a.confidence ? b : a));
    best.isBest = true;
  }

  return results;
}
