import { Component, OnInit, OnDestroy, AfterViewInit, ChangeDetectorRef, Inject, HostListener, ViewChild } from '@angular/core';
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

/** Plugin: draws "Winner" badge next to the first bar in horizontal bar charts. Skipped for win probability chart (that chart shows % only, bar stays green). */
const chartWinnerBadgePlugin = {
  id: 'chartWinnerBadge',
  afterDraw(chart: Chart) {
    if ((chart as unknown as { canvas?: { id?: string } }).canvas?.id === 'winProbabilityChart') return;
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

/** Plugin: draws value (e.g. "87%") to the right of each bar in horizontal bar charts. */
const chartBarValueRightPlugin = {
  id: 'chartBarValueRight',
  afterDatasetsDraw(chart: Chart) {
    const opts = chart.options as { indexAxis?: string };
    if (opts?.indexAxis !== 'y') return;
    const meta = chart.getDatasetMeta(0);
    if (!meta?.data?.length) return;
    const ctx = chart.ctx;
    const data = chart.data.datasets[0]?.data as number[] | undefined;
    if (!data) return;
    ctx.save();
    ctx.font = '12px Inter, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    meta.data.forEach((bar: unknown, i: number) => {
      const b = bar as { x: number; y: number; base: number };
      const value = data[i];
      const label = typeof value === 'number' ? value.toFixed(0) + '%' : String(value);
      const x = Math.max(b.x, b.base) + 8;
      ctx.fillText(label, x, b.y);
    });
    ctx.restore();
  }
};
Chart.register(chartBarValueRightPlugin);

/** Store label tooltip data and current chart by canvas so hover works even when the chart instance is recreated. */
const winProbabilityLabelDataByCanvas = new WeakMap<HTMLCanvasElement, string[][]>();
const winProbabilityChartByCanvas = new WeakMap<HTMLCanvasElement, Chart>();

/** Plugin: custom tooltip with full combination texts when hovering over Y-axis labels (Combination 1, 2, 3...). Bar hover keeps the chart tooltip (Win %, CR, Uplift). */
function createWinProbabilityLabelHoverPlugin(): { id: string; afterInit: (chart: Chart) => void } {
  return {
    id: 'winProbabilityLabelHover',
    afterInit(chart: Chart) {
      const canvas = chart.canvas as HTMLCanvasElement & { id?: string };
      if (canvas.id !== 'winProbabilityChart') return;
      if ((canvas as unknown as { _winProbLabelListener?: boolean })._winProbLabelListener) return;
      (canvas as unknown as { _winProbLabelListener?: boolean })._winProbLabelListener = true;
      let el = document.getElementById('win-probability-label-tooltip');
      if (!el) {
        el = document.createElement('div');
        el.setAttribute('id', 'win-probability-label-tooltip');
        el.style.cssText = 'position:fixed;display:none;max-width:360px;padding:10px 12px;background:rgba(33,33,33,0.95);color:#fff;font-size:12px;line-height:1.4;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.25);z-index:9999;pointer-events:none;white-space:pre-wrap;word-break:break-word;';
        document.body.appendChild(el);
      }
      const show = (lines: string[], clientX: number, clientY: number) => {
        el!.textContent = lines.join('\n');
        el!.style.display = 'block';
        el!.style.left = `${Math.min(clientX + 12, window.innerWidth - 380)}px`;
        el!.style.top = `${Math.max(8, clientY - 8)}px`;
      };
      const hide = () => { el!.style.display = 'none'; };
      const onMouseMove = (e: MouseEvent) => {
        const targetCanvas = e.currentTarget as HTMLCanvasElement;
        const currentChart = winProbabilityChartByCanvas.get(targetCanvas) ?? chart;
        const rect = targetCanvas.getBoundingClientRect();
        const displayX = e.clientX - rect.left;
        const displayY = e.clientY - rect.top;
        const scaleX = targetCanvas.width / rect.width;
        const scaleY = targetCanvas.height / rect.height;
        const x = displayX * scaleX;
        const y = displayY * scaleY;
        const yScale = currentChart.scales['y'];
        const xScale = currentChart.scales['x'];
        if (!yScale || !xScale) return;
        const chartArea = currentChart.chartArea;
        const chartLeft = chartArea?.left ?? 0;
        const chartRight = chartArea?.right ?? targetCanvas.width;
        const chartTop = chartArea?.top ?? 0;
        const chartBottom = chartArea?.bottom ?? targetCanvas.height;
        const labelAreaRight = Math.min(xScale.left, chartLeft + (chartRight - chartLeft) * 0.4);
        const inLabelArea = x >= 0 && x <= labelAreaRight && y >= chartTop && y <= chartBottom;
        if (inLabelArea) {
          const meta = currentChart.getDatasetMeta(0);
          if (!meta?.data?.length) { hide(); return; }
          let closestIndex = 0;
          let minDist = Infinity;
          for (let i = 0; i < meta.data.length; i++) {
            const bar = meta.data[i] as unknown as { y: number };
            const d = Math.abs(bar.y - y);
            if (d < minDist) { minDist = d; closestIndex = i; }
          }
          const labelData = winProbabilityLabelDataByCanvas.get(targetCanvas);
          if (labelData?.[closestIndex]?.length) {
            show(labelData[closestIndex], e.clientX, e.clientY);
            return;
          }
        }
        hide();
      };
      canvas.addEventListener('mousemove', onMouseMove);
      canvas.addEventListener('mouseleave', hide);
    }
  };
}
Chart.register(createWinProbabilityLabelHoverPlugin());

import { ProjectsStoreService } from '../../../data/projects-store.service';
import { OptimizationPoint, Variant, ResultsMetrics, Goal } from '../../../data/models';
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
import { InfoModalComponent } from '../../../shared/info-modal/info-modal.component';
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
} from '../../../api-contracts/results.contracts';

/** One row in the by-point view: a variant of the selected point with aggregated combo metrics. */
export interface PointVariantRow {
  variantId: string;
  variantName: string;
  variantText: string;
  combosCount: number;
  bestConversionRate: number;
  avgConversionRate: number;
  bestWinProbability: number;
  bestUplift: number;
  totalUsers: number;
  totalConversions: number;
  isControl: boolean;
}

@Component({
  selector: 'app-results',
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
          style({ opacity: 0, transform: 'translateX(-16px)' }),
          stagger(60, [
            animate('500ms cubic-bezier(0.25, 0.46, 0.45, 0.94)', style({ opacity: 1, transform: 'translateX(0)' }))
          ])
        ], { optional: true })
      ]),
      transition('out => in', [
        query('tr.mat-mdc-row', [
          style({ opacity: 0.5, transform: 'translateY(-8px)' }),
          stagger(40, [
            animate('400ms cubic-bezier(0.25, 0.46, 0.45, 0.94)', style({ opacity: 1, transform: 'translateY(0)' }))
          ])
        ], { optional: true })
      ])
    ])
  ],
  templateUrl: './results.component.html',
  styleUrls: ['./results.component.scss']
})
export class ResultsComponent implements OnInit, AfterViewInit, OnDestroy {
  projectId: string = '';
  points: OptimizationPoint[] = [];
  variants: Variant[] = [];
  goals: Goal[] = [];
  globalMetrics: ResultsMetrics[] = [];
  pointMetrics: ResultsMetrics[] = [];
  private latestMetrics: ResultsMetrics[] = [];
  selectedPointId: string = '';
  selectedGoalType: string = 'all';
  selectedGoalId: string = 'all';
  /** Filter for results table/charts: 'all' or point id. */
  selectedPointIdFilter: string = 'all';
  /** Filter for results: 'all' or goal id. Default view uses primary goal. */
  selectedGoalIdFilter: string = 'all';
  /** Derived from selectedPointIdFilter: 'byPoint' when a specific point is selected, else 'byGoal'. */
  get resultsViewMode(): 'byGoal' | 'byPoint' {
    return (this.selectedPointIdFilter && this.selectedPointIdFilter !== 'all') ? 'byPoint' : 'byGoal';
  }
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
  /** Label tooltip when hovering over "Combination X" in win probability chart (component-driven). */
  winProbabilityLabelTooltipVisible = false;
  winProbabilityLabelTooltipText = '';
  winProbabilityLabelTooltipX = 0;
  winProbabilityLabelTooltipY = 0;

  // KPI cards: by goal = combo-based, by point = variant-based (same as charts)
  controlCR = 0;
  /** By goal: best CR and uplift from top combination. */
  bestCRByGoal = 0;
  upliftByGoal = 0;
  usersForUpliftByGoal = 0;
  /** By point: best CR and uplift from best variant of selected point. */
  bestCRByPoint = 0;
  upliftByPoint = 0;
  usersForUpliftByPoint = 0;
  /** Values actually shown in KPI cards (set explicitly when switching view). */
  displayedBestCR = 0;
  displayedUplift = 0;
  displayedUsersForUplift = 0;
  /** Legacy single set (used where view is implicit). */
  bestCR = 0;
  uplift = 0;
  previousMetrics: ResultsMetrics[] = [];
  previewHtml: string = '';
  originalPreviewHtml: string = '';
  previewUrl: string = '';
  loadingPreview: boolean = false;
  useIframe: boolean = true;
  highlightSelector: string = '';
  
  // Grouped metrics by goal for Page Overview
  metricsByGoal: Map<string, {
    goal: Goal;
    metrics: ResultsMetrics[];
  }> = new Map();
  displayedColumns: string[] = ['variant', 'users', 'conversions', 'conversionRate', 'confidence'];
  displayedColumnsWithExpand: string[] = ['expand', 'variant', 'users', 'conversions', 'conversionRate', 'confidence'];
  combinationColumnsWithExpand: string[] = ['expand', 'comboId', 'combination', 'users', 'conversions', 'conversionRate', 'uplift', 'winProbability', 'preview'];
  /** Same column set as combination table for consistent UX. */
  pointVariantColumns: string[] = ['expand', 'comboId', 'combination', 'users', 'conversions', 'conversionRate', 'uplift', 'winProbability', 'preview'];

  @ViewChild('combinationTable') combinationTable: MatTable<CombinationRow> | null = null;
  @ViewChild('conversionRateChartGoal') conversionRateChartGoalRef: BaseChartDirective | null = null;
  @ViewChild('conversionRateChartPoint') conversionRateChartPointRef: BaseChartDirective | null = null;
  @ViewChild('winProbabilityChart') winProbabilityChartRef: BaseChartDirective | null = null;

  /** Line chart ref for the current view mode (by goal vs by point use separate canvas so chart is recreated). */
  private get conversionRateChartRef(): BaseChartDirective | null {
    return this.resultsViewMode === 'byGoal' ? this.conversionRateChartGoalRef : this.conversionRateChartPointRef;
  }

  /** Rows to display: byGoal = all combos (goal filter); byPoint = combos for selected point. Sorted by winProbability desc so row index matches chart order. */
  get displayCombinationRows(): CombinationRow[] {
    let rows: CombinationRow[];
    if (this.resultsViewMode === 'byPoint') {
      if (!this.selectedPointIdFilter || this.selectedPointIdFilter === 'all') return [];
      const sid = String(this.selectedPointIdFilter);
      rows = this.combinationRows.filter(c => c.points.some(p => String(p.pointId) === sid));
    } else {
      rows = this.combinationRows;
    }
    return [...rows].sort((a, b) => b.metrics.winProbability - a.metrics.winProbability);
  }

  /** Users count for uplift formatting in by-goal view. */
  get firstDisplayComboUsers(): number {
    return this.usersForUpliftByGoal;
  }

  /** KPI values shown in the cards: derived from current view mode so they always match. */
  get kpiBestCR(): number {
    return this.resultsViewMode === 'byPoint' ? this.bestCRByPoint : this.bestCRByGoal;
  }
  get kpiUplift(): number {
    return this.resultsViewMode === 'byPoint' ? this.upliftByPoint : this.upliftByGoal;
  }
  get kpiUsersForUplift(): number {
    return this.resultsViewMode === 'byPoint' ? this.usersForUpliftByPoint : this.usersForUpliftByGoal;
  }

  /** Rows for by-point view: one row per variant of the selected point (aggregated from combos). */
  get pointVariantRows(): PointVariantRow[] {
    if (this.resultsViewMode !== 'byPoint' || !this.selectedPointIdFilter || this.selectedPointIdFilter === 'all') return [];
    const sid = String(this.selectedPointIdFilter);
    const combosWithPoint = this.combinationRows.filter(c => c.points.some(p => String(p.pointId) === sid));
    const byVariant = new Map<string, { variantId: string; variantName: string; variantText: string; combos: CombinationRow[] }>();
    for (const combo of combosWithPoint) {
      const pointInCombo = combo.points.find(p => String(p.pointId) === sid);
      if (!pointInCombo) continue;
      const key = pointInCombo.variantId;
      if (!byVariant.has(key)) {
        byVariant.set(key, { variantId: pointInCombo.variantId, variantName: pointInCombo.variantName, variantText: pointInCombo.variantText, combos: [] });
      }
      byVariant.get(key)!.combos.push(combo);
    }
    const controlId = this.controlComboId;
    return Array.from(byVariant.values()).map(({ variantId, variantName, variantText, combos }) => {
      const bestCR = combos.length ? Math.max(...combos.map(c => c.metrics.conversionRate)) : 0;
      const bestWP = combos.length ? Math.max(...combos.map(c => c.metrics.winProbability)) : 0;
      const bestUplift = combos.length ? Math.max(...combos.map(c => c.metrics.uplift)) : 0;
      const totalUsers = combos.reduce((s, c) => s + c.metrics.users, 0);
      const totalConversions = combos.reduce((s, c) => s + c.metrics.conversions, 0);
      const avgCR = totalUsers > 0 ? totalConversions / totalUsers : 0;
      const isControl = controlId != null && combos.some(c => c.comboId === controlId);
      return {
        variantId,
        variantName,
        variantText,
        combosCount: combos.length,
        bestConversionRate: bestCR,
        avgConversionRate: avgCR,
        bestWinProbability: bestWP,
        bestUplift,
        totalUsers,
        totalConversions,
        isControl
      };
    }).sort((a, b) => b.bestConversionRate - a.bestConversionRate);
  }

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
  /** Subscriptions for current load (points, goals, metrics). Replaced on each loadData() to avoid accumulation. */
  private dataSubscription = new Subscription();

  // Chart data for simulation (ticket)
  public conversionRateOverTimeChartData: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: []
  };
  /** Dedicated data for by-goal line chart (separate canvas) so it always shows Control + Best. */
  public conversionRateOverTimeChartDataByGoal: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: []
  };
  public conversionRateOverTimeChartOptions: ChartConfiguration<'line'>['options'] = {};
  
  public winProbabilityChartData: ChartConfiguration<'bar'>['data'] = {
    labels: [],
    datasets: [{ label: 'Win Probability', data: [], backgroundColor: [] as string[] }]
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

    // Single param source: parent has projectId when route is project/:projectId/results
    const params$ = this.route.parent ? this.route.parent.params : this.route.params;
    this.subscriptions.add(
      params$.subscribe(params => {
        const newProjectId = params['projectId'];
        if (newProjectId && newProjectId !== this.projectId) {
          this.projectId = newProjectId;
          this.loadData();
          this.loadPreview();
          this.loadSavedSimulation();
        }
      })
    );
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.syncWinProbabilityLabelTooltipData(), 0);
    setTimeout(() => this.syncWinProbabilityLabelTooltipData(), 150);
  }

  ngOnDestroy(): void {
    this.dataSubscription.unsubscribe();
    this.subscriptions.unsubscribe();
  }

  /** Sync label tooltip data to the win probability chart (so hover on "Combination X" shows full texts). Call after chart exists. */
  private syncWinProbabilityLabelTooltipData(): void {
    const chartInstance = this.winProbabilityChartRef?.chart;
    if (!chartInstance || !this.topCombosForChart.length) return;
    const canvas = chartInstance.canvas as HTMLCanvasElement;
    const data = this.topCombosForChart.map(c => c.points.map(p => `${p.pointName}: ${p.variantText || '—'}`));
    winProbabilityLabelDataByCanvas.set(canvas, data);
    winProbabilityChartByCanvas.set(canvas, chartInstance);
  }

  onWinProbabilityChartMouseMove(event: MouseEvent): void {
    const chartInstance = this.winProbabilityChartRef?.chart;
    const canvas = chartInstance?.canvas as HTMLCanvasElement | undefined;
    if (!canvas?.getBoundingClientRect || canvas.id !== 'winProbabilityChart') {
      this.winProbabilityLabelTooltipVisible = false;
      this.cdr.markForCheck();
      return;
    }
    const rect = canvas.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) {
      this.winProbabilityLabelTooltipVisible = false;
      this.cdr.markForCheck();
      return;
    }
    if (!chartInstance?.chartArea || !this.topCombosForChart.length) {
      this.winProbabilityLabelTooltipVisible = false;
      this.cdr.markForCheck();
      return;
    }
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;
    const yScale = chartInstance.scales['y'];
    const xScale = chartInstance.scales['x'];
    if (!yScale || !xScale) {
      this.winProbabilityLabelTooltipVisible = false;
      this.cdr.markForCheck();
      return;
    }
    const chartArea = chartInstance.chartArea;
    const chartLeft = chartArea?.left ?? 0;
    const chartRight = chartArea?.right ?? canvas.width;
    const chartTop = chartArea?.top ?? 0;
    const chartBottom = chartArea?.bottom ?? canvas.height;
    const labelAreaRight = Math.min(xScale.left, chartLeft + (chartRight - chartLeft) * 0.4);
    const inLabelArea = x >= 0 && x <= labelAreaRight && y >= chartTop && y <= chartBottom;
    if (!inLabelArea) {
      this.winProbabilityLabelTooltipVisible = false;
      this.cdr.markForCheck();
      return;
    }
    const meta = chartInstance.getDatasetMeta(0);
    if (!meta?.data?.length) {
      this.winProbabilityLabelTooltipVisible = false;
      this.cdr.markForCheck();
      return;
    }
    let closestIndex = 0;
    let minDist = Infinity;
    for (let i = 0; i < meta.data.length; i++) {
      const bar = meta.data[i] as unknown as { y: number };
      const d = Math.abs(bar.y - y);
      if (d < minDist) {
        minDist = d;
        closestIndex = i;
      }
    }
    const lines = this.topCombosForChart[closestIndex]?.points.map(p => `${p.pointName}: ${p.variantText || '—'}`) ?? [];
    if (lines.length === 0) {
      this.winProbabilityLabelTooltipVisible = false;
      this.cdr.markForCheck();
      return;
    }
    this.winProbabilityLabelTooltipText = lines.join('\n');
    this.winProbabilityLabelTooltipX = Math.min(event.clientX + 12, window.innerWidth - 380);
    this.winProbabilityLabelTooltipY = Math.max(8, event.clientY - 8);
    this.winProbabilityLabelTooltipVisible = true;
    this.cdr.markForCheck();
  }

  onWinProbabilityChartMouseLeave(): void {
    this.winProbabilityLabelTooltipVisible = false;
    this.cdr.markForCheck();
  }

  loadData(): void {
    this.dataSubscription.unsubscribe();
    this.dataSubscription = new Subscription();

    const pointsSub = this.store.listPoints(this.projectId).subscribe({
      next: points => {
        this.points = points;
        if (points.length > 0 && !this.selectedPointId) {
          this.selectedPointId = points[0].id;
        }
        if (points.length > 0) {
          points.forEach(point => {
            const variantsSub = this.store.listVariants(point.id).subscribe();
            this.dataSubscription.add(variantsSub);
          });
        }
      },
      error: () => {
        this.points = [];
      }
    });
    this.dataSubscription.add(pointsSub);

    const goalsSub = this.store.getGoals(this.projectId).subscribe({
      next: goals => {
        this.goals = goals;
        if (goals.length > 0 && this.selectedGoalIdFilter === 'all') {
          const primary = goals.find(g => g.isPrimary) || goals[0];
          this.selectedGoalIdFilter = primary.id;
        }
      },
      error: () => {
        this.goals = [];
      }
    });
    this.dataSubscription.add(goalsSub);

    const metricsSub = combineLatest([
      this.store.variants$,
      this.store.metrics$
    ]).subscribe(([variants, metricsMap]) => {
      const projectVariants = variants.filter(v =>
        v.projectId === this.projectId && (v.status === 'pending' || v.status === 'approved' || v.status === 'discarded')
      );
      this.variants = projectVariants;
      const allMetrics: ResultsMetrics[] = Array.from(metricsMap.values())
        .filter(m => {
          const variant = projectVariants.find(v => v.id === m.variantId);
          return variant !== undefined;
        });
      this.latestMetrics = allMetrics;
      this.recomputeMetrics();
    });
    this.dataSubscription.add(metricsSub);

    const metricsOneSub = this.store.getMetrics(this.projectId).subscribe({
      next: () => {},
      error: () => {
        this.globalMetrics = [];
        this.pointMetrics = [];
      }
    });
    this.dataSubscription.add(metricsOneSub);
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
    this.selectedPointIdFilter = 'all';
    const primary = this.goals.find(g => g.isPrimary) || this.goals[0];
    this.selectedGoalIdFilter = primary?.id ?? 'all';
    this.initializeCharts();
    this.refreshFilteredChartsAndKPIs();
    this.markWinnersAndLosers();
    this.cdr.detectChanges();
  }

  updateMetrics(): void {
    this.store.getMetrics(this.projectId).subscribe({
      next: (metrics) => {
        const projectVariants = this.variants;
        const allMetrics: ResultsMetrics[] = (metrics || []).filter(m => {
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

  sortMetrics(metrics: ResultsMetrics[]): ResultsMetrics[] {
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

  private groupMetricsByGoal(metrics: ResultsMetrics[]): void {
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

  onResultsGoalChange(): void {
    this.refreshFilteredChartsAndKPIs();
  }

  onResultsPointChange(): void {
    this.refreshFilteredChartsAndKPIs();
    this.cdr.detectChanges();
    setTimeout(() => {
      this.updateKPIs();
      this.applyDisplayedKPIsForCurrentView();
      this.cdr.detectChanges();
    }, 0);
  }

  openWinProbabilityInfoModal(): void {
    this.dialog.open(InfoModalComponent, {
      width: '600px',
      data: {
        title: 'Win probability',
        content: '<p>Higher = more likely to be best given current traffic.</p>'
      }
    });
  }

  /** Sets displayed KPI values from current view mode (by goal vs by point). */
  private applyDisplayedKPIsForCurrentView(): void {
    if (this.resultsViewMode === 'byPoint') {
      this.displayedBestCR = this.bestCRByPoint;
      this.displayedUplift = this.upliftByPoint;
      this.displayedUsersForUplift = this.usersForUpliftByPoint;
    } else {
      this.displayedBestCR = this.bestCRByGoal;
      this.displayedUplift = this.upliftByGoal;
      this.displayedUsersForUplift = this.usersForUpliftByGoal;
    }
  }

  getSelectedPointName(): string {
    const p = this.points.find(pt => pt.id === this.selectedPointIdFilter);
    return p?.name ?? '';
  }

  /** Rebuild charts and KPIs: by goal = combos; by point = variants of selected point only. */
  private refreshFilteredChartsAndKPIs(): void {
    this.updateKPIs();

    if (this.resultsViewMode === 'byPoint') {
      this.refreshChartsForByPoint();
      this.updateKPIs();
      this.applyDisplayedKPIsForCurrentView();
      this.combinationTable?.renderRows();
      this.cdr.detectChanges();
      return;
    }

    {
      // By goal: restore combo-based charts and titles
      if (this.conversionRateOverTimeChartOptions?.plugins?.title) {
        (this.conversionRateOverTimeChartOptions.plugins.title as { text?: string }).text = 'Conversion rate over time';
      }
      if (this.winProbabilityChartOptions?.plugins?.title) {
        (this.winProbabilityChartOptions.plugins.title as { text?: string }).text = 'Win probability';
      }

      const rows = this.displayCombinationRows;
      const comboIds = new Set(rows.map(c => c.comboId));
      const topCombos = [...rows]
        .sort((a, b) => b.metrics.winProbability - a.metrics.winProbability)
        .slice(0, 8);
      this.setWinProbabilityChartFromCombos(topCombos);

      if (this.simulationFrames?.length) {
        const labels: string[] = [];
        const controlData: number[] = [];
        const bestData: number[] = [];
        this.simulationFrames.forEach(frame => {
          labels.push(`Day ${frame.day}`);
          const controlInFrame = this.controlComboId
            ? frame.combos.find(c => c.comboId === this.controlComboId)
            : null;
          controlData.push(controlInFrame?.conversionRate ?? this.controlMetrics?.conversionRate ?? 0);
          const filteredCombos = frame.combos.filter(c => comboIds.has(c.comboId));
          const bestInFrame = filteredCombos.length
            ? filteredCombos.reduce((best, c) => c.conversionRate > best.conversionRate ? c : best, filteredCombos[0])
            : null;
          bestData.push(bestInFrame?.conversionRate ?? 0);
        });
        this.conversionRateOverTimeChartDataByGoal = {
          labels,
          datasets: [
            { label: 'Control', data: controlData, borderColor: 'rgb(75, 192, 192)', backgroundColor: 'rgba(75, 192, 192, 0.2)', tension: 0.1 },
            { label: 'Best combination', data: bestData, borderColor: 'rgb(255, 99, 132)', backgroundColor: 'rgba(255, 99, 132, 0.2)', tension: 0.1 }
          ]
        };
      } else {
        this.conversionRateOverTimeChartDataByGoal = { labels: [], datasets: [] };
      }

      this.applyDisplayedKPIsForCurrentView();
      this.combinationTable?.renderRows();
      this.cdr.detectChanges();

      // By-goal line chart is in a separate canvas (*ngIf); it's created after detectChanges.
      // Force update in next tick so the new chart instance receives and draws the data.
      setTimeout(() => {
        this.conversionRateChartGoalRef?.chart?.update('active');
        this.winProbabilityChartRef?.chart?.update('active');
        this.cdr.detectChanges();
      }, 0);
    }
  }

  /** Charts for by-point view: same as by-goal — Control line + one line per variant (CR over time). */
  private refreshChartsForByPoint(framesToUse?: SimulationFrame[]): void {
    const frames = framesToUse ?? this.simulationFrames ?? [];
    const pointId = this.selectedPointIdFilter;
    if (!pointId || pointId === 'all' || !frames.length) {
      this.setWinProbabilityChartFromPointVariants([]);
      this.conversionRateOverTimeChartData = { labels: [], datasets: [] };
      if (this.conversionRateOverTimeChartOptions?.plugins?.title) {
        (this.conversionRateOverTimeChartOptions.plugins.title as { text?: string }).text = 'Conversion rate over time';
      }
      return;
    }
    const pointIdStr = String(pointId);
    const controlComboId = this.controlComboId;

    const comboToVariant = new Map<string, string>();
    for (const combo of this.combinationRows) {
      const p = combo.points.find(pt => String(pt.pointId) === pointIdStr);
      if (p) comboToVariant.set(combo.comboId, p.variantId);
    }
    const controlVariantId = controlComboId != null ? comboToVariant.get(controlComboId) ?? null : null;

    const variantOrder = [...new Set(comboToVariant.values())];
    const variantLabels = new Map<string, string>();
    for (const combo of this.combinationRows) {
      const p = combo.points.find(pt => String(pt.pointId) === pointIdStr);
      if (p && !variantLabels.has(p.variantId)) variantLabels.set(p.variantId, p.variantText.length > 20 ? p.variantText.slice(0, 20) + '…' : p.variantText);
    }

    const labels: string[] = [];
    frames.forEach(frame => labels.push(`Day ${frame.day}`));

    const datasets: { label: string; data: number[]; borderColor: string; backgroundColor: string; tension: number }[] = [];

    // 1) Control line (same as by-goal): CR of the control combo per frame
    const controlData: number[] = [];
    frames.forEach(frame => {
      const controlInFrame = controlComboId ? frame.combos.find(c => c.comboId === controlComboId) : null;
      controlData.push(controlInFrame?.conversionRate ?? this.controlMetrics?.conversionRate ?? 0);
    });
    datasets.push({
      label: 'Control',
      data: controlData,
      borderColor: 'rgb(75, 192, 192)',
      backgroundColor: 'rgba(75, 192, 192, 0.2)',
      tension: 0.1
    });

    // 2) One line per variant (excluding control — already shown as Control). Same order as by-goal style: control first, then others.
    const variantColors = ['rgb(255, 99, 132)', 'rgb(255, 205, 86)', 'rgb(54, 162, 235)', 'rgb(153, 102, 255)', 'rgb(201, 203, 207)'];
    variantOrder.forEach((variantId, idx) => {
      if (variantId === controlVariantId) return; // already drawn as Control
      const data: number[] = [];
      frames.forEach(frame => {
        const rates = frame.combos
          .filter(c => comboToVariant.get(c.comboId) === variantId)
          .map(c => c.conversionRate);
        const avg = rates.length ? rates.reduce((a, b) => a + b, 0) / rates.length : 0;
        data.push(avg);
      });
      const color = variantColors[idx % variantColors.length];
      datasets.push({
        label: variantLabels.get(variantId) ?? variantId,
        data,
        borderColor: color,
        backgroundColor: color.replace('rgb', 'rgba').replace(')', ', 0.2)'),
        tension: 0.1
      });
    });

    this.conversionRateOverTimeChartData = { labels, datasets };
    if (this.conversionRateOverTimeChartOptions?.plugins?.title) {
      (this.conversionRateOverTimeChartOptions.plugins.title as { text?: string }).text = 'Conversion rate over time';
    }

    const variantRows = this.pointVariantRows;
    this.setWinProbabilityChartFromPointVariants(variantRows);
    if (this.winProbabilityChartOptions?.plugins?.title) {
      (this.winProbabilityChartOptions.plugins.title as { text?: string }).text = 'Variants (win probability)';
    }
  }

  /** Updates win probability chart with variant rows (by-point view). */
  private setWinProbabilityChartFromPointVariants(rows: PointVariantRow[]): void {
    const d = this.winProbabilityChartData;
    if (!d.datasets?.length || !d.labels) return;
    const labelList = rows.map(r => r.variantText.length > 25 ? r.variantText.slice(0, 25) + '…' : r.variantText);
    const data = rows.map(r => r.bestWinProbability * 100);
    const backgroundColor = rows.map((_, i) => i === 0 ? 'rgba(46, 125, 50, 0.8)' : 'rgba(33, 150, 243, 0.8)');
    d.labels.length = 0;
    d.labels.push(...labelList);
    d.datasets[0].data.length = 0;
    (d.datasets[0].data as number[]).push(...data);
    (d.datasets[0].backgroundColor as string[]).length = 0;
    (d.datasets[0].backgroundColor as string[]).push(...backgroundColor);
    this.winProbabilityChartRef?.chart?.update('active');
  }

  private applyGoalTypeFilter(metrics: ResultsMetrics[], goalType: string): ResultsMetrics[] {
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
    link.setAttribute('download', `results-${this.projectId}-${new Date().toISOString().split('T')[0]}.csv`);
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

  isWinner(metric: ResultsMetrics): boolean {
    if (this.globalMetrics.length === 0) return false;
    const maxCR = Math.max(...this.globalMetrics.map(m => m.conversionRate));
    return metric.conversionRate === maxCR && metric.confidence >= 80;
  }

  isLoser(metric: ResultsMetrics): boolean {
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

  isRowExpandedPredicate = (row: ResultsMetrics): boolean => {
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

  trackByVariantId(index: number, row: ResultsMetrics): string {
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
                console.error('[Results] Empty HTML response');
                this.variantLoading.set(variantId, false);
                this.toast.showError('Could not load page preview');
              }
              this.loadingPreview = false;
            },
            error: (err) => {
              console.error('[Results] Error loading preview:', err);
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
                      console.error('[Results] Empty HTML response');
                      this.variantLoading.set(variantId, false);
                      this.toast.showError('Could not load page preview');
                    }
                    this.loadingPreview = false;
                  },
                  error: (err) => {
                    console.error('[Results] Error loading preview:', err);
                    this.variantLoading.set(variantId, false);
                    this.toast.showError('Could not load page preview');
                    this.loadingPreview = false;
                  }
                });
              } else {
                console.error('[Results] No pageUrl in project');
                this.variantLoading.set(variantId, false);
                this.loadingPreview = false;
              }
            },
            error: (err) => {
              console.error('[Results] Error getting project:', err);
              this.variantLoading.set(variantId, false);
              this.loadingPreview = false;
            }
          });
        }
      },
      error: (err) => {
        console.error('[Results] Error listing projects:', err);
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

  getMetricsByGoalEntries(): Array<{key: string, value: {goal: Goal, metrics: ResultsMetrics[]}}> {
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
    if (this.resultsViewMode === 'byPoint') {
      this.refreshChartsForByPoint(this.simulationFrames.slice(0, this.currentFrameIndex + 1));
      this.cdr.detectChanges();
      return;
    }

    const rows = this.displayCombinationRows;
    const comboIds = new Set(rows.map(c => c.comboId));

    const dayLabel = `Day ${frame.day}`;
    const controlInFrame = this.controlComboId
      ? frame.combos.find(c => c.comboId === this.controlComboId)
      : null;
    const controlCR = controlInFrame?.conversionRate ?? this.controlMetrics?.conversionRate ?? 0;

    const filteredFrameCombos = frame.combos.filter(c => comboIds.has(c.comboId));
    const bestInFrame = filteredFrameCombos.length
      ? filteredFrameCombos.reduce((best, c) => c.conversionRate > best.conversionRate ? c : best, filteredFrameCombos[0])
      : null;
    const bestCR = bestInFrame?.conversionRate ?? 0;

    const chartData = this.conversionRateOverTimeChartDataByGoal;
    if (!chartData.labels) {
      chartData.labels = [];
    }
    if (chartData.labels.length < frame.day) {
      chartData.labels.push(dayLabel);
      
      if (!chartData.datasets?.length) {
        chartData.datasets = [
          {
            label: 'Control',
            data: [] as number[],
            borderColor: 'rgb(75, 192, 192)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            tension: 0.1
          },
          {
            label: 'Best combination',
            data: [] as number[],
            borderColor: 'rgb(255, 99, 132)',
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            tension: 0.1
          }
        ];
      }
      
      (chartData.datasets[0].data as number[]).push(controlCR);
      (chartData.datasets[1].data as number[]).push(bestCR);
      this.conversionRateChartGoalRef?.chart?.update('active');
    }

    if (frame.day % 3 === 0) {
      const topCombos = [...rows]
        .sort((a, b) => b.metrics.winProbability - a.metrics.winProbability)
        .slice(0, 8);
      this.setWinProbabilityChartFromCombos(topCombos);
    }
    this.cdr.detectChanges();
  }

  private initializeCharts(): void {
    this.conversionRateOverTimeChartData = { labels: [], datasets: [] };
    this.conversionRateOverTimeChartDataByGoal = { labels: [], datasets: [] };

    const totalDuration = 2800;
    const getDataLen = (ctx: { chart?: Chart }): number =>
      (ctx.chart?.data?.labels?.length ?? ctx.chart?.data?.datasets?.[0]?.data?.length ?? 30);
    const delayBetweenPoints = (ctx: { chart?: Chart; type?: string; index?: number; xStarted?: boolean; yStarted?: boolean; datasetIndex?: number }) => {
      if (ctx.type !== 'data') return 0;
      const len = getDataLen(ctx);
      return (ctx.index ?? 0) * (totalDuration / Math.max(1, len));
    };
    const segmentDuration = (ctx: { chart?: Chart }) => totalDuration / Math.max(1, getDataLen(ctx));
    const previousY = (ctx: { chart?: Chart; index?: number; datasetIndex?: number }) => {
      const yScale = ctx.chart?.scales?.['y'];
      if (!ctx.chart || ctx.index === 0) {
        return yScale?.getPixelForValue(0) ?? 0;
      }
      const meta = ctx.chart.getDatasetMeta(ctx.datasetIndex ?? 0);
      const prev = meta?.data?.[(ctx.index ?? 1) - 1];
      const props = (prev as unknown as { getProps?(keys: string[], mode: boolean): Record<string, unknown> })?.getProps?.(['y'], true);
      const py = props && 'y' in props ? props['y'] : undefined;
      return (typeof py === 'number' ? py : yScale?.getPixelForValue(0)) ?? 0;
    };

    // Progressive line: points animate in one-by-one (Chart.js sample: options.animation.x / .y)
    const progressiveAnimation = {
      duration: totalDuration,
      x: {
        type: 'number' as const,
        easing: 'easeOutQuart' as const,
        duration: segmentDuration,
        from: NaN,
        delay(ctx: { type?: string; index?: number; xStarted?: boolean; chart?: Chart }) {
          if (ctx.type !== 'data' || ctx.xStarted) return 0;
          (ctx as { xStarted?: boolean }).xStarted = true;
          return delayBetweenPoints(ctx);
        }
      },
      y: {
        type: 'number' as const,
        easing: 'easeOutQuart' as const,
        duration: segmentDuration,
        from: previousY,
        delay(ctx: { type?: string; index?: number; yStarted?: boolean; chart?: Chart; datasetIndex?: number }) {
          if (ctx.type !== 'data' || ctx.yStarted) return 0;
          (ctx as { yStarted?: boolean }).yStarted = true;
          return delayBetweenPoints(ctx);
        }
      }
    };

    this.conversionRateOverTimeChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      animation: progressiveAnimation as unknown as typeof this.conversionRateOverTimeChartOptions extends { animation?: infer A } ? A : never,
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

    // Initialize win probability chart only (topCombosForChart for tooltip)
    const topCombos = [...this.combinationRows]
      .sort((a, b) => b.metrics.winProbability - a.metrics.winProbability)
      .slice(0, 8);
    this.setWinProbabilityChartFromCombos(topCombos);

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
          text: 'Win probability'
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

  /** Updates only the win probability chart (mutate in place + update('active')). Does not touch the line chart. */
  private setWinProbabilityChartFromCombos(topCombos: CombinationRow[]): void {
    this.topCombosForChart = topCombos;
    const labels = topCombos.map((c, i) => `Combination ${i + 1}`);
    const data = topCombos.map(c => c.metrics.winProbability * 100);
    const backgroundColor = topCombos.map((c, i) => i === 0 ? 'rgba(46, 125, 50, 0.8)' : 'rgba(33, 150, 243, 0.8)');
    const d = this.winProbabilityChartData;
    if (!d.datasets?.length || !d.labels) return;
    d.labels.length = 0;
    d.labels.push(...labels);
    d.datasets[0].data.length = 0;
    (d.datasets[0].data as number[]).push(...data);
    (d.datasets[0].backgroundColor as string[]).length = 0;
    (d.datasets[0].backgroundColor as string[]).push(...backgroundColor);
    this.winProbabilityChartRef?.chart?.update('active');
    this.syncWinProbabilityLabelTooltipData();
  }

  private updateKPIs(): void {
    if (this.controlMetrics) {
      this.controlCR = this.controlMetrics.conversionRate;
    }
    const rows = this.combinationRows;
    if (rows.length > 0) {
      const bestCombo = rows[0];
      this.bestCRByGoal = bestCombo.metrics.conversionRate;
      this.upliftByGoal = bestCombo.metrics.uplift;
      this.usersForUpliftByGoal = bestCombo.metrics.users;
    } else {
      this.bestCRByGoal = 0;
      this.upliftByGoal = 0;
      this.usersForUpliftByGoal = 0;
    }
    const variantRows = this.pointVariantRows;
    if (variantRows.length > 0) {
      const bestVariant = variantRows.reduce((a, b) => a.bestConversionRate >= b.bestConversionRate ? a : b);
      this.bestCRByPoint = bestVariant.bestConversionRate;
      this.upliftByPoint = this.controlCR > 0 ? (this.bestCRByPoint - this.controlCR) / this.controlCR : 0;
      this.usersForUpliftByPoint = bestVariant.totalUsers;
    } else {
      this.bestCRByPoint = 0;
      this.upliftByPoint = 0;
      this.usersForUpliftByPoint = 0;
    }
    this.bestCR = this.resultsViewMode === 'byPoint' ? this.bestCRByPoint : this.bestCRByGoal;
    this.uplift = this.resultsViewMode === 'byPoint' ? this.upliftByPoint : this.upliftByGoal;
    this.displayedBestCR = this.resultsViewMode === 'byPoint' ? this.bestCRByPoint : this.bestCRByGoal;
    this.displayedUplift = this.resultsViewMode === 'byPoint' ? this.upliftByPoint : this.upliftByGoal;
    this.displayedUsersForUplift = this.resultsViewMode === 'byPoint' ? this.usersForUpliftByPoint : this.usersForUpliftByGoal;
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
    const rows = this.displayCombinationRows;
    return rows.length > 0 && rows[0].comboId === combo.comboId;
  }

  isControlCombo(combo: CombinationRow): boolean {
    return combo.metrics.uplift === 0;
  }

  isLoserCombo(combo: CombinationRow): boolean {
    const rows = this.displayCombinationRows;
    if (rows.length === 0) return false;
    const bottomThreshold = Math.floor(rows.length * 0.2);
    const bottomStart = rows.length - bottomThreshold;
    const index = rows.findIndex(r => r.comboId === combo.comboId);
    return index >= bottomStart && index >= 0;
  }

  trackByComboId(index: number, combo: CombinationRow): string {
    return combo.comboId;
  }

  /** 1-based display index of combo in the table (matches chart bar position when chart shows top N). */
  getCombinationDisplayIndex(combo: CombinationRow): number {
    const rows = this.displayCombinationRows;
    const idx = rows.findIndex(c => c.comboId === combo.comboId);
    return idx >= 0 ? idx + 1 : 0;
  }

  /** Full combination text for tooltip (pointName: variantText per point). */
  getCombinationFullTooltip(combo: CombinationRow): string {
    return combo.points.map(p => `${p.pointName}: ${p.variantText || '—'}`).join('\n');
  }

  /** By-point table: 1-based display index. */
  getPointVariantDisplayIndex(row: PointVariantRow): number {
    const rows = this.pointVariantRows;
    const idx = rows.findIndex(r => r.variantId === row.variantId);
    return idx >= 0 ? idx + 1 : 0;
  }

  isControlPointVariant(row: PointVariantRow): boolean {
    return row.isControl;
  }

  isWinnerPointVariant(row: PointVariantRow): boolean {
    const rows = this.pointVariantRows;
    return rows.length > 0 && rows[0].variantId === row.variantId;
  }

  isLoserPointVariant(row: PointVariantRow): boolean {
    const rows = this.pointVariantRows;
    if (rows.length === 0) return false;
    const bottomThreshold = Math.floor(rows.length * 0.2);
    const bottomStart = rows.length - bottomThreshold;
    const index = rows.findIndex(r => r.variantId === row.variantId);
    return index >= bottomStart && index >= 0;
  }

  /** Preview one combo that contains this variant (best CR). */
  previewPointVariant(row: PointVariantRow): void {
    const sid = String(this.selectedPointIdFilter);
    const combo = this.combinationRows
      .filter(c => c.points.some(p => String(p.pointId) === sid && p.variantId === row.variantId))
      .sort((a, b) => b.metrics.conversionRate - a.metrics.conversionRate)[0];
    if (combo) this.previewCombination(combo);
  }
}

