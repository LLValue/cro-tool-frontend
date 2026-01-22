import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import { ActivatedRoute, Router } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
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
import { map } from 'rxjs/operators';
import { BaseChartDirective, provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { ProjectsStoreService } from '../../../data/projects-store.service';
import { OptimizationPoint, Variant, ReportingMetrics, Goal } from '../../../data/models';
import { ToastHelperService } from '../../../shared/toast-helper.service';
import { PageHeaderComponent } from '../../../shared/page-header/page-header.component';

@Component({
  selector: 'app-reporting',
  standalone: true,
  imports: [
    MatTabsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressBarModule,
    MatFormFieldModule,
    MatSelectModule,
    MatCardModule,
    FormsModule,
    CommonModule,
    PageHeaderComponent,
    BaseChartDirective
  ],
  providers: [provideCharts(withDefaultRegisterables())],
  animations: [
    trigger('slideInOut', [
      transition('* => *', [
        query('tr.mat-mdc-row', [
          style({ opacity: 0, transform: 'translateX(-20px)' }),
          stagger(100, [
            animate('400ms ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
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
  animatingMetrics = false;
  previousMetrics: ReportingMetrics[] = [];
  
  // Grouped metrics by goal for Page Overview
  metricsByGoal: Map<string, {
    goal: Goal;
    metrics: ReportingMetrics[];
  }> = new Map();
  displayedColumns: string[] = ['variant', 'users', 'conversions', 'conversionRate', 'confidence'];
  displayedColumnsWithActions: string[] = ['variant', 'users', 'conversions', 'conversionRate', 'confidence', 'actions'];
  private subscriptions = new Subscription();

  // Chart configurations
  public lineChartType: ChartType = 'line' as const;
  public pieChartType: ChartType = 'pie' as const;
  public conversionRateChartData: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: []
  };
  public conversionRateChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top'
      },
      title: {
        display: true,
        text: 'Conversion Rate Over Time'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return (Number(value) * 100).toFixed(1) + '%';
          }
        }
      }
    }
  };

  public distributionChartData: ChartConfiguration<'pie'>['data'] = {
    labels: [],
    datasets: [{
      data: [],
      backgroundColor: []
    }]
  };
  public distributionChartOptions: ChartConfiguration<'pie'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'right'
      },
      title: {
        display: true,
        text: 'Conversions Distribution by Variant'
      }
    }
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private store: ProjectsStoreService,
    private toast: ToastHelperService,
    private cdr: ChangeDetectorRef
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
    }

    this.route.params.subscribe(params => {
      const newProjectId = params['projectId'];
      if (newProjectId && newProjectId !== this.projectId) {
        this.projectId = newProjectId;
        this.loadData();
      }
    });

    if (this.route.parent) {
      this.route.parent.params.subscribe(params => {
        const newProjectId = params['projectId'];
        if (newProjectId && newProjectId !== this.projectId) {
          this.projectId = newProjectId;
          this.loadData();
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
        v.projectId === this.projectId && (v.status === 'active' || v.status === 'discarded')
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

    // Update charts
    this.updateCharts();
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

  private updateCharts(): void {
    const metrics = this.selectedPointId ? this.pointMetrics : this.globalMetrics;
    
    if (metrics.length === 0) {
      this.conversionRateChartData = {
        labels: [],
        datasets: []
      };
      this.distributionChartData = {
        labels: [],
        datasets: [{
          data: [],
          backgroundColor: []
        }]
      };
      return;
    }

    // Line chart: Conversion rates over time (simulated with days)
    const days = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'];
    const datasets = metrics.slice(0, 5).map((metric, index) => {
      const variant = this.variants.find(v => v.id === metric.variantId);
      const baseRate = metric.conversionRate;
      // Simulate daily variation
      const data = days.map((_, dayIndex) => {
        const variation = (Math.random() - 0.5) * 0.1; // ±5% variation
        return Math.max(0, Math.min(1, baseRate + variation));
      });
      
      const colors = [
        'rgba(126, 244, 115, 0.8)',
        'rgba(33, 150, 243, 0.8)',
        'rgba(156, 39, 176, 0.8)',
        'rgba(255, 152, 0, 0.8)',
        'rgba(244, 67, 54, 0.8)'
      ];
      
      return {
        label: variant?.text || `Variant ${index + 1}`,
        data: data,
        borderColor: colors[index % colors.length],
        backgroundColor: colors[index % colors.length].replace('0.8', '0.2'),
        tension: 0.4,
        fill: false
      };
    });

    this.conversionRateChartData = {
      labels: days,
      datasets: datasets
    };

    // Pie chart: Distribution of conversions
    const pieLabels = metrics.map(m => {
      const variant = this.variants.find(v => v.id === m.variantId);
      return variant?.text || 'Unknown';
    });
    const pieData = metrics.map(m => m.conversions);
    const pieColors = [
      'rgba(126, 244, 115, 0.8)',
      'rgba(33, 150, 243, 0.8)',
      'rgba(156, 39, 176, 0.8)',
      'rgba(255, 152, 0, 0.8)',
      'rgba(244, 67, 54, 0.8)',
      'rgba(76, 175, 80, 0.8)',
      'rgba(233, 30, 99, 0.8)',
      'rgba(63, 81, 181, 0.8)'
    ];

    this.distributionChartData = {
      labels: pieLabels,
      datasets: [{
        data: pieData,
        backgroundColor: pieColors.slice(0, pieData.length)
      }]
    };
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
    const activeVariants = this.variants.filter(v => v.status === 'active');
    if (activeVariants.length === 0) {
      this.toast.showError(`No active variants found for project ${this.projectId}. Please create variants first.`);
      return;
    }

    this.simulating = true;
    this.animatingMetrics = true;
    this.previousMetrics = [...this.globalMetrics];
    
    const sub = this.store.simulateTraffic(this.projectId, 7 * 24 * 60 * 60 * 1000, 200).subscribe({
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
      if (variant && metric.conversionRate < threshold && index > 0 && variant.status === 'active') {
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

  previewVariant(variantId: string): void {
    this.router.navigate(['/projects', this.projectId, 'preview'], {
      queryParams: { variant: variantId }
    });
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
}

