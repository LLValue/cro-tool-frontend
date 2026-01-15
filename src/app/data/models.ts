export interface Project {
  id: string;
  name: string;
  pageUrl: string;
  industry?: string;
  notes: string;
  status: 'draft' | 'active' | 'archived';
  createdAt: Date;
  updatedAt: Date;
  previewHtml: string;
  // Language & Voice
  language: string;
  tone?: string;
  styleComplexity?: 'simple' | 'technical';
  styleLength?: 'short' | 'med' | 'long';
  // Business & Page Context
  productSummary?: string;
  pageIntent?: string;
  funnelStage?: 'discovery' | 'consideration' | 'conversion';
  valueProps?: string[];
  typicalObjections?: string[];
  marketLocale?: string;
  // Proof & Source of Truth
  allowedFacts?: string[];
  mustNotClaim?: string[];
  // Legal & Brand Guardrails
  riskLevel?: 'Conservative' | 'Standard' | 'Exploratory';
  forbiddenWords: string[];
  mandatoryClaims: string[];
  prohibitedClaims?: string[];
  requiredDisclaimer?: string;
  toneAllowed: string[];
  toneDisallowed: string[];
  // Legacy fields (keeping for backward compatibility)
  pageContext: string;
  croGuidelines: string;
  brandGuardrails: string;
}

export interface OptimizationPoint {
  id: string;
  projectId: string;
  name: string;
  selector: string;
  text: string;
  objective: string;
  generationRules: string;
  elementType?: 'Title' | 'CTA' | 'Subheadline' | 'Microcopy' | 'Other';
  deviceScope?: 'All' | 'Mobile' | 'Desktop';
  status?: 'Active' | 'Paused';
  createdAt?: Date;
  updatedAt?: Date;
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
  status: 'active' | 'pending' | 'discarded';
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
  goalType: 'clickSelector' | 'urlReached' | 'dataLayerEvent' | 'all';
  users: number;
  conversions: number;
  conversionRate: number;
  confidence: number;
}

export interface ActivationConfig {
  projectId: string;
  scriptSnippet: string;
  scopeType: 'exact' | 'pattern';
  scopeValue: string;
  antiFlicker: boolean;
  maxWait: number;
  status: 'Live' | 'Paused' | 'Preview';
  createdAt: Date;
  updatedAt: Date;
}

export interface ActivityLog {
  id: string;
  projectId: string;
  action: string;
  message: string;
  timestamp: Date;
  userId?: string;
}

