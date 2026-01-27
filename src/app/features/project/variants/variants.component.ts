import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormControl, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatBadgeModule } from '@angular/material/badge';
import { CommonModule } from '@angular/common';
import { ProjectsStoreService } from '../../../data/projects-store.service';
import { OptimizationPoint, Variant } from '../../../data/models';
import { ToastHelperService } from '../../../shared/toast-helper.service';
import { PageHeaderComponent } from '../../../shared/page-header/page-header.component';
import { VariantDetailsDialogComponent } from './variant-details-dialog/variant-details-dialog.component';
import { GenerateVariantsProgressComponent, GenerateVariantsProgressData } from '../../../shared/generate-variants-progress/generate-variants-progress.component';
import { map } from 'rxjs/operators';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-variants',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatInputModule,
    MatFormFieldModule,
    MatDialogModule,
    MatBadgeModule,
    CommonModule,
    PageHeaderComponent
  ],
  templateUrl: './variants.component.html',
  styleUrls: ['./variants.component.scss']
})
export class VariantsComponent implements OnInit, OnDestroy {
  points: OptimizationPoint[] = [];
  variants: Variant[] = [];
  selectedPointId: string | null = null;
  filter: 'all' | 'pending' | 'approved' | 'discarded' = 'all';
  projectId: string = '';
  private subscriptions = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private store: ProjectsStoreService,
    private toast: ToastHelperService,
    private dialog: MatDialog
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
      this.loadPoints();
    }

    // Subscribe to params changes (both current and parent)
    const paramsSub = this.route.params.subscribe(params => {
      const newProjectId = params['projectId'];
      if (newProjectId && newProjectId !== this.projectId) {
        this.projectId = newProjectId;
        this.loadPoints();
      }
    });
    this.subscriptions.add(paramsSub);

    // Also subscribe to parent params (for nested routes)
    if (this.route.parent) {
      const parentParamsSub = this.route.parent.params.subscribe(params => {
        const newProjectId = params['projectId'];
        if (newProjectId && newProjectId !== this.projectId) {
          this.projectId = newProjectId;
          this.loadPoints();
        }
      });
      this.subscriptions.add(parentParamsSub);
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

  loadPoints(): void {
    // Ensure projectId is set from route
    const projectId = this.getProjectId();
    if (!projectId) {
      return;
    }
    this.projectId = projectId; // Update instance variable

    // Subscribe to points$ filtered by projectId
    const currentProjectId = this.projectId; // Capture for closure
    const pointsSub = this.store.points$.pipe(
      map(allPoints => allPoints.filter(p => p.projectId === currentProjectId))
    ).subscribe(points => {
      this.points = points;
      if (points.length > 0 && !this.selectedPointId) {
        this.selectPoint(points[0].id);
      }
    });
    this.subscriptions.add(pointsSub);

    // Trigger initial load from API
    this.subscriptions.add(
      this.store.listPoints(currentProjectId).subscribe({
        next: () => {
          // Points will be updated via the points$ subscription above
        },
        error: () => {
          // Silently handle error
        }
      })
    );
  }

  selectPoint(pointId: string): void {
    this.selectedPointId = pointId;
    this.loadVariants();
  }

  loadVariants(): void {
    if (this.selectedPointId) {
      this.store.listVariants(this.selectedPointId).subscribe(variants => {
        this.variants = variants;
      });
    }
  }

  get filteredVariants(): Variant[] {
    let filtered: Variant[];
    if (this.filter === 'all') {
      filtered = this.variants;
    } else {
      filtered = this.variants.filter(v => v.status === this.filter);
    }
    return filtered.sort((a, b) => {
      // First sort by UX score (descending)
      if (b.uxScore !== a.uxScore) {
        return b.uxScore - a.uxScore;
      }
      // Then sort by status (approved first)
      if (a.status === 'approved' && b.status !== 'approved') return -1;
      if (a.status !== 'approved' && b.status === 'approved') return 1;
      return 0;
    });
  }

  generateVariants(): void {
    if (!this.selectedPointId) return;

    const selectedPoint = this.points.find(p => p.id === this.selectedPointId);
    const generateObservable = this.store.generateVariants(this.selectedPointId, 10);
    
    const dialogRef = this.dialog.open(GenerateVariantsProgressComponent, {
      width: '600px',
      disableClose: true,
      data: {
        generateObservable: generateObservable,
        pointName: selectedPoint?.name
      } as GenerateVariantsProgressData
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.action === 'review') {
        // Refresh variants list
        this.loadVariants();
      } else if (result?.action === 'retry') {
        // Retry generation
        this.generateVariants();
      } else if (result?.action === 'fallback') {
        // Generate fallback variants (if backend supports it)
        // For now, just retry
        this.generateVariants();
      }
      // Always refresh variants list
      this.loadVariants();
    });
  }

  updateVariant(variant: Variant): void {
    this.store.updateVariant(variant.id, { text: variant.text });
  }

  approveVariant(id: string): void {
    this.store.approveVariant(id);
    this.toast.showSuccess('Variant approved');
    this.loadVariants();
  }

  unapproveVariant(id: string): void {
    this.store.updateVariant(id, { status: 'discarded' });
    this.toast.showSuccess('Variant disabled');
    this.loadVariants();
  }

  deleteVariant(id: string): void {
    if (confirm('Delete this variant?')) {
      this.store.deleteVariant(id);
      this.toast.showSuccess('Variant deleted');
      this.loadVariants();
    }
  }

  openScoreDialog(variant: Variant, type: 'ux' | 'compliance'): void {
    this.dialog.open(VariantDetailsDialogComponent, {
      data: { variant, type },
      width: '500px'
    });
  }
}

