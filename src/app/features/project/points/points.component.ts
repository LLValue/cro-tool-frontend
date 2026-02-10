import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { ProjectsStoreService } from '../../../data/projects-store.service';
import { OptimizationPoint, Variant } from '../../../data/models';
import { ToastHelperService } from '../../../shared/toast-helper.service';
import { PageHeaderComponent } from '../../../shared/page-header/page-header.component';
import { PreviewPanelComponent } from '../../../shared/preview-panel/preview-panel.component';
import { Subscription, combineLatest } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ProjectsApiService } from '../../../api/services/projects-api.service';
import { PreviewService } from '../../../shared/preview.service';
import { API_CLIENT } from '../../../api/api-client.token';
import { ApiClient } from '../../../api/api-client';
import { Inject } from '@angular/core';
import { SelectorInputDialogComponent } from './selector-input-dialog/selector-input-dialog.component';
import { MatTableDataSource } from '@angular/material/table';
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-points',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatChipsModule,
    MatMenuModule,
    MatDividerModule,
    MatTooltipModule,
    MatDialogModule,
    CommonModule,
    RouterModule,
    PageHeaderComponent,
    PreviewPanelComponent
  ],
  templateUrl: './points.component.html',
  styleUrls: ['./points.component.scss']
})
export class PointsComponent implements OnInit, OnDestroy {
  points: OptimizationPoint[] = [];
  variants: Variant[] = [];
  projectId: string = '';
  displayedColumns: string[] = ['name', 'type', 'status', 'variantsApproved', 'lastUpdated', 'actions'];
  pointsDataSource = new MatTableDataSource<OptimizationPoint>([]);
  selectedPoint: OptimizationPoint | null = null;
  previewHtml: string = '';
  originalPreviewHtml: string = '';
  previewUrl: string = '';
  loadingPreview: boolean = false;
  useIframe: boolean = true;
  highlightSelector: string = '';
  private subscriptions = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private store: ProjectsStoreService,
    private toast: ToastHelperService,
    private dialog: MatDialog,
    private projectsApi: ProjectsApiService,
    private previewService: PreviewService,
    private sanitizer: DomSanitizer,
    @Inject(API_CLIENT) private apiClient: ApiClient
  ) {}

  ngOnInit(): void {
    const projectId = this.getProjectId();
    if (projectId) {
      this.projectId = projectId;
      this.loadData();
    }

    const routeParamsSub = this.route.params.subscribe(params => {
      const newProjectId = params['projectId'];
      if (newProjectId && newProjectId !== this.projectId) {
        this.projectId = newProjectId;
        this.loadData();
      }
    });
    this.subscriptions.add(routeParamsSub);

    if (this.route.parent) {
      const parentParamsSub = this.route.parent.params.subscribe(params => {
        const newProjectId = params['projectId'];
        if (newProjectId && newProjectId !== this.projectId) {
          this.projectId = newProjectId;
          this.loadData();
        }
      });
      this.subscriptions.add(parentParamsSub);
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private getProjectId(): string {
    const currentParams = this.route.snapshot.params;
    if (currentParams['projectId']) {
      return currentParams['projectId'];
    }
    const parentParams = this.route.snapshot.parent?.params;
    if (parentParams?.['projectId']) {
      return parentParams['projectId'];
    }
    return this.projectId || '';
  }

  loadData(): void {
    const projectId = this.getProjectId();
    if (!projectId) {
      return;
    }
    this.projectId = projectId;

    const pointsSub = this.store.points$.pipe(
      map(points => points.filter(p => p.projectId === projectId))
    ).subscribe({
      next: points => {
        this.points = points;
        this.pointsDataSource.data = points;
      },
      error: () => {
        this.points = [];
        this.pointsDataSource.data = [];
      }
    });
    this.subscriptions.add(pointsSub);
    
    this.store.listPoints(projectId).subscribe();
    this.loadPreview();

    const variantsSub = combineLatest([
      this.store.variants$,
      this.store.points$
    ]).pipe(
      map(([variants, points]) => {
        const projectPointIds = points
          .filter(p => p.projectId === projectId)
          .map(p => p.id);
        return variants.filter(v => projectPointIds.includes(v.optimizationPointId));
      })
    ).subscribe({
      next: variants => {
        this.variants = variants;
      },
      error: () => {
        this.variants = [];
      }
    });
    this.subscriptions.add(variantsSub);
  }

  getApprovedVariantsCount(pointId: string): number {
    return this.variants.filter(v => 
      v.optimizationPointId === pointId && v.status === 'approved'
    ).length;
  }

  formatDate(date: Date | string | undefined): string {
    if (!date) return 'Never';
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return 'Never';
    return d.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  }

  openAddPointDialog(): void {
    const projectId = this.getProjectId();
    if (!projectId) {
      this.toast.showError('Project ID not found');
      return;
    }

    // Navigate to point-detail in create mode
    this.router.navigate(['/projects', projectId, 'points', 'new']);
  }

  duplicatePoint(point: OptimizationPoint): void {
    const projectId = this.getProjectId();
    if (!projectId) {
      this.toast.showError('Project ID not found');
      return;
    }

    const duplicateSub = this.store.addPoint(projectId, {
      name: `${point.name} (Copy)`,
      selector: point.selector,
      text: point.text,
      objective: point.objective,
      generationRules: point.generationRules,
      elementType: point.elementType,
      deviceScope: point.deviceScope,
      status: point.status || 'Included'
    }).subscribe({
      next: () => {
        this.toast.showSuccess('Point duplicated successfully');
      },
      error: () => {
        this.toast.showError('Failed to duplicate point');
      }
    });
    this.subscriptions.add(duplicateSub);
  }

  setSelectedPoint(point: OptimizationPoint): void {
    this.selectedPoint = point;
    if (point.selector) {
      this.highlightSelector = point.selector;
    }
  }

  highlightPoint(point: OptimizationPoint): void {
    if (point && point.selector) {
      // Clean selector to remove temporary classes
      const cleanSelector = this.cleanSelector(point.selector);
      this.highlightSelector = cleanSelector;
    }
  }

  clearHighlight(): void {
    this.highlightSelector = '';
  }

  private cleanSelector(selector: string): string {
    if (!selector) return selector;
    
    // Remove temporary classes used during element selection/highlighting
    const temporaryClasses = [
      '.point-editor-selected',
      '.point-editor-highlight',
      '.highlighted-element'
    ];
    
    let cleanedSelector = selector;
    temporaryClasses.forEach(tempClass => {
      cleanedSelector = cleanedSelector.replace(tempClass, '');
    });
    
    // Clean up any double dots or trailing dots
    cleanedSelector = cleanedSelector.replace(/\.{2,}/g, '.');
    cleanedSelector = cleanedSelector.replace(/\.$/, '');
    
    return cleanedSelector.trim();
  }

  /** Load page HTML for the preview panel. If not in project/cache, always fetches via proxy so iframe never shows error. */
  loadPreview(): void {
    const projectId = this.getProjectId();
    if (!projectId) return;

    this.loadingPreview = true;
    const projectSub = this.projectsApi.getProject(projectId).pipe(take(1)).subscribe({
      next: (project) => {
        const pageUrl = (project?.pageUrl || '').trim();
        if (!pageUrl) {
          this.loadingPreview = false;
          return;
        }
        this.previewUrl = pageUrl;

        if (project?.previewHtml?.trim()) {
          this.previewHtml = project.previewHtml;
          if (!this.originalPreviewHtml) {
            this.originalPreviewHtml = project.previewHtml;
          }
          this.useIframe = true;
          this.loadingPreview = false;
          return;
        }

        const fetchSub = this.apiClient.proxyFetch(pageUrl).subscribe({
          next: (response) => {
            if (response?.html?.trim()) {
              const processedHtml = this.removeCookiePopupsFromHtml(response.html);
              this.previewHtml = processedHtml;
              this.originalPreviewHtml = processedHtml;
              this.useIframe = true;
            }
            this.loadingPreview = false;
          },
          error: () => {
            this.toast.showError('Could not load page preview');
            this.loadingPreview = false;
          }
        });
        this.subscriptions.add(fetchSub);
      },
      error: () => {
        this.loadingPreview = false;
      }
    });
    this.subscriptions.add(projectSub);
  }

  private removeCookiePopupsFromHtml(html: string): string {
    if (!html) return html;
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const cookieSelectors = [
        '[id*="cookie"]', '[class*="cookie"]', '[id*="Cookie"]', '[class*="Cookie"]',
        '[id*="consent"]', '[class*="consent"]', '[id*="Consent"]', '[class*="Consent"]',
        '[id*="gdpr"]', '[class*="gdpr"]', '[id*="GDPR"]', '[class*="GDPR"]',
        '[id*="onetrust"]', '[class*="onetrust"]', '[id*="OneTrust"]', '[class*="OneTrust"]',
        '[id*="cookiebot"]', '[class*="cookiebot"]', '[id*="Cookiebot"]', '[class*="Cookiebot"]',
        '[id*="cookie-banner"]', '[class*="cookie-banner"]',
        '[id*="cookie-notice"]', '[class*="cookie-notice"]',
        '[id*="cookie-consent"]', '[class*="cookie-consent"]',
        '[id*="CybotCookiebotDialog"]', '[class*="CybotCookiebotDialog"]',
        '[data-testid*="cookie"]', '[data-testid*="Cookie"]'
      ];
      cookieSelectors.forEach(selector => {
        try {
          doc.querySelectorAll(selector).forEach(el => {
            const text = (el.textContent || '').toLowerCase();
            if (text.includes('cookie') || text.includes('consent') || text.includes('gdpr')) {
              el.remove();
            }
          });
        } catch (_) {}
      });
      return doc.documentElement.outerHTML;
    } catch {
      return html;
    }
  }

  onPreviewReload(): void {
    this.loadPreview();
  }

  editPoint(pointId: string): void {
    if (!pointId) return;
    this.router.navigate(['/projects', this.projectId, 'points', pointId]);
  }

  deletePoint(pointId: string): void {
    const point = this.points.find(p => p.id === pointId);
    if (!point) return;

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Delete Optimization Point',
        message: `Are you sure you want to delete "${point.name}"? This action cannot be undone.`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
        confirmColor: 'primary'
      }
    });

    const deleteSub = dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.store.deletePoint(pointId);
        this.toast.showSuccess('Point deleted successfully');
      }
    });
    this.subscriptions.add(deleteSub);
  }
}
