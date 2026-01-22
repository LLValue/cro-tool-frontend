export interface VariantDto {
  id: string;
  projectId: string;
  optimizationPointId: string;
  text: string;
  uxScore: number;
  uxRationale: string;
  complianceScore: number;
  complianceRationale: string;
  status: 'active' | 'discarded';
  createdAt: string; // ISO string
  source: 'fallback' | 'manual';
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
  status?: 'active' | 'pending' | 'discarded';
}

