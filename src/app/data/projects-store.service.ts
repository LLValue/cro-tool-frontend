import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { map, catchError, tap, switchMap, shareReplay } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';
import { Project, OptimizationPoint, Variant, Goal, ReportingMetrics } from './models';
import { ProjectsApiService } from '../api/services/projects-api.service';
import { PointsApiService } from '../api/services/points-api.service';
import { VariantsApiService } from '../api/services/variants-api.service';
import { GoalsApiService } from '../api/services/goals-api.service';
import { ReportingApiService } from '../api/services/reporting-api.service';

@Injectable({
  providedIn: 'root'
})
export class ProjectsStoreService {
  private projectsSubject = new BehaviorSubject<Project[]>([]);
  private pointsSubject = new BehaviorSubject<OptimizationPoint[]>([]);
  private variantsSubject = new BehaviorSubject<Variant[]>([]);
  private goalsSubject = new BehaviorSubject<Goal[]>([]);
  private metricsSubject = new BehaviorSubject<Map<string, ReportingMetrics>>(new Map());

  public projects$ = this.projectsSubject.asObservable().pipe(shareReplay(1));
  public points$ = this.pointsSubject.asObservable().pipe(shareReplay(1));
  public variants$ = this.variantsSubject.asObservable().pipe(shareReplay(1));
  public goals$ = this.goalsSubject.asObservable().pipe(shareReplay(1));
  public metrics$ = this.metricsSubject.asObservable().pipe(shareReplay(1));

  constructor(
    private projectsApi: ProjectsApiService,
    private pointsApi: PointsApiService,
    private variantsApi: VariantsApiService,
    private goalsApi: GoalsApiService,
    private reportingApi: ReportingApiService
  ) {
    this.loadProjects();
  }

  private loadProjects(): void {
    this.projectsApi.listProjects().subscribe({
      next: projects => {
        // Always ensure we have at least the default project for development
        if (projects.length === 0) {
          // If no projects, create a default one
          const defaultProject: Project = {
            id: '1',
            name: 'Landing Page A',
            pageUrl: 'https://pack.stage.es',
            notes: 'Main conversion page',
            status: 'active',
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-10'),
            previewHtml: '',
            language: 'en',
            pageContext: 'E-commerce landing page',
            croGuidelines: 'Focus on clarity and urgency',
            brandGuardrails: 'Maintain professional tone',
            forbiddenWords: [],
            mandatoryClaims: [],
            toneAllowed: ['professional', 'friendly'],
            toneDisallowed: ['casual', 'slang']
          };
          this.projectsSubject.next([defaultProject]);
        } else {
          this.projectsSubject.next(projects);
        }
      },
      error: () => {
        // On error, provide default project for development
        const defaultProject: Project = {
          id: '1',
          name: 'Landing Page A',
          pageUrl: 'https://pack.stage.es',
          notes: 'Main conversion page',
          status: 'active',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-10'),
          previewHtml: '',
          language: 'en',
          pageContext: 'E-commerce landing page',
          croGuidelines: 'Focus on clarity and urgency',
          brandGuardrails: 'Maintain professional tone',
          forbiddenWords: [],
          mandatoryClaims: [],
          toneAllowed: ['professional', 'friendly'],
          toneDisallowed: ['casual', 'slang']
        };
        this.projectsSubject.next([defaultProject]);
      }
    });
  }

  // Projects CRUD
  listProjects(): Observable<Project[]> {
    return this.projects$;
  }

  createProject(project: Partial<Project>): Project {
    const req = {
      name: project.name || 'New Project',
      pageUrl: project.pageUrl || '',
      notes: project.notes || ''
    };

    let createdProject: Project | null = null;
    this.projectsApi.createProject(req).subscribe({
      next: p => {
        createdProject = p;
        this.loadProjects();
      },
      error: err => {
        throw err;
      }
    });

    // For synchronous compatibility, return a placeholder
    // In real usage, components should subscribe to the observable
    return createdProject || {
      id: '',
      name: req.name,
      pageUrl: req.pageUrl,
      notes: req.notes,
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
      previewHtml: '',
      language: 'en',
      pageContext: '',
      croGuidelines: '',
      brandGuardrails: '',
      forbiddenWords: [],
      mandatoryClaims: [],
      toneAllowed: [],
      toneDisallowed: []
    };
  }

  updateProject(id: string, updates: Partial<Project>): void {
    const req: any = {};
    if (updates.name !== undefined) req.name = updates.name;
    if (updates.pageUrl !== undefined) req.pageUrl = updates.pageUrl;
    if (updates.notes !== undefined) req.notes = updates.notes;
    if (updates.status !== undefined) req.status = updates.status;
    if (updates.previewHtml !== undefined) req.previewHtml = updates.previewHtml;
    if (updates.language !== undefined) req.language = updates.language;
    if (updates.pageContext !== undefined) req.pageContext = updates.pageContext;
    if (updates.croGuidelines !== undefined) req.croGuidelines = updates.croGuidelines;
    if (updates.brandGuardrails !== undefined) req.brandGuardrails = updates.brandGuardrails;
    if (updates.forbiddenWords !== undefined) req.forbiddenWords = updates.forbiddenWords;
    if (updates.mandatoryClaims !== undefined) req.mandatoryClaims = updates.mandatoryClaims;
    if (updates.toneAllowed !== undefined) req.toneAllowed = updates.toneAllowed;
    if (updates.toneDisallowed !== undefined) req.toneDisallowed = updates.toneDisallowed;

    this.projectsApi.updateProject(id, req).subscribe({
      next: () => this.loadProjects(),
      error: () => {} // Error handling done in components
    });
  }

  deleteProject(id: string): void {
    this.projectsApi.deleteProject(id).subscribe({
      next: () => {
        this.loadProjects();
        // Clear related data
        this.pointsSubject.next(this.pointsSubject.value.filter(p => p.projectId !== id));
        this.variantsSubject.next(this.variantsSubject.value.filter(v => v.projectId !== id));
        this.goalsSubject.next(this.goalsSubject.value.filter(g => g.projectId !== id));
      },
      error: () => {} // Error handling done in components
    });
  }

  duplicateProject(id: string): Project {
    let duplicated: Project | null = null;
    this.projectsApi.duplicateProject(id).subscribe({
      next: p => {
        duplicated = p;
        this.loadProjects();
      },
      error: err => {
        throw err;
      }
    });

    // For synchronous compatibility
    return duplicated || this.getProject(id) || this.projectsSubject.value[0];
  }

  getProject(id: string): Project | undefined {
    return this.projectsSubject.value.find(p => p.id === id);
  }

  // Points CRUD
              listPoints(projectId: string): Observable<OptimizationPoint[]> {
    if (!projectId) {
      return this.points$;
    }
    this.pointsApi.listPoints(projectId).subscribe({
      next: points => {
        // Merge new points with existing ones, replacing points for this project
        const currentPoints = this.pointsSubject.value.filter(p => p.projectId !== projectId);
        const updatedPoints = [...currentPoints, ...points];
        this.pointsSubject.next(updatedPoints);
      },
      error: () => {
        // Error handling done in components
      }
    });
    return this.points$;
  }

  addPoint(projectId: string, point: Partial<OptimizationPoint>): Observable<OptimizationPoint> {
    const req = {
      name: point.name || 'New Point',
      selector: point.selector || '',
      objective: point.objective || '',
      generationRules: point.generationRules || ''
    };

    return this.pointsApi.createPoint(projectId, req).pipe(
      tap(createdPoint => {
        // After creating, reload the list to update all subscribers
        // Use the projectId from the created point (it might have been corrected by the API)
        const actualProjectId = createdPoint.projectId || projectId;
        if (actualProjectId) {
          this.listPoints(actualProjectId);
        }
      })
    );
  }

  updatePoint(id: string, updates: Partial<OptimizationPoint>): void {
    const point = this.pointsSubject.value.find(p => p.id === id);
    if (!point) return;

    const req: any = {};
    if (updates.name !== undefined) req.name = updates.name;
    if (updates.selector !== undefined) req.selector = updates.selector;
    if (updates.objective !== undefined) req.objective = updates.objective;
    if (updates.generationRules !== undefined) req.generationRules = updates.generationRules;

    this.pointsApi.updatePoint(point.projectId, id, req).subscribe({
      next: () => this.listPoints(point.projectId),
      error: () => {} // Error handling done in components
    });
  }

  deletePoint(id: string): void {
    const point = this.pointsSubject.value.find(p => p.id === id);
    if (!point) return;

    this.pointsApi.deletePoint(point.projectId, id).subscribe({
      next: () => {
        this.listPoints(point.projectId);
        this.variantsSubject.next(this.variantsSubject.value.filter(v => v.optimizationPointId !== id));
      },
      error: () => {} // Error handling done in components
    });
  }

  getPoint(id: string): OptimizationPoint | undefined {
    return this.pointsSubject.value.find(p => p.id === id);
  }

  // Variants CRUD
  listVariants(pointId: string): Observable<Variant[]> {
    const point = this.getPoint(pointId);
    if (!point) return of([]);

    this.variantsApi.listVariants(point.projectId, pointId).subscribe({
      next: variants => {
        const allVariants = this.variantsSubject.value.filter(v => v.optimizationPointId !== pointId);
        allVariants.push(...variants);
        this.variantsSubject.next(allVariants);
      },
      error: () => {} // Error handling done in components
    });
    return this.variants$;
  }

  generateVariants(pointId: string, count: number = 10): Variant[] {
    const point = this.getPoint(pointId);
    if (!point) return [];

    let generated: Variant[] = [];
    this.variantsApi.generateVariants(point.projectId, pointId, { count }).subscribe({
      next: variants => {
        generated = variants;
        this.listVariants(pointId);
      },
      error: err => {
        throw err;
      }
    });

    return generated;
  }

  approveVariant(id: string): void {
    const variant = this.variantsSubject.value.find(v => v.id === id);
    if (!variant) return;

    this.variantsApi.approveVariant(variant.projectId, id).subscribe({
      next: () => this.listVariants(variant.optimizationPointId),
      error: () => {} // Error handling done in components
    });
  }

  deleteVariant(id: string): void {
    const variant = this.variantsSubject.value.find(v => v.id === id);
    if (!variant) return;

    this.variantsApi.deleteVariant(variant.projectId, id).subscribe({
      next: () => this.listVariants(variant.optimizationPointId),
      error: () => {} // Error handling done in components
    });
  }

  discardLowScoreVariants(pointId: string): void {
    const variants = this.variantsSubject.value.filter(v => v.optimizationPointId === pointId);
    variants.forEach(variant => {
      if ((variant.uxScore < 5 || variant.complianceScore < 5) && variant.status === 'active') {
        this.variantsApi.discardVariant(variant.projectId, variant.id).subscribe({
          next: () => this.listVariants(pointId),
          error: () => {} // Error handling done in components
        });
      }
    });
  }

  updateVariant(id: string, updates: Partial<Variant>): void {
    const variant = this.variantsSubject.value.find(v => v.id === id);
    if (!variant) return;

    const req: any = {};
    if (updates.text !== undefined) req.text = updates.text;
    if (updates.uxScore !== undefined) req.uxScore = updates.uxScore;
    if (updates.uxRationale !== undefined) req.uxRationale = updates.uxRationale;
    if (updates.complianceScore !== undefined) req.complianceScore = updates.complianceScore;
    if (updates.complianceRationale !== undefined) req.complianceRationale = updates.complianceRationale;
    if (updates.status !== undefined) req.status = updates.status;

    this.variantsApi.updateVariant(variant.projectId, id, req).subscribe({
      next: () => this.listVariants(variant.optimizationPointId),
      error: () => {} // Error handling done in components
    });
  }

  // Goals
  setGoals(projectId: string, goals: Goal[]): void {
    const goalsToSet = goals.map(g => ({
      name: g.name,
      type: g.type,
      isPrimary: g.isPrimary,
      value: g.value
    }));

    this.goalsApi.setGoals(projectId, goalsToSet).subscribe({
      next: savedGoals => this.goalsSubject.next(savedGoals),
      error: () => {} // Error handling done in components
    });
  }

  getGoals(projectId: string): Observable<Goal[]> {
    this.goalsApi.getGoals(projectId).subscribe({
      next: goals => this.goalsSubject.next(goals),
      error: () => {} // Error handling done in components
    });
    return this.goals$;
  }

  // Reporting - Deterministic simulation
  simulateTraffic(projectId: string, durationMs: number = 6000, intervalMs: number = 200): Observable<void> {
    return new Observable(observer => {
      this.reportingApi.startSimulation(projectId, { durationMs, intervalMs }).subscribe({
        next: metrics => {
          const metricsMap = new Map<string, ReportingMetrics>();
          metrics.forEach(m => metricsMap.set(m.variantId, m));
          this.metricsSubject.next(metricsMap);
          observer.next();
          observer.complete();
        },
        error: err => {
          observer.error(err);
        }
      });
    });
  }

  getMetrics(projectId: string): Observable<ReportingMetrics[]> {
    return this.reportingApi.getReporting(projectId).pipe(
      map(metrics => {
        const metricsMap = new Map<string, ReportingMetrics>();
        metrics.forEach(m => metricsMap.set(m.variantId, m));
        this.metricsSubject.next(metricsMap);
        return metrics;
      })
    );
  }
}
