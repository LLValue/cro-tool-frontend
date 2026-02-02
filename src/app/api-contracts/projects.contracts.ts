export interface ProjectDto {
  id: string;
  name: string;
  pageUrl: string;
  industry?: string;
  notes: string;
  status: 'live' | 'paused' | 'preview';
  previewHtml: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

export interface BriefingGuardrailsDto {
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

export interface CreateProjectRequest {
  name: string;
  pageUrl: string;
  industry?: string;
  notes?: string;
}

export interface UpdateProjectRequest {
  name?: string;
  pageUrl?: string;
  industry?: string;
  notes?: string;
  status?: 'live' | 'paused' | 'preview';
  previewHtml?: string;
}

export interface CreateBriefingGuardrailsRequest {
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

export interface UpdateBriefingGuardrailsRequest {
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

export interface ProjectsListResponse {
  projects: ProjectDto[];
  total: number;
}

// Briefing Assistant
export interface BriefingAssistantGenerateRequest {
  sources: {
    urls: string[];
  };
  target_language: string;
  fill_sections: {
    business_context: boolean;
    journey_context: boolean;
    guardrails: boolean;
  };
}

export interface ProofPointEvidence {
  source_id: string;
  source_type: 'url' | 'document';
  source_label: string;
  excerpt: string;
}

export interface ProofPoint {
  id: string;
  text: string;
  category: string;
  confidence: 'high' | 'medium' | 'low';
  evidence: ProofPointEvidence[];
}

export interface GeneratedField {
  text: string;
  source: 'ai_draft' | 'manual';
  review_status: 'ok' | 'needs_review' | 'missing';
  confidence: 'high' | 'medium' | 'low';
  format_issue: boolean;
  evidence: ProofPointEvidence[];
}

export interface BriefingAssistantGenerateResponse {
  run_id: string;
  summary: {
    filled_fields: number;
    proof_points_found: number;
    needs_review_count: number;
  };
  fields: {
    'business.product_description'?: GeneratedField;
    'business.target_audiences'?: GeneratedField;
    'business.value_props'?: GeneratedField;
    'business.top_objections'?: GeneratedField;
    'journey.page_context_and_goal'?: GeneratedField;
    'journey.next_action'?: GeneratedField;
    'journey.funnel_stage'?: GeneratedField;
    'journey.tone_and_style'?: GeneratedField;
    'guardrails.brand_guidelines'?: GeneratedField;
    'guardrails.allowed_facts'?: GeneratedField;
    'guardrails.forbidden_words'?: GeneratedField;
    'guardrails.sensitive_claims'?: GeneratedField;
  };
  proof_points_pool: ProofPoint[];
  sources_used: Array<{
    id: string;
    type: 'url' | 'document';
    label: string;
    url?: string;
    char_count: number;
  }>;
}

export interface BriefingAssistantApproveProofPointsRequest {
  approved_ids: string[];
}

export interface BriefingAssistantApproveProofPointsResponse {
  allowedFacts: string[];
}
