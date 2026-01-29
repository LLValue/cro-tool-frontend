export interface VariantDto {
  id: string;
  projectId: string;
  optimizationPointId: string;
  text: string;
  uxScore: number;
  uxRationale: string;
  complianceScore: number;
  complianceRationale: string;
  status: 'pending' | 'approved' | 'discarded';
  createdAt: string; // ISO string
  source: 'ai' | 'fallback' | 'manual';
  angle?: string; // e.g., 'clarity', 'urgency', etc.
  reviewStatus?: string; // e.g., 'pass', 'review', etc.
  riskFlags?: string[]; // e.g., ['none'], ['urgency'], etc.
}

export interface GenerateVariantsRequest {
  count?: number; // default 10
}

export interface UpdateVariantRequest {
  text?: string;
  uxScore?: number;
  uxRationale?: string;
  complianceScore?: number;
  complianceRationale?: string;
  status?: 'pending' | 'approved' | 'discarded';
}

