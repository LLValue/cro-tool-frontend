import { Component, OnInit, OnDestroy, ChangeDetectorRef, Inject, HostListener, ViewChild } from '@angular/core';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import { ActivatedRoute, Router } from '@angular/router';
import { MatTable, MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription, combineLatest } from 'rxjs';
import { BaseChartDirective, provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { Chart, ChartConfiguration } from 'chart.js';

/** Plugin: draws "Winner" badge next to the first bar in horizontal bar charts. */
const chartWinnerBadgePlugin = {
  id: 'chartWinnerBadge',
  afterDraw(chart: Chart) {
    const cfg = (chart as unknown as { config?: { type?: string } }).config;
    if (cfg?.type !== 'bar' || !chart.options?.indexAxis || chart.options.indexAxis !== 'y') return;
    const meta = chart.getDatasetMeta(0);
    if (!meta?.data?.length) return;
    const firstBar = meta.data[0] as unknown as { x: number; y: number };
    const ctx = chart.ctx;
    const x = firstBar.x + 8;
    const y = firstBar.y;
    const padding = 6;
    const text = 'Winner';
    ctx.save();
    ctx.font = '11px Inter, system-ui, sans-serif';
    const width = ctx.measureText(text).width + padding * 2;
    const height = 18;
    const left = x;
    const top = y - height / 2;
    ctx.fillStyle = 'rgba(46, 125, 50, 0.95)';
    ctx.beginPath();
    if (typeof (ctx as CanvasRenderingContext2D & { roundRect?: (x: number, y: number, w: number, h: number, r: number) => void }).roundRect === 'function') {
      (ctx as CanvasRenderingContext2D & { roundRect: (x: number, y: number, w: number, h: number, r: number) => void }).roundRect(left, top, width, height, 4);
    } else {
      ctx.rect(left, top, width, height);
    }
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, left + width / 2, y);
    ctx.restore();
  }
};
Chart.register(chartWinnerBadgePlugin);
import { ProjectsStoreService } from '../../../data/projects-store.service';
import { OptimizationPoint, Variant, ReportingMetrics, Goal } from '../../../data/models';
import { ToastHelperService } from '../../../shared/toast-helper.service';
import { PageHeaderComponent } from '../../../shared/page-header/page-header.component';
import { PreviewPanelComponent } from '../../../shared/preview-panel/preview-panel.component';
import { PreviewService } from '../../../shared/preview.service';
import { ProjectsApiService } from '../../../api/services/projects-api.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { API_CLIENT } from '../../../api/api-client.token';
import { ApiClient } from '../../../api/api-client';
import { take } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SimulationProgressComponent } from '../../../shared/simulation-progress/simulation-progress.component';
import { 
  CombinationRow, 
  CombinationPoint,
  SimulateMonthResponse, 
  SimulationFrame,
  CombinationMetrics,
  SimulationDetailResponse
} from '../../../api-contracts/reporting.contracts';

@Component({
  selector: 'app-reporting',
  standalone: true,
  imports: [
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressBarModule,
    MatFormFieldModule,
    MatSelectModule,
    MatCardModule,
    MatSidenavModule,
    MatTooltipModule,
    FormsModule,
    CommonModule,
    PageHeaderComponent,
    PreviewPanelComponent,
    BaseChartDirective
  ],
  providers: [provideCharts(withDefaultRegisterables())],
  animations: [
    trigger('slideInOut', [
      transition('* => *', [
        query('tr.mat-mdc-row', [
          style({ opacity: 0, transform: 'translateX(-20px)' }),
          stagger(50, [
            animate('400ms ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
          ])
        ], { optional: true })
      ]),
      transition('out => in', [
        query('tr.mat-mdc-row', [
          style({ opacity: 0.5, transform: 'translateY(-10px)' }),
          stagger(30, [
            animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
          ])
        ], { optional: true })
      ])
    ])
  ],
  templateUrl: './reporting.component.html',
  styleUrls: ['./reporting.component.scss']
})
export class ReportingComponent implements OnInit, OnDestroy {
  projectId: string = '';
  points: OptimizationPoint[] = [];
  variants: Variant[] = [];
  goals: Goal[] = [];
  globalMetrics: ReportingMetrics[] = [];
  pointMetrics: ReportingMetrics[] = [];
  private latestMetrics: ReportingMetrics[] = [];
  selectedPointId: string = '';
  selectedGoalType: string = 'all';
  selectedGoalId: string = 'all';
  simulating = false;
  isSimulating = false; // For 30-day simulation
  animatingMetrics = false;
  
  // New properties for 30-day simulation
  combinationRows: CombinationRow[] = [];
  simulationFrames: SimulationFrame[] = [];
  controlMetrics: CombinationMetrics | null = null;
  /** comboId del control (uplift === 0) para usar su CR por día en el gráfico. */
  private controlComboId: string | null = null;
  /** ID de la simulación actual (tras POST simulate-month); para historial/eliminar. */
  currentSimulationId: string | null = null;
  currentFrameIndex = 0;
  previewDrawerOpen = false;
  selectedCombinationForPreview: CombinationRow | null = null;
  /** Pending frame animation timeout; cleared on Reset. */
  private animationTimeoutId: ReturnType<typeof setTimeout> | null = null;
  /** Current top combos for chart 2 tooltip (CR · Uplift). */
  topCombosForChart: CombinationRow[] = [];
  
  // KPI cards data
  controlCR = 0;
  bestCR = 0;
  uplift = 0;
  previousMetrics: ReportingMetrics[] = [];
  previewHtml: string = '';
  originalPreviewHtml: string = '';
  previewUrl: string = '';
  loadingPreview: boolean = false;
  useIframe: boolean = true;
  highlightSelector: string = '';
  
  // Grouped metrics by goal for Page Overview
  metricsByGoal: Map<string, {
    goal: Goal;
    metrics: ReportingMetrics[];
  }> = new Map();
  displayedColumns: string[] = ['variant', 'users', 'conversions', 'conversionRate', 'confidence'];
  displayedColumnsWithExpand: string[] = ['expand', 'variant', 'users', 'conversions', 'conversionRate', 'confidence'];
  combinationColumnsWithExpand: string[] = ['expand', 'combination', 'users', 'conversions', 'conversionRate', 'uplift', 'winProbability', 'preview'];
  
  @ViewChild('combinationTable') combinationTable: MatTable<CombinationRow> | null = null;

  // Track expanded rows
  expandedRows: Set<string> = new Set();
  expandedCombinations: Set<string> = new Set();
  variantPreviewHtml: Map<string, string> = new Map();
  variantHighlightSelector: Map<string, string> = new Map();
  variantLoading: Map<string, boolean> = new Map();
  
  // Track current expanded variant for change detection
  currentExpandedVariantId: string | null = null;
  currentExpandedVariantHtml: string = '';
  private subscriptions = new Subscription();

  // Chart data for simulation (ticket)
  public conversionRateOverTimeChartData: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: []
  };
  public conversionRateOverTimeChartOptions: ChartConfiguration<'line'>['options'] = {};
  
  public winProbabilityChartData: ChartConfiguration<'bar'>['data'] = {
    labels: [],
    datasets: []
  };
  public winProbabilityChartOptions: ChartConfiguration<'bar'>['options'] = {};

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private store: ProjectsStoreService,
    private toast: ToastHelperService,
    private cdr: ChangeDetectorRef,
    private projectsApi: ProjectsApiService,
    private previewService: PreviewService,
    private sanitizer: DomSanitizer,
    private dialog: MatDialog,
    @Inject(API_CLIENT) private apiClient: ApiClient
  ) {}

  ngOnInit(): void {
    const getProjectId = (): string | null => {
      const currentParams = this.route.snapshot.params;
      if (currentParams['projectId']) {
        return currentParams['projectId'];
      }
      const parentParams = this.route.snapshot.parent?.params;
      if (parentParams?.['projectId']) {
        return parentParams['projectId'];
      }
      return null;
    };

    const initialProjectId = getProjectId();
    if (initialProjectId) {
      this.projectId = initialProjectId;
      this.loadData();
      this.loadPreview();
      this.loadSavedSimulation();
    }

    this.route.params.subscribe(params => {
      const newProjectId = params['projectId'];
      if (newProjectId && newProjectId !== this.projectId) {
        this.projectId = newProjectId;
        this.loadData();
        this.loadPreview();
        this.loadSavedSimulation();
      }
    });

    if (this.route.parent) {
      this.route.parent.params.subscribe(params => {
        const newProjectId = params['projectId'];
        if (newProjectId && newProjectId !== this.projectId) {
          this.projectId = newProjectId;
          this.loadData();
          this.loadPreview();
          this.loadSavedSimulation();
        }
      });
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  loadData(): void {
    const pointsSub = this.store.listPoints(this.projectId).subscribe({
      next: points => {
        this.points = points;
        if (points.length > 0 && !this.selectedPointId) {
          this.selectedPointId = points[0].id;
        }
        
        if (points.length > 0) {
          points.forEach(point => {
            const variantsSub = this.store.listVariants(point.id).subscribe();
            this.subscriptions.add(variantsSub);
          });
        }
      },
      error: () => {
        this.points = [];
      }
    });
    this.subscriptions.add(pointsSub);

    const goalsSub = this.store.getGoals(this.projectId).subscribe({
      next: goals => {
        this.goals = goals;
      },
      error: () => {
        this.goals = [];
      }
    });
    this.subscriptions.add(goalsSub);

    const metricsSub = combineLatest([
      this.store.variants$,
      this.store.metrics$
    ]).subscribe(([variants, metricsMap]) => {
      const projectVariants = variants.filter(v => 
        v.projectId === this.projectId && (v.status === 'pending' || v.status === 'approved' || v.status === 'discarded')
      );
      this.variants = projectVariants;
      
      const allMetrics: ReportingMetrics[] = Array.from(metricsMap.values())
        .filter(m => {
          const variant = projectVariants.find(v => v.id === m.variantId);
          return variant !== undefined;
        });

      this.latestMetrics = allMetrics;
      this.recomputeMetrics();
    });
    this.subscriptions.add(metricsSub);

    this.store.getMetrics(this.projectId).subscribe({
      next: () => {},
      error: () => {
        this.globalMetrics = [];
        this.pointMetrics = [];
      }
    });
  }

  /** Carga la última simulación guardada (si existe) y la muestra sin animación. */
  loadSavedSimulation(): void {
    if (!this.projectId) return;
    this.apiClient.resultsSimulationsList(this.projectId).subscribe({
      next: (res) => {
        if (!res.simulations?.length) return;
        const latestId = res.simulations[0].id;
        this.apiClient.resultsSimulationGet(this.projectId, latestId).subscribe({
          next: (detail: SimulationDetailResponse) => {
            this.applySimulationDetail(detail);
          },
          error: () => {}
        });
      },
      error: () => {}
    });
  }

  /** Aplica una simulación completa al estado (detalle desde GET o POST). Sin animación. */
  private applySimulationDetail(detail: SimulateMonthResponse | SimulationDetailResponse): void {
    this.combinationRows = [...detail.combinations].sort((a, b) => b.metrics.conversionRate - a.metrics.conversionRate);
    this.simulationFrames = detail.frames;
    this.controlMetrics = detail.controlMetrics;
    this.controlComboId = detail.combinations.find(c => c.metrics.uplift === 0)?.comboId ?? null;
    this.currentSimulationId = detail.id?.trim() ? detail.id : null;
    this.initializeCharts();
    this.updateKPIs();
    this.markWinnersAndLosers();
    this.cdr.detectChanges();
  }

  updateMetrics(): void {
    this.store.getMetrics(this.projectId).subscribe({
      next: (metrics) => {
        const projectVariants = this.variants;
        const allMetrics: ReportingMetrics[] = (metrics || []).filter(m => {
          const variant = projectVariants.find(v => v.id === m.variantId);
          return variant !== undefined;
        });

        this.latestMetrics = allMetrics;
        this.recomputeMetrics();
      },
      error: () => {
        this.globalMetrics = [];
        this.pointMetrics = [];
      }
    });
  }

  loadPointMetrics(): void {
    this.updateMetrics();
  }

  sortMetrics(metrics: ReportingMetrics[]): ReportingMetrics[] {
    return [...metrics].sort((a, b) => {
      if (b.conversionRate !== a.conversionRate) {
        return b.conversionRate - a.conversionRate;
      }
      return b.confidence - a.confidence;
    });
  }

  getGoalTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      'all': 'All Goals',
      'clickSelector': 'Click Selector',
      'urlReached': 'URL Reached',
      'dataLayerEvent': 'Data Layer Event'
    };
    return labels[type] || type;
  }

  onGoalTypeChange(): void {
    // Reset selected goal when goal type changes
    this.selectedGoalId = 'all';
    // Filter should be instant; no need to refetch
    this.recomputeMetrics();
  }

  private recomputeMetrics(): void {
    const projectVariants = this.variants;
    const filtered = this.applyGoalTypeFilter(this.latestMetrics, this.selectedGoalType);

    // Group metrics by goal for Page Overview
    this.groupMetricsByGoal(filtered);

    // For Page Overview: filter by selected goal if not 'all'
    if (this.selectedGoalId === 'all') {
      this.globalMetrics = this.sortMetrics(filtered);
    } else {
      const goalMetrics = this.metricsByGoal.get(this.selectedGoalId);
      this.globalMetrics = goalMetrics ? this.sortMetrics(goalMetrics.metrics) : [];
    }

    // For By Optimization Point: filter by point
    if (this.selectedPointId) {
      this.pointMetrics = this.sortMetrics(
        filtered.filter(m => {
          const variant = projectVariants.find(v => v.id === m.variantId);
          return variant?.optimizationPointId === this.selectedPointId;
        })
      );
    } else {
      this.pointMetrics = [];
    }
  }

  private groupMetricsByGoal(metrics: ReportingMetrics[]): void {
    this.metricsByGoal.clear();
    
    // Group by goal type and goal ID (when available from backend)
    const goalsByType = new Map<string, Goal[]>();
    this.goals.forEach(goal => {
      if (!goalsByType.has(goal.type)) {
        goalsByType.set(goal.type, []);
      }
      goalsByType.get(goal.type)!.push(goal);
    });

    // For each goal, find its metrics
    goalsByType.forEach((goals, goalType) => {
      goals.forEach(goal => {
        const goalMetrics = metrics.filter(m => m.goalType === goalType);
        if (goalMetrics.length > 0) {
          this.metricsByGoal.set(goal.id, {
            goal: goal,
            metrics: goalMetrics
          });
        }
      });
    });

    // Also add aggregated "all" metrics
    if (metrics.length > 0) {
      this.metricsByGoal.set('all', {
        goal: {
          id: 'all',
          projectId: this.projectId,
          type: 'clickSelector',
          isPrimary: false,
          value: '',
          name: 'All Goals'
        } as Goal,
        metrics: metrics
      });
    }
  }

  getGoalsForType(goalType: string): Goal[] {
    if (goalType === 'all') {
      return Array.from(this.metricsByGoal.values())
        .map(g => g.goal)
        .filter(g => g.id !== 'all');
    }
    return this.goals.filter(g => g.type === goalType);
  }

  onGoalChange(): void {
    this.recomputeMetrics();
  }

  private applyGoalTypeFilter(metrics: ReportingMetrics[], goalType: string): ReportingMetrics[] {
    if (goalType === 'all') {
      // Aggregate metrics across goal types per variant
      const byVariant = new Map<string, { users: number; conversions: number; confidenceSum: number; confidenceWeight: number; pointId: string }>();
      for (const m of metrics) {
        const current = byVariant.get(m.variantId) || { users: 0, conversions: 0, confidenceSum: 0, confidenceWeight: 0, pointId: m.pointId };
        current.users += m.users;
        current.conversions += m.conversions;
        // weight confidence by users (fallback to 1)
        const w = Math.max(1, m.users);
        current.confidenceSum += m.confidence * w;
        current.confidenceWeight += w;
        current.pointId = m.pointId;
        byVariant.set(m.variantId, current);
      }

      return Array.from(byVariant.entries()).map(([variantId, agg]) => {
        const users = agg.users;
        const conversions = agg.conversions;
        return {
          variantId,
          pointId: agg.pointId,
          goalType: 'all',
          users,
          conversions,
          conversionRate: users > 0 ? conversions / users : 0,
          confidence: agg.confidenceWeight > 0 ? Math.round(agg.confidenceSum / agg.confidenceWeight) : 0
        };
      });
    }

    return metrics.filter(m => m.goalType === goalType);
  }

  exportCSV(): void {
    const metrics = this.selectedPointId ? this.pointMetrics : this.globalMetrics;
    if (metrics.length === 0) {
      this.toast.showError('No data to export');
      return;
    }

    const headers = ['Variant', 'Users', 'Conversions', 'Conversion Rate', 'Confidence'];
    const rows = metrics.map(m => {
      const variant = this.variants.find(v => v.id === m.variantId);
      return [
        variant?.text || 'Unknown',
        m.users.toString(),
        m.conversions.toString(),
        (m.conversionRate * 100).toFixed(2) + '%',
        m.confidence.toString() + '%'
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `reporting-${this.projectId}-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.toast.showSuccess('CSV exported successfully');
  }

  simulateTraffic(): void {
    const activeVariants = this.variants.filter(v => v.status === 'approved');
    if (activeVariants.length === 0) {
      this.toast.showError(`No approved variants found for project ${this.projectId}. Please approve variants first.`);
      return;
    }

    this.simulating = true;
    this.animatingMetrics = true;
    this.previousMetrics = [...this.globalMetrics];
    
    // Backend limit: durationMs must be <= 60000 (60 seconds)
    const sub = this.store.simulateTraffic(this.projectId, 60000, 200).subscribe({
      next: () => {
        setTimeout(() => {
          this.animateMetricsUpdate();
        }, 100);
      },
      complete: () => {
        setTimeout(() => {
          this.animateMetricsUpdate();
          setTimeout(() => {
            this.markLosers();
            setTimeout(() => {
              this.simulating = false;
              this.animatingMetrics = false;
              this.toast.showSuccess('Simulation complete');
            }, 500);
          }, 300);
        }, 100);
      },
      error: () => {
        this.simulating = false;
        this.animatingMetrics = false;
        this.updateMetrics();
        this.toast.showError('Simulation failed. Please try again.');
      }
    });
    this.subscriptions.add(sub);
  }

  private animateMetricsUpdate(): void {
    this.updateMetrics();
    this.animatingMetrics = true;
    this.cdr.detectChanges();
    
    setTimeout(() => {
      this.animatingMetrics = false;
      this.cdr.detectChanges();
    }, 1500);
  }

  markLosers(): void {
    if (this.globalMetrics.length === 0) return;

    const sortedMetrics = [...this.globalMetrics].sort((a, b) => {
      if (b.conversionRate !== a.conversionRate) {
        return b.conversionRate - a.conversionRate;
      }
      return b.confidence - a.confidence;
    });

    const maxCR = sortedMetrics[0]?.conversionRate || 0;
    const threshold = maxCR * 0.7;

    sortedMetrics.forEach((metric, index) => {
      const variant = this.variants.find(v => v.id === metric.variantId);
      if (variant && metric.conversionRate < threshold && index > 0 && variant.status === 'approved') {
        this.store.updateVariant(variant.id, { status: 'discarded' });
      }
    });
  }

  getVariantText(variantId: string): string {
    const variant = this.variants.find(v => v.id === variantId);
    return variant?.text || 'Unknown';
  }

  isWinner(metric: ReportingMetrics): boolean {
    if (this.globalMetrics.length === 0) return false;
    const maxCR = Math.max(...this.globalMetrics.map(m => m.conversionRate));
    return metric.conversionRate === maxCR && metric.confidence >= 80;
  }

  isLoser(metric: ReportingMetrics): boolean {
    const variant = this.variants.find(v => v.id === metric.variantId);
    return variant?.status === 'discarded' || false;
  }

  toggleRowExpansion(variantId: string): void {
    if (this.expandedRows.has(variantId)) {
      this.expandedRows.delete(variantId);
      this.currentExpandedVariantId = null;
      this.currentExpandedVariantHtml = '';
      this.cdr.detectChanges();
    } else {
      this.expandedRows.add(variantId);
      this.currentExpandedVariantId = variantId;
      // Load preview when expanding
      this.previewVariant(variantId);
    }
  }

  isRowExpanded(variantId: string): boolean {
    // Use a simple check to avoid change detection loops
    const isExpanded = this.expandedRows.has(variantId);
    return isExpanded;
  }

  isRowExpandedPredicate = (row: ReportingMetrics): boolean => {
    return this.isRowExpanded(row.variantId);
  }

  getPreviewHtmlForVariant(variantId: string): string {
    const variantHtml = this.variantPreviewHtml.get(variantId);
    if (variantHtml && variantHtml.trim().length > 0) {
      return variantHtml;
    }
    // If variant preview not ready, return original or main preview
    const fallback = this.originalPreviewHtml || this.previewHtml || '';
    return fallback;
  }

  getHighlightSelectorForVariant(variantId: string): string {
    return this.variantHighlightSelector.get(variantId) || this.highlightSelector;
  }

  isLoadingVariant(variantId: string): boolean {
    return this.variantLoading.get(variantId) || false;
  }

  trackByVariantId(index: number, row: ReportingMetrics): string {
    return row.variantId;
  }

  previewVariant(variantId: string): void {
    const variant = this.variants.find(v => v.id === variantId);
    if (!variant) {
      this.toast.showError('Variant not found');
      return;
    }

    const point = this.points.find(p => p.id === variant.optimizationPointId);
    if (!point || !point.selector) {
      this.toast.showError('Point selector not found');
      return;
    }

    // If preview is already loaded for this variant, just show it
    if (this.variantPreviewHtml.has(variantId)) {
      return;
    }

    // If original preview is not loaded, load it first
    if (!this.originalPreviewHtml && !this.previewHtml) {
      this.variantLoading.set(variantId, true);
      this.loadPreviewForVariant(variantId, variant, point);
      return;
    }

    // If we have preview but not original, use current preview as original
    if (!this.originalPreviewHtml && this.previewHtml) {
      this.originalPreviewHtml = this.previewHtml;
    }

    // Apply variant to HTML
    this.applyVariantToPreview(variantId, variant, point);
  }

  private loadPreviewForVariant(variantId: string, variant: Variant, point: OptimizationPoint): void {
    if (!this.projectId) {
      this.variantLoading.set(variantId, false);
      this.toast.showError('Project ID not found');
      return;
    }

    this.loadingPreview = true;
    this.store.listProjects().pipe(take(1)).subscribe({
      next: (projects) => {
        const project = projects.find(p => p.id === this.projectId);
        if (project?.pageUrl) {
          this.apiClient.proxyFetch(project.pageUrl).subscribe({
            next: (response) => {
              if (response.html && response.html.trim().length > 0) {
                this.previewHtml = response.html;
                this.originalPreviewHtml = response.html;
                this.useIframe = true;
                this.previewUrl = project.pageUrl;
                
                // Now apply the variant
                this.applyVariantToPreview(variantId, variant, point);
              } else {
                console.error('[Reporting] Empty HTML response');
                this.variantLoading.set(variantId, false);
                this.toast.showError('Could not load page preview');
              }
              this.loadingPreview = false;
            },
            error: (err) => {
              console.error('[Reporting] Error loading preview:', err);
              this.variantLoading.set(variantId, false);
              this.toast.showError('Could not load page preview');
              this.loadingPreview = false;
            }
          });
        } else {
          this.projectsApi.getProject(this.projectId).pipe(take(1)).subscribe({
            next: (project) => {
              if (project?.pageUrl) {
                this.apiClient.proxyFetch(project.pageUrl).subscribe({
                  next: (response) => {
                    if (response.html && response.html.trim().length > 0) {
                      this.previewHtml = response.html;
                      this.originalPreviewHtml = response.html;
                      this.useIframe = true;
                      this.previewUrl = project.pageUrl;
                      
                      // Now apply the variant
                      this.applyVariantToPreview(variantId, variant, point);
                    } else {
                      console.error('[Reporting] Empty HTML response');
                      this.variantLoading.set(variantId, false);
                      this.toast.showError('Could not load page preview');
                    }
                    this.loadingPreview = false;
                  },
                  error: (err) => {
                    console.error('[Reporting] Error loading preview:', err);
                    this.variantLoading.set(variantId, false);
                    this.toast.showError('Could not load page preview');
                    this.loadingPreview = false;
                  }
                });
              } else {
                console.error('[Reporting] No pageUrl in project');
                this.variantLoading.set(variantId, false);
                this.loadingPreview = false;
              }
            },
            error: (err) => {
              console.error('[Reporting] Error getting project:', err);
              this.variantLoading.set(variantId, false);
              this.loadingPreview = false;
            }
          });
        }
      },
      error: (err) => {
        console.error('[Reporting] Error listing projects:', err);
        this.variantLoading.set(variantId, false);
        this.loadingPreview = false;
      }
    });
  }

  private applyVariantToPreview(variantId: string, variant: Variant, point: OptimizationPoint): void {
    // Apply variant to HTML
    const modifiedHtml = this.previewService.applyVariantsToHtml(
      this.originalPreviewHtml || this.previewHtml,
      [variant],
      [point]
    );

    const previewHtml = modifiedHtml;
    const highlightSelector = point.selector || '';
    
    // Store preview for this variant
    this.variantPreviewHtml.set(variantId, previewHtml);
    this.variantHighlightSelector.set(variantId, highlightSelector);
    this.variantLoading.set(variantId, false);
    
    // Update tracked property for change detection
    if (this.currentExpandedVariantId === variantId) {
      this.currentExpandedVariantHtml = previewHtml;
    }
    
    // Also update main preview for backward compatibility
    this.previewHtml = previewHtml;
    
    // Clear any existing highlight first
    this.highlightSelector = '';
    
    // Force change detection to update the view
    this.cdr.markForCheck();
    this.cdr.detectChanges();
    
    // Use setTimeout to ensure change detection picks up the change
    setTimeout(() => {
      // Set the highlight selector to trigger the highlight animation
      this.highlightSelector = highlightSelector;
      
      // Force change detection again after setting highlight
      this.cdr.detectChanges();
      
      // Don't clear the highlight immediately - let it fade out naturally
      // The PreviewPanel will handle the fade-out after ~1 second
    }, 50);
  }

  loadPreview(): void {
    if (!this.projectId) return;

    this.loadingPreview = true;
    this.store.listProjects().pipe(take(1)).subscribe({
      next: (projects) => {
        const project = projects.find(p => p.id === this.projectId);
        if (project?.pageUrl) {
          // Fetch HTML from URL using proxy
          this.apiClient.proxyFetch(project.pageUrl).subscribe({
            next: (response) => {
              if (response.html && response.html.trim().length > 0) {
                this.previewHtml = response.html;
                if (!this.originalPreviewHtml) {
                  this.originalPreviewHtml = response.html;
                }
                this.useIframe = true;
              }
              this.loadingPreview = false;
            },
            error: () => {
              this.toast.showError('Could not load page preview');
              this.loadingPreview = false;
            }
          });
        } else {
          this.projectsApi.getProject(this.projectId).pipe(take(1)).subscribe({
            next: (p) => {
              if (p.pageUrl) {
                this.apiClient.proxyFetch(p.pageUrl).subscribe({
                  next: (response) => {
                    if (response.html && response.html.trim().length > 0) {
                      this.previewHtml = response.html;
                      if (!this.originalPreviewHtml) {
                        this.originalPreviewHtml = response.html;
                      }
                      this.useIframe = true;
                    }
                    this.loadingPreview = false;
                  },
                  error: () => {
                    this.toast.showError('Could not load page preview');
                    this.loadingPreview = false;
                  }
                });
              } else {
                this.toast.showError('No page URL configured for this project');
                this.loadingPreview = false;
              }
            },
            error: () => {
              this.loadingPreview = false;
            }
          });
        }
      },
      error: () => {
        this.loadingPreview = false;
      }
    });
  }

  onPreviewReload(): void {
    this.loadPreview();
  }

  onPreviewReset(): void {
    if (this.originalPreviewHtml) {
      this.previewHtml = this.originalPreviewHtml;
      this.highlightSelector = '';
    }
  }

  getSelectedPoint(): OptimizationPoint | undefined {
    return this.points.find(p => p.id === this.selectedPointId);
  }

  getPointVariantsCount(): number {
    return this.variants.filter(v => v.optimizationPointId === this.selectedPointId).length;
  }

  getMetricsByGoalEntries(): Array<{key: string, value: {goal: Goal, metrics: ReportingMetrics[]}}> {
    return Array.from(this.metricsByGoal.entries()).map(([key, value]) => ({ key, value }));
  }

  // New methods for 30-day simulation
  simulateMonth(): void {
    if (this.isSimulating) {
      return;
    }

    this.isSimulating = true;
    
    const dialogRef = this.dialog.open(SimulationProgressComponent, {
      width: '600px',
      disableClose: true,
      data: {
        simulateObservable: this.apiClient.simulateMonth(this.projectId)
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      this.isSimulating = false;
      
      if (result && result.success) {
        const response = result.data as SimulateMonthResponse;
        this.applySimulationDetail(response);
        this.startSimulationAnimation();
        // Toast shown when animation completes in startSimulationAnimation
      } else if (result && result.cancelled) {
        // User cancelled
      } else if (result && !result.success) {
        this.toast.showError('Simulation failed. Please try again.');
      }
    });
  }

  resetResults(): void {
    if (this.isSimulating) {
      return;
    }

    // Stop any animation in progress (ticket: "Debe parar cualquier animación en curso")
    if (this.animationTimeoutId != null) {
      clearTimeout(this.animationTimeoutId);
      this.animationTimeoutId = null;
    }
    this.animatingMetrics = false;

    const clearResultsState = () => {
      this.combinationRows = [];
      this.simulationFrames = [];
      this.controlMetrics = null;
      this.controlComboId = null;
      this.currentSimulationId = null;
      this.currentFrameIndex = 0;
      this.controlCR = 0;
      this.bestCR = 0;
      this.uplift = 0;
      this.topCombosForChart = [];
      this.initializeCharts();
      this.cdr.detectChanges();
    };

    this.apiClient.resetResults(this.projectId).subscribe({
      next: () => {
        clearResultsState();
        this.toast.showSuccess('Results reset successfully.');
      },
      error: (err) => {
        // Still clear UI so demo works when reset endpoint is not implemented
        clearResultsState();
        this.toast.showError('Failed to reset results. Please try again.');
        console.error('Reset error:', err);
      }
    });
  }

  private startSimulationAnimation(): void {
    if (this.simulationFrames.length === 0) {
      this.updateKPIs();
      this.markWinnersAndLosers();
      this.toast.showSuccess('Simulation completed.');
      this.cdr.detectChanges();
      return;
    }

    // Store previous metrics for comparison
    const previousMetricsMap = new Map<string, CombinationMetrics>();
    this.combinationRows.forEach(combo => {
      previousMetricsMap.set(combo.comboId, { ...combo.metrics });
    });

    const frameIntervalMs = 120; // ~3.6s for 30 frames
    let frameIndex = 0;
    this.animatingMetrics = true;

    const animateFrame = () => {
      if (frameIndex >= this.simulationFrames.length) {
        // Animation complete
        this.animatingMetrics = false;
        this.markWinnersAndLosers();
        this.toast.showSuccess('Simulation completed.');
        this.cdr.detectChanges();
        return;
      }

      const frame = this.simulationFrames[frameIndex];
      this.currentFrameIndex = frameIndex;
      
      // Update combination metrics from frame and track changes
      frame.combos.forEach(frameCombo => {
        const combo = this.combinationRows.find(c => c.comboId === frameCombo.comboId);
        if (combo) {
          const previousMetrics = previousMetricsMap.get(combo.comboId);
          combo.metrics = {
            users: frameCombo.users,
            conversions: frameCombo.conversions,
            conversionRate: frameCombo.conversionRate,
            uplift: frameCombo.uplift,
            winProbability: frameCombo.winProbability
          };
          
          // Update previous metrics map
          previousMetricsMap.set(combo.comboId, { ...combo.metrics });
        }
      });

      // Reorder rows by conversion rate (descending)
      this.combinationRows.sort((a, b) => b.metrics.conversionRate - a.metrics.conversionRate);
      
      // Update charts
      this.updateChartsFromFrame(frame);
      
      // Update KPIs
      this.updateKPIs();
      
      // Force change detection to trigger animations
      this.cdr.detectChanges();
      
      // Add a small delay to allow DOM to update before next frame
      frameIndex++;
      if (frameIndex < this.simulationFrames.length) {
        this.animationTimeoutId = setTimeout(animateFrame, frameIntervalMs);
      } else {
        this.animationTimeoutId = setTimeout(() => {
          this.animationTimeoutId = null;
          this.animatingMetrics = false;
          this.markWinnersAndLosers();
          this.toast.showSuccess('Simulation completed.');
          this.cdr.detectChanges();
        }, frameIntervalMs);
      }
    };

    animateFrame();
  }

  private updateChartsFromFrame(frame: SimulationFrame): void {
    // Update conversion rate over time chart
    const dayLabel = `Day ${frame.day}`;
    const controlInFrame = this.controlComboId
      ? frame.combos.find(c => c.comboId === this.controlComboId)
      : null;
    const controlCR = controlInFrame?.conversionRate ?? this.controlMetrics?.conversionRate ?? 0;

    // Find best combination CR for this frame
    const bestCombo = frame.combos.reduce((best, current) => 
      current.conversionRate > best.conversionRate ? current : best,
      frame.combos[0] || { conversionRate: 0 }
    );

    // Add data point to chart
    if (!this.conversionRateOverTimeChartData.labels) {
      this.conversionRateOverTimeChartData.labels = [];
    }
    if (this.conversionRateOverTimeChartData.labels.length < frame.day) {
      this.conversionRateOverTimeChartData.labels.push(dayLabel);
      
      if (this.conversionRateOverTimeChartData.datasets.length === 0) {
        this.conversionRateOverTimeChartData.datasets = [
          {
            label: 'Control',
            data: [],
            borderColor: 'rgb(75, 192, 192)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            tension: 0.1
          },
          {
            label: 'Best combination',
            data: [],
            borderColor: 'rgb(255, 99, 132)',
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            tension: 0.1
          }
        ];
      }
      
      this.conversionRateOverTimeChartData.datasets[0].data.push(controlCR);
      this.conversionRateOverTimeChartData.datasets[1].data.push(bestCombo.conversionRate);
      // Nueva referencia para que ng2-charts detecte el cambio (Angular OnPush / ngOnChanges)
      this.conversionRateOverTimeChartData = {
        labels: [...(this.conversionRateOverTimeChartData.labels || [])],
        datasets: (this.conversionRateOverTimeChartData.datasets || []).map(ds => ({
          ...ds,
          data: [...(ds.data as number[])]
        }))
      };
    }

    // Update win probability chart (reorder every 2-3 frames to avoid too much movement)
    if (frame.day % 3 === 0) {
      const topCombos = [...this.combinationRows]
        .sort((a, b) => b.metrics.winProbability - a.metrics.winProbability)
        .slice(0, 8);
      this.topCombosForChart = topCombos;
      this.winProbabilityChartData = {
        labels: topCombos.map(c => this.getCombinationLabel(c)),
        datasets: [{
          label: 'Win Probability',
          data: topCombos.map(c => c.metrics.winProbability * 100),
          backgroundColor: topCombos.map((c, i) => i === 0 ? 'rgba(46, 125, 50, 0.8)' : 'rgba(33, 150, 243, 0.8)')
        }]
      };
    }
    this.cdr.detectChanges();
  }

  private initializeCharts(): void {
    // Initialize conversion rate over time chart
    this.conversionRateOverTimeChartData = {
      labels: [],
      datasets: []
    };
    
    this.conversionRateOverTimeChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top'
        },
        title: {
          display: true,
          text: 'Conversion rate over time'
        },
        tooltip: {
          callbacks: {
            label: (context) => `${context.dataset.label ?? ''}: ${(Number(context.parsed.y) * 100).toFixed(2)}%`
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (value: unknown) => (Number(value) * 100).toFixed(2) + '%'
          }
        }
      }
    };

    // Initialize win probability chart (and topCombosForChart for tooltip)
    const topCombos = [...this.combinationRows]
      .sort((a, b) => b.metrics.winProbability - a.metrics.winProbability)
      .slice(0, 8);
    this.topCombosForChart = topCombos;
    this.winProbabilityChartData = {
      labels: topCombos.map(c => this.getCombinationLabel(c)),
      datasets: topCombos.length ? [{
        label: 'Win Probability',
        data: topCombos.map(c => c.metrics.winProbability * 100),
        backgroundColor: topCombos.map((c, i) => i === 0 ? 'rgba(46, 125, 50, 0.8)' : 'rgba(33, 150, 243, 0.8)')
      }] : []
    };
    
    this.winProbabilityChartOptions = {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: { right: 72 }
      },
      plugins: {
        legend: {
          display: false
        },
        title: {
          display: true,
          text: 'Top combinations (win probability)'
        },
        tooltip: {
          callbacks: {
            afterLabel: (context) => {
              const idx = context.dataIndex;
              const combo = this.topCombosForChart[idx];
              if (!combo) return '';
              const cr = this.formatConversionRate(combo.metrics.conversionRate, combo.metrics.users);
              const uplift = this.formatUplift(combo.metrics.uplift, combo.metrics.users);
              return `CR ${cr} · Uplift ${uplift}`;
            }
          }
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          max: 100,
          ticks: {
            callback: (value: unknown) => Number(value).toFixed(0) + '%'
          }
        }
      }
    };
  }

  private updateKPIs(): void {
    if (this.controlMetrics) {
      this.controlCR = this.controlMetrics.conversionRate;
    }
    
    if (this.combinationRows.length > 0) {
      const best = this.combinationRows[0];
      this.bestCR = best.metrics.conversionRate;
      this.uplift = best.metrics.uplift;
    }
  }

  private markWinnersAndLosers(): void {
    // Mark top row as winner
    // Mark bottom 20% as discarded
    const bottomThreshold = Math.floor(this.combinationRows.length * 0.2);
    // This will be handled in the template with CSS classes
  }

  // Formatting methods
  formatCombinationLabel(combo: CombinationRow, truncated: boolean = true): string {
    if (truncated) {
      return combo.points.map(p => {
        const truncatedText = p.variantText.length > 12 
          ? p.variantText.substring(0, 12) + '…' 
          : p.variantText;
        return `${p.pointName}: "${truncatedText}"`;
      }).join('\n');
    } else {
      return combo.points.map(p => 
        `${p.pointName}: ${p.variantText}`
      ).join('\n');
    }
  }

  getCombinationLabel(combo: CombinationRow): string {
    return combo.points.map(p => p.pointName).join(' + ');
  }

  formatUplift(uplift: number, users: number = 0): string {
    if (users < 50 || users === 0) return '—';
    if (uplift === 0) return '—';
    const sign = uplift > 0 ? '+' : '';
    return `${sign}${(uplift * 100).toFixed(2)}%`;
  }

  formatConversionRate(cr: number, users: number): string {
    if (users < 50) return '—';
    return `${(cr * 100).toFixed(2)}%`;
  }

  formatWinProbability(wp: number, users: number): string {
    if (users < 50) return '—';
    return `${(wp * 100).toFixed(0)}%`;
  }

  /** Per-point contribution: uplift when backend exposes pointUplift. */
  formatPointUplift(point: CombinationPoint): string {
    if (point.pointUplift == null) return '—';
    const sign = point.pointUplift > 0 ? '+' : '';
    return `${sign}${(point.pointUplift * 100).toFixed(2)}%`;
  }

  /** Per-point contribution: win probability when backend exposes pointWinProbability. */
  formatPointWinProbability(point: CombinationPoint): string {
    if (point.pointWinProbability == null) return '—';
    return `${(point.pointWinProbability * 100).toFixed(0)}%`;
  }

  /** True when backend exposes pointWinProbability and this point has the highest in the combination. */
  isWinningPoint(point: CombinationPoint, combo: CombinationRow): boolean {
    const withProb = combo.points.filter(p => p.pointWinProbability != null);
    if (withProb.length === 0) return false;
    const maxProb = Math.max(...withProb.map(p => p.pointWinProbability!));
    return point.pointWinProbability != null && point.pointWinProbability >= maxProb;
  }

  truncateText(text: string, maxLength: number): string {
    const t = (text ?? '').trim();
    if (!t) return '—';
    if (t.length <= maxLength) return t;
    return t.substring(0, maxLength) + '…';
  }

  // Preview methods
  previewCombination(combo: CombinationRow): void {
    this.selectedCombinationForPreview = combo;
    this.previewDrawerOpen = true;
    
    // Apply combination to preview
    this.applyCombinationToPreview(combo);
    
    // Force change detection
    this.cdr.detectChanges();
  }

  private applyCombinationToPreview(combo: CombinationRow): void {
    if (!this.originalPreviewHtml) {
      this.loadPreview();
      // Retry after a short delay
      setTimeout(() => {
        if (this.originalPreviewHtml) {
          this.applyCombinationToPreview(combo);
        }
      }, 500);
      return;
    }

    // Apply all variants in combination using applyVariantsToHtml
    const variants = combo.points.map(point => {
      const variant = this.variants.find(v => v.id === point.variantId);
      return variant || { id: point.variantId, text: point.variantText, optimizationPointId: point.pointId } as Variant;
    });
    const points = combo.points.map(point => {
      const optPoint = this.points.find(p => p.id === point.pointId);
      return optPoint || { id: point.pointId, selector: point.cssSelector, name: point.pointName } as OptimizationPoint;
    });
    
    this.previewHtml = this.previewService.applyVariantsToHtml(
      this.originalPreviewHtml,
      variants,
      points
    );
    
    // Highlight all updated elements (fade 800–1200ms per spec)
    const selectors = combo.points.map(p => p.cssSelector).filter(Boolean).join(', ');
    this.highlightSelector = selectors;
    this.cdr.detectChanges();
    setTimeout(() => {
      this.highlightSelector = '';
      this.cdr.detectChanges();
    }, 1100);
  }

  closePreviewDrawer(): void {
    this.previewDrawerOpen = false;
    this.selectedCombinationForPreview = null;
    this.highlightSelector = '';
    this.cdr.detectChanges();
  }

  /** Copy combination texts to clipboard (unfold action). */
  copyCombinationTexts(combo: CombinationRow): void {
    const lines = combo.points.map(p => `${p.pointName} — ${p.variantName}\n"${p.variantText}"`).join('\n\n');
    navigator.clipboard.writeText(lines).then(() => {
      this.toast.showSuccess('Combination texts copied to clipboard.');
    }).catch(() => {
      this.toast.showError('Could not copy to clipboard.');
    });
  }

  /** Re-apply highlight in the preview drawer (optional "Apply highlight" action). */
  applyHighlightInDrawer(): void {
    if (!this.selectedCombinationForPreview) return;
    const selectors = this.selectedCombinationForPreview.points.map(p => p.cssSelector).filter(Boolean).join(', ');
    this.highlightSelector = selectors;
    this.cdr.detectChanges();
    setTimeout(() => {
      this.highlightSelector = '';
      this.cdr.detectChanges();
    }, 1100);
  }

  @HostListener('document:keydown.escape', ['$event'])
  handleEscapeKey(event: KeyboardEvent): void {
    if (this.previewDrawerOpen) {
      this.closePreviewDrawer();
    }
  }

  isCombinationExpanded(comboId: string): boolean {
    return this.expandedCombinations.has(comboId);
  }

  isComboRowExpanded = (_index: number, row: CombinationRow): boolean =>
    this.isCombinationExpanded(row.comboId);

  toggleCombinationExpansion(comboId: string): void {
    const next = new Set(this.expandedCombinations);
    if (next.has(comboId)) {
      next.delete(comboId);
    } else {
      next.add(comboId);
    }
    this.expandedCombinations = next;
    this.cdr.detectChanges();
    this.combinationTable?.renderRows();
  }

  isWinnerCombo(combo: CombinationRow): boolean {
    return this.combinationRows.length > 0 && 
           this.combinationRows[0].comboId === combo.comboId;
  }

  isLoserCombo(combo: CombinationRow): boolean {
    const bottomThreshold = Math.floor(this.combinationRows.length * 0.2);
    const sorted = [...this.combinationRows].sort((a, b) => 
      a.metrics.conversionRate - b.metrics.conversionRate
    );
    return sorted.slice(0, bottomThreshold).some(c => c.comboId === combo.comboId);
  }

  trackByComboId(index: number, combo: CombinationRow): string {
    return combo.comboId;
  }
}

