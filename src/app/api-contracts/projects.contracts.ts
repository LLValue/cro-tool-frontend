export interface ProjectDto {
  id: string;
  name: string;
  pageUrl: string;
  notes: string;
  status: 'draft' | 'active' | 'archived';
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
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

export interface CreateProjectRequest {
  name: string;
  pageUrl: string;
  notes?: string;
}

export interface UpdateProjectRequest {
  name?: string;
  pageUrl?: string;
  notes?: string;
  status?: 'draft' | 'active' | 'archived';
  previewHtml?: string;
  language?: string;
  pageContext?: string;
  croGuidelines?: string;
  brandGuardrails?: string;
  forbiddenWords?: string[];
  mandatoryClaims?: string[];
  toneAllowed?: string[];
  toneDisallowed?: string[];
}

export interface ProjectsListResponse {
  projects: ProjectDto[];
  total: number;
}

