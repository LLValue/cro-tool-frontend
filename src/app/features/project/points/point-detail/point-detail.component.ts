import { Component, OnInit, OnDestroy, ViewChild, ElementRef, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { PageHeaderComponent } from '../../../../shared/page-header/page-header.component';
import { ChipsInputComponent } from '../../../../shared/chips-input/chips-input.component';
import { InfoModalComponent } from '../../../../shared/info-modal/info-modal.component';
import { GenerateVariantsProgressComponent, GenerateVariantsProgressData } from '../../../../shared/generate-variants-progress/generate-variants-progress.component';
import { ConfirmDialogComponent } from '../../../../shared/confirm-dialog/confirm-dialog.component';
import { AddVariantDialogComponent } from '../../../../shared/add-variant-dialog/add-variant-dialog.component';
import { PreviewPanelComponent } from '../../../../shared/preview-panel/preview-panel.component';
import { PreviewService } from '../../../../shared/preview.service';
import { ProjectsStoreService } from '../../../../data/projects-store.service';
import { ProjectsApiService } from '../../../../api/services/projects-api.service';
import { PointsApiService } from '../../../../api/services/points-api.service';
import { GoalsApiService } from '../../../../api/services/goals-api.service';
import { OptimizationPoint, Variant, Goal } from '../../../../data/models';
import { PointBriefDraftRequest, PointBriefDraftResponse } from '../../../../api-contracts/points.contracts';
import { of, timer, forkJoin } from 'rxjs';
import { catchError, take, switchMap } from 'rxjs/operators';
import { ToastHelperService } from '../../../../shared/toast-helper.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { API_CLIENT } from '../../../../api/api-client.token';
import { ApiClient } from '../../../../api/api-client';
import { Subscription } from 'rxjs';

/** Set to true to use local mock when backend is unavailable */
const USE_MOCK_BRIEF_DRAFT = false;

interface SelectedElement {
  element: HTMLElement | null;
  selector: string;
  text: string;
}

@Component({
  selector: 'app-point-detail',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FormsModule,
    CommonModule,
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatChipsModule,
    MatSlideToggleModule,
    MatTooltipModule,
    MatProgressBarModule,
    MatDialogModule,
    PageHeaderComponent,
    ChipsInputComponent,
    PreviewPanelComponent
  ],
  templateUrl: './point-detail.component.html',
  styleUrls: ['./point-detail.component.scss']
})
export class PointDetailComponent implements OnInit, OnDestroy {
  @ViewChild('previewFrame', { static: false }) previewFrame!: ElementRef<HTMLIFrameElement>;
  
  pointId: string = '';
  projectId: string = '';
  point: OptimizationPoint | null = null;
  isCreateMode: boolean = false;
  variants: Variant[] = [];
  filteredVariants: Variant[] = [];
  variantFilter: string = 'all';
  variantSearchText = '';
  expandedVariantId: string | null = null;
  editingVariantId: string | null = null;
  editingVariantText = '';
  addVariantLoading = false;
  readonly Math = Math;

  setupForm: FormGroup;
  briefForm: FormGroup;
  
  goodIdeas: string[] = [];
  thingsToAvoid: string[] = [];
  mustIncludeKeywords: string[] = [];
  mustAvoidTerms: string[] = [];
  
  elementTypes = [
    'Headline (H1)',
    'Subheadline / Subheader (H2)',
    'Call to Action (CTA) Button',
    'Supporting Copy / Body Text',
    'Form Labels & Helper Text',
    'Trust & Assurance Copy',
    'Benefit Bullets (feature list)',
    'Other'
  ];
  
  // Preview and selection properties
  html: string = '';
  safeHtml: SafeHtml | null = null;
  loading = false;
  error: string | null = null;
  selectionMode = false;
  selectedElement: SelectedElement | null = null;
  viewMode: 'mobile' | 'desktop' = 'desktop';
  private highlightStyle: HTMLStyleElement | null = null;
  projectPageUrl: string = '';
  
  private subscriptions = new Subscription();

  // Variants tab preview properties
  previewHtml: string = '';
  originalPreviewHtml: string = '';
  previewUrl: string = '';
  loadingPreview: boolean = false;
  highlightSelector: string = '';

  // AI Brief Helper state
  readonly MIN_CHARS_FOR_IMPROVE = 10;
  briefDraftLoading = false;
  briefFieldState: Record<string, { source: 'manual' | 'ai_draft'; reviewStatus: 'ok' | 'needs_review' | 'missing'; lastUpdatedAt?: number }> = {};
  private highlightFieldsSet = new Set<string>();
  private highlightTimeoutIds: ReturnType<typeof setTimeout>[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private store: ProjectsStoreService,
    private fb: FormBuilder,
    private toast: ToastHelperService,
    @Inject(API_CLIENT) private apiClient: ApiClient,
    private sanitizer: DomSanitizer,
    private projectsApi: ProjectsApiService,
    private pointsApi: PointsApiService,
    private goalsApi: GoalsApiService,
    private dialog: MatDialog,
    private previewService: PreviewService
  ) {
    this.setupForm = this.fb.group({
      name: ['', Validators.required],
      elementType: [this.elementTypes[0]],
      selector: ['', Validators.required],
      deviceScope: ['All'],
      status: ['Included']
    });

    this.briefForm = this.fb.group({
      objective: ['', Validators.required],
      context: ['', Validators.required],
      minChars: [0, [Validators.min(0), Validators.pattern(/^\d+$/)]],
      maxChars: [0, [Validators.min(0), Validators.pattern(/^\d+$/)]],
      maxWords: [0, [Validators.min(0), Validators.pattern(/^\d+$/)]]
    });
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.pointId = params['pointId'] || '';
      this.projectId = params['projectId'] || this.route.snapshot.parent?.params['projectId'] || '';
      
      this.isCreateMode = this.pointId === 'new' || !this.pointId;
      
      if (this.isCreateMode) {
        this.loadPreview();
        this.loadProjectPreview();
      } else {
        this.loadPoint();
        this.loadVariants();
        this.loadPreview();
        this.loadProjectPreview();
      }
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.removeHighlightStyle();
    this.highlightTimeoutIds.forEach(id => clearTimeout(id));
    this.highlightTimeoutIds = [];
  }

  loadPoint(): void {
    if (!this.pointId || !this.projectId) return;
    this.store.listPoints(this.projectId).subscribe();
    const sub = this.store.points$.subscribe(points => {
      this.point = points.find(p => p.id === this.pointId) || null;
      if (this.point) {
        this.setupForm.patchValue({
          name: this.point.name || '',
          elementType: this.getDisplayElementType(this.point.elementType) || this.elementTypes[0],
          selector: this.point.selector || '',
          deviceScope: this.point.deviceScope || 'All',
          status: this.point.status || 'Included'
        });
        this.briefForm.patchValue({
          objective: this.point.objective || '',
          context: (this.point as any).context || ''
        });

        const generationRules = this.point.generationRules ? JSON.parse(this.point.generationRules || '{}') : {};
        this.goodIdeas = generationRules.goodIdeas || [];
        this.thingsToAvoid = generationRules.thingsToAvoid || [];
        this.mustIncludeKeywords = generationRules.mustIncludeKeywords || [];
        this.mustAvoidTerms = generationRules.mustAvoidTerms || [];
        this.briefForm.patchValue({
          minChars: generationRules.minChars || 0,
          maxChars: generationRules.maxChars || 0,
          maxWords: generationRules.maxWords || 0
        });
      } else {
        if (!this.setupForm.get('elementType')?.value) {
          this.setupForm.patchValue({ elementType: this.elementTypes[0] });
        }
        if (!this.setupForm.get('deviceScope')?.value) {
          this.setupForm.patchValue({ deviceScope: 'All' });
        }
      }
    });
    this.subscriptions.add(sub);
  }

  /** Index of the Variants tab (0=Point Setup, 1=Optimization Brief, 2=Variants). */
  private readonly VARIANTS_TAB_INDEX = 2;

  loadVariants(): void {
    if (!this.pointId) return;

    const sub = this.store.variants$.subscribe(variants => {
      this.variants = variants
        .filter(v => v.optimizationPointId === this.pointId)
        .sort((a, b) => {
          if (b.uxScore !== a.uxScore) {
            return b.uxScore - a.uxScore;
          }
          if (a.status === 'approved' && b.status !== 'approved') return -1;
          if (a.status !== 'approved' && b.status === 'approved') return 1;
          return 0;
        });
      this.filterVariants();
    });
    this.subscriptions.add(sub);

    this.refreshVariantsFromApi();
  }

  /** Triggers the GET .../variants API call so the store has the latest list. Call on init and when switching to Variants tab. */
  refreshVariantsFromApi(): void {
    if (this.pointId && !this.isCreateMode) {
      this.store.listVariants(this.pointId).subscribe();
    }
  }

  onTabIndexChange(index: number): void {
    if (index === this.VARIANTS_TAB_INDEX) {
      this.refreshVariantsFromApi();
    }
  }

  filterVariants(): void {
    let filtered = this.variants;
    if (this.variantFilter === 'all') {
      filtered = filtered.filter(v => v.status !== 'discarded');
    } else {
      filtered = filtered.filter(v => {
        if (this.variantFilter === 'enabled') return v.status === 'approved';
        if (this.variantFilter === 'disabled') return v.status === 'pending';
        if (this.variantFilter === 'discarded') return v.status === 'discarded';
        return true;
      });
    }
    const q = (this.variantSearchText || '').trim().toLowerCase();
    if (q) {
      filtered = filtered.filter(v =>
        v.id.toLowerCase().includes(q) || (v.text || '').toLowerCase().includes(q)
      );
    }
    this.filteredVariants = filtered.sort((a, b) => {
      if (b.uxScore !== a.uxScore) return b.uxScore - a.uxScore;
      if (a.status === 'approved' && b.status !== 'approved') return -1;
      if (a.status !== 'approved' && b.status === 'approved') return 1;
      return 0;
    });
  }

  get enabledVariants(): Variant[] {
    return this.variants.filter(v => v.status === 'approved');
  }

  get hasNonDiscardedVariants(): boolean {
    return this.variants.some(v => v.status !== 'discarded');
  }

  getVariantDisplayId(variant: Variant): string {
    return variant.id.length > 8 ? variant.id.slice(-8) : variant.id;
  }

  /** Returns flags to display; excludes "none" and empty so the Flags section only shows when there are meaningful flags. */
  getComplianceFlags(variant: Variant): string[] {
    const raw = variant.riskFlags ?? [];
    return raw.filter(f => {
      const s = (f || '').trim().toLowerCase();
      return s.length > 0 && s !== 'none';
    });
  }

  hasComplianceWarning(variant: Variant): boolean {
    return (variant.complianceScore < 7) || !!((variant.riskFlags?.length ?? 0) > 0);
  }

  toggleExpand(variantId: string): void {
    this.expandedVariantId = this.expandedVariantId === variantId ? null : variantId;
  }

  isExpanded(variantId: string): boolean {
    return this.expandedVariantId === variantId;
  }

  startEditVariant(variant: Variant): void {
    this.editingVariantId = variant.id;
    this.editingVariantText = variant.text;
  }

  cancelEditVariant(): void {
    this.editingVariantId = null;
    this.editingVariantText = '';
  }

  saveEditVariant(): void {
    if (!this.editingVariantId) return;
    const text = this.editingVariantText.trim();
    const v = this.variants.find(x => x.id === this.editingVariantId);
    if (!v || !text) {
      this.cancelEditVariant();
      return;
    }
    this.store.updateVariant(this.editingVariantId, { text });
    v.text = text;
    this.toast.showSuccess('Variant updated');
    this.cancelEditVariant();
  }

  copyVariantId(variantId: string, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    navigator.clipboard?.writeText(variantId).then(() => this.toast.showSuccess('ID copied'));
  }

  openAddVariantModal(): void {
    const dialogRef = this.dialog.open(AddVariantDialogComponent, {
      width: '480px',
      data: {}
    });
    dialogRef.afterClosed().subscribe((text: string | null) => {
      if (text) this.addVariantManualWithText(text);
    });
  }

  addVariantManualWithText(text: string): void {
    if (!this.pointId) return;
    this.addVariantLoading = true;
    this.store.addVariant(this.pointId, text, this.projectId).subscribe({
      next: () => {
        this.toast.showSuccess('Variant added.');
        this.loadVariants();
      },
      error: () => this.toast.showError('Failed to add variant. Please try again.')
    }).add(() => { this.addVariantLoading = false; });
  }

  scrollToVariantAndPreview(variant: Variant): void {
    const el = document.getElementById('variant-row-' + variant.id);
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    this.previewVariant(variant);
  }

  onVariantUseInExperimentChange(variant: Variant, useInExperiment: boolean): void {
    if (variant.status === 'discarded') return;
    if (useInExperiment) {
      this.approveVariant(variant.id);
    } else {
      this.unapproveVariant(variant.id);
    }
  }

  saveSetup(): void {
    if (this.setupForm.invalid) return;

    const status = this.setupForm.get('status')?.value ? 'Included' : 'Excluded';
    
    const elementTypeValue = this.setupForm.get('elementType')?.value;
    const elementType = elementTypeValue
      ? (this.mapElementTypeForApi(elementTypeValue) as 'Title' | 'CTA' | 'Subheadline' | 'Microcopy' | 'Other')
      : undefined;

    const generationRules = {
      goodIdeas: Array.isArray(this.goodIdeas) ? this.goodIdeas : [],
      thingsToAvoid: Array.isArray(this.thingsToAvoid) ? this.thingsToAvoid : [],
      mustIncludeKeywords: Array.isArray(this.mustIncludeKeywords) ? this.mustIncludeKeywords : [],
      mustAvoidTerms: Array.isArray(this.mustAvoidTerms) ? this.mustAvoidTerms : [],
      minChars: this.briefForm.get('minChars')?.value || 0,
      maxChars: this.briefForm.get('maxChars')?.value || 0,
      maxWords: this.briefForm.get('maxWords')?.value || 0
    };

    const pointData: Partial<OptimizationPoint> = {
      name: this.setupForm.get('name')?.value,
      elementType: elementType,
      selector: this.setupForm.get('selector')?.value,
      deviceScope: this.setupForm.get('deviceScope')?.value,
      status: status,
      objective: this.briefForm.get('objective')?.value || '',
      context: this.briefForm.get('context')?.value || '',
      generationRules: JSON.stringify(generationRules)
    };

    if (this.isCreateMode) {
      this.store.addPoint(this.projectId, pointData).subscribe({
        next: (newPoint) => {
          this.toast.showSuccess('Point created successfully');
          this.router.navigate(['/projects', this.projectId, 'points', newPoint.id]);
        },
        error: () => {
          this.toast.showError('Failed to create point');
        }
      });
    } else {
      if (!this.point) return;
      
      this.store.updatePoint(this.pointId, {
        ...pointData,
        updatedAt: new Date()
      });

      this.toast.showSuccess('Point setup saved');
    }
  }

  saveBrief(): void {
    if (this.isCreateMode) {
      this.toast.showSuccess('Brief saved. Remember to save the Point Setup to create the point.');
      return;
    }
    
    if (!this.point) return;

    const generationRules = {
      goodIdeas: Array.isArray(this.goodIdeas) ? this.goodIdeas : [],
      thingsToAvoid: Array.isArray(this.thingsToAvoid) ? this.thingsToAvoid : [],
      mustIncludeKeywords: Array.isArray(this.mustIncludeKeywords) ? this.mustIncludeKeywords : [],
      mustAvoidTerms: Array.isArray(this.mustAvoidTerms) ? this.mustAvoidTerms : [],
      minChars: this.briefForm.get('minChars')?.value || 0,
      maxChars: this.briefForm.get('maxChars')?.value || 0,
      maxWords: this.briefForm.get('maxWords')?.value || 0
    };

    this.store.updatePoint(this.pointId, {
      objective: this.briefForm.get('objective')?.value,
      context: this.briefForm.get('context')?.value ?? '',
      generationRules: JSON.stringify(generationRules),
      updatedAt: new Date()
    });

    this.toast.showSuccess('Optimization brief saved');
  }

  generateVariants(): void {
    if (!this.pointId) return;

    const generateObservable = this.store.generateVariants(this.pointId, 10);
    
    const dialogRef = this.dialog.open(GenerateVariantsProgressComponent, {
      width: '600px',
      disableClose: true,
      data: {
        generateObservable: generateObservable,
        pointName: this.point?.name
      } as GenerateVariantsProgressData
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.action === 'review') {
        this.loadVariants();
      } else if (result?.action === 'retry') {
        this.generateVariants();
      } else if (result?.action === 'fallback') {
        this.generateVariants();
      }
      this.loadVariants();
    });
  }

  approveVariant(variantId: string): void {
    this.store.approveVariant(variantId);
    this.toast.showSuccess('Variant approved');
  }

  unapproveVariant(variantId: string): void {
    this.store.updateVariant(variantId, { status: 'pending' });
    this.toast.showSuccess('Variant disabled');
  }

  /** Discard variant (soft delete): sets status to discarded. It stays in history and appears when filtering by Discarded. */
  deleteVariant(variantId: string): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Discard this variant?',
        message: 'It will be kept for history. You can view it by filtering by Discarded.',
        confirmText: 'Discard',
        cancelText: 'Cancel',
        confirmColor: 'primary'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.store.updateVariant(variantId, { status: 'discarded' });
        this.toast.showSuccess('Variant discarded.');
      }
    });
  }

  deleteAllVariants(): void {
    const toDiscard = this.variants.filter(v => v.status !== 'discarded');
    const count = toDiscard.length;
    if (count === 0) return;
    const pointName = this.point?.name ?? 'this point';
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Discard all variants',
        message: `Discard all ${count} variant${count === 1 ? '' : 's'} for "${pointName}"? They will be moved to Discarded (history is kept).`,
        confirmText: 'Discard all',
        cancelText: 'Cancel',
        confirmColor: 'primary'
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.store.discardAllVariantsForPoint(this.pointId).subscribe({
          next: () => {
            this.toast.showSuccess(`${count} variant${count === 1 ? '' : 's'} discarded.`);
            this.loadVariants();
          },
          error: () => {
            this.toast.showError('Error discarding variants. Please try again.');
          }
        });
      }
    });
  }

  updateVariant(variant: Variant): void {
    if (variant.status === 'approved') return;
    
    this.store.updateVariant(variant.id, { text: variant.text });
  }

  onStatusToggleChange(checked: boolean): void {
    if (!this.point) return;

    const newStatus = checked ? 'Included' : 'Excluded';
    this.setupForm.patchValue({ status: newStatus });
    
    this.store.updatePoint(this.pointId, {
      status: newStatus,
      updatedAt: new Date()
    });
    this.toast.showSuccess(`Point ${newStatus === 'Included' ? 'included' : 'excluded'}`);
  }

  toggleStatus(): void {
    if (!this.point) return;

    const newStatus = this.point.status === 'Included' ? 'Excluded' : 'Included';
    this.store.updatePoint(this.pointId, {
      status: newStatus,
      updatedAt: new Date()
    });
    this.toast.showSuccess(`Point ${newStatus === 'Included' ? 'included' : 'excluded'}`);
  }

  formatDate(date: Date | string | undefined): string {
    if (!date) return 'Unknown';
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return 'Unknown';
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatDateShort(date: Date | string | undefined): string {
    if (!date) return '—';
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  goBack(): void {
    this.router.navigate(['/projects', this.projectId, 'points']);
  }

  loadPreview(): void {
    if (!this.projectId) return;
    
    this.loading = true;
    this.error = null;

    const projectSub = this.store.listProjects().pipe(take(1)).subscribe({
      next: (projects) => {
        let project = projects.find(p => p.id === this.projectId);
        
        if (!project) {
          this.projectsApi.getProject(this.projectId).pipe(take(1)).subscribe({
            next: (p) => {
              project = p;
              this.fetchPageHtml(project?.pageUrl);
            },
            error: () => {
              this.error = 'Project not found. Please check the project ID.';
              this.loading = false;
              this.toast.showError(this.error);
            }
          });
        } else {
          this.fetchPageHtml(project?.pageUrl);
        }
      },
      error: () => {
        this.projectsApi.getProject(this.projectId).pipe(take(1)).subscribe({
          next: (project) => {
            this.fetchPageHtml(project?.pageUrl);
          },
          error: () => {
            this.error = 'Project not found. Please check the project ID.';
            this.loading = false;
            this.toast.showError(this.error);
          }
        });
      }
    });
    this.subscriptions.add(projectSub);
  }

  private fetchPageHtml(pageUrl: string | undefined): void {
    if (!pageUrl || !pageUrl.trim()) {
      this.error = 'Project does not have a page URL configured. Please set it in Project Setup.';
      this.loading = false;
      this.projectPageUrl = '';
      this.toast.showError(this.error);
      return;
    }

    this.projectPageUrl = pageUrl;
    const sub = this.apiClient.proxyFetch(pageUrl).subscribe({
      next: (response) => {
        if (!response.html || response.html.trim().length === 0) {
          this.error = 'The page preview is empty. The URL may be invalid or the page may not be accessible.';
          this.loading = false;
          this.toast.showError(this.error);
          return;
        }

        this.html = this.removeCookiePopupsFromHtml(response.html);
        this.safeHtml = this.sanitizer.bypassSecurityTrustHtml(this.html);
        this.loading = false;
        
        setTimeout(() => {
          this.injectSelectionScript();
        }, 500);
      },
      error: (err: any) => {
        this.loading = false;
        
        let errorMessage = 'Failed to load page preview.';
        if (err.error?.message) {
          errorMessage = `Failed to load page preview: ${err.error.message}`;
        } else if (err.message) {
          errorMessage = `Failed to load page preview: ${err.message}`;
        } else if (err.status === 400) {
          errorMessage = 'Invalid URL. Please check the project\'s page URL in Project Setup.';
        } else if (err.status === 502) {
          errorMessage = 'Unable to fetch the page. The URL may be invalid, unreachable, or the page may be taking too long to load.';
        } else if (err.status === 0) {
          errorMessage = 'Cannot connect to the server. Please make sure the backend is running.';
        }

        this.error = errorMessage;
        this.toast.showError(errorMessage);
      }
    });
    this.subscriptions.add(sub);
  }

  injectSelectionScript(): void {
    const iframe = this.previewFrame?.nativeElement;
    if (!iframe) return;

    iframe.onload = () => {
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!iframeDoc) {
          console.warn('Cannot access iframe document (CORS restriction)');
          return;
        }

        this.removeHighlightStyle();

        const style = iframeDoc.createElement('style');
        style.id = 'point-editor-highlight';
        style.textContent = `
          .point-editor-highlight {
            outline: 3px solid #2196F3 !important;
            outline-offset: 2px !important;
            background-color: rgba(33, 150, 243, 0.1) !important;
            cursor: pointer !important;
          }
          .point-editor-selected {
            outline: 3px solid #4CAF50 !important;
            outline-offset: 2px !important;
            background-color: rgba(76, 175, 80, 0.2) !important;
          }
          
          /* Hide cookie consent pop-ups and banners */
          [id*="cookie"],
          [class*="cookie"],
          [id*="Cookie"],
          [class*="Cookie"],
          [id*="consent"],
          [class*="consent"],
          [id*="Consent"],
          [class*="Consent"],
          [id*="gdpr"],
          [class*="gdpr"],
          [id*="GDPR"],
          [class*="GDPR"],
          [id*="cookie-banner"],
          [class*="cookie-banner"],
          [id*="cookie-notice"],
          [class*="cookie-notice"],
          [id*="cookie-consent"],
          [class*="cookie-consent"],
          [id*="onetrust"],
          [class*="onetrust"],
          [id*="OneTrust"],
          [class*="OneTrust"],
          [id*="cookiebot"],
          [class*="cookiebot"],
          [id*="Cookiebot"],
          [class*="Cookiebot"],
          [id*="CybotCookiebotDialog"],
          [class*="CybotCookiebotDialog"],
          [data-testid*="cookie"],
          [data-testid*="Cookie"] {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            height: 0 !important;
            width: 0 !important;
            overflow: hidden !important;
            position: absolute !important;
            left: -9999px !important;
            z-index: -9999 !important;
          }
        `;
        iframeDoc.head.appendChild(style);
        this.highlightStyle = style;
        
        const cookieScript = iframeDoc.createElement('script');
        cookieScript.textContent = `
          (function() {
            function hideCookieElements() {
              const selectors = [
                '[id*="cookie"]', '[class*="cookie"]', '[id*="Cookie"]', '[class*="Cookie"]',
                '[id*="consent"]', '[class*="consent"]', '[id*="Consent"]', '[class*="Consent"]',
                '[id*="gdpr"]', '[class*="gdpr"]', '[id*="GDPR"]', '[class*="GDPR"]',
                '[id*="onetrust"]', '[class*="onetrust"]', '[id*="OneTrust"]', '[class*="OneTrust"]',
                '[id*="cookiebot"]', '[class*="cookiebot"]', '[id*="Cookiebot"]', '[class*="Cookiebot"]',
                '[id*="CybotCookiebotDialog"]', '[class*="CybotCookiebotDialog"]'
              ];
              selectors.forEach(selector => {
                try {
                  document.querySelectorAll(selector).forEach(el => {
                    const text = (el.textContent || '').toLowerCase();
                    if (text.includes('cookie') || text.includes('consent') || text.includes('gdpr')) {
                      el.style.cssText = 'display:none!important;visibility:hidden!important;opacity:0!important;height:0!important;width:0!important;position:absolute!important;left:-9999px!important;z-index:-9999!important;';
                    }
                  });
                } catch(e) {}
              });
            }
            hideCookieElements();
            if (document.readyState === 'loading') {
              document.addEventListener('DOMContentLoaded', hideCookieElements);
            }
            setTimeout(hideCookieElements, 500);
            setTimeout(hideCookieElements, 1000);
            setTimeout(hideCookieElements, 2000);
            const observer = new MutationObserver(hideCookieElements);
            observer.observe(document.body, { childList: true, subtree: true });
          })();
        `;
        iframeDoc.head.appendChild(cookieScript);

        iframeDoc.addEventListener('mouseover', this.onElementHover.bind(this), true);
        iframeDoc.addEventListener('mouseout', this.onElementOut.bind(this), true);
        iframeDoc.addEventListener('click', this.onElementClick.bind(this), true);
      } catch (err) {
        console.warn('Could not inject selection script (CORS):', err);
        this.toast.showError('Cannot access iframe content. Please use manual selector input.');
      }
    };
  }

  onElementHover(event: MouseEvent): void {
    if (!this.selectionMode) return;
    
    const target = event.target as HTMLElement;
    if (!target || target === this.selectedElement?.element) return;

    const prevHighlight = this.previewFrame?.nativeElement?.contentDocument?.querySelector('.point-editor-highlight');
    if (prevHighlight) {
      prevHighlight.classList.remove('point-editor-highlight');
    }

    target.classList.add('point-editor-highlight');
  }

  onElementOut(event: MouseEvent): void {
    if (!this.selectionMode) return;
    
    const target = event.target as HTMLElement;
    if (!target || target === this.selectedElement?.element) return;

    target.classList.remove('point-editor-highlight');
  }

  onElementClick(event: MouseEvent): void {
    if (!this.selectionMode) return;
    
    event.preventDefault();
    event.stopPropagation();

    const target = event.target as HTMLElement;
    if (!target) return;

    const prevSelected = this.previewFrame?.nativeElement?.contentDocument?.querySelector('.point-editor-selected');
    if (prevSelected) {
      prevSelected.classList.remove('point-editor-selected');
    }

    target.classList.add('point-editor-selected');
    target.classList.remove('point-editor-highlight');

    const selector = this.generateSelector(target);
    const text = this.extractText(target);

    this.selectedElement = {
      element: target,
      selector,
      text
    };

    this.setupForm.patchValue({ selector });
    // Name is never auto-filled; user must enter it manually.

    this.selectionMode = false;
    this.toast.showSuccess('Element selected! Review the details below.');
  }

  generateSelector(element: HTMLElement): string {
    if (element.id) {
      return `#${element.id}`;
    }

    if (element.className && typeof element.className === 'string') {
      const classes = element.className.split(' ').filter(c => c.trim());
      if (classes.length > 0) {
        const classSelector = '.' + classes.join('.');
        const iframeDoc = this.previewFrame?.nativeElement?.contentDocument;
        if (iframeDoc && iframeDoc.querySelectorAll(classSelector).length === 1) {
          return classSelector;
        }
      }
    }

    for (let i = 0; i < element.attributes.length; i++) {
      const attr = element.attributes[i];
      if (attr.name.startsWith('data-')) {
        const selector = `[${attr.name}="${attr.value}"]`;
        const iframeDoc = this.previewFrame?.nativeElement?.contentDocument;
        if (iframeDoc && iframeDoc.querySelectorAll(selector).length === 1) {
          return selector;
        }
      }
    }

    const path: string[] = [];
    let current: HTMLElement | null = element;

    while (current && current.nodeType === Node.ELEMENT_NODE) {
      let selector = current.tagName.toLowerCase();
      
      if (current.id) {
        selector += `#${current.id}`;
        path.unshift(selector);
        break;
      }
      
      if (current.className && typeof current.className === 'string') {
        const classes = current.className.split(' ').filter(c => c.trim());
        if (classes.length > 0) {
          selector += '.' + classes.join('.');
        }
      }

      const parent: HTMLElement | null = current.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter(
          (child: Element) => (child as HTMLElement).tagName === current!.tagName
        );
        if (siblings.length > 1) {
          const index = siblings.indexOf(current) + 1;
          selector += `:nth-of-type(${index})`;
        }
      }

      path.unshift(selector);
      current = parent;
    }

    return path.join(' > ');
  }

  extractText(element: HTMLElement): string {
    const clone = element.cloneNode(true) as HTMLElement;
    const interactiveElements = clone.querySelectorAll('button, a, input, textarea, select');
    interactiveElements.forEach(el => el.remove());
    return clone.textContent?.trim() || '';
  }

  generateDefaultName(element: HTMLElement | null, text: string): string {
    const shortText = text.substring(0, 30).replace(/\s+/g, ' ');
    
    if (!element) {
      // If no element, try to infer from text or selector
      if (text.length > 0) {
        return `Element: ${shortText}`;
      }
      return 'New Optimization Point';
    }
    
    const tagName = element.tagName.toLowerCase();
    
    if (tagName === 'h1' || tagName === 'h2' || tagName === 'h3') {
      return `Title: ${shortText}`;
    }
    if (tagName === 'button' || (element.closest('button'))) {
      return `CTA: ${shortText}`;
    }
    if (tagName === 'p') {
      return `Text: ${shortText}`;
    }
    
    return `${tagName}: ${shortText}`;
  }

  enableSelectionMode(): void {
    this.selectionMode = true;
    this.toast.showInfo('Click on any element in the preview to select it');
  }

  disableSelectionMode(): void {
    this.selectionMode = false;
  }

  toggleSelectionMode(): void {
    if (this.selectionMode) {
      this.disableSelectionMode();
      this.toast.showInfo('Selection mode cancelled');
    } else {
      this.enableSelectionMode();
    }
  }

  onElementSelected(event: { selector: string; text: string }): void {
    this.selectedElement = {
      element: null, // Not needed anymore
      selector: event.selector,
      text: event.text
    };

    this.setupForm.patchValue({ selector: event.selector });
    // Name is never auto-filled; user must enter it manually.

    this.selectionMode = false;
    this.toast.showSuccess('Element selected! Review the details below.');
  }

  removeHighlightStyle(): void {
    if (this.highlightStyle && this.highlightStyle.parentNode) {
      this.highlightStyle.parentNode.removeChild(this.highlightStyle);
      this.highlightStyle = null;
    }
  }

  getCharacterCount(controlName: string): number {
    const value = this.briefForm.get(controlName)?.value || '';
    return value.length;
  }

  getMaxChars(): number {
    return this.briefForm.get('maxChars')?.value || 0;
  }

  getInfoModalContent(field: string): string {
    const contents: { [key: string]: string } = {
      objective: `
        <p><strong>Explain the element's goal:</strong> What "success" looks like, and the user friction it should address.</p>
        <p><strong>Example objectives:</strong></p>
        <ul>
          <li>Improve clarity and reduce confusion about the pricing structure</li>
          <li>Increase trust and reduce perceived risk in the signup process</li>
          <li>Drive clicks to the pricing page with a clear value proposition</li>
        </ul>
        <p><strong>Common mistakes:</strong></p>
        <ul>
          <li>Too solution-led (focusing on features instead of outcomes)</li>
          <li>Too broad (not specific enough to guide the AI)</li>
          <li>Not measurable (no clear success criteria)</li>
        </ul>
      `,
      context: `
        <p><strong>Capture what's around the element:</strong> Nearby text/visuals, what the user likely knows at this point, key constraints.</p>
        <p><strong>Good context example:</strong></p>
        <p>"User has just seen the pricing table. They know the product costs $99/month. They're comparing plans. The CTA appears right after the feature comparison table."</p>
        <p><strong>Bad context example:</strong></p>
        <p>"User is on the pricing page." (Too vague - doesn't capture the user's mindset or surrounding content)</p>
      `,
      goodIdeas: `
        <p><strong>Suggested angles and structures:</strong> Patterns that fit this element type (H1/CTA/microcopy).</p>
        <p><strong>Example patterns:</strong></p>
        <ul>
          <li>Reassurance-first: "Start your free trial - no credit card required"</li>
          <li>Benefit-first: "Get 3x more conversions with AI-powered copy"</li>
          <li>Process clarity: "See how it works in 2 minutes"</li>
          <li>Social proof: "Join 10,000+ marketers already using this"</li>
        </ul>
        <p><strong>When to use each:</strong> Match the pattern to the user's stage in the funnel and the element's purpose.</p>
      `,
      thingsToAvoid: `
        <p><strong>Known pitfalls and compliance-sensitive language:</strong> "No-go" styles for this client/market.</p>
        <p><strong>Risky phrasing examples:</strong></p>
        <ul>
          <li>Overpromising: "Guaranteed to double your revenue"</li>
          <li>Jargon: "Leverage our synergistic solution"</li>
          <li>Aggressive urgency: "Only 2 hours left! Buy now!"</li>
          <li>Sensitive claims: "FDA approved" (without verification)</li>
        </ul>
        <p><strong>Safer alternatives:</strong> Focus on benefits you can prove, use clear language, create urgency through value, not scarcity.</p>
      `,
      minChars: `
        <p><strong>Why limits matter:</strong> Layout constraints, readability, mobile experience.</p>
        <p><strong>Suggested ranges by element type:</strong></p>
        <ul>
          <li>CTA: 6-18 characters</li>
          <li>H1: 25-60 characters</li>
          <li>Subheadline: 40-80 characters</li>
          <li>Microcopy: 10-50 characters</li>
        </ul>
        <p><strong>What happens if variants exceed limits:</strong> They can be auto-rejected or rewritten to fit the constraints.</p>
      `,
      maxChars: `
        <p><strong>Why limits matter:</strong> Layout constraints, readability, mobile experience.</p>
        <p><strong>Suggested ranges by element type:</strong></p>
        <ul>
          <li>CTA: 6-18 characters</li>
          <li>H1: 25-60 characters</li>
          <li>Subheadline: 40-80 characters</li>
          <li>Microcopy: 10-50 characters</li>
        </ul>
        <p><strong>What happens if variants exceed limits:</strong> They can be auto-rejected or rewritten to fit the constraints.</p>
      `,
      mustIncludeKeywords: `
        <p><strong>Use for required terms:</strong> Product name, "APR", "quote", etc.</p>
        <p><strong>Recommendation:</strong> 0-3 items max. Too many requirements reduces creativity and can harm UX.</p>
        <p><strong>Matching rules:</strong></p>
        <ul>
          <li>Exact match: The keyword must appear exactly as specified</li>
          <li>Contains: The keyword can appear as part of a larger phrase</li>
        </ul>
        <p><strong>Warning:</strong> Over-constraining can lead to awkward or forced copy that doesn't feel natural.</p>
      `,
      mustAvoidTerms: `
        <p><strong>Use for local constraints:</strong> Avoid "free" on CTA, avoid urgency on regulated pages, etc.</p>
        <p><strong>How this interacts with global guardrails:</strong> This is additive - local constraints are in addition to global forbidden terms.</p>
        <p><strong>How violations are handled:</strong> Variants with forbidden terms can be auto-filtered or rewritten to remove the problematic language.</p>
        <p><strong>Example:</strong> If "free" is globally forbidden but you also want to avoid "trial" on this specific CTA, both will be checked.</p>
      `
    };
    return contents[field] || '';
  }

  openInfoModal(title: string, field: string): void {
    const content = this.getInfoModalContent(field);
    this.dialog.open(InfoModalComponent, {
      width: '600px',
      data: { title, content }
    });
  }

  openWhatWillBeFilledModal(): void {
    const content = `
      <ul>
        <li>Qualitative objective</></li>
        <li>Element context</></li>
        <li>Good ideas (optional)</li>
        <li>Things to avoid (optional)</li>
        <li>Suggested length constraints (if empty)</li>
      </ul>
      <p><em>You can edit everything before generating variants.</em></p>
    `;
    this.dialog.open(InfoModalComponent, {
      width: '500px',
      data: { title: 'What the assistant will draft', content }
    });
  }

  get canShowImproveBrief(): boolean {
    const obj = (this.briefForm.get('objective')?.value || '').trim();
    const ctx = (this.briefForm.get('context')?.value || '').trim();
    return obj.length >= this.MIN_CHARS_FOR_IMPROVE || ctx.length >= this.MIN_CHARS_FOR_IMPROVE;
  }

  getBadgeLabel(fieldKey: string): string {
    const state = this.briefFieldState[fieldKey];
    if (!state) return '';
    if (state.source === 'manual') return 'Manual';
    if (state.reviewStatus === 'missing') return 'Missing';
    if (state.reviewStatus === 'needs_review') return 'Needs review';
    if (state.source === 'ai_draft') return 'Auto-filled (Draft)';
    return '';
  }

  getBadgeClass(fieldKey: string): string {
    const state = this.briefFieldState[fieldKey];
    if (!state) return 'brief-badge-default';
    if (state.source === 'manual') return 'brief-badge-manual';
    if (state.reviewStatus === 'missing') return 'brief-badge-missing';
    if (state.reviewStatus === 'needs_review') return 'brief-badge-needs-review';
    return 'brief-badge-draft';
  }

  isManualField(fieldKey: string): boolean {
    return this.briefFieldState[fieldKey]?.source === 'manual';
  }

  isFieldHighlighted(fieldKey: string): boolean {
    return this.highlightFieldsSet.has(fieldKey);
  }

  onBriefFieldInput(fieldKey: string): void {
    this.briefFieldState[fieldKey] = {
      source: 'manual',
      reviewStatus: 'ok',
      lastUpdatedAt: Date.now()
    };
  }

  requestBriefDraft(mode: 'suggest' | 'improve'): void {
    if (!this.projectId || !this.pointId || this.pointId === 'new') {
      this.toast.showError('Save the point first to use the AI brief helper.');
      return;
    }
    this.briefDraftLoading = true;
    const obs = forkJoin({
      guardrails: this.store.getBriefingGuardrails(this.projectId).pipe(take(1)),
      goals: this.goalsApi.getGoals(this.projectId).pipe(take(1))
    }).pipe(
      switchMap(({ guardrails, goals }) => {
        const primary = goals.find((g: Goal) => g.isPrimary);
        const primaryGoalPayload: { type: 'clickSelector' | 'urlReached' | 'dataLayerEvent'; label: string; selector?: string } = primary
          ? {
              type: primary.type,
              label: primary.name || `${primary.type} goal`,
              selector: primary.type === 'clickSelector' ? primary.value : undefined
            }
          : { type: 'urlReached', label: 'Not specified' };
        const targetLanguage = guardrails?.language?.trim() || 'en-US';
        const req = this.buildBriefDraftRequest(mode, primaryGoalPayload, targetLanguage);
        return USE_MOCK_BRIEF_DRAFT
          ? timer(5500).pipe(switchMap(() => of(this.getMockBriefDraftResponse(req))))
          : this.pointsApi.getBriefDraft(this.projectId, this.pointId, req).pipe(
              catchError(err => {
                this.briefDraftLoading = false;
                this.toast.showError('We couldn\'t generate a draft. Please try again.');
                throw err;
              })
            );
      })
    );
    const dialogRef = this.dialog.open(GenerateVariantsProgressComponent, {
      width: '600px',
      disableClose: true,
      data: {
        generateObservable: obs,
        pointName: 'Point Brief Draft'
      } as GenerateVariantsProgressData
    });
    dialogRef.afterClosed().subscribe(result => {
      this.briefDraftLoading = false;
      if (result?.success && result?.data) {
        this.applyDraft(result.data as PointBriefDraftResponse);
        this.toast.showSuccess('Draft applied. Please review before generating variants.');
      } else if (result?.action === 'retry') {
        this.requestBriefDraft(mode);
      }
    });
  }

  private getMockBriefDraftResponse(_req: PointBriefDraftRequest): PointBriefDraftResponse {
    const pointName = _req.point?.pointName || 'this element';
    const elementType = _req.point?.elementType || 'Headline';
    return {
      suggestedFields: {
        qualitativeObjective: `Increase clarity and drive engagement for ${pointName}. Make the value proposition immediately clear and aligned with the page goal.`,
        elementContext: `User is viewing the main conversion area. ${elementType} is above the fold and should reinforce trust and next-step clarity. Surrounding content sets expectations; this element must align in tone and length.`,
        goodIdeas: 'Benefit-first, reassurance, social proof, clear CTA language',
        thingsToAvoid: 'Overpromising, jargon, aggressive urgency, unsubstantiated claims',
        minChars: 15,
        maxChars: 60,
        mustIncludeKeywords: [],
        mustAvoidTerms: ['guaranteed', 'free', 'instant']
      },
      fieldStates: {
        qualitativeObjective: { source: 'ai_draft', reviewStatus: 'ok', confidence: 'high' },
        elementContext: { source: 'ai_draft', reviewStatus: 'ok', confidence: 'medium' },
        goodIdeas: { source: 'ai_draft', reviewStatus: 'ok', confidence: 'medium' },
        thingsToAvoid: { source: 'ai_draft', reviewStatus: 'needs_review', confidence: 'low' },
        minChars: { source: 'ai_draft', reviewStatus: 'ok', confidence: 'medium' },
        maxChars: { source: 'ai_draft', reviewStatus: 'ok', confidence: 'medium' }
      },
      warnings: [
        { code: 'REVIEW_RECOMMENDED', message: 'Review "Things to avoid" for your market and compliance rules.' }
      ]
    };
  }

  private buildBriefDraftRequest(
    mode: 'suggest' | 'improve',
    primaryGoal: { type: 'clickSelector' | 'urlReached' | 'dataLayerEvent'; label: string; selector?: string },
    targetLanguage: string = 'en-US'
  ): PointBriefDraftRequest {
    const pointName = this.setupForm.get('name')?.value || this.point?.name || 'Point';
    const elementTypeRaw = this.setupForm.get('elementType')?.value || this.point?.elementType || 'Other';
    const elementType = this.mapElementTypeForApi(elementTypeRaw);
    const selector = this.setupForm.get('selector')?.value || this.point?.selector || '';
    const deviceScope = this.setupForm.get('deviceScope')?.value || this.point?.deviceScope || 'All';
    const currentElementText = this.point?.text || this.selectedElement?.text || '';
    const objective = this.briefForm.get('objective')?.value ?? '';
    const context = this.briefForm.get('context')?.value ?? '';
    const minCharsVal = this.briefForm.get('minChars')?.value;
    const maxCharsVal = this.briefForm.get('maxChars')?.value;
    const minChars = minCharsVal !== undefined && minCharsVal !== null && minCharsVal !== '' ? Number(minCharsVal) : null;
    const maxChars = maxCharsVal !== undefined && maxCharsVal !== null && maxCharsVal !== '' ? Number(maxCharsVal) : null;

    return {
      mode,
      targetLanguage,
      point: {
        pointName,
        elementType,
        cssSelector: selector,
        deviceScope: String(deviceScope)
      },
      currentElementText: currentElementText || undefined,
      existingBrief: {
        qualitativeObjective: objective,
        elementContext: context,
        goodIdeas: Array.isArray(this.goodIdeas) ? this.goodIdeas.join(', ') : '',
        thingsToAvoid: Array.isArray(this.thingsToAvoid) ? this.thingsToAvoid.join(', ') : '',
        mustIncludeKeywords: Array.isArray(this.mustIncludeKeywords) ? [...this.mustIncludeKeywords] : [],
        mustAvoidTerms: Array.isArray(this.mustAvoidTerms) ? [...this.mustAvoidTerms] : [],
        minChars,
        maxChars
      },
      projectContext: { primaryGoal }
    };
  }

  /** Map API elementType to the display string used in the dropdown (elementTypes). */
  private getDisplayElementType(apiValue?: string): string | undefined {
    if (!apiValue) return undefined;
    const v = String(apiValue);
    const map: Record<string, string> = {
      Title: 'Headline (H1)',
      CTA: 'Call to Action (CTA) Button',
      Subheadline: 'Subheadline / Subheader (H2)',
      Microcopy: 'Supporting Copy / Body Text',
      Other: 'Other'
    };
    return map[v] ?? this.elementTypes.find(display => this.mapElementTypeForApi(display) === v) ?? undefined;
  }

  private mapElementTypeForApi(value: string): string {
    if (!value) return 'Other';
    const v = String(value);
    if (v.includes('H1') || v.includes('Headline')) return 'Title';
    if (v.includes('CTA') || v.includes('Call to Action')) return 'CTA';
    if (v.includes('H2') || v.includes('Subheadline') || v.includes('Subheader')) return 'Subheadline';
    if (v.includes('Form Labels') || v.includes('Helper Text') || v.includes('Trust') || v.includes('Supporting Copy') || v.includes('Benefit Bullets')) return 'Microcopy';
    if (v === 'Title' || v === 'CTA' || v === 'Subheadline' || v === 'Microcopy' || v === 'Other') return v;
    return 'Other';
  }

  private applyDraft(response: PointBriefDraftResponse): void {
    const { suggestedFields, fieldStates } = response;
    if (!suggestedFields) return;

    const fieldsToHighlight: string[] = [];

    if (suggestedFields.qualitativeObjective !== undefined && suggestedFields.qualitativeObjective !== '') {
      this.briefForm.patchValue({ objective: suggestedFields.qualitativeObjective });
      fieldsToHighlight.push('objective');
      this.briefFieldState['objective'] = {
        source: 'ai_draft',
        reviewStatus: fieldStates?.qualitativeObjective?.reviewStatus === 'needs_review' ? 'needs_review' : 'ok',
        lastUpdatedAt: Date.now()
      };
    }

    if (suggestedFields.elementContext !== undefined && suggestedFields.elementContext !== '') {
      this.briefForm.patchValue({ context: suggestedFields.elementContext });
      fieldsToHighlight.push('context');
      this.briefFieldState['context'] = {
        source: 'ai_draft',
        reviewStatus: fieldStates?.elementContext?.reviewStatus === 'needs_review' ? 'needs_review' : 'ok',
        lastUpdatedAt: Date.now()
      };
    }

    // Required fields that are still empty after apply → Missing (per ticket: "Si campo obligatorio quedó vacío → Missing")
    const objectiveValue = (this.briefForm.get('objective')?.value ?? '').toString().trim();
    const contextValue = (this.briefForm.get('context')?.value ?? '').toString().trim();
    if (objectiveValue === '') {
      this.briefFieldState['objective'] = { source: 'ai_draft', reviewStatus: 'missing', lastUpdatedAt: Date.now() };
    }
    if (contextValue === '') {
      this.briefFieldState['context'] = { source: 'ai_draft', reviewStatus: 'missing', lastUpdatedAt: Date.now() };
    }

    if (suggestedFields.goodIdeas !== undefined && suggestedFields.goodIdeas !== '') {
      this.goodIdeas = suggestedFields.goodIdeas.split(/[,;\n]/).map(s => s.trim()).filter(Boolean);
      fieldsToHighlight.push('goodIdeas');
      this.briefFieldState['goodIdeas'] = {
        source: 'ai_draft',
        reviewStatus: fieldStates?.goodIdeas?.reviewStatus === 'needs_review' ? 'needs_review' : 'ok',
        lastUpdatedAt: Date.now()
      };
    }
    if (suggestedFields.thingsToAvoid !== undefined && suggestedFields.thingsToAvoid !== '') {
      this.thingsToAvoid = suggestedFields.thingsToAvoid.split(/[,;\n]/).map(s => s.trim()).filter(Boolean);
      fieldsToHighlight.push('thingsToAvoid');
      this.briefFieldState['thingsToAvoid'] = {
        source: 'ai_draft',
        reviewStatus: fieldStates?.thingsToAvoid?.reviewStatus === 'needs_review' ? 'needs_review' : 'ok',
        lastUpdatedAt: Date.now()
      };
    }
    if (suggestedFields.mustIncludeKeywords?.length) {
      this.mustIncludeKeywords = [...suggestedFields.mustIncludeKeywords];
      fieldsToHighlight.push('mustIncludeKeywords');
      this.briefFieldState['mustIncludeKeywords'] = { source: 'ai_draft', reviewStatus: 'ok', lastUpdatedAt: Date.now() };
    }
    if (suggestedFields.mustAvoidTerms?.length) {
      this.mustAvoidTerms = [...suggestedFields.mustAvoidTerms];
      fieldsToHighlight.push('mustAvoidTerms');
      this.briefFieldState['mustAvoidTerms'] = { source: 'ai_draft', reviewStatus: 'ok', lastUpdatedAt: Date.now() };
    }
    if (suggestedFields.minChars != null) {
      this.briefForm.patchValue({ minChars: suggestedFields.minChars });
      fieldsToHighlight.push('minChars');
      this.briefFieldState['minChars'] = { source: 'ai_draft', reviewStatus: 'ok', lastUpdatedAt: Date.now() };
    }
    if (suggestedFields.maxChars != null) {
      this.briefForm.patchValue({ maxChars: suggestedFields.maxChars });
      fieldsToHighlight.push('maxChars');
      this.briefFieldState['maxChars'] = { source: 'ai_draft', reviewStatus: 'ok', lastUpdatedAt: Date.now() };
    }

    this.triggerFieldHighlights(fieldsToHighlight);
  }

  private triggerFieldHighlights(fieldKeys: string[]): void {
    this.highlightTimeoutIds.forEach(id => clearTimeout(id));
    this.highlightTimeoutIds = [];
    fieldKeys.forEach(k => this.highlightFieldsSet.add(k));
    const duration = 750;
    this.highlightTimeoutIds = fieldKeys.map(k =>
      setTimeout(() => {
        this.highlightFieldsSet.delete(k);
      }, duration)
    );
  }

  loadProjectPreview(): void {
    console.log('[PointDetail] loadProjectPreview called', { projectId: this.projectId });
    if (!this.projectId) {
      console.log('[PointDetail] No projectId, returning');
      return;
    }

    this.loadingPreview = true;
    this.projectsApi.getProject(this.projectId).pipe(take(1)).subscribe({
      next: (project) => {
        console.log('[PointDetail] Project loaded', { pageUrl: project.pageUrl, hasPreviewHtml: !!project.previewHtml });
        if (project.pageUrl) {
          console.log('[PointDetail] Fetching HTML from proxy', project.pageUrl);
          this.apiClient.proxyFetch(project.pageUrl).subscribe({
            next: (response) => {
              console.log('[PointDetail] Proxy fetch response', { hasHtml: !!response.html, htmlLength: response.html?.length });
              if (response.html && response.html.trim().length > 0) {
                const processedHtml = this.removeCookiePopupsFromHtml(response.html);
                this.previewHtml = processedHtml;
                this.originalPreviewHtml = processedHtml;
                console.log('[PointDetail] Preview HTML set', { previewHtmlLength: this.previewHtml.length, originalLength: this.originalPreviewHtml.length });
              }
              this.loadingPreview = false;
            },
            error: (err) => {
              console.error('[PointDetail] Proxy fetch error', err);
              this.toast.showError('Could not load page preview');
              this.loadingPreview = false;
            }
          });
        } else {
          console.log('[PointDetail] No pageUrl in project');
          this.toast.showError('No page URL configured for this project');
          this.loadingPreview = false;
        }
      },
      error: (err) => {
        console.error('[PointDetail] Get project error', err);
        this.loadingPreview = false;
      }
    });
  }

  previewVariant(variant: Variant): void {
    console.log('[PointDetail] ==================== PREVIEW VARIANT CLICKED ====================');
    console.log('[PointDetail] Variant:', variant);
    console.log('[PointDetail] Point:', this.point);
    console.log('[PointDetail] Preview HTML length:', this.previewHtml?.length);
    console.log('[PointDetail] Original HTML length:', this.originalPreviewHtml?.length);
    console.log('[PointDetail] Current highlightSelector:', this.highlightSelector);
    
    if (!this.point || !this.point.selector) {
      console.error('[PointDetail] ERROR: Point or selector not found', { point: this.point });
      this.toast.showError('Point selector not found');
      return;
    }

    if (!this.previewHtml && !this.originalPreviewHtml) {
      console.error('[PointDetail] ERROR: No preview HTML available');
      this.toast.showError('No preview available. Please wait for the preview to load.');
      return;
    }

    if (!this.originalPreviewHtml && this.previewHtml) {
      console.log('[PointDetail] Setting originalPreviewHtml from previewHtml');
      this.originalPreviewHtml = this.previewHtml;
    }

    const baseHtml = this.originalPreviewHtml || this.previewHtml;
    console.log('[PointDetail] Using base HTML:', baseHtml.substring(0, 200));
    console.log('[PointDetail] Applying variant with selector:', this.point.selector, 'and text:', variant.text);

    const modifiedHtml = this.previewService.applyVariantsToHtml(
      baseHtml,
      [variant],
      [this.point]
    );

    console.log('[PointDetail] Modified HTML length:', modifiedHtml?.length);
    console.log('[PointDetail] HTML changed:', baseHtml !== modifiedHtml);
    console.log('[PointDetail] Modified HTML preview:', modifiedHtml.substring(0, 200));

    console.log('[PointDetail] Setting previewHtml (this should trigger ngOnChanges in PreviewPanel)');
    this.previewHtml = modifiedHtml;
    
    this.highlightSelector = '';
    
    setTimeout(() => {
      if (this.point && this.point.selector) {
        this.highlightSelector = this.point.selector;
      }
    }, 50);
    this.toast.showSuccess('Preview updated');
  }

  onPreviewReload(): void {
    this.loadProjectPreview();
  }

  onPreviewReset(): void {
    if (this.originalPreviewHtml) {
      this.previewHtml = this.originalPreviewHtml;
      this.highlightSelector = '';
      this.toast.showSuccess('Preview reset to original');
    }
  }

  /**
   * Remove cookie consent pop-ups and banners from HTML
   */
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
          const elements = doc.querySelectorAll(selector);
          elements.forEach(el => {
            const text = (el.textContent || '').toLowerCase();
            if (text.includes('cookie') || text.includes('consent') || text.includes('gdpr')) {
              el.remove();
            }
          });
        } catch (e) {
        }
      });

      return doc.documentElement.outerHTML;
    } catch (error) {
      return html;
    }
  }
}
