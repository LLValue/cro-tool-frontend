import { Injectable } from '@angular/core';
import { Observable, of, throwError, timer } from 'rxjs';
import { delay, map, switchMap } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiClient } from '../api-client';
import { InMemoryDbService } from './in-memory-db.service';
import { MockSettingsService } from './mock-settings.service';
import {
  LoginRequest,
  LoginResponse,
  MeResponse
} from '../../api-contracts/auth.contracts';
import {
  ProjectDto,
  CreateProjectRequest,
  UpdateProjectRequest,
  ProjectsListResponse
} from '../../api-contracts/projects.contracts';
import {
  OptimizationPointDto,
  CreatePointRequest,
  UpdatePointRequest
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
  ReportingMetricsDto
} from '../../api-contracts/reporting.contracts';

@Injectable()
export class MockApiClient implements ApiClient {
  constructor(
    private db: InMemoryDbService,
    private settings: MockSettingsService
  ) {}

  private simulateLatency<T>(): (source: Observable<T>) => Observable<T> {
    const config = this.settings.getSettings();
    if (!config.enableLatency) {
      return (source) => source;
    }
    const delayMs = Math.random() * (config.maxLatencyMs - config.minLatencyMs) + config.minLatencyMs;
    return (source) => source.pipe(delay(delayMs));
  }

  private simulateFailure<T>(): (source: Observable<T>) => Observable<T> {
    const config = this.settings.getSettings();
    if (!config.enableErrors || Math.random() > config.errorRate) {
      return (source) => source;
    }
    return (source) => source.pipe(
      switchMap(() => {
        const errorCode = this.getRandomErrorCode();
        return throwError(() => new HttpErrorResponse({
          status: errorCode,
          statusText: this.getErrorStatusText(errorCode),
          error: { message: this.getErrorMessage(errorCode) }
        }));
      })
    );
  }

  private getRandomErrorCode(): number {
    const codes = [401, 404, 422, 500];
    return codes[Math.floor(Math.random() * codes.length)];
  }

  private getErrorStatusText(code: number): string {
    const statusTexts: Record<number, string> = {
      401: 'Unauthorized',
      404: 'Not Found',
      422: 'Unprocessable Entity',
      500: 'Internal Server Error'
    };
    return statusTexts[code] || 'Error';
  }

  private getErrorMessage(code: number): string {
    const messages: Record<number, string> = {
      401: 'Authentication required',
      404: 'Resource not found',
      422: 'Validation failed',
      500: 'Internal server error'
    };
    return messages[code] || 'An error occurred';
  }

  private seededRandom(seed: number, min: number, max: number): number {
    const x = Math.sin(seed) * 10000;
    return min + (x - Math.floor(x)) * (max - min);
  }

  // Auth
  authLogin(req: LoginRequest): Observable<LoginResponse> {
    // Validation
    if (!req.email || !req.password) {
      return throwError(() => new HttpErrorResponse({
        status: 422,
        statusText: 'Unprocessable Entity',
        error: { message: 'Email and password are required' }
      }));
    }

    const response: LoginResponse = {
      token: 'mock_token_' + Date.now(),
      user: {
        id: '1',
        email: req.email,
        name: req.email.split('@')[0]
      }
    };

    return of(response).pipe(
      this.simulateLatency(),
      this.simulateFailure()
    );
  }

  authMe(): Observable<MeResponse> {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      return throwError(() => new HttpErrorResponse({
        status: 401,
        statusText: 'Unauthorized',
        error: { message: 'Authentication required' }
      }));
    }

    const response: MeResponse = {
      id: '1',
      email: 'user@example.com',
      name: 'User'
    };

    return of(response).pipe(
      this.simulateLatency(),
      this.simulateFailure()
    );
  }

  // Projects
  projectsList(): Observable<ProjectsListResponse> {
    const projects = this.db.getProjects();
    const response: ProjectsListResponse = {
      projects,
      total: projects.length
    };

    return of(response).pipe(
      this.simulateLatency(),
      this.simulateFailure()
    );
  }

  projectsCreate(req: CreateProjectRequest): Observable<ProjectDto> {
    // Validation
    if (!req.name || req.name.trim().length === 0) {
      return throwError(() => new HttpErrorResponse({
        status: 422,
        statusText: 'Unprocessable Entity',
        error: { message: 'Project name is required' }
      }));
    }
    if (!req.pageUrl || req.pageUrl.trim().length === 0) {
      return throwError(() => new HttpErrorResponse({
        status: 422,
        statusText: 'Unprocessable Entity',
        error: { message: 'Page URL is required' }
      }));
    }

    const project: ProjectDto = {
      id: Date.now().toString(),
      name: req.name,
      pageUrl: req.pageUrl,
      notes: req.notes || '',
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      previewHtml: this.getDefaultPreviewHtml(),
      language: 'en',
      pageContext: '',
      croGuidelines: '',
      brandGuardrails: '',
      forbiddenWords: [],
      mandatoryClaims: [],
      toneAllowed: [],
      toneDisallowed: []
    };

    this.db.addProject(project);

    return of(project).pipe(
      this.simulateLatency(),
      this.simulateFailure()
    );
  }

  projectsGet(id: string): Observable<ProjectDto> {
    let project = this.db.getProject(id);
    
    // For development: if project not found, return default project
    if (!project) {
      // Try to get default project (ID '1')
      project = this.db.getProject('1');
      if (!project) {
        // If no default project exists, create one
        const defaultProject: ProjectDto = {
          id: id || '1',
          name: 'Landing Page A',
          pageUrl: 'https://pack.stage.es',
          notes: 'Main conversion page',
          status: 'active',
          createdAt: new Date('2024-01-01').toISOString(),
          updatedAt: new Date('2024-01-10').toISOString(),
          previewHtml: this.getDefaultPreviewHtml(),
          language: 'en',
          pageContext: 'E-commerce landing page',
          croGuidelines: 'Focus on clarity and urgency',
          brandGuardrails: 'Maintain professional tone',
          forbiddenWords: [],
          mandatoryClaims: [],
          toneAllowed: ['professional', 'friendly'],
          toneDisallowed: ['casual', 'slang']
        };
        this.db.addProject(defaultProject);
        project = defaultProject;
      }
    }

    return of(project).pipe(
      this.simulateLatency(),
      this.simulateFailure()
    );
  }

  projectsUpdate(id: string, req: UpdateProjectRequest): Observable<ProjectDto> {
    const project = this.db.getProject(id);
    if (!project) {
      return throwError(() => new HttpErrorResponse({
        status: 404,
        statusText: 'Not Found',
        error: { message: 'Project not found' }
      }));
    }

    // Validation
    if (req.name !== undefined && req.name.trim().length === 0) {
      return throwError(() => new HttpErrorResponse({
        status: 422,
        statusText: 'Unprocessable Entity',
        error: { message: 'Project name cannot be empty' }
      }));
    }

    this.db.updateProject(id, req);
    const updated = this.db.getProject(id)!;

    return of(updated).pipe(
      this.simulateLatency(),
      this.simulateFailure()
    );
  }

  projectsDelete(id: string): Observable<void> {
    const project = this.db.getProject(id);
    if (!project) {
      return throwError(() => new HttpErrorResponse({
        status: 404,
        statusText: 'Not Found',
        error: { message: 'Project not found' }
      }));
    }

    this.db.deleteProject(id);

    return of(undefined).pipe(
      this.simulateLatency(),
      this.simulateFailure()
    );
  }

  projectsDuplicate(id: string): Observable<ProjectDto> {
    const original = this.db.getProject(id);
    if (!original) {
      return throwError(() => new HttpErrorResponse({
        status: 404,
        statusText: 'Not Found',
        error: { message: 'Project not found' }
      }));
    }

    const duplicated: ProjectDto = {
      ...original,
      id: Date.now().toString(),
      name: original.name + ' (Copy)',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.db.addProject(duplicated);

    return of(duplicated).pipe(
      this.simulateLatency(),
      this.simulateFailure()
    );
  }

  previewLoad(projectId: string): Observable<{ previewHtml: string }> {
    const project = this.db.getProject(projectId);
    if (!project) {
      return throwError(() => new HttpErrorResponse({
        status: 404,
        statusText: 'Not Found',
        error: { message: 'Project not found' }
      }));
    }

    // If project has saved preview HTML, use it
    if (project.previewHtml) {
      return of({ previewHtml: project.previewHtml }).pipe(
        this.simulateLatency(),
        this.simulateFailure()
      );
    }

    // Otherwise, return default HTML (actual page loading happens in PreviewService)
    const previewHtml = this.getDefaultPreviewHtml();
    this.db.updateProject(projectId, { previewHtml });

    return of({ previewHtml }).pipe(
      this.simulateLatency(),
      this.simulateFailure()
    );
  }

  // Points
  pointsList(projectId: string): Observable<OptimizationPointDto[]> {
    let project = this.db.getProject(projectId);
    
    // For development: if project not found, use default project
    if (!project) {
      project = this.db.getProject('1');
      if (!project) {
        // Return empty array instead of error for development
        return of([]).pipe(
          this.simulateLatency(),
          this.simulateFailure()
        );
      }
      // Use default project ID if original not found
      projectId = '1';
    }

    const points = this.db.getPoints(projectId);

    return of(points).pipe(
      this.simulateLatency(),
      this.simulateFailure()
    );
  }

  pointsCreate(projectId: string, req: CreatePointRequest): Observable<OptimizationPointDto> {
    let project = this.db.getProject(projectId);
    
    // For development: if project not found, use default project
    if (!project) {
      project = this.db.getProject('1');
      if (!project) {
        // Return error only if we can't find default project either
        return throwError(() => new HttpErrorResponse({
          status: 404,
          statusText: 'Not Found',
          error: { message: 'Project not found' }
        }));
      }
      // Use default project ID if original not found
      projectId = '1';
    }

    // Validation
    if (!req.name || req.name.trim().length === 0) {
      return throwError(() => new HttpErrorResponse({
        status: 422,
        statusText: 'Unprocessable Entity',
        error: { message: 'Point name is required' }
      }));
    }

    const point: OptimizationPointDto = {
      id: Date.now().toString(),
      projectId,
      name: req.name,
      selector: req.selector || '',
      text: req.text || '',
      objective: req.objective || '',
      generationRules: req.generationRules || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.db.addPoint(point);

    return of(point).pipe(
      this.simulateLatency(),
      this.simulateFailure()
    );
  }

  pointsUpdate(projectId: string, pointId: string, req: UpdatePointRequest): Observable<OptimizationPointDto> {
    const point = this.db.getPoint(pointId);
    if (!point || point.projectId !== projectId) {
      return throwError(() => new HttpErrorResponse({
        status: 404,
        statusText: 'Not Found',
        error: { message: 'Point not found' }
      }));
    }

    // Validation
    if (req.name !== undefined && req.name.trim().length === 0) {
      return throwError(() => new HttpErrorResponse({
        status: 422,
        statusText: 'Unprocessable Entity',
        error: { message: 'Point name cannot be empty' }
      }));
    }

    this.db.updatePoint(pointId, req);
    const updated = this.db.getPoint(pointId)!;

    return of(updated).pipe(
      this.simulateLatency(),
      this.simulateFailure()
    );
  }

  pointsDelete(projectId: string, pointId: string): Observable<void> {
    const point = this.db.getPoint(pointId);
    if (!point || point.projectId !== projectId) {
      return throwError(() => new HttpErrorResponse({
        status: 404,
        statusText: 'Not Found',
        error: { message: 'Point not found' }
      }));
    }

    this.db.deletePoint(pointId);

    return of(undefined).pipe(
      this.simulateLatency(),
      this.simulateFailure()
    );
  }

  // Variants
  variantsList(projectId: string, pointId: string): Observable<VariantDto[]> {
    const point = this.db.getPoint(pointId);
    if (!point || point.projectId !== projectId) {
      return throwError(() => new HttpErrorResponse({
        status: 404,
        statusText: 'Not Found',
        error: { message: 'Point not found' }
      }));
    }

    const variants = this.db.getVariants(pointId);

    return of(variants).pipe(
      this.simulateLatency(),
      this.simulateFailure()
    );
  }

  variantsGenerate(projectId: string, pointId: string, req: GenerateVariantsRequest): Observable<VariantDto[]> {
    const point = this.db.getPoint(pointId);
    if (!point || point.projectId !== projectId) {
      return throwError(() => new HttpErrorResponse({
        status: 404,
        statusText: 'Not Found',
        error: { message: 'Point not found' }
      }));
    }

    const count = req.count || 10;
    const variants: VariantDto[] = [];
    const seed = parseInt(pointId) || 12345;
    const config = this.settings.getSettings();
    const fixedSeed = config.fixedSeed;

    for (let i = 0; i < count; i++) {
      const variantSeed = (fixedSeed ?? seed) + i;
      const uxScore = this.seededRandom(variantSeed, 0, 10);
      const complianceScore = this.seededRandom(variantSeed + 100, 0, 10);
      const status = (uxScore < 5 || complianceScore < 5) ? 'discarded' : 'active';

      variants.push({
        id: `${pointId}_${i}_${Date.now()}`,
        projectId,
        optimizationPointId: pointId,
        text: this.generateFallbackText(point.name, i, variantSeed),
        uxScore: Math.round(uxScore * 10) / 10,
        uxRationale: this.generateRationale('ux', uxScore, variantSeed),
        complianceScore: Math.round(complianceScore * 10) / 10,
        complianceRationale: this.generateRationale('compliance', complianceScore, variantSeed),
        status,
        createdAt: new Date().toISOString(),
        source: 'fallback'
      });
    }

    this.db.addVariants(variants);

    return of(variants).pipe(
      this.simulateLatency(),
      this.simulateFailure()
    );
  }

  variantsUpdate(projectId: string, variantId: string, req: UpdateVariantRequest): Observable<VariantDto> {
    const variant = this.db.getVariant(variantId);
    if (!variant || variant.projectId !== projectId) {
      return throwError(() => new HttpErrorResponse({
        status: 404,
        statusText: 'Not Found',
        error: { message: 'Variant not found' }
      }));
    }

    // Auto-discard rule
    if (req.uxScore !== undefined || req.complianceScore !== undefined) {
      const finalUxScore = req.uxScore ?? variant.uxScore;
      const finalComplianceScore = req.complianceScore ?? variant.complianceScore;
      if (finalUxScore < 5 || finalComplianceScore < 5) {
        req.status = 'discarded';
      }
    }

    this.db.updateVariant(variantId, req);
    const updated = this.db.getVariant(variantId)!;

    return of(updated).pipe(
      this.simulateLatency(),
      this.simulateFailure()
    );
  }

  variantsApprove(projectId: string, variantId: string): Observable<VariantDto> {
    return this.variantsUpdate(projectId, variantId, { status: 'active' });
  }

  variantsDiscard(projectId: string, variantId: string): Observable<VariantDto> {
    return this.variantsUpdate(projectId, variantId, { status: 'discarded' });
  }

  variantsDelete(projectId: string, variantId: string): Observable<void> {
    const variant = this.db.getVariant(variantId);
    if (!variant || variant.projectId !== projectId) {
      return throwError(() => new HttpErrorResponse({
        status: 404,
        statusText: 'Not Found',
        error: { message: 'Variant not found' }
      }));
    }

    this.db.deleteVariant(variantId);

    return of(undefined).pipe(
      this.simulateLatency(),
      this.simulateFailure()
    );
  }

  // Goals
  goalsGet(projectId: string): Observable<GoalDto[]> {
    const project = this.db.getProject(projectId);
    if (!project) {
      return throwError(() => new HttpErrorResponse({
        status: 404,
        statusText: 'Not Found',
        error: { message: 'Project not found' }
      }));
    }

    const goals = this.db.getGoals(projectId);

    return of(goals).pipe(
      this.simulateLatency(),
      this.simulateFailure()
    );
  }

  goalsSet(projectId: string, req: SetGoalsRequest): Observable<GoalDto[]> {
    const project = this.db.getProject(projectId);
    if (!project) {
      return throwError(() => new HttpErrorResponse({
        status: 404,
        statusText: 'Not Found',
        error: { message: 'Project not found' }
      }));
    }

    // Validation
    for (const goal of req.goals) {
      if (!goal.name || goal.name.trim().length === 0) {
        return throwError(() => new HttpErrorResponse({
          status: 422,
          statusText: 'Unprocessable Entity',
          error: { message: 'Goal name is required' }
        }));
      }
      if (!goal.value || goal.value.trim().length === 0) {
        return throwError(() => new HttpErrorResponse({
          status: 422,
          statusText: 'Unprocessable Entity',
          error: { message: 'Goal value is required' }
        }));
      }
      if (goal.type === 'dataLayerEvent' && goal.value.length > 50) {
        return throwError(() => new HttpErrorResponse({
          status: 422,
          statusText: 'Unprocessable Entity',
          error: { message: 'Event name must be 50 characters or less' }
        }));
      }
    }

    const goals: GoalDto[] = req.goals.map((g, index) => ({
      id: `${Date.now()}_${index}`,
      projectId,
      ...g,
      createdAt: new Date().toISOString()
    }));

    this.db.setGoals(projectId, goals);

    return of(goals).pipe(
      this.simulateLatency(),
      this.simulateFailure()
    );
  }

  // Reporting
  reportingGet(projectId: string): Observable<ReportingResponse> {
    let project = this.db.getProject(projectId);
    
    if (!project) {
      project = this.db.getProject('1');
      if (!project) {
        const defaultProject: ProjectDto = {
          id: projectId || '1',
          name: 'Landing Page A',
          pageUrl: 'https://pack.stage.es',
          notes: 'Main conversion page',
          status: 'active',
          createdAt: new Date('2024-01-01').toISOString(),
          updatedAt: new Date('2024-01-10').toISOString(),
          previewHtml: this.getDefaultPreviewHtml(),
          language: 'en',
          pageContext: 'E-commerce landing page',
          croGuidelines: 'Focus on clarity and urgency',
          brandGuardrails: 'Maintain professional tone',
          forbiddenWords: [],
          mandatoryClaims: [],
          toneAllowed: ['professional', 'friendly'],
          toneDisallowed: ['casual', 'slang']
        };
        this.db.addProject(defaultProject);
        project = defaultProject;
      }
    }

    const metricsMap = this.db.getMetrics();
    const pointIds = this.db.getPoints(projectId).map(p => p.id);
    
    const allVariants: VariantDto[] = [];
    pointIds.forEach(pointId => {
      const pointVariants = this.db.getVariants(pointId);
      allVariants.push(...pointVariants);
    });
    
    const variants = allVariants.filter(v => v.projectId === projectId && v.status === 'active');
    const activeVariantIds = new Set(variants.map(v => v.id));
    const metrics: ReportingMetricsDto[] = Array.from(metricsMap.entries())
      .filter(([key]) => {
        const [variantId] = key.split(':');
        return activeVariantIds.has(variantId);
      })
      .map(([, value]) => value as ReportingMetricsDto)
      .filter((m): m is ReportingMetricsDto => !!m);

    const response: ReportingResponse = {
      metrics,
      lastUpdated: new Date().toISOString()
    };

    return of(response).pipe(
      this.simulateLatency(),
      this.simulateFailure()
    );
  }

  simulateStart(projectId: string, req: SimulationStartRequest): Observable<ReportingResponse> {
    let project = this.db.getProject(projectId);
    
    if (!project) {
      project = this.db.getProject('1');
      if (!project) {
        const defaultProject: ProjectDto = {
          id: projectId || '1',
          name: 'Landing Page A',
          pageUrl: 'https://pack.stage.es',
          notes: 'Main conversion page',
          status: 'active',
          createdAt: new Date('2024-01-01').toISOString(),
          updatedAt: new Date('2024-01-10').toISOString(),
          previewHtml: this.getDefaultPreviewHtml(),
          language: 'en',
          pageContext: 'E-commerce landing page',
          croGuidelines: 'Focus on clarity and urgency',
          brandGuardrails: 'Maintain professional tone',
          forbiddenWords: [],
          mandatoryClaims: [],
          toneAllowed: ['professional', 'friendly'],
          toneDisallowed: ['casual', 'slang']
        };
        this.db.addProject(defaultProject);
        project = defaultProject;
      }
    }

    const durationMs = req.durationMs || 6000;
    const intervalMs = req.intervalMs || 200;
    const pointIds = this.db.getPoints(projectId).map(p => p.id);
    
    const allVariants: VariantDto[] = [];
    pointIds.forEach(pointId => {
      const pointVariants = this.db.getVariants(pointId);
      allVariants.push(...pointVariants);
    });
    const variantIds = allVariants.filter(v => v.projectId === projectId && v.status === 'active').map(v => v.id);
    const config = this.settings.getSettings();
    const fixedSeed = config.fixedSeed;

    const metricsMap = new Map<string, ReportingMetricsDto>();
    const goalTypes: Array<ReportingMetricsDto['goalType']> = (() => {
      const goals = this.db.getGoals(projectId);
      const unique = Array.from(new Set(goals.map(g => g.type))) as Array<ReportingMetricsDto['goalType']>;
      return unique.length > 0 ? unique : ['clickSelector', 'urlReached', 'dataLayerEvent'];
    })();

    if (variantIds.length > 0) {
      variantIds.forEach((variantId, index) => {
        const variant = this.db.getVariant(variantId);
        if (variant) {
          const seed = fixedSeed ?? (parseInt(variantId) || index * 1000);
          goalTypes.forEach(goalType => {
            metricsMap.set(`${variantId}:${goalType}`, {
              variantId,
              pointId: variant.optimizationPointId,
              goalType,
              users: 0,
              conversions: 0,
              conversionRate: 0,
              confidence: 0
            });
          });
        }
      });

      variantIds.forEach((variantId, index) => {
        const variant = this.db.getVariant(variantId);
        if (variant) {
          const seed = fixedSeed ?? (parseInt(variantId) || index * 1000);
          const baseUsers = Math.floor(this.seededRandom(seed, 100, 1000));
          const baseCR = this.seededRandom(seed + 1000, 0.02, 0.15);

          goalTypes.forEach((goalType, goalIndex) => {
            // Slightly vary metrics per goal type so the filter has visible impact
            const typeSeed = seed + 3000 + goalIndex * 777;
            const typeUsers = Math.max(50, Math.floor(baseUsers * this.seededRandom(typeSeed, 0.6, 1.1)));
            const typeCR = Math.min(0.3, Math.max(0.005, baseCR * this.seededRandom(typeSeed + 1000, 0.8, 1.25)));
            const confidence = Math.min(99, Math.floor(75 + this.seededRandom(typeSeed + 2000, 0, 24)));

            const current = metricsMap.get(`${variantId}:${goalType}`)!;
            current.users = typeUsers;
            current.conversions = Math.floor(current.users * typeCR);
            current.conversionRate = current.users > 0 ? current.conversions / current.users : 0;
            current.confidence = confidence;
          });
        }
      });

      this.db.setMetrics(metricsMap);
    }

    const metrics: ReportingMetricsDto[] = Array.from(metricsMap.values());
    const response: ReportingResponse = {
      metrics,
      lastUpdated: new Date().toISOString()
    };

    return of(response).pipe(
      this.simulateLatency(),
      this.simulateFailure()
    );
  }

  // Helpers
  private getDefaultPreviewHtml(): string {
    return `
      <!DOCTYPE html>
      <html>
      <head><title>Landing Page</title></head>
      <body style="font-family: Arial; padding: 20px;">
        <h1 class="hero-title">Welcome to Our Product</h1>
        <p class="hero-subtitle">Transform your business today</p>
        <button class="cta-button">Get Started Now</button>
        <p class="benefit-text">Join thousands of satisfied customers</p>
        <h2 class="section-title">Why Choose Us?</h2>
        <p class="feature-text">We deliver results</p>
      </body>
      </html>
    `;
  }

  private generateFallbackText(pointName: string, index: number, seed: number): string {
    const templates = [
      `Transform your ${pointName.toLowerCase()} experience`,
      `Discover the power of ${pointName.toLowerCase()}`,
      `Elevate your ${pointName.toLowerCase()} journey`,
      `Unlock ${pointName.toLowerCase()} potential`,
      `Revolutionize your ${pointName.toLowerCase()} approach`,
      `Maximize ${pointName.toLowerCase()} results`,
      `Optimize your ${pointName.toLowerCase()} strategy`,
      `Enhance ${pointName.toLowerCase()} performance`,
      `Streamline your ${pointName.toLowerCase()} process`,
      `Amplify ${pointName.toLowerCase()} impact`
    ];
    return templates[index % templates.length];
  }

  // Proxy
  proxyFetch(url: string): Observable<{ html: string }> {
    return of({ html: '<html><body>Mock HTML content from proxy</body></html>' }).pipe(
      this.simulateLatency(),
      this.simulateFailure()
    );
  }

  proxyPreview(projectId: string): Observable<{ previewHtml: string }> {
    const project = this.db.getProject(projectId);
    if (project && project.previewHtml) {
      return of({ previewHtml: project.previewHtml || '' }).pipe(
        this.simulateLatency(),
        this.simulateFailure()
      );
    }
    return of({ previewHtml: '<html><body>Mock preview HTML</body></html>' }).pipe(
      this.simulateLatency(),
      this.simulateFailure()
    );
  }

  private generateRationale(type: 'ux' | 'compliance', score: number, seed: number): string {
    if (type === 'ux') {
      if (score >= 8) return 'Excellent clarity and user appeal';
      if (score >= 6) return 'Good user experience potential';
      if (score >= 4) return 'Average user engagement expected';
      return 'Low user appeal, needs improvement';
    } else {
      if (score >= 8) return 'Fully compliant with guidelines';
      if (score >= 6) return 'Mostly compliant, minor concerns';
      if (score >= 4) return 'Some compliance issues detected';
      return 'Significant compliance violations';
    }
  }
}

