export interface ReportingMetricsDto {
  variantId: string;
  pointId: string;
  goalType: 'clickSelector' | 'urlReached' | 'dataLayerEvent';
  users: number;
  conversions: number;
  conversionRate: number;
  confidence: number;
}

export interface ReportingResponse {
  metrics: ReportingMetricsDto[];
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
  combinations: CombinationRow[];
  frames: SimulationFrame[]; // 30 frames, one per day
  controlMetrics: CombinationMetrics;
}

export interface ResetResponse {
  success: boolean;
  message?: string;
}