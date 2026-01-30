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
