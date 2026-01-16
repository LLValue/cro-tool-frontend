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
  ProjectsListResponse
} from '../api-contracts/projects.contracts';
import {
  OptimizationPointDto,
  CreatePointRequest,
  UpdatePointRequest
} from '../api-contracts/points.contracts';
import {
  VariantDto,
  GenerateVariantsRequest,
  UpdateVariantRequest
} from '../api-contracts/variants.contracts';
import {
  GoalDto,
  SetGoalsRequest
} from '../api-contracts/goals.contracts';
import {
  ReportingResponse,
  SimulationStartRequest
} from '../api-contracts/reporting.contracts';

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

  // Points
  pointsList(projectId: string): Observable<OptimizationPointDto[]>;
  pointsCreate(projectId: string, req: CreatePointRequest): Observable<OptimizationPointDto>;
  pointsUpdate(projectId: string, pointId: string, req: UpdatePointRequest): Observable<OptimizationPointDto>;
  pointsDelete(projectId: string, pointId: string): Observable<void>;

  // Variants
  variantsList(projectId: string, pointId: string): Observable<VariantDto[]>;
  variantsGenerate(projectId: string, pointId: string, req: GenerateVariantsRequest): Observable<VariantDto[]>;
  variantsUpdate(projectId: string, variantId: string, req: UpdateVariantRequest): Observable<VariantDto>;
  variantsApprove(projectId: string, variantId: string): Observable<VariantDto>;
  variantsDiscard(projectId: string, variantId: string): Observable<VariantDto>;
  variantsDelete(projectId: string, variantId: string): Observable<void>;

  // Goals
  goalsGet(projectId: string): Observable<GoalDto[]>;
  goalsSet(projectId: string, req: SetGoalsRequest): Observable<GoalDto[]>;

  // Reporting
  reportingGet(projectId: string): Observable<ReportingResponse>;
  simulateStart(projectId: string, req: SimulationStartRequest): Observable<ReportingResponse>;

  // Proxy
  proxyFetch(url: string): Observable<{ html: string }>;
  proxyPreview(projectId: string): Observable<{ previewHtml: string }>;
}

