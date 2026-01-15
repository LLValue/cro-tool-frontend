import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';

export interface ConfirmDialogData {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: 'primary' | 'accent' | 'warn';
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule
  ],
  template: `
    <h2 mat-dialog-title>{{ data.title || 'Confirm' }}</h2>
    <mat-dialog-content>
      <p>{{ data.message }}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">
        {{ data.cancelText || 'Cancel' }}
      </button>
      <button 
        mat-raised-button 
        [color]="data.confirmColor || 'primary'" 
        (click)="onConfirm()">
        {{ data.confirmText || 'Confirm' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    h2 {
      margin: 0 0 16px 0;
      font-size: 20px;
      font-weight: 500;
      color: #1a1a1a;
    }

    mat-dialog-content {
      padding: 0 24px;
      margin: 0;
      min-width: 300px;
      max-width: 500px;

      p {
        margin: 0;
        line-height: 1.5;
        color: #1a1a1a;
      }
    }

    mat-dialog-actions {
      padding: 16px 24px;
      margin: 0;
      gap: 8px;
    }

    :host-context(body.dark-mode) {
      h2 {
        color: #ffffff !important;
      }

      mat-dialog-content {
        color: rgba(255, 255, 255, 0.87) !important;

        p {
          color: rgba(255, 255, 255, 0.87) !important;
        }
      }

      mat-dialog-actions {
        button {
          color: #ffffff !important;
        }
      }
    }
  `]
})
export class ConfirmDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData
  ) {}

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }
}
