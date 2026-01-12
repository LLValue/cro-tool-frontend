export interface Project {
  id: string;
  name: string;
  pageUrl: string;
  notes: string;
  status: 'draft' | 'active' | 'archived';
  createdAt: Date;
  updatedAt: Date;
  previewHtml: string;
  language: string;
  pageContext: string;
  croGuidelines: string;
  brandGuardrails: string;
  forbiddenWords: string[];
  mandatoryClaims: string[];
  toneAllowed: string[];
  toneDisallowed: string[];
}

export interface OptimizationPoint {
  id: string;
  projectId: string;
  name: string;
  selector: string;
  objective: string;
  generationRules: string;
}

export interface Variant {
  id: string;
  projectId: string;
  optimizationPointId: string;
  text: string;
  uxScore: number;
  uxRationale: string;
  complianceScore: number;
  complianceRationale: string;
  status: 'active' | 'discarded';
  createdAt: Date;
  source: 'fallback' | 'manual';
}

export interface Goal {
  id: string;
  projectId: string;
  name: string;
  type: 'clickSelector' | 'urlReached' | 'dataLayerEvent';
  isPrimary: boolean;
  value: string;
}

export interface ReportingMetrics {
  variantId: string;
  pointId: string;
  users: number;
  conversions: number;
  conversionRate: number;
  confidence: number;
}

