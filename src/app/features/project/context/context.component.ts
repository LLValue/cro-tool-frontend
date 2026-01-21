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
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PageHeaderComponent } from '../../../shared/page-header/page-header.component';
import { ChipsInputComponent } from '../../../shared/chips-input/chips-input.component';
import { InfoModalComponent } from '../../../shared/info-modal/info-modal.component';

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
    ChipsInputComponent,
    MatDialogModule,
    MatTooltipModule
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
    private toast: ToastHelperService,
    private dialog: MatDialog
  ) {
    this.globalForm = this.fb.group({
      // Language & Voice
      language: ['en', Validators.required],
      tone: ['professional'],
      styleComplexity: ['simple'],
      styleLength: ['short'],
      // Business & Page Context
      industry: [''],
      productSummary: [''],
      pageIntent: [''],
      funnelStage: ['discovery'],
      valueProps: [[]],
      typicalObjections: [[]],
      marketLocale: [''],
      // Proof & Source of Truth
      allowedFacts: [[]],
      mustNotClaim: [[]],
      // Legal & Brand Guardrails
      riskLevel: ['Conservative'],
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
        language: project.language || 'en',
        tone: project.tone || 'professional',
        styleComplexity: project.styleComplexity || 'simple',
        styleLength: project.styleLength || 'short',
        industry: project.industry || '',
        productSummary: project.productSummary || '',
        pageIntent: project.pageIntent || '',
        funnelStage: project.funnelStage || 'discovery',
        valueProps: project.valueProps || [],
        typicalObjections: project.typicalObjections || [],
        marketLocale: project.marketLocale || '',
        allowedFacts: project.allowedFacts || [],
        mustNotClaim: project.mustNotClaim || [],
        riskLevel: project.riskLevel || 'Conservative',
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
      
      // Set default values for empty select fields
      this.setDefaultSelectValues();
    } else {
      // No project data, set defaults for new project
      this.setDefaultSelectValues();
    }
  }

  private setDefaultSelectValues(): void {
    if (!this.globalForm.get('language')?.value) {
      this.globalForm.patchValue({ language: 'en' }, { emitEvent: false });
    }
    if (!this.globalForm.get('tone')?.value) {
      this.globalForm.patchValue({ tone: 'professional' }, { emitEvent: false });
    }
    if (!this.globalForm.get('styleLength')?.value) {
      this.globalForm.patchValue({ styleLength: 'short' }, { emitEvent: false });
    }
    if (!this.globalForm.get('funnelStage')?.value) {
      this.globalForm.patchValue({ funnelStage: 'discovery' }, { emitEvent: false });
    }
    if (!this.globalForm.get('riskLevel')?.value) {
      this.globalForm.patchValue({ riskLevel: 'Conservative' }, { emitEvent: false });
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

  // Character counter helpers
  getCharacterCount(controlName: string): number {
    const form = controlName === 'objective' || controlName === 'generationRules' 
      ? this.pointForm 
      : this.globalForm;
    const value = form.get(controlName)?.value || '';
    return typeof value === 'string' ? value.length : 0;
  }

  // Info modal content
  getInfoModalContent(field: string): string {
    const contents: { [key: string]: string } = {
      language: `
        <p><strong>Select the primary language</strong> for all generated variants.</p>
        <p>This ensures all copy is written in the correct language and follows language-specific conventions.</p>
      `,
      tone: `
        <p><strong>Define the overall tone</strong> that should be used across all variants.</p>
        <p><strong>Options:</strong></p>
        <ul>
          <li>Professional: Formal, business-appropriate</li>
          <li>Friendly: Warm, approachable</li>
          <li>Casual: Relaxed, informal</li>
          <li>Formal: Very structured, traditional</li>
          <li>Conversational: Natural, like speaking to a friend</li>
          <li>Authoritative: Confident, expert voice</li>
        </ul>
      `,
      productSummary: `
        <p><strong>Describe what the product/service is and who it's for.</strong></p>
        <p>This helps the AI understand the core offering and target audience, ensuring all variants align with the product's value proposition.</p>
        <p><strong>Example:</strong> "A SaaS platform for small businesses to manage their inventory and sales. Target audience: retail store owners with 1-10 employees."</p>
      `,
      pageIntent: `
        <p><strong>Define what action you want users to take on this page.</strong></p>
        <p>This guides the AI to write copy that drives toward the desired conversion goal.</p>
        <p><strong>Examples:</strong></p>
        <ul>
          <li>Sign up for a free trial</li>
          <li>Request a demo</li>
          <li>Download a resource</li>
          <li>Make a purchase</li>
        </ul>
      `,
      forbiddenWords: `
        <p><strong>List words that must never appear</strong> in any generated variant.</p>
        <p>These are global constraints that apply across all optimization points. Use for compliance-sensitive terms, competitor names, or brand-inappropriate language.</p>
      `,
      mandatoryClaims: `
        <p><strong>List claims that must appear</strong> in all variants.</p>
        <p>These are required statements for legal or compliance reasons. Use sparingly to maintain copy quality.</p>
      `
    };
    return contents[field] || '';
  }

  // Info modal
  openInfoModal(title: string, field: string): void {
    const content = this.getInfoModalContent(field);
    if (content) {
      this.dialog.open(InfoModalComponent, {
        width: '600px',
        data: { title, content }
      });
    }
  }
}

