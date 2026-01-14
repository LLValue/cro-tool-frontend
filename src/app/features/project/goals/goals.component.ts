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
      name: ['Primary Goal', Validators.required],
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
    this.route.params.subscribe(params => {
      this.projectId = params['projectId'];
      this.loadGoals();
    });
  }

  loadGoals(): void {
    this.store.getGoals(this.projectId).subscribe(goals => {
      const primary = goals.find(g => g.isPrimary);
      if (primary) {
        this.primaryGoalForm.patchValue({
          name: primary.name,
          type: primary.type,
          value: primary.value
        });
      }

      const secondary = goals.filter(g => !g.isPrimary);
      this.goalsArray.clear();
      secondary.forEach(goal => {
        this.goalsArray.push(this.fb.group({
          name: [goal.name, Validators.required],
          type: [goal.type, Validators.required],
          value: [goal.value, Validators.required]
        }));
      });
    });
  }

  addSecondaryGoal(): void {
    this.goalsArray.push(this.fb.group({
      name: ['', Validators.required],
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

  getPrimaryGoalSummary(): string {
    const name = this.primaryGoalForm.get('name')?.value;
    const type = this.primaryGoalForm.get('type')?.value;
    const value = this.primaryGoalForm.get('value')?.value;
    if (!name && !type && !value) return 'Not set';
    return `${name || 'Unnamed'}: ${type} - ${value || 'Not set'}`;
  }

  getSecondaryGoalsSummary(): string {
    const count = this.goalsArray.length;
    if (count === 0) return 'None';
    const names = this.goalsArray.controls
      .map(control => control.get('name')?.value || 'Unnamed')
      .filter(name => name);
    return names.length > 0 ? names.join(', ') : `${count} goal(s)`;
  }

  saveGoals(): void {
    const goals: Goal[] = [];
    
    // Primary goal
    if (this.primaryGoalForm.valid) {
      goals.push({
        id: Date.now().toString(),
        projectId: this.projectId,
        isPrimary: true,
        ...this.primaryGoalForm.value
      });
    }

    // Secondary goals
    this.goalsArray.controls.forEach(control => {
      if (control.valid) {
        goals.push({
          id: Date.now().toString() + Math.random(),
          projectId: this.projectId,
          isPrimary: false,
          ...control.value
        });
      }
    });

    this.store.setGoals(this.projectId, goals);
    this.toast.showSuccess('Goals saved');
  }
}

