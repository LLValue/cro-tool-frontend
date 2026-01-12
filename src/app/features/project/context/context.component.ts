import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { debounceTime, map } from 'rxjs/operators';
import { ProjectsStoreService } from '../../../data/projects-store.service';
import { OptimizationPoint } from '../../../data/models';
import { ToastHelperService } from '../../../shared/toast-helper.service';
import { PageHeaderComponent } from '../../../shared/page-header/page-header.component';
import { ChipsInputComponent } from '../../../shared/chips-input/chips-input.component';

@Component({
  selector: 'app-context',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    CommonModule,
    PageHeaderComponent,
    ChipsInputComponent
  ],
  template: `
    <app-page-header title="Context & Guidelines"></app-page-header>

    <mat-tab-group>
      <mat-tab label="Global">
        <form [formGroup]="globalForm" class="form-container">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Language</mat-label>
            <mat-select formControlName="language">
              <mat-option value="en">English</mat-option>
              <mat-option value="es">Spanish</mat-option>
              <mat-option value="fr">French</mat-option>
              <mat-option value="de">German</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Page Context</mat-label>
            <textarea matInput formControlName="pageContext" rows="4"></textarea>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>CRO Guidelines</mat-label>
            <textarea matInput formControlName="croGuidelines" rows="4"></textarea>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Brand Guardrails</mat-label>
            <textarea matInput formControlName="brandGuardrails" rows="4"></textarea>
          </mat-form-field>

          <app-chips-input
            formControlName="forbiddenWords"
            label="Forbidden Words"
            placeholder="Add forbidden word">
          </app-chips-input>

          <app-chips-input
            formControlName="toneAllowed"
            label="Allowed Tones"
            placeholder="Add allowed tone">
          </app-chips-input>

          <app-chips-input
            formControlName="toneDisallowed"
            label="Disallowed Tones"
            placeholder="Add disallowed tone">
          </app-chips-input>

          <div class="mandatory-claims">
            <h4>Mandatory Claims</h4>
            <div *ngFor="let claim of mandatoryClaims.controls; let i = index" class="claim-row">
              <mat-form-field appearance="outline" class="claim-input">
                <mat-label>Claim {{ i + 1 }}</mat-label>
                <input matInput [formControl]="$any(claim)">
              </mat-form-field>
              <button mat-icon-button (click)="removeClaim(i)">
                <mat-icon>delete</mat-icon>
              </button>
            </div>
            <button mat-button (click)="addClaim()">
              <mat-icon>add</mat-icon>
              Add Claim
            </button>
          </div>
        </form>
      </mat-tab>

      <mat-tab label="Per-Point">
        <form [formGroup]="pointForm" class="form-container">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Select Point</mat-label>
            <mat-select formControlName="pointId">
              <mat-option *ngFor="let point of points" [value]="point.id">
                {{ point.name }}
              </mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Objective</mat-label>
            <textarea matInput formControlName="objective" rows="4"></textarea>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Generation Rules</mat-label>
            <textarea matInput formControlName="generationRules" rows="4"></textarea>
          </mat-form-field>
        </form>
      </mat-tab>
    </mat-tab-group>
  `,
  styles: [`
    ::ng-deep {
      .mat-tab-group {
        margin-top: 48px;
      }
    }
    .form-container {
      padding: 24px;
    }
    .full-width {
      width: 100%;
      margin-bottom: 16px;
    }
    .mandatory-claims {
      margin-top: 24px;
    }
    .claim-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }
    .claim-input {
      flex: 1;
    }
    :host-context(body.dark-mode) {
      .mandatory-claims {
        h4 {
          color: #ffffff !important;
        }
        button {
          color: #ffffff !important;
          mat-icon {
            color: #ffffff !important;
          }
        }
      }
    }
  `]
})
export class ContextComponent implements OnInit, OnDestroy {
  globalForm: FormGroup;
  pointForm: FormGroup;
  projectId: string = '';
  points: OptimizationPoint[] = [];
  mandatoryClaims: FormArray;
  private subscriptions = new Subscription();
  private isUpdatingForm = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private store: ProjectsStoreService,
    private toast: ToastHelperService
  ) {
    this.globalForm = this.fb.group({
      language: [''],
      pageContext: [''],
      croGuidelines: [''],
      brandGuardrails: [''],
      forbiddenWords: [[]],
      toneAllowed: [[]],
      toneDisallowed: [[]]
    });

    this.pointForm = this.fb.group({
      pointId: [''],
      objective: [''],
      generationRules: ['']
    });

    this.mandatoryClaims = this.fb.array([]);
  }

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
      this.loadProjectData();
      this.loadPoints();
    }

    // Subscribe to params changes (both current and parent)
    const paramsSub = this.route.params.subscribe((params: any) => {
      const newProjectId = params['projectId'];
      if (newProjectId && newProjectId !== this.projectId) {
        this.projectId = newProjectId;
        this.loadProjectData();
        this.loadPoints();
      }
    });
    this.subscriptions.add(paramsSub);

    // Also subscribe to parent params (for nested routes)
    if (this.route.parent) {
      const parentParamsSub = this.route.parent.params.subscribe((params: any) => {
        const newProjectId = params['projectId'];
        if (newProjectId && newProjectId !== this.projectId) {
          this.projectId = newProjectId;
          this.loadProjectData();
          this.loadPoints();
        }
      });
      this.subscriptions.add(parentParamsSub);
    }

    // Autosave with debounce
    const globalFormSub = this.globalForm.valueChanges.pipe(debounceTime(500)).subscribe(() => {
      if (!this.isUpdatingForm) {
        this.saveGlobal();
      }
    });
    this.subscriptions.add(globalFormSub);

    const pointFormSub = this.pointForm.valueChanges.pipe(debounceTime(500)).subscribe(() => {
      if (!this.isUpdatingForm) {
        this.savePoint();
      }
    });
    this.subscriptions.add(pointFormSub);
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

  private loadProjectData(): void {
    const projectId = this.getProjectId();
    if (!projectId) {
      return;
    }
    this.projectId = projectId; // Update instance variable

    const project = this.store.getProject(this.projectId);
    if (project) {
      this.isUpdatingForm = true;
      this.globalForm.patchValue({
        language: project.language,
        pageContext: project.pageContext,
        croGuidelines: project.croGuidelines,
        brandGuardrails: project.brandGuardrails,
        forbiddenWords: project.forbiddenWords || [],
        toneAllowed: project.toneAllowed || [],
        toneDisallowed: project.toneDisallowed || []
      }, { emitEvent: false });
      // Clear existing mandatory claims
      while (this.mandatoryClaims.length !== 0) {
        this.mandatoryClaims.removeAt(0);
      }
      project.mandatoryClaims?.forEach(claim => {
        this.mandatoryClaims.push(this.fb.control(claim), { emitEvent: false });
      });
      this.isUpdatingForm = false;
    }
  }

  loadPoints(): void {
    // Ensure projectId is set from route
    const projectId = this.getProjectId();
    if (!projectId) {
      return;
    }
    this.projectId = projectId; // Update instance variable

    // Subscribe to points$ observable and filter by projectId
    // This will automatically update when points are added/updated/deleted
    const currentProjectId = this.projectId; // Capture for closure
    const pointsSub = this.store.points$.pipe(
      map((allPoints: OptimizationPoint[]) => allPoints.filter(p => p.projectId === currentProjectId))
    ).subscribe({
      next: (points: OptimizationPoint[]) => {
        this.points = points;
        const currentPointId = this.pointForm.get('pointId')?.value;
        
        // If no point is selected or the selected point no longer exists, select the first one
        if (points.length > 0) {
          if (!currentPointId || !points.find(p => p.id === currentPointId)) {
            this.isUpdatingForm = true;
            this.pointForm.patchValue({ pointId: points[0].id }, { emitEvent: false });
            this.isUpdatingForm = false;
            this.loadPointData(points[0].id);
          } else {
            // Reload data for currently selected point in case it was updated
            this.loadPointData(currentPointId);
          }
        } else {
          // No points available, clear the form
          this.isUpdatingForm = true;
          this.pointForm.patchValue({ pointId: '', objective: '', generationRules: '' }, { emitEvent: false });
          this.isUpdatingForm = false;
        }
      },
      error: () => {
        // Silently handle error - points might not exist yet
        this.points = [];
      }
    });
    this.subscriptions.add(pointsSub);

    // Subscribe to pointId changes (only once)
    const pointIdSub = this.pointForm.get('pointId')?.valueChanges.subscribe((pointId: string) => {
      if (pointId && !this.isUpdatingForm) {
        this.loadPointData(pointId);
      }
    });
    if (pointIdSub) {
      this.subscriptions.add(pointIdSub);
    }

    // Trigger initial load from API
    // Use the captured projectId from above
    this.store.listPoints(currentProjectId).subscribe({
      next: () => {
        // Points will be updated via the points$ subscription above
      },
      error: () => {
        // Silently handle error
      }
    });
  }

  loadPointData(pointId: string): void {
    const point = this.points.find(p => p.id === pointId);
    if (point) {
      this.isUpdatingForm = true;
      this.pointForm.patchValue({
        objective: point.objective,
        generationRules: point.generationRules
      }, { emitEvent: false });
      this.isUpdatingForm = false;
    }
  }

  saveGlobal(): void {
    const values = this.globalForm.value;
    const mandatoryClaims = this.mandatoryClaims.controls.map((c: any) => c.value);
    this.store.updateProject(this.projectId, {
      ...values,
      mandatoryClaims
    });
    this.toast.showInfo('Saved');
  }

  savePoint(): void {
    const values = this.pointForm.value;
    if (values.pointId) {
      this.store.updatePoint(values.pointId, {
        objective: values.objective,
        generationRules: values.generationRules
      });
      this.toast.showInfo('Saved');
    }
  }

  addClaim(): void {
    this.mandatoryClaims.push(this.fb.control(''));
  }

  removeClaim(index: number): void {
    this.mandatoryClaims.removeAt(index);
    this.saveGlobal();
  }
}

