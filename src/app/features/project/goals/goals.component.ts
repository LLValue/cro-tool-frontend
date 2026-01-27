import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule, Validators, AbstractControl } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatRadioModule } from '@angular/material/radio';
import { MatTooltipModule } from '@angular/material/tooltip';
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
    MatTooltipModule,
    CommonModule,
    PageHeaderComponent
  ],
  templateUrl: './goals.component.html',
  styleUrls: ['./goals.component.scss']
})
export class GoalsComponent implements OnInit {
  goalForm: FormGroup;
  projectId: string = '';
  formSubmitted = false;
  savedGoals: Goal[] = [];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private store: ProjectsStoreService,
    private toast: ToastHelperService
  ) {
    this.goalForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(500)]],
      type: ['urlReached', Validators.required],
      value: ['', Validators.required],
      isPrimary: [false, Validators.required]
    });

    // Add custom validator for primary goal uniqueness
    this.goalForm.get('isPrimary')?.valueChanges.subscribe(() => {
      this.checkPrimaryExists();
    });
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
      this.savedGoals = goals;
      this.checkPrimaryExists();
    });
  }

  checkPrimaryExists(): void {
    const isPrimary = this.goalForm.get('isPrimary')?.value;
    if (isPrimary && this.savedGoals.some(g => g.isPrimary)) {
      this.goalForm.get('isPrimary')?.setErrors({ primaryExists: true });
    } else {
      const errors = this.goalForm.get('isPrimary')?.errors;
      if (errors && errors['primaryExists']) {
        delete errors['primaryExists'];
        if (Object.keys(errors).length === 0) {
          this.goalForm.get('isPrimary')?.setErrors(null);
        } else {
          this.goalForm.get('isPrimary')?.setErrors(errors);
        }
      }
    }
  }

  removeGoal(goalId: string): void {
    this.store.getGoals(this.projectId).pipe(take(1)).subscribe(goals => {
      const updatedGoals = goals.filter(g => g.id !== goalId);
      this.store.setGoals(this.projectId, updatedGoals);
      this.savedGoals = updatedGoals;
      this.toast.showSuccess('Goal deleted');
      this.checkPrimaryExists();
    });
  }

  getValueLabel(): string {
    const type = this.goalForm.get('type')?.value;
    return this.getLabelForType(type);
  }

  getValuePlaceholder(): string {
    const type = this.goalForm.get('type')?.value;
    return this.getPlaceholderForType(type);
  }

  getValueLabelForGoal(goal: Goal): string {
    return this.getLabelForType(goal.type);
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
      case 'clickSelector': return 'Enter CSS selector';
      case 'urlReached': return 'Enter URL';
      case 'dataLayerEvent': return 'Enter event name';
      default: return '';
    }
  }

  getTypeLabel(type: string): string {
    switch (type) {
      case 'clickSelector': return 'CSS Selector';
      case 'urlReached': return 'URL';
      case 'dataLayerEvent': return 'Event Name';
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

  getCharacterCount(fieldName: string): number {
    const value = this.goalForm.get(fieldName)?.value || '';
    return typeof value === 'string' ? value.length : 0;
  }

  saveGoal(): void {
    this.formSubmitted = true;
    
    if (!this.projectId) {
      this.toast.showError('Project ID is missing');
      return;
    }

    if (this.goalForm.invalid) {
      this.toast.showError('Please fill in all required fields');
      return;
    }

    // Check if primary already exists
    this.checkPrimaryExists();
    if (this.goalForm.get('isPrimary')?.hasError('primaryExists')) {
      this.toast.showError('A primary goal already exists. Only one primary goal is allowed.');
      return;
    }

    // Get existing goals
    this.store.getGoals(this.projectId).pipe(take(1)).subscribe(existingGoals => {
      const goalValue = this.goalForm.value;
      const newGoal: Goal = {
        id: Date.now().toString() + Math.random(),
        projectId: this.projectId,
        isPrimary: goalValue.isPrimary,
        type: goalValue.type,
        value: goalValue.value,
        name: goalValue.name
      };

      const updatedGoals = [...existingGoals, newGoal];
      this.store.setGoals(this.projectId, updatedGoals);
      this.savedGoals = updatedGoals;
      this.toast.showSuccess('Goal saved');
      
      // Reset form
      this.goalForm.reset({
        name: '',
        type: 'urlReached',
        value: '',
        isPrimary: false
      });
      this.formSubmitted = false;
    });
  }
}
