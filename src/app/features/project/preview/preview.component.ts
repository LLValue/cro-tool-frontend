import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml, SafeResourceUrl } from '@angular/platform-browser';
import { ProjectsStoreService } from '../../../data/projects-store.service';
import { ProjectsApiService } from '../../../api/services/projects-api.service';
import { PreviewService } from '../../../shared/preview.service';
import { Variant, OptimizationPoint } from '../../../data/models';
import { PageHeaderComponent } from '../../../shared/page-header/page-header.component';
import { Subscription } from 'rxjs';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-preview',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatListModule,
    CommonModule,
    PageHeaderComponent
  ],
  templateUrl: './preview.component.html',
  styleUrls: ['./preview.component.scss']
})
export class PreviewComponent implements OnInit, OnDestroy {
  projectId: string = '';
  project: any = null;
  basePreviewHtml: string = '';
  previewHtml: string = '';
  safePreviewHtml: SafeHtml = '';
  appliedVariants: Variant[] = [];
  points: OptimizationPoint[] = [];
  useIframe: boolean = false;
  pageUrl: string = '';
  safeIframeUrl: SafeResourceUrl = '';
  private lastScrollY = 0;
  private subscriptions = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private store: ProjectsStoreService,
    private projectsApi: ProjectsApiService,
    private previewService: PreviewService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    // Get projectId from multiple sources (for nested routes)
    const getProjectId = (): string | null => {
      // Try current route params first
      const currentParams = this.route.snapshot.params;
      if (currentParams['projectId']) {
        return currentParams['projectId'];
      }
      // Try parent route params (for nested routes)
      const parentParams = this.route.snapshot.parent?.params;
      if (parentParams?.['projectId']) {
        return parentParams['projectId'];
      }
      return null;
    };

    const initialProjectId = getProjectId();
    if (initialProjectId) {
      this.projectId = initialProjectId;
      this.loadProject();
    }

    // Subscribe to params changes (both current and parent)
    const paramsSub = this.route.params.subscribe(params => {
      const newProjectId = params['projectId'];
      if (newProjectId && newProjectId !== this.projectId) {
        this.projectId = newProjectId;
        this.loadProject();
      }
    });
    this.subscriptions.add(paramsSub);

    // Also subscribe to parent params (for nested routes)
    if (this.route.parent) {
      const parentParamsSub = this.route.parent.params.subscribe(params => {
        const newProjectId = params['projectId'];
        if (newProjectId && newProjectId !== this.projectId) {
          this.projectId = newProjectId;
          this.loadProject();
        }
      });
      this.subscriptions.add(parentParamsSub);
    }

    this.route.queryParams.subscribe(params => {
      if (params['variant']) {
        this.applyVariant(params['variant']);
      }
    });
  }

  private getProjectId(): string {
    // Try current route params first
    const currentParams = this.route.snapshot.params;
    if (currentParams['projectId']) {
      return currentParams['projectId'];
    }
    // Try parent route params (for nested routes)
    const parentParams = this.route.snapshot.parent?.params;
    if (parentParams?.['projectId']) {
      return parentParams['projectId'];
    }
    // Fallback to instance variable
    return this.projectId || '';
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  loadProject(): void {
    // Ensure projectId is set from route
    const projectId = this.getProjectId();
    if (!projectId) {
      return;
    }
    this.projectId = projectId; // Update instance variable

    // First try to get from store (synchronous, faster)
    const storeProject = this.store.getProject(this.projectId);
    if (storeProject) {
      this.project = storeProject;
      this.pageUrl = storeProject.pageUrl || 'https://pack.stage.es';
      this.loadPagePreview();
      this.loadPoints();
      this.loadVariants();
      return;
    }

    // If not in store, wait for projects to load from API
    const sub = this.store.listProjects().pipe(take(1)).subscribe({
      next: projects => {
        const foundProject = projects.find(p => p.id === this.projectId);
        if (foundProject) {
          this.project = foundProject;
          this.pageUrl = foundProject.pageUrl || 'https://pack.stage.es';
          this.loadPagePreview();
          this.loadPoints();
          this.loadVariants();
        } else {
          // Try API as fallback
          if (this.projectId) {
            this.projectsApi.getProject(this.projectId).pipe(take(1)).subscribe({
              next: project => {
                this.project = project;
                this.pageUrl = project.pageUrl || 'https://pack.stage.es';
                this.loadPagePreview();
                this.loadPoints();
                this.loadVariants();
              },
              error: () => {
                // Use default project if not found (for development)
                this.useDefaultProject();
              }
            });
          } else {
            this.useDefaultProject();
          }
        }
      },
      error: () => {
        // Try API directly
        if (this.projectId) {
          this.projectsApi.getProject(this.projectId).pipe(take(1)).subscribe({
            next: project => {
              this.project = project;
              this.pageUrl = project.pageUrl || 'https://pack.stage.es';
              this.loadPagePreview();
              this.loadPoints();
              this.loadVariants();
            },
            error: () => {
              // Use default project if not found (for development)
              this.useDefaultProject();
            }
          });
        } else {
          this.useDefaultProject();
        }
      }
    });
    this.subscriptions.add(sub);
  }

  private useDefaultProject(): void {
    // For development: use default project data
    this.project = {
      id: this.projectId || '1',
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
    this.pageUrl = this.project.pageUrl;
    this.loadPagePreview();
    this.loadPoints();
    this.loadVariants();
  }

  loadPagePreview(): void {
    // Use default URL if not configured (for development)
    if (!this.pageUrl) {
      this.pageUrl = 'https://pack.stage.es';
    }

    // Use saved preview HTML if no URL (fallback only)
    if (!this.pageUrl && this.project?.previewHtml) {
      this.basePreviewHtml = this.project.previewHtml;
      this.useIframe = false;
      this.updatePreview();
      return;
    }

    // ALWAYS try to load HTML directly first (even for cross-origin)
    // This allows variant application to work
    this.previewService.loadPageFromUrl(this.pageUrl).subscribe({
      next: html => {
        if (html && html.trim().length > 0) {
          // Successfully loaded HTML directly
          this.useIframe = false;
          this.basePreviewHtml = html;
          this.updatePreview();
        } else {
          // Failed to load HTML, fallback to iframe
          this.useIframe = true;
          this.lastScrollY = window.scrollY || 0;
          this.safeIframeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.pageUrl);
          this.updatePreview();
        }
      },
      error: () => {
        // Failed to load HTML, fallback to iframe
        this.useIframe = true;
        this.lastScrollY = window.scrollY || 0;
        this.safeIframeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.pageUrl);
        this.updatePreview();
      }
    });
  }

  onPreviewIframeLoad(): void {
    requestAnimationFrame(() => {
      window.scrollTo({ top: this.lastScrollY, left: 0, behavior: 'auto' });
      (document.activeElement as HTMLElement | null)?.blur?.();
      (document.body as HTMLElement).focus?.();
    });
  }

  loadPoints(): void {
    if (!this.projectId) {
      return;
    }
    
    const sub = this.store.listPoints(this.projectId).subscribe({
      next: points => {
        this.points = points;
        this.updatePreview();
      },
      error: err => {
        // Silently handle error - points might not exist yet
        console.warn('No points found for project', this.projectId);
        this.points = [];
      }
    });
    this.subscriptions.add(sub);
  }

  loadVariants(): void {
    // Listen to variants changes to update preview in real-time
    const sub = this.store.variants$.subscribe(variants => {
      // Get active variants for this project's points
      const activeVariants = variants.filter(v => 
        v.status === 'active' && 
        this.points.some(p => p.id === v.optimizationPointId)
      );
      this.appliedVariants = activeVariants;
      this.updatePreview();
    });
    this.subscriptions.add(sub);
  }

  applyVariant(variantId: string): void {
    this.store.variants$.subscribe(variants => {
      const variant = variants.find(v => v.id === variantId && v.projectId === this.projectId);
      if (variant) {
        this.appliedVariants = [variant];
        this.updatePreview();
      }
    }).unsubscribe();
  }

  updatePreview(): void {
    if (!this.basePreviewHtml && !this.useIframe) {
      return;
    }

    if (this.useIframe) {
      // Iframe will be handled in template
      // Note: We can't modify iframe content due to CORS, but we can show the original page
      return;
    }

    // Apply variants to HTML
    let html = this.basePreviewHtml;
    if (this.appliedVariants.length > 0 && this.points.length > 0) {
      html = this.previewService.applyVariantsToHtml(html, this.appliedVariants, this.points);
    }

    this.previewHtml = html;
    this.safePreviewHtml = this.previewService.sanitizeHtml(html);
  }

  getPointName(pointId: string): string {
    const point = this.points.find(p => p.id === pointId);
    return point?.name || 'Unknown Point';
  }

  goBack(): void {
    this.router.navigate(['/projects', this.projectId, 'reporting']);
  }
}

