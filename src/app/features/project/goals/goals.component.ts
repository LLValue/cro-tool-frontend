import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatRadioModule } from '@angular/material/radio';
import { CommonModule } from '@angular/common';
import { take } from 'rxjs/operators';
import { ProjectsStoreService } from '../../../data/projects-store.service';
import { Goal } from '../../../data/models';
import { ToastHelperService } from '../../../shared/toast-helper.service';
import { PageHeaderComponent } from '../../../shared/page-header/page-header.component';

@Component({
  selector: 'app-goals',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatRadioModule,
    CommonModule,
    PageHeaderComponent
  ],
  templateUrl: './goals.component.html',
  styleUrls: ['./goals.component.scss']
})
export class GoalsComponent implements OnInit {
  primaryGoalForm: FormGroup;
  secondaryGoalsForm: FormGroup;
  projectId: string = '';

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private store: ProjectsStoreService,
    private toast: ToastHelperService
  ) {
    this.primaryGoalForm = this.fb.group({
      name: [''], // Optional - will come from backend in the future
      type: ['clickSelector', Validators.required],
      value: ['', Validators.required]
    });

    this.secondaryGoalsForm = this.fb.group({
      goals: this.fb.array([])
    });
  }

  get goalsArray(): FormArray {
    return this.secondaryGoalsForm.get('goals') as FormArray;
  }

  ngOnInit(): void {
    // Get projectId from route params (check both current and parent)
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
      this.loadGoals();
    }

    // Subscribe to params changes
    this.route.params.subscribe(params => {
      const newProjectId = params['projectId'];
      if (newProjectId && newProjectId !== this.projectId) {
        this.projectId = newProjectId;
        this.loadGoals();
      }
    });

    // Also subscribe to parent params (for nested routes)
    if (this.route.parent) {
      this.route.parent.params.subscribe(params => {
        const newProjectId = params['projectId'];
        if (newProjectId && newProjectId !== this.projectId) {
          this.projectId = newProjectId;
          this.loadGoals();
        }
      });
    }
  }

  loadGoals(): void {
    if (!this.projectId) {
      return;
    }
    
    this.store.getGoals(this.projectId).subscribe(goals => {
      const primary = goals.find(g => g.isPrimary);
      if (primary) {
        this.primaryGoalForm.patchValue({
          name: primary.name || '', // Handle undefined name
          type: primary.type,
          value: primary.value
        });
      }

      const secondary = goals.filter(g => !g.isPrimary);
      this.goalsArray.clear();
      secondary.forEach(goal => {
        this.goalsArray.push(this.fb.group({
          name: [goal.name || ''], // Optional - handle undefined name
          type: [goal.type, Validators.required],
          value: [goal.value, Validators.required]
        }));
      });
    });
  }

  addSecondaryGoal(): void {
    this.goalsArray.push(this.fb.group({
      name: [''], // Optional - will come from backend in the future
      type: ['clickSelector', Validators.required],
      value: ['', Validators.required]
    }));
  }

  removeSecondaryGoal(index: number): void {
    this.goalsArray.removeAt(index);
  }

  getValueLabel(): string {
    const type = this.primaryGoalForm.get('type')?.value;
    return this.getLabelForType(type);
  }

  getValuePlaceholder(): string {
    const type = this.primaryGoalForm.get('type')?.value;
    return this.getPlaceholderForType(type);
  }

  getValuePlaceholderForGoal(goal: FormGroup): string {
    const type = goal.get('type')?.value;
    return this.getPlaceholderForType(type);
  }

  getLabelForType(type: string): string {
    switch (type) {
      case 'clickSelector': return 'CSS Selector';
      case 'urlReached': return 'URL';
      case 'dataLayerEvent': return 'Event Name';
      default: return 'Value';
    }
  }

  getPlaceholderForType(type: string): string {
    switch (type) {
      case 'clickSelector': return '.cta-button';
      case 'urlReached': return 'https://pack.stage.es';
      case 'dataLayerEvent': return 'purchase';
      default: return '';
    }
  }

  getTypeLabel(type: string): string {
    switch (type) {
      case 'clickSelector': return 'Click Selector';
      case 'urlReached': return 'URL Reached';
      case 'dataLayerEvent': return 'Data Layer Event';
      default: return 'Unknown';
    }
  }

  getTypeIcon(type: string): string {
    switch (type) {
      case 'clickSelector': return 'mouse';
      case 'urlReached': return 'link';
      case 'dataLayerEvent': return 'analytics';
      default: return 'help';
    }
  }

  getDefaultGoalName(type: string, isPrimary: boolean): string {
    const typeLabel = this.getTypeLabel(type);
    return isPrimary ? `Primary ${typeLabel}` : `Secondary ${typeLabel}`;
  }

  savePrimaryGoal(): void {
    if (!this.projectId) {
      this.toast.showError('Project ID is missing');
      return;
    }

    if (!this.primaryGoalForm.valid) {
      this.toast.showError('Please fill in all required fields for the primary goal');
      return;
    }

    // Get existing goals
    this.store.getGoals(this.projectId).pipe(take(1)).subscribe(existingGoals => {
      const goals: Goal[] = [];
      
      // Add primary goal
      const primaryFormValue = this.primaryGoalForm.value;
      goals.push({
        id: existingGoals.find(g => g.isPrimary)?.id || Date.now().toString(),
        projectId: this.projectId,
        isPrimary: true,
        type: primaryFormValue.type,
        value: primaryFormValue.value,
        // Only include name if it's provided (not empty)
        ...(primaryFormValue.name ? { name: primaryFormValue.name } : {})
      });

      // Keep existing secondary goals
      const secondaryGoals = existingGoals.filter(g => !g.isPrimary);
      goals.push(...secondaryGoals);

      this.store.setGoals(this.projectId, goals);
      this.toast.showSuccess('Primary goal saved');
    });
  }

  saveSecondaryGoals(): void {
    if (!this.projectId) {
      this.toast.showError('Project ID is missing');
      return;
    }

    if (this.goalsArray.length === 0) {
      this.toast.showError('Please add at least one secondary goal');
      return;
    }

    // Validate all secondary goals
    const invalidGoals = this.goalsArray.controls.filter(control => !control.valid);
    if (invalidGoals.length > 0) {
      this.toast.showError('Please fill in all required fields for secondary goals');
      return;
    }

    // Get existing goals
    this.store.getGoals(this.projectId).pipe(take(1)).subscribe(existingGoals => {
      const goals: Goal[] = [];
      
      // Keep existing primary goal
      const primaryGoal = existingGoals.find(g => g.isPrimary);
      if (primaryGoal) {
        goals.push(primaryGoal);
      }

      // Add secondary goals
      this.goalsArray.controls.forEach((control, index) => {
        if (control.valid) {
          const existingSecondary = existingGoals.filter(g => !g.isPrimary)[index];
          const goalValue = control.value;
          goals.push({
            id: existingSecondary?.id || Date.now().toString() + Math.random(),
            projectId: this.projectId,
            isPrimary: false,
            type: goalValue.type,
            value: goalValue.value,
            // Only include name if it's provided (not empty)
            ...(goalValue.name ? { name: goalValue.name } : {})
          });
        }
      });

      this.store.setGoals(this.projectId, goals);
      this.toast.showSuccess('Secondary goals saved');
    });
  }

  saveGoals(): void {
    if (!this.projectId) {
      this.toast.showError('Project ID is missing');
      return;
    }

    const goals: Goal[] = [];
    
    // Primary goal
    if (this.primaryGoalForm.valid) {
      const primaryFormValue = this.primaryGoalForm.value;
      goals.push({
        id: Date.now().toString(),
        projectId: this.projectId,
        isPrimary: true,
        type: primaryFormValue.type,
        value: primaryFormValue.value,
        // Only include name if it's provided (not empty)
        ...(primaryFormValue.name ? { name: primaryFormValue.name } : {})
      });
    }

    // Secondary goals
    this.goalsArray.controls.forEach(control => {
      if (control.valid) {
        const goalValue = control.value;
        goals.push({
          id: Date.now().toString() + Math.random(),
          projectId: this.projectId,
          isPrimary: false,
          type: goalValue.type,
          value: goalValue.value,
          // Only include name if it's provided (not empty)
          ...(goalValue.name ? { name: goalValue.name } : {})
        });
      }
    });

    this.store.setGoals(this.projectId, goals);
    this.toast.showSuccess('All goals saved');
  }
}

