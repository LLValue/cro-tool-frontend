import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiClient } from '../api-client';
import {
  LoginRequest,
  LoginResponse,
  MeResponse
} from '../../api-contracts/auth.contracts';
import {
  ProjectDto,
  CreateProjectRequest,
  UpdateProjectRequest,
  ProjectsListResponse,
  BriefingGuardrailsDto,
  CreateBriefingGuardrailsRequest,
  UpdateBriefingGuardrailsRequest,
  BriefingAssistantGenerateRequest,
  BriefingAssistantGenerateResponse,
  BriefingAssistantApproveProofPointsRequest,
  BriefingAssistantApproveProofPointsResponse
} from '../../api-contracts/projects.contracts';
import {
  OptimizationPointDto,
  CreatePointRequest,
  UpdatePointRequest,
  PointBriefDraftRequest,
  PointBriefDraftResponse
} from '../../api-contracts/points.contracts';
import {
  VariantDto,
  GenerateVariantsRequest,
  UpdateVariantRequest
} from '../../api-contracts/variants.contracts';
import {
  GoalDto,
  SetGoalsRequest
} from '../../api-contracts/goals.contracts';
import {
  ReportingResponse,
  SimulationStartRequest,
  SimulateMonthResponse,
  ResetResponse
} from '../../api-contracts/reporting.contracts';

/**
 * Real HTTP API client implementation.
 * HTTP implementation of the ApiClient interface.
 * 
 * Usage in main.ts:
 * {
 *   provide: API_CLIENT,
 *   useClass: HttpApiClient
 * }
 */
@Injectable()
export class HttpApiClient implements ApiClient {
  private http = inject(HttpClient);
  private baseUrl = '/api'; // Configure your API base URL

  // Auth
  authLogin(req: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.baseUrl}/auth/login`, req);
  }

  authMe(): Observable<MeResponse> {
    return this.http.get<MeResponse>(`${this.baseUrl}/auth/me`);
  }

  // Projects
  projectsList(): Observable<ProjectsListResponse> {
    return this.http.get<ProjectsListResponse>(`${this.baseUrl}/projects`);
  }

  projectsCreate(req: CreateProjectRequest): Observable<ProjectDto> {
    return this.http.post<ProjectDto>(`${this.baseUrl}/projects`, req);
  }

  projectsGet(id: string): Observable<ProjectDto> {
    return this.http.get<ProjectDto>(`${this.baseUrl}/projects/${id}`);
  }

  projectsUpdate(id: string, req: UpdateProjectRequest): Observable<ProjectDto> {
    return this.http.patch<ProjectDto>(`${this.baseUrl}/projects/${id}`, req);
  }

  projectsDelete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/projects/${id}`);
  }

  projectsDuplicate(id: string): Observable<ProjectDto> {
    return this.http.post<ProjectDto>(`${this.baseUrl}/projects/${id}/duplicate`, {});
  }

  previewLoad(projectId: string): Observable<{ previewHtml: string }> {
    return this.http.get<{ previewHtml: string }>(`${this.baseUrl}/projects/${projectId}/preview`);
  }

  // Briefing Guardrails
  briefingGuardrailsGet(projectId: string): Observable<BriefingGuardrailsDto> {
    return this.http.get<BriefingGuardrailsDto>(`${this.baseUrl}/projects/${projectId}/briefing-guardrails`);
  }

  briefingGuardrailsCreate(projectId: string, req: CreateBriefingGuardrailsRequest): Observable<BriefingGuardrailsDto> {
    return this.http.post<BriefingGuardrailsDto>(`${this.baseUrl}/projects/${projectId}/briefing-guardrails`, req);
  }

  briefingGuardrailsUpdate(projectId: string, req: UpdateBriefingGuardrailsRequest): Observable<BriefingGuardrailsDto> {
    return this.http.patch<BriefingGuardrailsDto>(`${this.baseUrl}/projects/${projectId}/briefing-guardrails`, req);
  }

  // Briefing Assistant
  briefingAssistantGenerate(projectId: string, req: BriefingAssistantGenerateRequest): Observable<BriefingAssistantGenerateResponse> {
    return this.http.post<BriefingAssistantGenerateResponse>(`${this.baseUrl}/projects/${projectId}/briefing-assistant/generate`, req);
  }

  briefingAssistantApproveProofPoints(projectId: string, req: BriefingAssistantApproveProofPointsRequest): Observable<BriefingAssistantApproveProofPointsResponse> {
    return this.http.post<BriefingAssistantApproveProofPointsResponse>(`${this.baseUrl}/projects/${projectId}/briefing-assistant/approve-proof-points`, req);
  }

  // Points
  pointsList(projectId: string): Observable<OptimizationPointDto[]> {
    return this.http.get<OptimizationPointDto[]>(`${this.baseUrl}/projects/${projectId}/points`);
  }

  pointsCreate(projectId: string, req: CreatePointRequest): Observable<OptimizationPointDto> {
    return this.http.post<OptimizationPointDto>(`${this.baseUrl}/projects/${projectId}/points`, req);
  }

  pointsUpdate(projectId: string, pointId: string, req: UpdatePointRequest): Observable<OptimizationPointDto> {
    return this.http.patch<OptimizationPointDto>(`${this.baseUrl}/projects/${projectId}/points/${pointId}`, req);
  }

  pointsDelete(projectId: string, pointId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/projects/${projectId}/points/${pointId}`);
  }

  pointsBriefDraft(projectId: string, pointId: string, req: PointBriefDraftRequest): Observable<PointBriefDraftResponse> {
    return this.http.post<PointBriefDraftResponse>(`${this.baseUrl}/projects/${projectId}/points/${pointId}/ai/brief-draft`, req);
  }

  // Variants
  variantsList(projectId: string, pointId: string): Observable<VariantDto[]> {
    return this.http.get<VariantDto[]>(`${this.baseUrl}/projects/${projectId}/points/${pointId}/variants`);
  }

  variantsGenerate(projectId: string, pointId: string, req: GenerateVariantsRequest): Observable<VariantDto[]> {
    return this.http.post<VariantDto[]>(`${this.baseUrl}/projects/${projectId}/points/${pointId}/variants/generate`, req);
  }

  variantsUpdate(projectId: string, variantId: string, req: UpdateVariantRequest): Observable<VariantDto> {
    return this.http.patch<VariantDto>(`${this.baseUrl}/projects/${projectId}/variants/${variantId}`, req);
  }

  variantsApprove(projectId: string, variantId: string): Observable<VariantDto> {
    return this.http.post<VariantDto>(`${this.baseUrl}/projects/${projectId}/variants/${variantId}/approve`, {});
  }

  variantsDiscard(projectId: string, variantId: string): Observable<VariantDto> {
    return this.http.post<VariantDto>(`${this.baseUrl}/projects/${projectId}/variants/${variantId}/discard`, {});
  }

  variantsDelete(projectId: string, variantId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/projects/${projectId}/variants/${variantId}`);
  }

  // Goals
  goalsGet(projectId: string): Observable<GoalDto[]> {
    return this.http.get<GoalDto[]>(`${this.baseUrl}/projects/${projectId}/goals`);
  }

  goalsSet(projectId: string, req: SetGoalsRequest): Observable<GoalDto[]> {
    return this.http.put<GoalDto[]>(`${this.baseUrl}/projects/${projectId}/goals`, req);
  }

  // Reporting
  reportingGet(projectId: string): Observable<ReportingResponse> {
    return this.http.get<ReportingResponse>(`${this.baseUrl}/projects/${projectId}/reporting`);
  }

  simulateStart(projectId: string, req: SimulationStartRequest): Observable<ReportingResponse> {
    return this.http.post<ReportingResponse>(`${this.baseUrl}/projects/${projectId}/reporting/simulate`, req);
  }

  simulateMonth(projectId: string): Observable<SimulateMonthResponse> {
    return this.http.post<SimulateMonthResponse>(`${this.baseUrl}/projects/${projectId}/results/simulate-month`, {});
  }

  resetResults(projectId: string): Observable<ResetResponse> {
    return this.http.post<ResetResponse>(`${this.baseUrl}/projects/${projectId}/results/reset`, {});
  }

  // Proxy
  proxyFetch(url: string): Observable<{ html: string }> {
    // The endpoint returns HTML directly (text/html), not JSON
    return this.http.get(`${this.baseUrl}/proxy/fetch`, {
      params: { url },
      responseType: 'text'
    }).pipe(
      map((html: string) => ({ html }))
    );
  }

  proxyPreview(projectId: string, variantIds?: string[]): Observable<{ html: string }> {
    let params: any = {};
    if (variantIds && variantIds.length > 0) {
      params.variantIds = variantIds.join(',');
    }
    // Try JSON first, fallback to text
    return this.http.get<{ html: string }>(`${this.baseUrl}/proxy/preview/${projectId}`, {
      params
    }).pipe(
      map((response: any) => {
        // Handle error responses from backend
        if (response.message && !response.html) {
          throw new Error(response.message);
        }
        // Handle both JSON { html: "..." } and plain text responses
        if (typeof response === 'string') {
          return { html: response };
        }
        return { html: response.html || response.previewHtml || '' };
      })
    );
  }
}

