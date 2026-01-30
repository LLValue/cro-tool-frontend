export interface Project {
  id: string;
  name: string;
  pageUrl: string;
  industry?: string;
  notes: string;
  status: 'live' | 'paused' | 'preview';
  previewHtml: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BriefingGuardrails {
  id: string;
  projectId: string;
  productDescription?: string;
  targetAudiences?: string;
  valueProps?: string[];
  topObjections?: string[];
  language?: string;
  toneAndStyle?: string;
  pageContextAndGoal?: string;
  nextAction?: string;
  funnelStage?: 'discovery' | 'consideration' | 'conversion';
  brandGuidelines?: string;
  allowedFacts?: string[];
  forbiddenWords?: string[];
  sensitiveClaims?: string[];
}

export interface OptimizationPoint {
  id: string;
  projectId: string;
  name: string;
  selector: string;
  text: string;
  objective: string;
  context?: string;
  generationRules: string;
  elementType?: 'Title' | 'CTA' | 'Subheadline' | 'Microcopy' | 'Other';
  deviceScope?: 'All' | 'Mobile' | 'Desktop';
  status?: 'Included' | 'Excluded';
  minChars?: number;
  maxChars?: number;
  maxWords?: number;
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
  status: 'pending' | 'approved' | 'discarded';
  createdAt: Date;
  source: 'ai' | 'fallback' | 'manual';
  angle?: string; // e.g., 'clarity', 'urgency', etc.
  reviewStatus?: string; // e.g., 'pass', 'review', etc.
  riskFlags?: string[]; // e.g., ['none'], ['urgency'], etc.
}

export interface Goal {
  id: string;
  projectId: string;
  name?: string; // Optional - will come from backend in the future
  type: 'clickSelector' | 'urlReached' | 'dataLayerEvent';
  isPrimary: boolean;
  value: string;
  createdAt?: Date;
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
