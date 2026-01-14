import { Component, OnInit, OnDestroy, ViewChild, ElementRef, Renderer2, ChangeDetectorRef } from '@angular/core';
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
import { take, map } from 'rxjs/operators';
import { DomSanitizer, SafeHtml, SafeResourceUrl } from '@angular/platform-browser';
import { SelectorInputDialogComponent } from './selector-input-dialog/selector-input-dialog.component';

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
  templateUrl: './points.component.html',
  styleUrls: ['./points.component.scss']
})
export class PointsComponent implements OnInit, OnDestroy {
  @ViewChild('previewContainer', { static: false }) previewContainer!: ElementRef;
  @ViewChild('previewIframe', { static: false }) previewIframe!: ElementRef<HTMLIFrameElement>;
  
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
  selectedElement: HTMLElement | null = null;
  currentSelector: string = '';
  selectedText: string = '';
  viewMode: 'desktop' | 'mobile' = 'desktop';
  useIframe: boolean = false;
  pageUrl: string = '';
  safeIframeUrl: SafeResourceUrl = '';
  iframeLoaded: boolean = false;
  canAccessIframe: boolean = false;
  private subscriptions = new Subscription();
  private pointsSubscription: Subscription | null = null;

  constructor(
    private route: ActivatedRoute,
    private store: ProjectsStoreService,
    private projectsApi: ProjectsApiService,
    private previewService: PreviewService,
    private toast: ToastHelperService,
    private sanitizer: DomSanitizer,
    private renderer: Renderer2,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef
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
    this.route.params.subscribe(params => {
      const newProjectId = params['projectId'];
      if (newProjectId && newProjectId !== this.projectId) {
        this.projectId = newProjectId;
        // Unsubscribe from previous subscriptions
        this.subscriptions.unsubscribe();
        this.subscriptions = new Subscription();
        // Load project first, then load points and variants
        this.loadProject();
      }
    });

    // Also subscribe to parent params (for nested routes)
    if (this.route.parent) {
      this.route.parent.params.subscribe(params => {
        const newProjectId = params['projectId'];
        if (newProjectId && newProjectId !== this.projectId) {
          this.projectId = newProjectId;
          // Unsubscribe from previous subscriptions
          this.subscriptions.unsubscribe();
          this.subscriptions = new Subscription();
          // Load project first, then load points and variants
          this.loadProject();
        }
      });
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
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
    this.store.listProjects().pipe(take(1)).subscribe({
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
          this.projectsApi.getProject(this.projectId).subscribe({
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
        }
      },
      error: () => {
        // Try API directly
        this.projectsApi.getProject(this.projectId).subscribe({
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
      }
    });
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
    // This allows element selection to work
    this.previewService.loadPageFromUrl(this.pageUrl).subscribe({
      next: html => {
        if (html && html.trim().length > 0) {
          // Successfully loaded HTML directly
          this.useIframe = false;
          this.canAccessIframe = false;
          this.basePreviewHtml = html;
          this.updatePreview();
        } else {
          // Failed to load HTML, fallback to iframe
          this.useIframe = true;
          this.safeIframeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.pageUrl);
          this.updatePreview();
        }
      },
      error: () => {
        // Failed to load HTML, fallback to iframe
        this.useIframe = true;
        this.safeIframeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.pageUrl);
        this.updatePreview();
      }
    });
  }

  loadPoints(): void {
    // Ensure projectId is set from route
    const projectId = this.getProjectId();
    if (!projectId) {
      return;
    }
    this.projectId = projectId; // Update instance variable
    
    // Unsubscribe from previous subscription if exists
    if (this.pointsSubscription) {
      this.pointsSubscription.unsubscribe();
      this.subscriptions.remove(this.pointsSubscription);
    }
    
    // Subscribe to points$ observable and filter by projectId
    // This will automatically update when points are added/updated/deleted
    const currentProjectId = this.projectId; // Capture projectId to avoid closure issues
    this.pointsSubscription = this.store.points$.pipe(
      map(allPoints => allPoints.filter(p => p.projectId === currentProjectId))
    ).subscribe({
      next: points => {
        this.points = points;
        this.cdr.markForCheck(); // Force change detection
        this.updatePreview();
      },
      error: err => {
        // Silently handle error - points might not exist yet
        this.points = [];
        this.updatePreview();
      }
    });
    this.subscriptions.add(this.pointsSubscription);
    
    // Also trigger initial load from API
    this.store.listPoints(this.projectId).subscribe({
      next: () => {
        // Points will be updated via the points$ subscription above
      },
      error: () => {
        // Silently handle error
      }
    });
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
    // Check if we're using iframe and cannot access it
    if (this.useIframe && !this.canAccessIframe) {
      // If we can't access iframe, offer manual input directly
      this.openManualSelectorDialog();
      return;
    }

    // Enter selection mode to allow user to click on text in preview
    this.selectedPointId = null; // New point, no ID yet
    this.selectionMode = true;
    
    // If using iframe and can access it, attach listeners
    if (this.useIframe && this.canAccessIframe && this.iframeLoaded && this.previewIframe?.nativeElement) {
      try {
        const iframe = this.previewIframe.nativeElement;
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (iframeDoc) {
          this.attachIframeListeners(iframeDoc);
        }
      } catch (e) {
        // Cannot access iframe, offer manual input
        this.openManualSelectorDialog();
        this.cancelSelection();
        return;
      }
    }
    
    this.toast.showInfo('Click on the text you want to optimize in the preview');
  }

  attemptLoadHtmlDirectly(): void {
    // Try to load HTML directly to enable selection
    if (!this.pageUrl) return;
    
    this.toast.showInfo('Loading page HTML for selection...');
    this.previewService.loadPageFromUrl(this.pageUrl).subscribe({
      next: html => {
        if (html && html.trim().length > 0) {
          // Successfully loaded HTML, switch to direct HTML mode
          this.useIframe = false;
          this.canAccessIframe = false;
          this.basePreviewHtml = html;
          this.updatePreview();
          this.toast.showSuccess('Page loaded. You can now select elements.');
        } else {
          this.toast.showError('Cannot load page HTML due to CORS restrictions. Use "Enter Selector Manually" instead.');
        }
      },
      error: () => {
        this.toast.showError('Cannot load page HTML due to CORS restrictions. Use "Enter Selector Manually" instead.');
      }
    });
  }

  openManualSelectorDialog(): void {
    const dialogRef = this.dialog.open(SelectorInputDialogComponent, {
      width: '600px',
      data: {
        suggestedName: this.selectedText || 'New Point',
        suggestedSelector: this.currentSelector || '',
        suggestedText: this.selectedText || ''
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.name && result.selector) {
        // Get projectId from route (may be in parent for nested routes)
        const projectId = this.getProjectId();
        if (!projectId) {
          this.toast.showError('Project ID is not available. Please refresh the page.');
          return;
        }
        
        // Create the point with manual selector
        const newPoint: Partial<OptimizationPoint> = {
          name: result.name.trim(),
          selector: result.selector.trim(),
          text: result.text?.trim() || this.selectedText || '',
          objective: '',
          generationRules: ''
        };
        this.store.addPoint(projectId, newPoint).subscribe({
          next: () => {
            this.toast.showSuccess('Point created with manual selector');
            this.cancelSelection();
            this.cdr.markForCheck(); // Force change detection
            // No need to call listPoints - addPoint already does it internally
          },
          error: (err) => {
            const errorMessage = err?.error?.message || err?.message || 'Unknown error';
            this.toast.showError(`Failed to create point: ${errorMessage}`);
          }
        });
      }
    });
  }

  startSelection(pointId: string): void {
    this.selectedPointId = pointId;
    this.selectionMode = true;
    // Attach iframe listeners if iframe is loaded and accessible
    if (this.useIframe && this.iframeLoaded && this.canAccessIframe && this.previewIframe?.nativeElement) {
      try {
        const iframe = this.previewIframe.nativeElement;
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (iframeDoc) {
          this.attachIframeListeners(iframeDoc);
        }
      } catch (e) {
        // Cannot access iframe
      }
    }
    this.toast.showInfo('Click on the text you want to optimize in the preview');
  }

  onPreviewClick(event: MouseEvent): void {
    if (!this.selectionMode) return;
    event.preventDefault();
    event.stopPropagation();
    const target = event.target as HTMLElement;
    this.selectElement(target);
  }

  onPreviewMouseOver(event: MouseEvent): void {
    if (!this.selectionMode) return;
    const target = event.target as HTMLElement;
    if (target && target.ownerDocument) {
      this.highlightElement(target, target.ownerDocument);
    }
  }

  onPreviewMouseOut(event: MouseEvent): void {
    if (!this.selectionMode) return;
    const target = event.target as HTMLElement;
    if (target && target.ownerDocument) {
      this.clearHighlight(target.ownerDocument);
    }
  }

  onIframeLoad(): void {
    this.iframeLoaded = true;
    // Check if we can access iframe content (same-origin only)
    if (this.previewIframe?.nativeElement) {
      try {
        const iframe = this.previewIframe.nativeElement;
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (iframeDoc) {
          this.canAccessIframe = true;
          // Add click listener to iframe content
          if (this.selectionMode) {
            this.attachIframeListeners(iframeDoc);
          }
        } else {
          this.canAccessIframe = false;
        }
      } catch (e) {
        // Cross-origin iframe, cannot access
        this.canAccessIframe = false;
      }
    }
  }

  attachIframeListeners(doc: Document): void {
    // Remove existing listeners if they exist
    if (this.iframeClickHandler) {
      doc.removeEventListener('click', this.iframeClickHandler, true);
    }
    if (this.iframeMouseOverHandler) {
      doc.removeEventListener('mouseover', this.iframeMouseOverHandler, true);
    }
    if (this.iframeMouseOutHandler) {
      doc.removeEventListener('mouseout', this.iframeMouseOutHandler, true);
    }
    
    // Add new listeners
    this.iframeClickHandler = (e: MouseEvent) => {
      if (!this.selectionMode) return;
      e.preventDefault();
      e.stopPropagation();
      const target = e.target as HTMLElement;
      this.selectElement(target);
    };
    
    this.iframeMouseOverHandler = (e: MouseEvent) => {
      if (!this.selectionMode) return;
      const target = e.target as HTMLElement;
      this.highlightElement(target, doc);
    };
    
    this.iframeMouseOutHandler = () => {
      if (!this.selectionMode) return;
      this.clearHighlight(doc);
    };
    
    doc.addEventListener('click', this.iframeClickHandler, true);
    doc.addEventListener('mouseover', this.iframeMouseOverHandler, true);
    doc.addEventListener('mouseout', this.iframeMouseOutHandler, true);
  }

  private iframeClickHandler: ((e: MouseEvent) => void) | null = null;
  private iframeMouseOverHandler: ((e: MouseEvent) => void) | null = null;
  private iframeMouseOutHandler: (() => void) | null = null;

  selectElement(element: HTMLElement): void {
    this.selectedElement = element;
    this.hoveredElement = element;
    this.currentSelector = this.generateSelector(element);
    this.selectedText = this.getElementText(element);
    
    // Show visual feedback
    this.highlightElement(element, element.ownerDocument);
  }

  highlightElement(element: HTMLElement, doc: Document): void {
    // Remove existing highlight
    this.clearHighlight(doc);
    
    // Add highlight overlay
    const rect = element.getBoundingClientRect();
    const highlight = doc.createElement('div');
    highlight.id = 'cro-selection-highlight';
    highlight.style.position = 'absolute';
    highlight.style.left = `${rect.left + (doc.defaultView?.scrollX || 0)}px`;
    highlight.style.top = `${rect.top + (doc.defaultView?.scrollY || 0)}px`;
    highlight.style.width = `${rect.width}px`;
    highlight.style.height = `${rect.height}px`;
    highlight.style.border = '2px solid #2196F3';
    highlight.style.backgroundColor = 'rgba(33, 150, 243, 0.1)';
    highlight.style.pointerEvents = 'none';
    highlight.style.zIndex = '9999';
    highlight.style.boxSizing = 'border-box';
    doc.body.appendChild(highlight);
  }

  clearHighlight(doc: Document): void {
    const existing = doc.getElementById('cro-selection-highlight');
    if (existing) {
      existing.remove();
    }
  }

  getElementText(element: HTMLElement): string {
    // Get text content, prioritizing visible text
    const text = element.textContent?.trim() || element.innerText?.trim() || '';
    // Limit to first 100 characters for display
    return text.length > 100 ? text.substring(0, 100) + '...' : text;
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
    if (!this.currentSelector || !this.selectedElement) {
      this.toast.showError('Please select an element first');
      return;
    }

    // Get projectId from route (may be in parent for nested routes)
    const projectId = this.getProjectId();
    if (!projectId) {
      this.toast.showError('Project ID is not available. Please refresh the page.');
      return;
    }

    // If it's a new point (no selectedPointId), create it
    if (!this.selectedPointId) {
      const name = prompt('Enter a name for this optimization point:', this.selectedText || 'New Point');
      if (name && name.trim()) {
        const newPoint: Partial<OptimizationPoint> = {
          name: name.trim(),
          selector: this.currentSelector,
          text: this.selectedText || '',
          objective: '',
          generationRules: ''
        };
        this.store.addPoint(projectId, newPoint).subscribe({
          next: () => {
            this.toast.showSuccess('Point created');
            this.cancelSelection();
            this.cdr.markForCheck(); // Force change detection
            // No need to call listPoints - addPoint already does it internally
          },
          error: (err) => {
            const errorMessage = err?.error?.message || err?.message || 'Unknown error';
            this.toast.showError(`Failed to create point: ${errorMessage}`);
          }
        });
      }
    } else {
      // Update existing point selector
      this.store.updatePoint(this.selectedPointId, { selector: this.currentSelector });
      this.toast.showSuccess('Selector saved');
      this.cancelSelection();
    }
  }

  cancelSelection(): void {
    this.selectionMode = false;
    this.selectedPointId = null;
    this.hoveredElement = null;
    this.selectedElement = null;
    this.currentSelector = '';
    this.selectedText = '';
    
    // Remove iframe listeners
    if (this.useIframe && this.canAccessIframe && this.previewIframe?.nativeElement) {
      try {
        const iframe = this.previewIframe.nativeElement;
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (iframeDoc) {
          this.clearHighlight(iframeDoc);
          if (this.iframeClickHandler) {
            iframeDoc.removeEventListener('click', this.iframeClickHandler, true);
          }
          if (this.iframeMouseOverHandler) {
            iframeDoc.removeEventListener('mouseover', this.iframeMouseOverHandler, true);
          }
          if (this.iframeMouseOutHandler) {
            iframeDoc.removeEventListener('mouseout', this.iframeMouseOutHandler, true);
          }
        }
      } catch (e) {
        // Cannot access iframe
      }
    }
    
    // Clear highlight in direct HTML mode
    if (!this.useIframe && this.selectedElement) {
      const element = this.selectedElement as HTMLElement;
      const doc = element.ownerDocument;
      if (doc) {
        this.clearHighlight(doc);
      }
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

