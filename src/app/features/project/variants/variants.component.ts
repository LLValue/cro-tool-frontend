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
  template: `
    <app-page-header title="Variants">
      <button mat-raised-button color="primary" (click)="generateVariants()" [disabled]="!selectedPointId">
        <mat-icon>auto_fix_high</mat-icon>
        Generate 10
      </button>
    </app-page-header>

    <div class="variants-container">
      <div class="points-list">
        <h3>Optimization Points</h3>
        <div *ngIf="points.length === 0" class="empty-points">
          <p>No points created yet. Create points in the Points page first.</p>
        </div>
        <mat-card *ngFor="let point of points" 
                  class="point-card" 
                  [class.selected]="selectedPointId === point.id"
                  (click)="selectPoint(point.id)">
          <mat-card-content>
            <strong>{{ point.name }}</strong>
            <p *ngIf="point.selector"><code>{{ point.selector }}</code></p>
            <p *ngIf="!point.selector" class="no-selector">No selector set</p>
          </mat-card-content>
        </mat-card>
      </div>

      <div class="variants-list">
        <div class="variants-header">
          <h3>Variants</h3>
          <mat-chip-set>
            <mat-chip (click)="filter = 'all'" [class.selected]="filter === 'all'">All</mat-chip>
            <mat-chip (click)="filter = 'active'" [class.selected]="filter === 'active'">Active</mat-chip>
            <mat-chip (click)="filter = 'discarded'" [class.selected]="filter === 'discarded'">Discarded</mat-chip>
          </mat-chip-set>
        </div>

        <div *ngFor="let variant of filteredVariants" class="variant-card">
          <mat-card>
            <mat-card-header>
              <mat-card-title>
                <mat-form-field appearance="outline" class="variant-text-input">
                  <textarea matInput [(ngModel)]="variant.text" (blur)="updateVariant(variant)"></textarea>
                </mat-form-field>
              </mat-card-title>
              <mat-card-subtitle>
                <mat-chip [class]="'status-' + variant.status">{{ variant.status }}</mat-chip>
                <span class="source-badge">{{ variant.source }}</span>
                <span class="date">{{ variant.createdAt | date:'short' }}</span>
              </mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <div class="scores">
                <div class="score-item" (click)="openScoreDialog(variant, 'ux')">
                  <strong>UX Score:</strong> {{ variant.uxScore }}/10
                  <mat-icon>info</mat-icon>
                </div>
                <div class="score-item" (click)="openScoreDialog(variant, 'compliance')">
                  <strong>Compliance:</strong> {{ variant.complianceScore }}/10
                  <mat-icon>info</mat-icon>
                </div>
              </div>
            </mat-card-content>
            <mat-card-actions>
              <button mat-button (click)="approveVariant(variant.id)" *ngIf="variant.status === 'discarded'">
                <mat-icon>check_circle</mat-icon>
                Approve
              </button>
              <button mat-button color="warn" (click)="deleteVariant(variant.id)">
                <mat-icon>delete</mat-icon>
                Delete
              </button>
            </mat-card-actions>
          </mat-card>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .variants-container {
      display: grid;
      grid-template-columns: 300px 1fr;
      gap: 24px;
      margin-top: 48px;
    }
    .points-list {
      max-height: calc(100vh - 200px);
      overflow-y: auto;
    }
    .point-card {
      margin-bottom: 8px;
      cursor: pointer;
    }
    .point-card.selected {
      border: 2px solid #2196F3;
    }
    .variants-list {
      max-height: calc(100vh - 200px);
      overflow-y: auto;
    }
    .variants-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    mat-chip.selected {
      background-color: #2196F3;
      color: white;
    }
    .variant-card {
      margin-bottom: 16px;
    }
    .variant-text-input {
      width: 100%;
    }
    .status-active { background-color: #4caf50; color: white; }
    .status-discarded { background-color: #f44336; color: white; }
    .source-badge {
      margin-left: 8px;
      font-size: 12px;
      color: #666;
    }
    .date {
      margin-left: 8px;
      font-size: 12px;
      color: #999;
    }
    .empty-points {
      padding: 24px;
      text-align: center;
      color: #666;
      font-style: italic;
    }
    .no-selector {
      color: #999;
      font-style: italic;
      font-size: 12px;
    }
    :host-context(body.dark-mode) {
      .variants-container {
        h3 {
          color: #ffffff !important;
        }
      }
      .variants-header {
        h3 {
          color: #ffffff !important;
        }
      }
      .points-list {
        h3 {
          color: #ffffff !important;
        }
      }
      .source-badge {
        color: #ffffff;
      }
      .date {
        color: #ffffff;
      }
      mat-chip {
        .mdc-evolution-chip__text-label {
          color: #ffffff !important;
        }
        &.selected .mdc-evolution-chip__text-label {
          color: #ffffff !important;
        }
      }
      .mat-mdc-list-item {
        p {
          color: #ffffff !important;
        }
      }
    }
    .scores {
      display: flex;
      gap: 16px;
    }
    .score-item {
      display: flex;
      align-items: center;
      gap: 4px;
      cursor: pointer;
    }
    code {
      background: #f5f5f5;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 12px;
    }
  `]
})
export class VariantsComponent implements OnInit, OnDestroy {
  points: OptimizationPoint[] = [];
  variants: Variant[] = [];
  selectedPointId: string | null = null;
  filter: 'all' | 'active' | 'discarded' = 'all';
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
    if (this.filter === 'all') return this.variants;
    return this.variants.filter(v => v.status === this.filter);
  }

  generateVariants(): void {
    if (this.selectedPointId) {
      this.store.generateVariants(this.selectedPointId, 10);
      this.toast.showSuccess('Variants generated');
      this.loadVariants();
    }
  }

  updateVariant(variant: Variant): void {
    this.store.updateVariant(variant.id, { text: variant.text });
  }

  approveVariant(id: string): void {
    this.store.approveVariant(id);
    this.toast.showSuccess('Variant approved');
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

