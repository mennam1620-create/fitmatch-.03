import { describe, it, expect } from 'vitest';
import { matchChart, VERDICT_LABELS } from '@/lib/matchEngine';
import type { ProductSizeChart, MeasurementKey, FitVerdict } from '@/types';

const DRESS_CHART: ProductSizeChart = {
  measurements: ['bust', 'waist', 'hips'],
  rows: [
    { size: 'XS', bust: 81, waist: 61, hips: 86 },
    { size: 'S',  bust: 86, waist: 66, hips: 91 },
    { size: 'M',  bust: 91, waist: 71, hips: 97 },
    { size: 'L',  bust: 97, waist: 76, hips: 102 },
    { size: 'XL', bust: 102, waist: 81, hips: 107 },
  ],
};

const JEANS_CHART: ProductSizeChart = {
  measurements: ['waist', 'hips', 'inseam'],
  rows: [
    { size: 'XS', waist: 61, hips: 86, inseam: 71 },
    { size: 'S',  waist: 66, hips: 91, inseam: 74 },
    { size: 'M',  waist: 71, hips: 97, inseam: 76 },
    { size: 'L',  waist: 76, hips: 102, inseam: 79 },
    { size: 'XL', waist: 81, hips: 107, inseam: 81 },
  ],
};

const BLOUSE_CHART: ProductSizeChart = {
  measurements: ['bust' as MeasurementKey],
  rows: [
    { size: 'XS', bust: 84 },
    { size: 'S',  bust: 89 },
    { size: 'M',  bust: 94 },
    { size: 'L',  bust: 99 },
    { size: 'XL', bust: 104 },
  ],
};

// ──────────────────────────────────────────────────────────────
// BASIC SCORING
// ──────────────────────────────────────────────────────────────

describe('matchChart — basic scoring', () => {
  it('returns a result for every size in the chart', () => {
    const results = matchChart('dresses', DRESS_CHART, { bust: 90, waist: 70, hips: 96 }, 'medium', 'fitted', 'true-to-size');
    expect(results).toHaveLength(5);
    expect(results.map((r) => r.size)).toEqual(['XS', 'S', 'M', 'L', 'XL']);
  });

  it('marks exactly one size as best', () => {
    const results = matchChart('dresses', DRESS_CHART, { bust: 90, waist: 70, hips: 96 }, 'medium', 'fitted', 'true-to-size');
    const best = results.filter((r) => r.isBest);
    expect(best).toHaveLength(1);
  });

  it('selects the closest size as best when measurements match exactly', () => {
    const results = matchChart('dresses', DRESS_CHART, { bust: 91, waist: 71, hips: 97 }, 'medium', 'fitted', 'true-to-size');
    const best = results.find((r) => r.isBest);
    expect(best?.size).toBe('M');
    expect(best?.confidence).toBe(100);
    expect(best?.verdict).toBe('excellent');
  });

  it('assigns ranking 1 to the best size', () => {
    const results = matchChart('dresses', DRESS_CHART, { bust: 91, waist: 71, hips: 97 }, 'medium', 'fitted', 'true-to-size');
    const best = results.find((r) => r.isBest);
    expect(best?.ranking).toBe(1);
  });

  it('assigns unique rankings to all sizes', () => {
    const results = matchChart('dresses', DRESS_CHART, { bust: 90, waist: 70, hips: 96 }, 'medium', 'fitted', 'true-to-size');
    const rankings = results.map((r) => r.ranking).sort((a, b) => a - b);
    expect(rankings).toEqual([1, 2, 3, 4, 5]);
  });
});

// ──────────────────────────────────────────────────────────────
// CONFIDENCE SCORES
// ──────────────────────────────────────────────────────────────

describe('matchChart — confidence scores', () => {
  it('scores 100 when all measurements match exactly', () => {
    const results = matchChart('dresses', DRESS_CHART, { bust: 86, waist: 66, hips: 91 }, 'none', 'fitted', 'true-to-size');
    const best = results.find((r) => r.isBest);
    expect(best?.size).toBe('S');
    expect(best?.confidence).toBe(100);
  });

  it('gives lower scores to sizes further from the user', () => {
    const results = matchChart('dresses', DRESS_CHART, { bust: 91, waist: 71, hips: 97 }, 'none', 'fitted', 'true-to-size');
    const m = results.find((r) => r.size === 'M')!;
    const xl = results.find((r) => r.size === 'XL')!;
    expect(m.confidence).toBeGreaterThan(xl.confidence);
  });

  it('never returns a negative confidence', () => {
    const results = matchChart('dresses', DRESS_CHART, { bust: 60, waist: 40, hips: 50 }, 'none', 'fitted', 'true-to-size');
    results.forEach((r) => {
      expect(r.confidence).toBeGreaterThanOrEqual(0);
    });
  });

  it('confidence is always 0–100', () => {
    const results = matchChart('dresses', DRESS_CHART, { bust: 130, waist: 115, hips: 140 }, 'none', 'fitted', 'true-to-size');
    results.forEach((r) => {
      expect(r.confidence).toBeLessThanOrEqual(100);
      expect(r.confidence).toBeGreaterThanOrEqual(0);
    });
  });
});

// ──────────────────────────────────────────────────────────────
// EASE COMPUTATION
// ──────────────────────────────────────────────────────────────

describe('matchChart — ease computation', () => {
  it('computes positive ease when garment is bigger than body', () => {
    // User bust 86, size M bust 91 → ease = 5
    const results = matchChart('dresses', DRESS_CHART, { bust: 86, waist: 66, hips: 91 }, 'none', 'fitted', 'true-to-size');
    const m = results.find((r) => r.size === 'M')!;
    const bustDetail = m.details.find((d) => d.measurement === 'bust')!;
    expect(bustDetail.ease).toBe(5);
  });

  it('computes negative ease when garment is smaller than body', () => {
    // User bust 91, size S bust 86 → ease = -5
    const results = matchChart('dresses', DRESS_CHART, { bust: 91, waist: 71, hips: 97 }, 'none', 'fitted', 'true-to-size');
    const s = results.find((r) => r.size === 'S')!;
    const bustDetail = s.details.find((d) => d.measurement === 'bust')!;
    expect(bustDetail.ease).toBe(-5);
  });

  it('computes zero ease when garment matches body exactly', () => {
    const results = matchChart('dresses', DRESS_CHART, { bust: 91, waist: 71, hips: 97 }, 'none', 'fitted', 'true-to-size');
    const m = results.find((r) => r.size === 'M')!;
    m.details.forEach((d) => {
      expect(d.ease).toBe(0);
    });
  });

  it('ease is rounded to 1 decimal place', () => {
    // User bust 90.5, size M bust 91 → ease = 0.5
    const results = matchChart('dresses', DRESS_CHART, { bust: 90.5, waist: 70.5, hips: 96.5 }, 'none', 'fitted', 'true-to-size');
    const m = results.find((r) => r.size === 'M')!;
    const bustDetail = m.details.find((d) => d.measurement === 'bust')!;
    expect(bustDetail.ease).toBe(0.5);
  });
});

// ──────────────────────────────────────────────────────────────
// FABRIC STRETCH
// ──────────────────────────────────────────────────────────────

describe('matchChart — fabric stretch', () => {
  it('higher stretch gives a better score for the same negative ease', () => {
    const measurements = { bust: 88, waist: 68, hips: 93 };
    const noStretch = matchChart('dresses', DRESS_CHART, measurements, 'none', 'fitted', 'true-to-size');
    const highStretch = matchChart('dresses', DRESS_CHART, measurements, 'high', 'fitted', 'true-to-size');
    const noStretchBest = noStretch.find((r) => r.isBest)!;
    const highStretchBest = highStretch.find((r) => r.isBest)!;
    expect(highStretchBest.confidence).toBeGreaterThanOrEqual(noStretchBest.confidence);
  });

  it('stretch affects tolerance — negative ease is less penalised with stretch', () => {
    const measurements = { bust: 94, waist: 74, hips: 99 }; // bigger than M, smaller than L
    const noStretch = matchChart('dresses', DRESS_CHART, measurements, 'none', 'fitted', 'true-to-size');
    const highStretch = matchChart('dresses', DRESS_CHART, measurements, 'high', 'fitted', 'true-to-size');
    // For size M (which has negative ease), high stretch should score >= no stretch
    const noStretchM = noStretch.find((r) => r.size === 'M')!;
    const highStretchM = highStretch.find((r) => r.size === 'M')!;
    expect(highStretchM.confidence).toBeGreaterThanOrEqual(noStretchM.confidence);
  });
});

// ──────────────────────────────────────────────────────────────
// FIT STYLE
// ──────────────────────────────────────────────────────────────

describe('matchChart — fit style', () => {
  it('relaxed style scores positive-ease sizes higher than fitted style does', () => {
    const measurements = { bust: 86, waist: 66, hips: 91 }; // exact S
    const relaxedResults = matchChart('dresses', DRESS_CHART, measurements, 'none', 'relaxed', 'true-to-size');
    const fittedResults = matchChart('dresses', DRESS_CHART, measurements, 'none', 'fitted', 'true-to-size');
    const relaxedL = relaxedResults.find((r) => r.size === 'L')!;
    const fittedL = fittedResults.find((r) => r.size === 'L')!;
    expect(relaxedL.confidence).toBeGreaterThanOrEqual(fittedL.confidence);
  });

  it('fitted style scores near-zero-ease sizes higher than relaxed style does', () => {
    const measurements = { bust: 91, waist: 71, hips: 97 }; // exact M
    const fittedResults = matchChart('dresses', DRESS_CHART, measurements, 'none', 'fitted', 'true-to-size');
    const relaxedResults = matchChart('dresses', DRESS_CHART, measurements, 'none', 'relaxed', 'true-to-size');
    const fittedM = fittedResults.find((r) => r.size === 'M')!;
    const relaxedM = relaxedResults.find((r) => r.size === 'M')!;
    expect(fittedM.confidence).toBeGreaterThanOrEqual(relaxedM.confidence);
  });
});

// ──────────────────────────────────────────────────────────────
// USER FIT PREFERENCE
// ──────────────────────────────────────────────────────────────

describe('matchChart — user fit preference', () => {
  it('relaxed preference scores positive-ease sizes higher than snug preference', () => {
    const measurements = { bust: 86, waist: 66, hips: 91 }; // exact S
    const relaxedResults = matchChart('dresses', DRESS_CHART, measurements, 'none', 'tailored', 'relaxed');
    const snugResults = matchChart('dresses', DRESS_CHART, measurements, 'none', 'tailored', 'snug');
    const relaxedL = relaxedResults.find((r) => r.size === 'L')!;
    const snugL = snugResults.find((r) => r.size === 'L')!;
    expect(relaxedL.confidence).toBeGreaterThan(snugL.confidence);
  });

  it('snug preference scores negative-ease sizes higher than relaxed preference', () => {
    const measurements = { bust: 86, waist: 66, hips: 91 }; // exact S
    const relaxedResults = matchChart('dresses', DRESS_CHART, measurements, 'none', 'tailored', 'relaxed');
    const snugResults = matchChart('dresses', DRESS_CHART, measurements, 'none', 'tailored', 'snug');
    const relaxedXS = relaxedResults.find((r) => r.size === 'XS')!;
    const snugXS = snugResults.find((r) => r.size === 'XS')!;
    expect(snugXS.confidence).toBeGreaterThan(relaxedXS.confidence);
  });
});

// ──────────────────────────────────────────────────────────────
// VERDICT CONTRADICTION CHECKS — the core of the request
// ──────────────────────────────────────────────────────────────

describe('matchChart — verdict contradiction checks', () => {
  it('NEVER labels "relaxed" when ANY measurement has negative ease', () => {
    // User is bigger than S at bust (86 vs 86 = 0), but much bigger at waist (76 vs 66 = -10 ease on waist)
    // Actually let's make user clearly bigger than some sizes
    const testCases = [
      // user bust 94, waist 74, hips 99 — bigger than M at all → negative ease for M
      { measurements: { bust: 94, waist: 74, hips: 99 }, label: 'bigger than M' },
      // user bust 100, waist 80, hips 105 — much bigger than L
      { measurements: { bust: 100, waist: 80, hips: 105 }, label: 'bigger than L' },
    ];
    for (const tc of testCases) {
      const results = matchChart('dresses', DRESS_CHART, tc.measurements, 'none', 'fitted', 'true-to-size');
      for (const r of results) {
        const hasNegativeEase = r.details.some((d) => d.available && d.ease < 0);
        if (hasNegativeEase) {
          expect(r.verdict).not.toBe('relaxed');
        }
      }
    }
  });

  it('a size where ALL measurements have negative ease is NEVER "relaxed"', () => {
    // User much bigger than XS at all measurements
    const results = matchChart('dresses', DRESS_CHART, { bust: 100, waist: 80, hips: 105 }, 'none', 'fitted', 'true-to-size');
    const xs = results.find((r) => r.size === 'XS')!;
    const allNegative = xs.details.every((d) => d.available && d.ease < 0);
    expect(allNegative).toBe(true);
    expect(xs.verdict).not.toBe('relaxed');
  });

  it('a size where ANY measurement has negative ease is never "relaxed" — exhaustive check', () => {
    // Test many measurement sets and verify the invariant holds for every size
    const testMeasurements = [
      { bust: 88, waist: 68, hips: 93 },
      { bust: 92, waist: 72, hips: 98 },
      { bust: 95, waist: 75, hips: 100 },
      { bust: 80, waist: 62, hips: 85 },
      { bust: 100, waist: 79, hips: 106 },
    ];
    for (const m of testMeasurements) {
      const results = matchChart('dresses', DRESS_CHART, m, 'medium', 'fitted', 'true-to-size');
      for (const r of results) {
        const hasNeg = r.details.some((d) => d.available && d.ease < 0);
        if (hasNeg) {
          expect(r.verdict).not.toBe('relaxed');
        }
      }
    }
  });

  it('a size where ALL measurements have positive ease CAN be "relaxed" when score is 20–45', () => {
    // User smaller than XS — all sizes have positive ease
    const results = matchChart('dresses', DRESS_CHART, { bust: 76, waist: 56, hips: 81 }, 'none', 'fitted', 'true-to-size');
    // XS: ease = 81-76=5, 61-56=5, 86-81=5 — all positive
    const xs = results.find((r) => r.size === 'XS')!;
    expect(xs.details.every((d) => d.available && d.ease >= 0)).toBe(true);
    // Should be relaxed (or better), NOT snug/poor
    expect(['relaxed', 'fair', 'good', 'great', 'excellent']).toContain(xs.verdict);
  });

  it('"snug" verdict only appears when at least one measurement has negative ease', () => {
    const results = matchChart('dresses', DRESS_CHART, { bust: 94, waist: 74, hips: 99 }, 'medium', 'fitted', 'true-to-size');
    for (const r of results) {
      if (r.verdict === 'snug') {
        const hasNeg = r.details.some((d) => d.available && d.ease < 0);
        expect(hasNeg).toBe(true);
      }
    }
  });

  it('"excellent" verdict only appears when score >= 90', () => {
    const results = matchChart('dresses', DRESS_CHART, { bust: 90, waist: 70, hips: 96 }, 'medium', 'fitted', 'true-to-size');
    for (const r of results) {
      if (r.verdict === 'excellent') {
        expect(r.confidence).toBeGreaterThanOrEqual(90);
      }
    }
  });

  it('"poor" verdict only appears when score < 20', () => {
    const results = matchChart('dresses', DRESS_CHART, { bust: 72, waist: 56, hips: 80 }, 'none', 'fitted', 'true-to-size');
    for (const r of results) {
      if (r.verdict === 'poor') {
        expect(r.confidence).toBeLessThan(20);
      }
    }
  });

  it('a size with very large negative ease at all measurements is "poor", not "relaxed"', () => {
    // User way bigger than XL
    const results = matchChart('dresses', DRESS_CHART, { bust: 120, waist: 100, hips: 125 }, 'none', 'fitted', 'true-to-size');
    const xs = results.find((r) => r.size === 'XS')!;
    expect(xs.verdict).not.toBe('relaxed');
    expect(xs.verdict).toBe('poor');
  });

  it('a size with very large positive ease at all measurements is "relaxed" or "poor", not "snug"', () => {
    // User way smaller than XS — all sizes have positive ease
    const results = matchChart('dresses', DRESS_CHART, { bust: 70, waist: 50, hips: 75 }, 'none', 'fitted', 'true-to-size');
    const xl = results.find((r) => r.size === 'XL')!;
    expect(xl.verdict).not.toBe('snug');
  });

  it('best size is always ranking 1', () => {
    const results = matchChart('dresses', DRESS_CHART, { bust: 90, waist: 70, hips: 96 }, 'medium', 'fitted', 'true-to-size');
    const best = results.find((r) => r.isBest)!;
    expect(best.ranking).toBe(1);
  });

  it('higher confidence always gets a better (lower) ranking', () => {
    const results = matchChart('dresses', DRESS_CHART, { bust: 90, waist: 70, hips: 96 }, 'medium', 'fitted', 'true-to-size');
    const sorted = [...results].sort((a, b) => a.ranking - b.ranking);
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].confidence).toBeLessThanOrEqual(sorted[i - 1].confidence);
    }
  });

  it('every verdict has a human-readable label', () => {
    const allVerdicts: FitVerdict[] = ['excellent', 'great', 'good', 'fair', 'relaxed', 'snug', 'poor'];
    allVerdicts.forEach((v) => {
      expect(VERDICT_LABELS[v]).toBeTruthy();
      expect(VERDICT_LABELS[v].length).toBeGreaterThan(0);
    });
  });

  it('explanation mentions ease in cm when verdict is relaxed', () => {
    // All positive ease, low score → relaxed
    const results = matchChart('dresses', DRESS_CHART, { bust: 76, waist: 56, hips: 81 }, 'none', 'relaxed', 'relaxed');
    const relaxedResult = results.find((r) => r.verdict === 'relaxed');
    if (relaxedResult) {
      expect(relaxedResult.explanation).toMatch(/cm/);
    }
  });

  it('explanation mentions negative ease when verdict is snug', () => {
    // User slightly bigger than some size
    const results = matchChart('dresses', DRESS_CHART, { bust: 94, waist: 74, hips: 99 }, 'high', 'fitted', 'snug');
    const snugResult = results.find((r) => r.verdict === 'snug');
    if (snugResult) {
      expect(snugResult.explanation).toMatch(/smaller than your body/);
    }
  });
});

// ──────────────────────────────────────────────────────────────
// COVERAGE & WARNINGS
// ──────────────────────────────────────────────────────────────

describe('matchChart — coverage & warnings', () => {
  it('reports coverage 0 when no measurements provided', () => {
    const results = matchChart('dresses', DRESS_CHART, {}, 'none', 'fitted', 'true-to-size');
    results.forEach((r) => {
      expect(r.coverage).toBe(0);
      expect(r.warnings.some((w) => w.type === 'no-match')).toBe(true);
    });
  });

  it('reports partial coverage when some measurements are missing', () => {
    const results = matchChart('dresses', DRESS_CHART, { bust: 90 }, 'none', 'fitted', 'true-to-size');
    results.forEach((r) => {
      expect(r.coverage).toBeCloseTo(1 / 3, 5);
      expect(r.warnings.some((w) => w.type === 'missing-measurement')).toBe(true);
    });
  });

  it('reports full coverage when all measurements provided', () => {
    const results = matchChart('dresses', DRESS_CHART, { bust: 90, waist: 70, hips: 96 }, 'none', 'fitted', 'true-to-size');
    results.forEach((r) => {
      expect(r.coverage).toBe(1);
      expect(r.warnings.some((w) => w.type === 'missing-measurement')).toBe(false);
    });
  });
});

// ──────────────────────────────────────────────────────────────
// PER-MEASUREMENT DETAILS
// ──────────────────────────────────────────────────────────────

describe('matchChart — per-measurement details', () => {
  it('provides a reason string for each measurement', () => {
    const results = matchChart('dresses', DRESS_CHART, { bust: 90, waist: 70, hips: 96 }, 'none', 'fitted', 'true-to-size');
    const best = results.find((r) => r.isBest)!;
    best.details.forEach((d) => {
      expect(d.reason).toBeTruthy();
      expect(d.reason.length).toBeGreaterThan(5);
    });
  });

  it('marks unavailable measurements correctly', () => {
    const results = matchChart('dresses', DRESS_CHART, { bust: 90 }, 'none', 'fitted', 'true-to-size');
    const best = results.find((r) => r.isBest)!;
    const bust = best.details.find((d) => d.measurement === 'bust')!;
    const waist = best.details.find((d) => d.measurement === 'waist')!;
    expect(bust.available).toBe(true);
    expect(waist.available).toBe(false);
  });

  it('provides ease value for each available measurement', () => {
    const results = matchChart('dresses', DRESS_CHART, { bust: 90, waist: 70, hips: 96 }, 'none', 'fitted', 'true-to-size');
    const best = results.find((r) => r.isBest)!;
    best.details.filter((d) => d.available).forEach((d) => {
      expect(typeof d.ease).toBe('number');
    });
  });

  it('reason mentions ease in cm for non-true fits', () => {
    const results = matchChart('dresses', DRESS_CHART, { bust: 86, waist: 66, hips: 91 }, 'none', 'fitted', 'true-to-size');
    const m = results.find((r) => r.size === 'M')!;
    const bustDetail = m.details.find((d) => d.measurement === 'bust')!;
    // ease = 5, fit = loose
    expect(bustDetail.reason).toMatch(/cm/);
  });
});

// ──────────────────────────────────────────────────────────────
// CONSISTENCY / DETERMINISM
// ──────────────────────────────────────────────────────────────

describe('matchChart — consistency', () => {
  it('produces identical results for the same inputs', () => {
    const measurements = { bust: 90, waist: 70, hips: 96 };
    const r1 = matchChart('dresses', DRESS_CHART, measurements, 'medium', 'fitted', 'true-to-size');
    const r2 = matchChart('dresses', DRESS_CHART, measurements, 'medium', 'fitted', 'true-to-size');
    expect(r1).toEqual(r2);
  });

  it('produces identical results across 100 runs', () => {
    const measurements = { waist: 70, hips: 96, inseam: 76 };
    let prev: ReturnType<typeof matchChart> | null = null;
    for (let i = 0; i < 100; i++) {
      const cur = matchChart('jeans', JEANS_CHART, measurements, 'low', 'fitted', 'true-to-size');
      if (prev) expect(cur).toEqual(prev);
      prev = cur;
    }
  });

  it('is deterministic regardless of key order in measurements object', () => {
    const r1 = matchChart('dresses', DRESS_CHART, { bust: 90, waist: 70, hips: 96 }, 'none', 'fitted', 'true-to-size');
    const r2 = matchChart('dresses', DRESS_CHART, { hips: 96, bust: 90, waist: 70 }, 'none', 'fitted', 'true-to-size');
    expect(r1).toEqual(r2);
  });
});

// ──────────────────────────────────────────────────────────────
// SINGLE-MEASUREMENT PRODUCTS
// ──────────────────────────────────────────────────────────────

describe('matchChart — single-measurement products', () => {
  it('works with a single measurement (blouse)', () => {
    const results = matchChart('tops', BLOUSE_CHART, { bust: 94 }, 'none', 'fitted', 'true-to-size');
    const best = results.find((r) => r.isBest)!;
    expect(best.size).toBe('M');
    expect(best.confidence).toBe(100);
    expect(best.verdict).toBe('excellent');
  });
});

// ──────────────────────────────────────────────────────────────
// BEST SIZE SELECTION
// ──────────────────────────────────────────────────────────────

describe('matchChart — best size selection', () => {
  it('best size is always the chart row closest to the user measurements', () => {
    const testCases: { category: 'dresses' | 'jeans' | 'tops'; chart: ProductSizeChart; measurements: Partial<Record<MeasurementKey, number>>; expectedBest: string }[] = [
      { category: 'dresses', chart: DRESS_CHART, measurements: { bust: 91, waist: 71, hips: 97 }, expectedBest: 'M' },
      { category: 'dresses', chart: DRESS_CHART, measurements: { bust: 97, waist: 76, hips: 102 }, expectedBest: 'L' },
      { category: 'jeans', chart: JEANS_CHART, measurements: { waist: 66, hips: 91, inseam: 74 }, expectedBest: 'S' },
      { category: 'tops', chart: BLOUSE_CHART, measurements: { bust: 89 }, expectedBest: 'S' },
    ];
    for (const tc of testCases) {
      const results = matchChart(tc.category, tc.chart, tc.measurements, 'medium', 'fitted', 'true-to-size');
      const best = results.find((r) => r.isBest)!;
      expect(best.size).toBe(tc.expectedBest);
    }
  });
});
