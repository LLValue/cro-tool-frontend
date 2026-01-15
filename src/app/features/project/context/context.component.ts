import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
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
    MatCardModule,
    CommonModule,
    PageHeaderComponent,
    ChipsInputComponent
  ],
  templateUrl: './context.component.html',
  styleUrls: ['./context.component.scss']
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
      // Language & Voice
      language: ['', Validators.required],
      tone: [''],
      styleComplexity: ['simple'],
      styleLength: ['med'],
      // Business & Page Context
      industry: [''],
      productSummary: [''],
      pageIntent: [''],
      funnelStage: [''],
      valueProps: [[]],
      typicalObjections: [[]],
      marketLocale: [''],
      // Proof & Source of Truth
      allowedFacts: [[]],
      mustNotClaim: [[]],
      // Legal & Brand Guardrails
      riskLevel: ['Standard'],
      forbiddenWords: [[]],
      mandatoryClaims: [[]],
      prohibitedClaims: [[]],
      requiredDisclaimer: [''],
      toneAllowed: [[]],
      toneDisallowed: [[]],
      // Legacy fields
      pageContext: [''],
      croGuidelines: [''],
      brandGuardrails: ['']
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
        language: project.language || '',
        tone: project.tone || '',
        styleComplexity: project.styleComplexity || 'simple',
        styleLength: project.styleLength || 'med',
        industry: project.industry || '',
        productSummary: project.productSummary || '',
        pageIntent: project.pageIntent || '',
        funnelStage: project.funnelStage || '',
        valueProps: project.valueProps || [],
        typicalObjections: project.typicalObjections || [],
        marketLocale: project.marketLocale || '',
        allowedFacts: project.allowedFacts || [],
        mustNotClaim: project.mustNotClaim || [],
        riskLevel: project.riskLevel || 'Standard',
        forbiddenWords: project.forbiddenWords || [],
        prohibitedClaims: project.prohibitedClaims || [],
        requiredDisclaimer: project.requiredDisclaimer || '',
        toneAllowed: project.toneAllowed || [],
        toneDisallowed: project.toneDisallowed || [],
        pageContext: project.pageContext || '',
        croGuidelines: project.croGuidelines || '',
        brandGuardrails: project.brandGuardrails || ''
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

