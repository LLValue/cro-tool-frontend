import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSliderModule } from '@angular/material/slider';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { MockSettingsService } from '../../../api/mock/mock-settings.service';
import { PageHeaderComponent } from '../../../shared/page-header/page-header.component';

@Component({
  selector: 'app-mock-settings',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatSliderModule,
    MatButtonModule,
    CommonModule,
    PageHeaderComponent
  ],
  template: `
    <app-page-header title="Mock API Settings"></app-page-header>

    <mat-card>
      <mat-card-content>
        <form [formGroup]="form">
          <mat-checkbox formControlName="enableLatency">
            Enable Latency Simulation
          </mat-checkbox>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Min Latency (ms)</mat-label>
            <input matInput type="number" formControlName="minLatencyMs">
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Max Latency (ms)</mat-label>
            <input matInput type="number" formControlName="maxLatencyMs">
          </mat-form-field>

          <mat-checkbox formControlName="enableErrors">
            Enable Error Injection
          </mat-checkbox>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Error Rate (0-1)</mat-label>
            <input matInput type="number" formControlName="errorRate" min="0" max="1" step="0.1">
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Fixed Seed (optional)</mat-label>
            <input matInput type="number" formControlName="fixedSeed">
          </mat-form-field>

          <div class="actions">
            <button mat-raised-button color="primary" (click)="save()">Save Settings</button>
            <button mat-button (click)="reset()">Reset to Defaults</button>
          </div>
        </form>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .full-width {
      width: 100%;
      margin-bottom: 16px;
    }
    mat-checkbox {
      display: block;
      margin-bottom: 16px;
    }
    .actions {
      display: flex;
      gap: 8px;
      margin-top: 16px;
    }

    :host-context(body.dark-mode) {
      ::ng-deep {
        mat-checkbox {
          .mdc-label,
          label.mdc-label {
            color: white !important;
          }
          
          .mdc-checkbox__native-control:enabled:checked ~ .mdc-checkbox__background {
            background-color: white !important;
            border-color: white !important;
          }
          
          .mdc-checkbox__native-control:enabled ~ .mdc-checkbox__background {
            border-color: white !important;
          }
          
          .mdc-checkbox__checkmark,
          .mdc-checkbox__checkmark-path {
            color: #000 !important;
            stroke: #000 !important;
          }
          
          .mdc-checkbox__native-control:enabled:checked ~ .mdc-checkbox__background .mdc-checkbox__checkmark-path {
            stroke: #000 !important;
            fill: none !important;
          }
        }
        
        .mdc-form-field {
          .mdc-label {
            color: white !important;
          }
        }
      }
    }
  `]
})
export class MockSettingsComponent implements OnInit {
  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private settings: MockSettingsService
  ) {
    this.form = this.fb.group({
      enableLatency: [true],
      minLatencyMs: [150],
      maxLatencyMs: [700],
      enableErrors: [false],
      errorRate: [0.1],
      fixedSeed: [null]
    });
  }

  ngOnInit(): void {
    const current = this.settings.getSettings();
    this.form.patchValue({
      enableLatency: current.enableLatency,
      minLatencyMs: current.minLatencyMs,
      maxLatencyMs: current.maxLatencyMs,
      enableErrors: current.enableErrors,
      errorRate: current.errorRate,
      fixedSeed: current.fixedSeed
    });
  }

  save(): void {
    if (this.form.valid) {
      const values = this.form.value;
      this.settings.updateSettings({
        enableLatency: values.enableLatency,
        minLatencyMs: values.minLatencyMs,
        maxLatencyMs: values.maxLatencyMs,
        enableErrors: values.enableErrors,
        errorRate: values.errorRate,
        fixedSeed: values.fixedSeed || undefined
      });
      alert('Settings saved!');
    }
  }

  reset(): void {
    this.settings.resetSettings();
    this.ngOnInit();
    alert('Settings reset to defaults!');
  }
}

