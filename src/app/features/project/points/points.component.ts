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
import { Subscription, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { SelectorInputDialogComponent } from './selector-input-dialog/selector-input-dialog.component';
import { PointEditorComponent } from './point-editor/point-editor.component';
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
    PageHeaderComponent
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
  private subscriptions = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private store: ProjectsStoreService,
    private toast: ToastHelperService,
    private dialog: MatDialog
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
      v.optimizationPointId === pointId && v.status === 'active'
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

    // Open the editor mode dialog
    const dialogRef = this.dialog.open(PointEditorComponent, {
      width: '95vw',
      maxWidth: '1800px',
      height: '95vh',
      maxHeight: '1200px',
      data: { projectId },
      disableClose: false,
      panelClass: 'point-editor-dialog'
    });

    const dialogSub = dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const addPointSub = this.store.addPoint(projectId, {
          name: result.name,
          selector: result.selector,
          text: result.text || '',
          elementType: result.elementType || 'Other',
          status: 'Active'
        }).subscribe({
          next: () => {
            this.toast.showSuccess('Point created successfully');
          },
          error: () => {
            this.toast.showError('Failed to create point');
          }
        });
        this.subscriptions.add(addPointSub);
      }
    });
    this.subscriptions.add(dialogSub);
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
      status: point.status || 'Active'
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
