import { Component, OnInit, OnDestroy, ViewChild, ElementRef, Renderer2 } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CommonModule } from '@angular/common';
import { ProjectsStoreService } from '../../../data/projects-store.service';
import { ProjectsApiService } from '../../../api/services/projects-api.service';
import { OptimizationPoint, Variant } from '../../../data/models';
import { ToastHelperService } from '../../../shared/toast-helper.service';
import { PageHeaderComponent } from '../../../shared/page-header/page-header.component';
import { PreviewService } from '../../../shared/preview.service';
import { Subscription, combineLatest } from 'rxjs';
import { take } from 'rxjs/operators';
import { DomSanitizer, SafeHtml, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-points',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatCardModule,
    MatChipsModule,
    MatDialogModule,
    MatTooltipModule,
    CommonModule,
    PageHeaderComponent
  ],
  template: `
    <app-page-header title="Optimization Points">
      <button mat-button (click)="toggleViewMode()">
        <mat-icon>{{ viewMode === 'desktop' ? 'phone_android' : 'desktop_windows' }}</mat-icon>
        {{ viewMode === 'desktop' ? 'Mobile' : 'Desktop' }}
      </button>
    </app-page-header>

    <div class="points-container">
      <div class="preview-section" [class.mobile]="viewMode === 'mobile'">
        <div class="preview-header">
          <h3>Page Preview</h3>
          <button mat-icon-button (click)="loadPagePreview()" matTooltip="Reload page">
            <mat-icon>refresh</mat-icon>
          </button>
        </div>
        <div *ngIf="selectionMode && currentSelector" class="selector-display">
          <strong>Current Selector:</strong> <code>{{ currentSelector }}</code>
        </div>
        <div #previewContainer class="preview-wrapper" [class.selection-mode]="selectionMode">
          <iframe 
            *ngIf="useIframe && safeIframeUrl" 
            [src]="safeIframeUrl" 
            class="preview-iframe"
            frameborder="0">
          </iframe>
          <div 
            *ngIf="!useIframe" 
            class="preview-content" 
            [innerHTML]="safePreviewHtml" 
            (click)="onPreviewClick($event)">
          </div>
          <div *ngIf="selectionMode && !useIframe" class="selection-overlay" [style.display]="hoveredElement ? 'block' : 'none'"></div>
        </div>
        <div *ngIf="selectionMode" class="selection-controls">
          <button mat-button (click)="selectParent()">
            <mat-icon>arrow_upward</mat-icon>
            Parent
          </button>
          <button mat-raised-button color="primary" (click)="confirmSelection()">
            <mat-icon>check</mat-icon>
            Confirm
          </button>
          <button mat-button (click)="cancelSelection()">
            <mat-icon>close</mat-icon>
            Cancel
          </button>
        </div>
      </div>

      <div class="points-list-section">
        <div class="points-header">
          <h3>Optimization Points</h3>
          <button mat-raised-button color="primary" (click)="openAddPointDialog()">
            <mat-icon>add</mat-icon>
            Add Point
          </button>
        </div>
        <mat-card *ngFor="let point of points" class="point-card" [class.selected]="selectedPointId === point.id">
          <mat-card-header>
            <mat-card-title>{{ point.name }}</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <p *ngIf="point.selector"><strong>Selector:</strong> <code>{{ point.selector }}</code></p>
            <p *ngIf="!point.selector" class="no-selector">No selector set</p>
          </mat-card-content>
          <mat-card-actions>
            <button mat-button (click)="startSelection(point.id)" *ngIf="!point.selector">
              <mat-icon>gps_fixed</mat-icon>
              Start Selection
            </button>
            <button mat-button (click)="editPoint(point)">
              <mat-icon>edit</mat-icon>
              Edit
            </button>
            <button mat-button color="warn" (click)="deletePoint(point.id)">
              <mat-icon>delete</mat-icon>
              Delete
            </button>
          </mat-card-actions>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .points-container {
      display: grid;
      grid-template-columns: 3fr 1fr;
      gap: 24px;
      height: calc(100vh - 200px);
      margin-top: 48px;
    }
    .preview-section {
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      padding: 16px;
      overflow: auto;
    }
    .preview-section.mobile .preview-wrapper {
      max-width: 375px;
      margin: 0 auto;
    }
    .preview-wrapper {
      position: relative;
      border: 1px solid #ccc;
      background: white;
      min-height: 400px;
    }
    .preview-wrapper.selection-mode {
      cursor: crosshair;
    }
    .preview-content {
      padding: 16px;
    }
    .preview-iframe {
      width: 100%;
      height: 600px;
      border: none;
    }
    .selection-overlay {
      position: absolute;
      border: 2px solid #2196F3;
      background: rgba(33, 150, 243, 0.1);
      pointer-events: none;
    }
    .selection-controls {
      display: flex;
      gap: 8px;
      margin-top: 16px;
      justify-content: center;
    }
    .points-list-section {
      overflow-y: auto;
    }
    .preview-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    .selector-display {
      padding: 8px 12px;
      background: #e3f2fd;
      border-left: 3px solid #2196F3;
      margin-bottom: 16px;
      border-radius: 4px;
      font-size: 14px;
    }
    .selector-display code {
      background: white;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: monospace;
      color: #1976d2;
    }
    .points-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    .point-card {
      margin-bottom: 16px;
    }
    .point-card.selected {
      border: 2px solid #2196F3;
    }
    .no-selector {
      color: #999;
      font-style: italic;
    }
    code {
      background: #f5f5f5;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 12px;
    }
    :host-context(body.dark-mode) {
      .no-selector {
        color: #ffffff;
      }
      code {
        background: rgba(255, 255, 255, 0.1);
        color: #ffffff;
      }
      .selector-display {
        background: rgba(33, 150, 243, 0.2);
        border-left-color: #2196F3;
        color: #ffffff;
      }
      .selector-display code {
        background: rgba(255, 255, 255, 0.1);
        color: #64b5f6;
      }
      .preview-section {
        border-color: rgba(255, 255, 255, 0.12);
      }
      .preview-header {
        h3 {
          color: #ffffff !important;
        }
        button {
          color: #ffffff !important;
          mat-icon {
            color: #ffffff !important;
          }
          &:hover {
            color: var(--theme-primary) !important;
            mat-icon {
              color: var(--theme-primary) !important;
            }
          }
        }
      }
      .preview-wrapper {
        border-color: rgba(255, 255, 255, 0.12);
        background: #1e1e1e;
      }
      .selection-controls {
        button {
          color: #ffffff !important;
          mat-icon {
            color: #ffffff !important;
          }
        }
      }
      .points-header {
        h3 {
          color: #ffffff !important;
        }
        button {
          color: #ffffff !important;
          mat-icon {
            color: #ffffff !important;
          }
        }
      }
    }
  `]
})
export class PointsComponent implements OnInit, OnDestroy {
  @ViewChild('previewContainer', { static: false }) previewContainer!: ElementRef;
  
  points: OptimizationPoint[] = [];
  variants: Variant[] = [];
  projectId: string = '';
  project: any = null;
  basePreviewHtml: string = '';
  previewHtml: string = '';
  safePreviewHtml: SafeHtml = '';
  selectionMode = false;
  selectedPointId: string | null = null;
  hoveredElement: HTMLElement | null = null;
  currentSelector: string = '';
  viewMode: 'desktop' | 'mobile' = 'desktop';
  useIframe: boolean = false;
  pageUrl: string = '';
  safeIframeUrl: SafeResourceUrl = '';
  private subscriptions = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private store: ProjectsStoreService,
    private projectsApi: ProjectsApiService,
    private previewService: PreviewService,
    private toast: ToastHelperService,
    private sanitizer: DomSanitizer,
    private renderer: Renderer2,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.projectId = params['projectId'];
      // Load project first, then load points and variants
      this.loadProject();
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  loadProject(): void {
    // First try to get from store (synchronous, faster)
    const storeProject = this.store.getProject(this.projectId);
    if (storeProject) {
      this.project = storeProject;
      this.pageUrl = storeProject.pageUrl || 'https://pack.stage.es/?packageId=209&from=app&next_results_tab=same';
      this.loadPagePreview();
      this.loadPoints();
      this.loadVariants();
      return;
    }

    // If not in store, wait for projects to load from API
    this.store.listProjects().pipe(take(1)).subscribe({
      next: projects => {
        const foundProject = projects.find(p => p.id === this.projectId);
        if (foundProject) {
          this.project = foundProject;
          this.pageUrl = foundProject.pageUrl || 'https://pack.stage.es/?packageId=209&from=app&next_results_tab=same';
          this.loadPagePreview();
          this.loadPoints();
          this.loadVariants();
        } else {
          // Try API as fallback
          this.projectsApi.getProject(this.projectId).subscribe({
            next: project => {
              this.project = project;
              this.pageUrl = project.pageUrl || 'https://pack.stage.es/?packageId=209&from=app&next_results_tab=same';
              this.loadPagePreview();
              this.loadPoints();
              this.loadVariants();
            },
            error: () => {
              // Use default project if not found (for development)
              this.useDefaultProject();
            }
          });
        }
      },
      error: () => {
        // Try API directly
        this.projectsApi.getProject(this.projectId).subscribe({
          next: project => {
            this.project = project;
            this.pageUrl = project.pageUrl || 'https://pack.stage.es/?packageId=209&from=app&next_results_tab=same';
            this.loadPagePreview();
            this.loadPoints();
            this.loadVariants();
          },
          error: () => {
            // Use default project if not found (for development)
            this.useDefaultProject();
          }
        });
      }
    });
  }

  private useDefaultProject(): void {
    // For development: use default project data
    this.project = {
      id: this.projectId || '1',
      name: 'Landing Page A',
      pageUrl: 'https://pack.stage.es/?packageId=209&from=app&next_results_tab=same',
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
      this.pageUrl = 'https://pack.stage.es/?packageId=209&from=app&next_results_tab=same';
    }

    // Use saved preview HTML if no URL (fallback only)
    if (!this.pageUrl && this.project?.previewHtml) {
      this.basePreviewHtml = this.project.previewHtml;
      this.updatePreview();
      return;
    }

    // Check if we need to use iframe (different origin)
    this.useIframe = this.previewService.shouldUseIframe(this.pageUrl);

    if (this.useIframe) {
      // For external URLs, we'll use iframe in the template
      this.basePreviewHtml = '';
      this.safeIframeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.pageUrl);
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
            this.safeIframeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.pageUrl);
            this.updatePreview();
          }
        },
        error: () => {
          // Fallback to iframe
          this.useIframe = true;
          this.safeIframeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.pageUrl);
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
      this.variants = activeVariants;
      this.updatePreview();
    });
    this.subscriptions.add(sub);
  }

  updatePreview(): void {
    if (!this.basePreviewHtml && !this.useIframe) {
      return;
    }

    if (this.useIframe) {
      // Iframe will be handled in template
      return;
    }

    // Apply variants to HTML
    let html = this.basePreviewHtml;
    if (this.variants.length > 0 && this.points.length > 0) {
      html = this.previewService.applyVariantsToHtml(html, this.variants, this.points);
    }

    this.previewHtml = html;
    this.safePreviewHtml = this.previewService.sanitizeHtml(html);
  }

  toggleViewMode(): void {
    this.viewMode = this.viewMode === 'desktop' ? 'mobile' : 'desktop';
  }

  openAddPointDialog(): void {
    // Simple prompt for MVP
    const name = prompt('Enter point name:');
    if (name) {
      this.store.addPoint(this.projectId, { name });
      this.toast.showSuccess('Point added');
      this.loadPoints();
    }
  }

  startSelection(pointId: string): void {
    this.selectedPointId = pointId;
    this.selectionMode = true;
  }

  onPreviewClick(event: MouseEvent): void {
    if (!this.selectionMode) return;
    event.stopPropagation();
    const target = event.target as HTMLElement;
    this.hoveredElement = target;
    this.currentSelector = this.generateSelector(target);
  }

  generateSelector(element: HTMLElement): string {
    // Priority 1: ID selector (most specific)
    if (element.id) {
      return `#${element.id}`;
    }

    // Priority 2: Class selector (if has classes)
    if (element.className && typeof element.className === 'string') {
      const classes = element.className
        .split(' ')
        .filter(c => c && c.trim().length > 0)
        .join('.');
      if (classes) {
        return `${element.tagName.toLowerCase()}.${classes}`;
      }
    }

    // Priority 3: Attribute selector (data attributes, etc.)
    const dataAttributes = Array.from(element.attributes)
      .filter(attr => attr.name.startsWith('data-'))
      .map(attr => `[${attr.name}="${attr.value}"]`)
      .join('');
    if (dataAttributes) {
      return `${element.tagName.toLowerCase()}${dataAttributes}`;
    }

    // Priority 4: Tag with parent context (if parent has ID or class)
    if (element.parentElement) {
      const parent = element.parentElement;
      if (parent.id) {
        return `${parent.tagName.toLowerCase()}#${parent.id} > ${element.tagName.toLowerCase()}`;
      }
      if (parent.className && typeof parent.className === 'string') {
        const parentClasses = parent.className
          .split(' ')
          .filter(c => c && c.trim().length > 0)
          .join('.');
        if (parentClasses) {
          return `${parent.tagName.toLowerCase()}.${parentClasses} > ${element.tagName.toLowerCase()}`;
        }
      }
    }

    // Fallback: Just tag name
    return element.tagName.toLowerCase();
  }

  selectParent(): void {
    if (this.hoveredElement?.parentElement) {
      this.hoveredElement = this.hoveredElement.parentElement;
      this.currentSelector = this.generateSelector(this.hoveredElement);
    }
  }

  confirmSelection(): void {
    if (this.selectedPointId && this.currentSelector) {
      this.store.updatePoint(this.selectedPointId, { selector: this.currentSelector });
      this.toast.showSuccess('Selector saved');
      this.cancelSelection();
      this.loadPoints();
    }
  }

  cancelSelection(): void {
    this.selectionMode = false;
    this.selectedPointId = null;
    this.hoveredElement = null;
    this.currentSelector = '';
  }

  editPoint(point: OptimizationPoint): void {
    const name = prompt('Enter new name:', point.name);
    if (name && name !== point.name) {
      this.store.updatePoint(point.id, { name });
      this.toast.showSuccess('Point updated');
      this.loadPoints();
    }
  }

  deletePoint(id: string): void {
    if (confirm('Delete this point?')) {
      this.store.deletePoint(id);
      this.toast.showSuccess('Point deleted');
      this.loadPoints();
    }
  }
}

