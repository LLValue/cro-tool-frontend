export interface ProjectDto {
  id: string;
  name: string;
  pageUrl: string;
  industry?: string;
  elementType?: string;
  notes: string;
  status: 'live' | 'paused' | 'preview';
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
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

export interface CreateProjectRequest {
  name: string;
  pageUrl: string;
  notes?: string;
}

export interface UpdateProjectRequest {
  name?: string;
  pageUrl?: string;
  industry?: string;
  elementType?: string;
  notes?: string;
  status?: 'live' | 'paused' | 'preview';
  previewHtml?: string;
  // Language & Voice
  language?: string;
  tone?: string;
  styleComplexity?: 'simple' | 'technical';
  styleLength?: 'short' | 'med' | 'long';
  // Business & Page Context - using form field names (primary)
  productDescription?: string;
  targetAudiences?: string;
  valueProps?: string[];
  topObjections?: string[];
  // Journey Context - using form field names (primary)
  toneAndStyle?: string;
  pageContextAndGoal?: string;
  funnelStage?: string;
  // Guardrails - using form field names (primary)
  brandGuidelines?: string;
  allowedFacts?: string[];
  forbiddenWords?: string[];
  sensitiveClaims?: string[];
  // Legacy/Backend fields (for backward compatibility - only used when reading from backend)
  productSummary?: string;
  pageIntent?: string;
  typicalObjections?: string[];
  prohibitedClaims?: string[];
  brandGuardrails?: string;
  // Other backend fields (may be used by other parts of the system)
  mustNotClaim?: string[];
  riskLevel?: 'Conservative' | 'Standard' | 'Exploratory';
  mandatoryClaims?: string[];
  requiredDisclaimer?: string;
  toneAllowed?: string[];
  toneDisallowed?: string[];
  pageContext?: string;
  croGuidelines?: string;
}

export interface ProjectsListResponse {
  projects: ProjectDto[];
  total: number;
}

