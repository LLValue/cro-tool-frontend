import { Observable } from 'rxjs';
import {
  LoginRequest,
  LoginResponse,
  MeResponse
} from '../api-contracts/auth.contracts';
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
} from '../api-contracts/projects.contracts';
import {
  OptimizationPointDto,
  CreatePointRequest,
  UpdatePointRequest,
  PointBriefDraftRequest,
  PointBriefDraftResponse
} from '../api-contracts/points.contracts';
import {
  VariantDto,
  GenerateVariantsRequest,
  CreateVariantRequest,
  UpdateVariantRequest
} from '../api-contracts/variants.contracts';
import {
  GoalDto,
  SetGoalsRequest
} from '../api-contracts/goals.contracts';
import {
  ResultsResponse,
  SimulationStartRequest,
  SimulateMonthResponse,
  ResetResponse,
  SimulationsListResponse,
  SimulationDetailResponse
} from '../api-contracts/results.contracts';

export interface ApiClient {
  // Auth
  authLogin(req: LoginRequest): Observable<LoginResponse>;
  authMe(): Observable<MeResponse>;

  // Projects
  projectsList(): Observable<ProjectsListResponse>;
  projectsCreate(req: CreateProjectRequest): Observable<ProjectDto>;
  projectsGet(id: string): Observable<ProjectDto>;
  projectsUpdate(id: string, req: UpdateProjectRequest): Observable<ProjectDto>;
  projectsDelete(id: string): Observable<void>;
  projectsDuplicate(id: string): Observable<ProjectDto>;
  previewLoad(projectId: string): Observable<{ previewHtml: string }>;

  // Briefing Guardrails
  briefingGuardrailsGet(projectId: string): Observable<BriefingGuardrailsDto>;
  briefingGuardrailsCreate(projectId: string, req: CreateBriefingGuardrailsRequest): Observable<BriefingGuardrailsDto>;
  briefingGuardrailsUpdate(projectId: string, req: UpdateBriefingGuardrailsRequest): Observable<BriefingGuardrailsDto>;

  // Briefing Assistant
  briefingAssistantGenerate(projectId: string, req: BriefingAssistantGenerateRequest): Observable<BriefingAssistantGenerateResponse>;
  briefingAssistantApproveProofPoints(projectId: string, req: BriefingAssistantApproveProofPointsRequest): Observable<BriefingAssistantApproveProofPointsResponse>;

  // Points
  pointsList(projectId: string): Observable<OptimizationPointDto[]>;
  pointsCreate(projectId: string, req: CreatePointRequest): Observable<OptimizationPointDto>;
  pointsUpdate(projectId: string, pointId: string, req: UpdatePointRequest): Observable<OptimizationPointDto>;
  pointsDelete(projectId: string, pointId: string): Observable<void>;
  pointsBriefDraft(projectId: string, pointId: string, req: PointBriefDraftRequest): Observable<PointBriefDraftResponse>;

  // Variants
  variantsList(projectId: string, pointId: string): Observable<VariantDto[]>;
  variantsCreate(projectId: string, pointId: string, req: CreateVariantRequest): Observable<VariantDto>;
  variantsGenerate(projectId: string, pointId: string, req: GenerateVariantsRequest): Observable<VariantDto[]>;
  variantsUpdate(projectId: string, variantId: string, req: UpdateVariantRequest): Observable<VariantDto>;
  variantsApprove(projectId: string, variantId: string): Observable<VariantDto>;
  variantsDiscard(projectId: string, variantId: string): Observable<VariantDto>;
  variantsDelete(projectId: string, variantId: string): Observable<void>;

  // Goals
  goalsGet(projectId: string): Observable<GoalDto[]>;
  goalsSet(projectId: string, req: SetGoalsRequest): Observable<GoalDto[]>;

  // Results
  resultsGet(projectId: string): Observable<ResultsResponse>;
  simulateStart(projectId: string, req: SimulationStartRequest): Observable<ResultsResponse>;
  simulateMonth(projectId: string): Observable<SimulateMonthResponse>;
  resetResults(projectId: string): Observable<ResetResponse>;

  // Results simulations (list, get, delete)
  resultsSimulationsList(projectId: string): Observable<SimulationsListResponse>;
  resultsSimulationGet(projectId: string, simulationId: string): Observable<SimulationDetailResponse>;
  resultsSimulationDelete(projectId: string, simulationId: string): Observable<void>;

  // Proxy
  proxyFetch(url: string): Observable<{ html: string }>;
  proxyPreview(projectId: string, variantIds?: string[]): Observable<{ html: string }>;
}

