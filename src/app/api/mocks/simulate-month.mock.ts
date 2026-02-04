import {
  SimulateMonthResponse,
  CombinationRow,
  CombinationMetrics,
  SimulationFrame
} from '../../api-contracts/reporting.contracts';

/**
 * Mock combinations for "Simulate 30 days" demo.
 * The "Combination" cell shows one line per optimization point (pointName + truncated variantText).
 * The spec example (Hero headline, CTA, Microcopy) was just the display format; the real backend
 * sends whatever points exist for the project — so each row can have N points, not necessarily 3.
 */
const MOCK_COMBINATIONS: Omit<CombinationRow, 'metrics'>[] = [
  {
    comboId: 'A0|B0|C0',
    points: [
      { pointId: 'hero', pointName: 'Hero headline', variantId: 'v1', variantName: 'Control', variantText: 'Pay securely online and in-store with real-time controls.', cssSelector: '#hero h1' },
      { pointId: 'cta', pointName: 'Main CTA', variantId: 'v2', variantName: 'Control', variantText: 'Start application', cssSelector: 'button[data-qa="cta"]' },
      { pointId: 'micro', pointName: 'Microcopy', variantId: 'v3', variantName: 'Control', variantText: 'Terms and conditions apply.', cssSelector: '.microcopy' }
    ]
  },
  {
    comboId: 'A0|B1|C0',
    points: [
      { pointId: 'hero', pointName: 'Hero headline', variantId: 'v1', variantName: 'Control', variantText: 'Pay securely online and in-store with real-time controls.', cssSelector: '#hero h1' },
      { pointId: 'cta', pointName: 'Main CTA', variantId: 'v4', variantName: 'Variant 2', variantText: 'Check eligibility', cssSelector: 'button[data-qa="cta"]' },
      { pointId: 'micro', pointName: 'Microcopy', variantId: 'v3', variantName: 'Control', variantText: 'Terms and conditions apply.', cssSelector: '.microcopy' }
    ]
  },
  {
    comboId: 'A1|B0|C0',
    points: [
      { pointId: 'hero', pointName: 'Hero headline', variantId: 'v5', variantName: 'Variant 3', variantText: 'Bank with confidence. Your money, your control.', cssSelector: '#hero h1' },
      { pointId: 'cta', pointName: 'Main CTA', variantId: 'v2', variantName: 'Control', variantText: 'Start application', cssSelector: 'button[data-qa="cta"]' },
      { pointId: 'micro', pointName: 'Microcopy', variantId: 'v3', variantName: 'Control', variantText: 'Terms and conditions apply.', cssSelector: '.microcopy' }
    ]
  },
  {
    comboId: 'A1|B1|C0',
    points: [
      { pointId: 'hero', pointName: 'Hero headline', variantId: 'v5', variantName: 'Variant 3', variantText: 'Bank with confidence. Your money, your control.', cssSelector: '#hero h1' },
      { pointId: 'cta', pointName: 'Main CTA', variantId: 'v4', variantName: 'Variant 2', variantText: 'Check eligibility', cssSelector: 'button[data-qa="cta"]' },
      { pointId: 'micro', pointName: 'Microcopy', variantId: 'v3', variantName: 'Control', variantText: 'Terms and conditions apply.', cssSelector: '.microcopy' }
    ]
  },
  {
    comboId: 'A1|B2|C1',
    points: [
      { pointId: 'hero', pointName: 'Hero headline', variantId: 'v5', variantName: 'Variant 3', variantText: 'Bank with confidence. Your money, your control.', cssSelector: '#hero h1' },
      { pointId: 'cta', pointName: 'Main CTA', variantId: 'v6', variantName: 'Variant 4', variantText: 'Apply now — quick decision', cssSelector: 'button[data-qa="cta"]' },
      { pointId: 'micro', pointName: 'Microcopy', variantId: 'v7', variantName: 'Variant 5', variantText: 'Subject to approval. Terms apply.', cssSelector: '.microcopy' }
    ]
  },
  {
    comboId: 'A2|B2|C1',
    points: [
      { pointId: 'hero', pointName: 'Hero headline', variantId: 'v8', variantName: 'Variant 6', variantText: 'Simple, fast, secure. Banking that fits you.', cssSelector: '#hero h1' },
      { pointId: 'cta', pointName: 'Main CTA', variantId: 'v6', variantName: 'Variant 4', variantText: 'Apply now — quick decision', cssSelector: 'button[data-qa="cta"]' },
      { pointId: 'micro', pointName: 'Microcopy', variantId: 'v7', variantName: 'Variant 5', variantText: 'Subject to approval. Terms apply.', cssSelector: '.microcopy' }
    ]
  }
];

/** Control baseline (fixed over 30 days for the line chart). */
const CONTROL_CR = 0.082;

/** Build 30 frames so one combo (A1|B2|C1) wins by day 30. */
function buildMockFrames(comboIds: string[]): SimulationFrame[] {
  const frames: SimulationFrame[] = [];
  const rnd = (min: number, max: number) => min + Math.random() * (max - min);
  // Target final metrics: A1|B2|C1 wins with ~10.2% CR, others below
  const targets: Record<string, { cr: number; wp: number }> = {
    'A0|B0|C0': { cr: 0.082, wp: 0.05 },
    'A0|B1|C0': { cr: 0.087, wp: 0.08 },
    'A1|B0|C0': { cr: 0.091, wp: 0.12 },
    'A1|B1|C0': { cr: 0.094, wp: 0.18 },
    'A1|B2|C1': { cr: 0.102, wp: 0.45 }, // winner
    'A2|B2|C1': { cr: 0.089, wp: 0.12 }
  };
  for (let day = 1; day <= 30; day++) {
    const t = day / 30; // 0..1 progression
    const combos = comboIds.map(comboId => {
      const target = targets[comboId] ?? { cr: 0.085, wp: 0.1 };
      const users = Math.round(800 + day * 120 + rnd(-50, 50));
      const cr = CONTROL_CR + (target.cr - CONTROL_CR) * t + rnd(-0.005, 0.005);
      const conversions = Math.round(users * Math.max(0.02, Math.min(0.2, cr)));
      const uplift = (cr - CONTROL_CR) / (CONTROL_CR || 0.01);
      const wp = Math.min(0.99, Math.max(0.01, target.wp * (0.3 + 0.7 * t) + rnd(-0.02, 0.02)));
      return {
        comboId,
        users,
        conversions,
        conversionRate: Math.round(cr * 10000) / 10000,
        uplift: Math.round(uplift * 10000) / 10000,
        winProbability: Math.round(wp * 1000) / 1000
      };
    });
    frames.push({ day, combos });
  }
  return frames;
}

/**
 * Returns a full mock SimulateMonthResponse for "Simulate 30 days" demo.
 * Use when backend is not available or for development.
 */
export function getMockSimulateMonthResponse(): SimulateMonthResponse {
  const comboIds = MOCK_COMBINATIONS.map(c => c.comboId);
  const frames = buildMockFrames(comboIds);
  const lastFrame = frames[frames.length - 1];
  const controlMetrics: CombinationMetrics = {
    users: lastFrame.combos[0].users,
    conversions: Math.round(lastFrame.combos[0].users * CONTROL_CR),
    conversionRate: CONTROL_CR,
    uplift: 0,
    winProbability: 0.05
  };
  /** Per-point contribution mock: assign pointWinProbability (and pointUplift) so one point per combo is "winner". */
  const assignPointMetrics = (points: CombinationRow['points'], comboIndex: number): CombinationRow['points'] => {
    const winnerIndex = comboIndex % points.length; // rotate which point wins per combo
    return points.map((p, i) => ({
      ...p,
      pointUplift: 0.01 + (i === winnerIndex ? 0.025 : 0.005 * (points.length - i)),
      pointWinProbability: i === winnerIndex ? 0.72 + comboIndex * 0.02 : 0.35 + i * 0.05
    }));
  };

  const combinations: CombinationRow[] = MOCK_COMBINATIONS.map((row, idx) => {
    const lastCombo = lastFrame.combos.find(c => c.comboId === row.comboId)!;
    return {
      ...row,
      points: assignPointMetrics(row.points, idx),
      metrics: {
        users: lastCombo.users,
        conversions: lastCombo.conversions,
        conversionRate: lastCombo.conversionRate,
        uplift: lastCombo.uplift,
        winProbability: lastCombo.winProbability
      }
    };
  }).sort((a, b) => b.metrics.conversionRate - a.metrics.conversionRate);
  return {
    combinations,
    frames,
    controlMetrics
  };
}
