import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-selector-input-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CommonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <h2 mat-dialog-title>Enter CSS Selector Manually</h2>
    <mat-dialog-content>
      <p class="help-text">
        Due to cross-origin restrictions, we cannot access the iframe content directly.
        Please enter the CSS selector for the element you want to optimize.
      </p>
      <p class="help-text">
        <strong>Tip:</strong> Open the page in a new tab, use browser DevTools (F12), 
        right-click on the element, select "Inspect", then right-click the element in DevTools 
        and choose "Copy > Copy selector".
      </p>
      <form [formGroup]="form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Point Name</mat-label>
          <input matInput formControlName="name" required>
          <mat-error *ngIf="form.get('name')?.hasError('required')">
            Name is required
          </mat-error>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>CSS Selector</mat-label>
          <input matInput formControlName="selector" required placeholder="e.g., .hero-title, #cta-button, h1">
          <mat-hint>Enter a valid CSS selector (ID, class, or element selector)</mat-hint>
          <mat-error *ngIf="form.get('selector')?.hasError('required')">
            Selector is required
          </mat-error>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button color="primary" (click)="onSave()" [disabled]="form.invalid">
        <mat-icon>check</mat-icon>
        Create Point
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .full-width {
      width: 100%;
      margin-bottom: 16px;
    }
    .help-text {
      margin-bottom: 16px;
      font-size: 14px;
      line-height: 1.5;
    }
    mat-dialog-content {
      min-width: 500px;
    }
  `]
})
export class SelectorInputDialogComponent {
  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<SelectorInputDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { suggestedName?: string; suggestedSelector?: string }
  ) {
    this.form = this.fb.group({
      name: [data?.suggestedName || '', Validators.required],
      selector: [data?.suggestedSelector || '', Validators.required]
    });
  }

  onSave(): void {
    if (this.form.valid) {
      this.dialogRef.close(this.form.value);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}

