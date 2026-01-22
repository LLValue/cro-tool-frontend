import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { Variant } from '../../../../data/models';

@Component({
  selector: 'app-variant-details-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  templateUrl: './variant-details-dialog.component.html'
})
export class VariantDetailsDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<VariantDetailsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { variant: Variant; type: 'ux' | 'compliance' }
  ) {}

  close(): void {
    this.dialogRef.close();
  }
}

