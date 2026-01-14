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
import { Subscription } from 'rxjs';
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
    this.route.params.subscribe(params => {
      this.projectId = params['projectId'];
      this.loadData();
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  loadData(): void {
    this.store.listPoints(this.projectId).subscribe(points => {
      this.points = points;
      if (points.length > 0) {
        this.selectedPointId = points[0].id;
        this.loadPointMetrics();
      }
    });

    this.store.variants$.subscribe(variants => {
      this.variants = variants.filter(v => v.projectId === this.projectId && v.status === 'active');
    });

    this.store.getMetrics(this.projectId).subscribe(metrics => {
      this.globalMetrics = this.sortMetrics(metrics || []);
    });
  }

  loadPointMetrics(): void {
    if (this.selectedPointId) {
      this.store.getMetrics(this.projectId).subscribe(allMetrics => {
        this.pointMetrics = this.sortMetrics(
          (allMetrics || []).filter(m => {
            const variant = this.variants.find(v => v.id === m.variantId);
            return variant?.optimizationPointId === this.selectedPointId;
          })
        );
      });
    }
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
    this.simulating = true;
    const sub = this.store.simulateTraffic(this.projectId, 6000, 200).subscribe({
      next: () => {
        this.loadData();
        this.loadPointMetrics();
      },
      complete: () => {
        this.simulating = false;
        this.toast.showSuccess('Simulation complete');
      }
    });
    this.subscriptions.add(sub);
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

