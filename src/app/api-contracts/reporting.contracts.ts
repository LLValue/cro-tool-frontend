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

