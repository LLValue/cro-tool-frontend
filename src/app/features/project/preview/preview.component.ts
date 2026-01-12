import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
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
  template: `
    <app-page-header title="Preview">
      <button mat-button (click)="goBack()">
        <mat-icon>arrow_back</mat-icon>
        Back to Reporting
      </button>
    </app-page-header>

    <div class="preview-container">
      <div class="preview-content">
        <iframe 
          *ngIf="useIframe && pageUrl" 
          [src]="pageUrl" 
          class="preview-iframe"
          frameborder="0">
        </iframe>
        <div 
          *ngIf="!useIframe" 
          class="preview-wrapper" 
          [innerHTML]="safePreviewHtml">
        </div>
      </div>
      <div class="variants-panel">
        <mat-card>
          <mat-card-header>
            <mat-card-title>Applied Variants</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <mat-list>
              <mat-list-item *ngFor="let variant of appliedVariants">
                <div class="variant-item">
                  <strong>{{ getPointName(variant.optimizationPointId) }}</strong>
                  <p>{{ variant.text }}</p>
                </div>
              </mat-list-item>
              <mat-list-item *ngIf="appliedVariants.length === 0">
                <p>No variants applied</p>
              </mat-list-item>
            </mat-list>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .preview-container {
      display: grid;
      grid-template-columns: 1fr 300px;
      gap: 24px;
      margin-top: 48px;
    }
    .preview-content {
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      padding: 16px;
      background: white;
    }
    .preview-wrapper {
      border: 1px solid #ccc;
      padding: 16px;
      background: white;
      min-height: 400px;
    }
    :host-context(body.dark-mode) {
      .preview-wrapper {
        border-color: rgba(255, 255, 255, 0.12);
        background: #1e1e1e;
      }
      .preview-content {
        border-color: rgba(255, 255, 255, 0.12);
        background: #1e1e1e;
    }
    .preview-iframe {
      width: 100%;
      height: calc(100vh - 250px);
      border: 1px solid #ccc;
      border-radius: 4px;
    }
    .variants-panel {
      max-height: calc(100vh - 200px);
      overflow-y: auto;
    }
    .variant-item {
      padding: 8px 0;
    }
    .variant-item strong {
      display: block;
      margin-bottom: 4px;
    }
    .variant-item p {
      margin: 0;
      color: #666;
      font-size: 14px;
    }
    :host-context(body.dark-mode) {
      .variant-item p {
        color: #ffffff;
      }
      .variant-item strong {
        color: #ffffff;
      }
    }
  `]
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
    this.route.params.subscribe(params => {
      this.projectId = params['projectId'];
      // Load project first, then load points and variants
      this.loadProject();
    });

    this.route.queryParams.subscribe(params => {
      if (params['variant']) {
        this.applyVariant(params['variant']);
      }
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  loadProject(): void {
    this.projectsApi.getProject(this.projectId).subscribe({
      next: project => {
        this.project = project;
        this.pageUrl = project.pageUrl || '';
        this.loadPagePreview();
        // Load points and variants after project is loaded
        this.loadPoints();
        this.loadVariants();
      },
      error: () => {
        // Try to get from store
        const storeProject = this.store.getProject(this.projectId);
        if (storeProject) {
          this.project = storeProject;
          this.pageUrl = storeProject.pageUrl || '';
          this.loadPagePreview();
          // Load points and variants after project is loaded
          this.loadPoints();
          this.loadVariants();
        } else {
          // Wait for projects to load, then try again
          const sub = this.store.listProjects().pipe(take(1)).subscribe(projects => {
            const foundProject = projects.find(p => p.id === this.projectId);
            if (foundProject) {
              this.project = foundProject;
              this.pageUrl = foundProject.pageUrl || '';
              this.loadPagePreview();
              this.loadPoints();
              this.loadVariants();
            }
          });
          this.subscriptions.add(sub);
        }
      }
    });
  }

  loadPagePreview(): void {
    if (!this.pageUrl) {
      // Use saved preview HTML if no URL
      if (this.project?.previewHtml) {
        this.basePreviewHtml = this.project.previewHtml;
        this.updatePreview();
        return;
      }
      return;
    }

    // Check if we need to use iframe (different origin)
    this.useIframe = this.previewService.shouldUseIframe(this.pageUrl);

    if (this.useIframe) {
      // For external URLs, we'll use iframe in the template
      this.basePreviewHtml = '';
      this.updatePreview();
    } else {
      // Try to load HTML directly
      this.previewService.loadPageFromUrl(this.pageUrl).subscribe({
        next: html => {
          if (html) {
            this.basePreviewHtml = html;
            this.updatePreview();
          } else {
            // Fallback to iframe
            this.useIframe = true;
            this.updatePreview();
          }
        },
        error: () => {
          // Fallback to iframe
          this.useIframe = true;
          this.updatePreview();
        }
      });
    }
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

