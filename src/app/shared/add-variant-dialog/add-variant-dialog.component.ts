import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface AddVariantDialogData {
  /** Optional initial text */
  initialText?: string;
}

@Component({
  selector: 'app-add-variant-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule
  ],
  templateUrl: './add-variant-dialog.component.html',
  styleUrls: ['./add-variant-dialog.component.scss']
})
export class AddVariantDialogComponent {
  text = '';

  constructor(
    public dialogRef: MatDialogRef<AddVariantDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AddVariantDialogData
  ) {
    this.text = data?.initialText ?? '';
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }

  onAdd(): void {
    const trimmed = (this.text || '').trim();
    this.dialogRef.close(trimmed ? trimmed : null);
  }
}
