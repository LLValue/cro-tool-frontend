import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { ProjectsStoreService } from '../../../data/projects-store.service';
import { OptimizationPoint, Variant, ReportingMetrics } from '../../../data/models';
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
    FormsModule,
    CommonModule,
    PageHeaderComponent
  ],
  templateUrl: './reporting.component.html',
  styleUrls: ['./reporting.component.scss']
})
export class ReportingComponent implements OnInit, OnDestroy {
  projectId: string = '';
  points: OptimizationPoint[] = [];
  variants: Variant[] = [];
  globalMetrics: ReportingMetrics[] = [];
  pointMetrics: ReportingMetrics[] = [];
  selectedPointId: string = '';
  simulating = false;
  displayedColumns: string[] = ['variant', 'users', 'conversions', 'conversionRate', 'confidence'];
  displayedColumnsWithActions: string[] = ['variant', 'users', 'conversions', 'conversionRate', 'confidence', 'actions'];
  private subscriptions = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private store: ProjectsStoreService,
    private toast: ToastHelperService
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

    const metricsSub = combineLatest([
      this.store.variants$,
      this.store.metrics$
    ]).subscribe(([variants, metricsMap]) => {
      const projectVariants = variants.filter(v => v.projectId === this.projectId && v.status === 'active');
      this.variants = projectVariants;
      
      const allMetrics: ReportingMetrics[] = Array.from(metricsMap.values())
        .filter(m => {
          const variant = projectVariants.find(v => v.id === m.variantId);
          return variant !== undefined;
        });

      this.globalMetrics = this.sortMetrics(allMetrics);

      if (this.selectedPointId) {
        this.pointMetrics = this.sortMetrics(
          allMetrics.filter(m => {
            const variant = projectVariants.find(v => v.id === m.variantId);
            return variant?.optimizationPointId === this.selectedPointId;
          })
        );
      } else {
        this.pointMetrics = [];
      }
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

        if (allMetrics.length > 0) {
          this.globalMetrics = this.sortMetrics(allMetrics);

          if (this.selectedPointId) {
            this.pointMetrics = this.sortMetrics(
              allMetrics.filter(m => {
                const variant = projectVariants.find(v => v.id === m.variantId);
                return variant?.optimizationPointId === this.selectedPointId;
              })
            );
          } else {
            this.pointMetrics = [];
          }
        }
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

  simulateTraffic(): void {
    if (this.variants.length === 0) {
      this.toast.showError(`No active variants found for project ${this.projectId}. Please create variants first.`);
      return;
    }

    this.simulating = true;
    const sub = this.store.simulateTraffic(this.projectId, 6000, 200).subscribe({
      next: () => {
        setTimeout(() => {
          this.updateMetrics();
          this.markLosers();
        }, 100);
      },
      complete: () => {
        setTimeout(() => {
          this.simulating = false;
          this.updateMetrics();
          this.markLosers();
          this.toast.showSuccess('Simulation complete');
        }, 100);
      },
      error: () => {
        this.simulating = false;
        this.updateMetrics();
        this.toast.showError('Simulation failed. Please try again.');
      }
    });
    this.subscriptions.add(sub);
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
}

