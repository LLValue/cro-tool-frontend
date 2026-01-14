import { Injectable } from '@angular/core';
import { ProjectDto } from '../../api-contracts/projects.contracts';
import { OptimizationPointDto } from '../../api-contracts/points.contracts';
import { VariantDto } from '../../api-contracts/variants.contracts';
import { GoalDto } from '../../api-contracts/goals.contracts';

function seededRandom(seed: number, min: number, max: number): number {
  const x = Math.sin(seed) * 10000;
  return min + (x - Math.floor(x)) * (max - min);
}

function generateFallbackText(pointName: string, index: number): string {
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

function generateRationale(type: 'ux' | 'compliance', score: number): string {
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

export interface InMemoryDbData {
  projects: ProjectDto[];
  points: OptimizationPointDto[];
  variants: VariantDto[];
  goals: GoalDto[];
  metrics: Map<string, any>; // variantId -> metrics
}

@Injectable({
  providedIn: 'root'
})
export class InMemoryDbService {
  private readonly STORAGE_KEY = 'mock_api_db';
  private data: InMemoryDbData;

  constructor() {
    this.data = this.loadFromStorage();
    if (this.data.projects.length === 0) {
      this.initializeDefaultData();
    } else {
      // Ensure existing projects have the correct URL
      this.migrateOldUrls(this.data);
      // Ensure default point and variants exist for project '1'
      this.ensureDefaultData();
    }
  }

  private ensureDefaultData(): void {
    const project = this.data.projects.find(p => p.id === '1');
    if (!project) return;

    let point = this.data.points.find(p => p.projectId === '1');
    if (!point) {
      point = {
        id: 'point_1',
        projectId: '1',
        name: 'Hero Title',
        selector: 'c-home__hero__text__title',
        text: 'Reserva Entradas El Rey León + Hotel',
        objective: 'Increase click-through rate',
        generationRules: 'Keep it professional and engaging',
        createdAt: new Date('2024-01-01').toISOString(),
        updatedAt: new Date('2024-01-01').toISOString()
      };
      this.data.points.push(point);
    }

    if (!point) return;

    const existingVariants = this.data.variants.filter(v => v.projectId === '1' && v.optimizationPointId === point!.id);
    if (existingVariants.length === 0) {
      const defaultVariants: VariantDto[] = [];
      const pointId = point.id;
      const projectId = '1';
      const seed = 12345;

      for (let i = 0; i < 10; i++) {
        const variantSeed = seed + i;
        const uxScore = seededRandom(variantSeed, 6, 10);
        const complianceScore = seededRandom(variantSeed + 100, 6, 10);

        defaultVariants.push({
          id: `${pointId}_${i}_${Date.now()}`,
          projectId,
          optimizationPointId: pointId,
          text: generateFallbackText(point.name, i),
          uxScore: Math.round(uxScore * 10) / 10,
          uxRationale: generateRationale('ux', uxScore),
          complianceScore: Math.round(complianceScore * 10) / 10,
          complianceRationale: generateRationale('compliance', complianceScore),
          status: 'active',
          createdAt: new Date('2024-01-01').toISOString(),
          source: 'fallback'
        });
      }

      this.data.variants.push(...defaultVariants);
      this.saveToStorage();
    }
  }

  private loadFromStorage(): InMemoryDbData {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Reconstruct Map from serialized data
        const metrics = new Map();
        if (parsed.metricsArray) {
          parsed.metricsArray.forEach(([key, value]: [string, any]) => {
            metrics.set(key, value);
          });
        }
        const data = {
          projects: parsed.projects || [],
          points: parsed.points || [],
          variants: parsed.variants || [],
          goals: parsed.goals || [],
          metrics
        };
        // Migrate old URLs to new URL
        this.migrateOldUrls(data);
        return data;
      } catch {
        // fall through to default
      }
    }
    return {
      projects: [],
      points: [],
      variants: [],
      goals: [],
      metrics: new Map()
    };
  }

  private migrateOldUrls(data: InMemoryDbData): void {
    const oldUrls = [
      'https://example.com',
      'https://example.com/landing',
      'http://example.com',
      'http://example.com/landing'
    ];
    const newUrl = 'https://pack.stage.es';
    let hasChanges = false;

    // Update projects with old URLs or old pack.stage.es URLs without the full parameters
    data.projects.forEach(project => {
      if (oldUrls.some(oldUrl => project.pageUrl?.includes(oldUrl) || project.pageUrl === oldUrl)) {
        project.pageUrl = newUrl;
        hasChanges = true;
      } else if (project.pageUrl?.includes('pack.stage.es') && project.pageUrl !== 'https://pack.stage.es') {
        // Update existing pack.stage.es URLs to the new simple URL
        project.pageUrl = newUrl;
        hasChanges = true;
      }
    });

    // Save if there were changes
    if (hasChanges) {
      const toStore = {
        projects: data.projects,
        points: data.points,
        variants: data.variants,
        goals: data.goals,
        metricsArray: Array.from(data.metrics.entries())
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(toStore));
    }
  }

  private saveToStorage(): void {
    const toStore = {
      projects: this.data.projects,
      points: this.data.points,
      variants: this.data.variants,
      goals: this.data.goals,
      metricsArray: Array.from(this.data.metrics.entries())
    };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(toStore));
  }

  private initializeDefaultData(): void {
    const defaultProject: ProjectDto = {
      id: '1',
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
    this.data.projects.push(defaultProject);

    const defaultPoint: OptimizationPointDto = {
      id: 'point_1',
      projectId: '1',
      name: 'Hero Title',
      selector: 'c-home__hero__text__title',
      text: 'Reserva Entradas El Rey León + Hotel',
      objective: 'Increase click-through rate',
      generationRules: 'Keep it professional and engaging',
      createdAt: new Date('2024-01-01').toISOString(),
      updatedAt: new Date('2024-01-01').toISOString()
    };
    this.data.points.push(defaultPoint);

    const defaultVariants: VariantDto[] = [];
    const pointId = defaultPoint.id;
    const projectId = defaultProject.id;
    const seed = 12345;

    for (let i = 0; i < 10; i++) {
      const variantSeed = seed + i;
      const uxScore = seededRandom(variantSeed, 6, 10);
      const complianceScore = seededRandom(variantSeed + 100, 6, 10);
      const status = 'active';

      defaultVariants.push({
        id: `${pointId}_${i}_${Date.now()}`,
        projectId,
        optimizationPointId: pointId,
        text: generateFallbackText(defaultPoint.name, i),
        uxScore: Math.round(uxScore * 10) / 10,
        uxRationale: generateRationale('ux', uxScore),
        complianceScore: Math.round(complianceScore * 10) / 10,
        complianceRationale: generateRationale('compliance', complianceScore),
        status,
        createdAt: new Date('2024-01-01').toISOString(),
        source: 'fallback'
      });
    }

    this.data.variants.push(...defaultVariants);
    this.saveToStorage();
  }

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

  // Projects
  getProjects(): ProjectDto[] {
    return [...this.data.projects];
  }

  getProject(id: string): ProjectDto | undefined {
    return this.data.projects.find(p => p.id === id);
  }

  addProject(project: ProjectDto): void {
    this.data.projects.push(project);
    this.saveToStorage();
  }

  updateProject(id: string, updates: Partial<ProjectDto>): void {
    const index = this.data.projects.findIndex(p => p.id === id);
    if (index >= 0) {
      this.data.projects[index] = { ...this.data.projects[index], ...updates, updatedAt: new Date().toISOString() };
      this.saveToStorage();
    }
  }

  deleteProject(id: string): void {
    this.data.projects = this.data.projects.filter(p => p.id !== id);
    // Cascade delete related data
    this.data.points = this.data.points.filter(p => p.projectId !== id);
    this.data.variants = this.data.variants.filter(v => v.projectId !== id);
    this.data.goals = this.data.goals.filter(g => g.projectId !== id);
    this.saveToStorage();
  }

  // Points
  getPoints(projectId: string): OptimizationPointDto[] {
    return this.data.points.filter(p => p.projectId === projectId);
  }

  getPoint(id: string): OptimizationPointDto | undefined {
    return this.data.points.find(p => p.id === id);
  }

  addPoint(point: OptimizationPointDto): void {
    this.data.points.push(point);
    this.saveToStorage();
  }

  updatePoint(id: string, updates: Partial<OptimizationPointDto>): void {
    const index = this.data.points.findIndex(p => p.id === id);
    if (index >= 0) {
      this.data.points[index] = { ...this.data.points[index], ...updates, updatedAt: new Date().toISOString() };
      this.saveToStorage();
    }
  }

  deletePoint(id: string): void {
    this.data.points = this.data.points.filter(p => p.id !== id);
    // Cascade delete variants
    this.data.variants = this.data.variants.filter(v => v.optimizationPointId !== id);
    this.saveToStorage();
  }

  // Variants
  getVariants(pointId: string): VariantDto[] {
    return this.data.variants.filter(v => v.optimizationPointId === pointId);
  }

  getVariant(id: string): VariantDto | undefined {
    return this.data.variants.find(v => v.id === id);
  }

  addVariants(variants: VariantDto[]): void {
    this.data.variants.push(...variants);
    this.saveToStorage();
  }

  updateVariant(id: string, updates: Partial<VariantDto>): void {
    const index = this.data.variants.findIndex(v => v.id === id);
    if (index >= 0) {
      this.data.variants[index] = { ...this.data.variants[index], ...updates };
      this.saveToStorage();
    }
  }

  deleteVariant(id: string): void {
    this.data.variants = this.data.variants.filter(v => v.id !== id);
    this.saveToStorage();
  }

  // Goals
  getGoals(projectId: string): GoalDto[] {
    return this.data.goals.filter(g => g.projectId === projectId);
  }

  setGoals(projectId: string, goals: GoalDto[]): void {
    // Remove existing goals for this project
    this.data.goals = this.data.goals.filter(g => g.projectId !== projectId);
    // Add new goals
    this.data.goals.push(...goals);
    this.saveToStorage();
  }

  // Metrics
  getMetrics(): Map<string, any> {
    return this.data.metrics;
  }

  setMetrics(metrics: Map<string, any>): void {
    this.data.metrics = metrics;
    this.saveToStorage();
  }

  clearData(): void {
    this.data = {
      projects: [],
      points: [],
      variants: [],
      goals: [],
      metrics: new Map()
    };
    this.saveToStorage();
    this.initializeDefaultData();
  }
}

