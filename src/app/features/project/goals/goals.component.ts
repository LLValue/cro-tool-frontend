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
  template: `
    <app-page-header title="Goals"></app-page-header>

    <div class="goals-container">
      <mat-card class="primary-goal-card">
        <mat-card-header>
          <mat-card-title>Primary Goal</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <form [formGroup]="primaryGoalForm">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Goal Type</mat-label>
              <mat-select formControlName="type">
                <mat-option value="clickSelector">Click Selector</mat-option>
                <mat-option value="urlReached">URL Reached</mat-option>
                <mat-option value="dataLayerEvent">Data Layer Event</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>{{ getValueLabel() }}</mat-label>
              <input matInput formControlName="value" [placeholder]="getValuePlaceholder()">
            </mat-form-field>
          </form>
        </mat-card-content>
      </mat-card>

      <mat-card class="secondary-goals-card">
        <mat-card-header>
          <mat-card-title>Secondary Goals</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <form [formGroup]="secondaryGoalsForm">
            <div formArrayName="goals">
              <div *ngFor="let goal of goalsArray.controls; let i = index" [formGroupName]="i" class="goal-row">
                <mat-form-field appearance="outline" class="goal-type">
                  <mat-label>Type</mat-label>
                  <mat-select formControlName="type">
                    <mat-option value="clickSelector">Click Selector</mat-option>
                    <mat-option value="urlReached">URL Reached</mat-option>
                    <mat-option value="dataLayerEvent">Data Layer Event</mat-option>
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline" class="goal-value">
                  <mat-label>Value</mat-label>
                  <input matInput formControlName="value" [placeholder]="getValuePlaceholderForGoal($any(goal))">
                </mat-form-field>
                <button mat-icon-button (click)="removeSecondaryGoal(i)">
                  <mat-icon>delete</mat-icon>
                </button>
              </div>
            </div>
            <button mat-button (click)="addSecondaryGoal()">
              <mat-icon>add</mat-icon>
              Add Secondary Goal
            </button>
          </form>
        </mat-card-content>
      </mat-card>

      <mat-card class="summary-card">
        <mat-card-header>
          <mat-card-title>Summary</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <p><strong>Primary:</strong> {{ getPrimaryGoalSummary() }}</p>
          <p><strong>Secondary:</strong> {{ getSecondaryGoalsSummary() }}</p>
        </mat-card-content>
        <mat-card-actions>
          <button mat-raised-button color="primary" (click)="saveGoals()">
            <mat-icon>save</mat-icon>
            Save Goals
          </button>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [`
    .goals-container {
      display: flex;
      flex-direction: column;
      gap: 24px;
      margin-top: 48px;
    }
    .full-width {
      width: 100%;
      margin-bottom: 16px;
    }
    .goal-row {
      display: flex;
      gap: 8px;
      align-items: center;
      margin-bottom: 16px;
    }
    .goal-type {
      width: 200px;
    }
    .goal-value {
      flex: 1;
    }
  `]
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
          type: primary.type,
          value: primary.value
        });
      }

      const secondary = goals.filter(g => !g.isPrimary);
      this.goalsArray.clear();
      secondary.forEach(goal => {
        this.goalsArray.push(this.fb.group({
          type: [goal.type, Validators.required],
          value: [goal.value, Validators.required]
        }));
      });
    });
  }

  addSecondaryGoal(): void {
    this.goalsArray.push(this.fb.group({
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
      case 'urlReached': return 'https://pack.stage.es/?packageId=209&from=app&success=true';
      case 'dataLayerEvent': return 'purchase';
      default: return '';
    }
  }

  getPrimaryGoalSummary(): string {
    const type = this.primaryGoalForm.get('type')?.value;
    const value = this.primaryGoalForm.get('value')?.value;
    return `${type}: ${value || 'Not set'}`;
  }

  getSecondaryGoalsSummary(): string {
    const count = this.goalsArray.length;
    return count === 0 ? 'None' : `${count} goal(s)`;
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

