export interface ResultsMetricsDto {
  variantId: string;
  pointId: string;
  goalType: 'clickSelector' | 'urlReached' | 'dataLayerEvent';
  users: number;
  conversions: number;
  conversionRate: number;
  confidence: number;
}

export interface ResultsResponse {
  metrics: ResultsMetricsDto[];
  lastUpdated: string; // ISO string
}

export interface SimulationStartRequest {
  durationMs?: number; // default 6000
  intervalMs?: number; // default 200
}

// New interfaces for 30-day simulation
export interface CombinationPoint {
  pointId: string;
  pointName: string;
  variantId: string;
  variantName: string;
  variantText: string;
  cssSelector: string;
  /** When backend exposes per-point metrics (optional). */
  pointUplift?: number;
  pointWinProbability?: number;
}

export interface CombinationMetrics {
  users: number;
  conversions: number;
  conversionRate: number;
  uplift: number; // decimal, e.g., 0.0270 for +2.70%
  winProbability: number; // decimal, e.g., 0.97 for 97%
}

export interface CombinationRow {
  comboId: string; // e.g., "A0|B2|C1"
  points: CombinationPoint[];
  metrics: CombinationMetrics;
}

export interface SimulationFrame {
  day: number;
  combos: Array<{
    comboId: string;
    users: number;
    conversions: number;
    conversionRate: number;
    uplift: number;
    winProbability: number;
  }>;
}

export interface SimulateMonthResponse {
  /** ID de la simulación guardada; "" si no hubo datos suficientes y no se persistió. */
  id: string;
  combinations: CombinationRow[];
  frames: SimulationFrame[]; // 30 frames, one per day
  controlMetrics: CombinationMetrics;
}

export interface ResetResponse {
  success: boolean;
  message?: string;
}

// Simulations list and detail (GET list, GET by id, DELETE)
export interface SimulationSummaryDto {
  id: string;
  monthlyUsers: number;
  days: number;
  seed: string | null;
  createdAt: string; // ISO date
  summary: {
    totalCombinations: number;
    bestCombinationId: string;
    bestUplift: number;
    controlConversionRate: number;
  };
}

export interface SimulationsListResponse {
  simulations: SimulationSummaryDto[];
}

/** Simulación completa (GET /simulations/:id). */
export interface SimulationDetailResponse {
  id: string;
  projectId: string;
  monthlyUsers: number;
  days: number;
  seed: string | null;
  combinations: CombinationRow[];
  frames: SimulationFrame[];
  controlMetrics: CombinationMetrics;
  createdAt: string; // ISO date
}