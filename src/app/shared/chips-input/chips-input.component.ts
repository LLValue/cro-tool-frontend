import { Component, Input, Output, EventEmitter, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { CommonModule } from '@angular/common';
import { COMMA, ENTER } from '@angular/cdk/keycodes';

@Component({
  selector: 'app-chips-input',
  standalone: true,
  imports: [CommonModule, MatChipsModule, MatFormFieldModule, MatIconModule, MatInputModule, FormsModule, ReactiveFormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ChipsInputComponent),
      multi: true
    }
  ],
  template: `
    <mat-form-field appearance="outline" class="chips-input">
      <mat-label>{{ label }}</mat-label>
      <mat-chip-grid #chipGrid [attr.aria-label]="label">
        <mat-chip-row *ngFor="let item of value" (removed)="remove(item)">
          {{ item }}
          <button matChipRemove [attr.aria-label]="'remove ' + item">
            <mat-icon>cancel</mat-icon>
          </button>
        </mat-chip-row>
      </mat-chip-grid>
      <input
        [placeholder]="placeholder"
        [matChipInputFor]="chipGrid"
        [matChipInputSeparatorKeyCodes]="separatorKeysCodes"
        [matChipInputAddOnBlur]="addOnBlur"
        (matChipInputTokenEnd)="add($event)"
      />
    </mat-form-field>
  `
})
export class ChipsInputComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() placeholder = 'Add new item';
  @Input() addOnBlur = true;
  readonly separatorKeysCodes = [ENTER, COMMA] as const;

  value: string[] = [];
  onChange = (value: string[]) => {};
  onTouched = () => {};

  writeValue(value: string[]): void {
    this.value = value || [];
  }

  registerOnChange(fn: (value: string[]) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  add(event: any): void {
    const value = (event.value || '').trim();
    if (value && !this.value.includes(value)) {
      this.value = [...this.value, value];
      this.onChange(this.value);
    }
    event.chipInput!.clear();
  }

  remove(item: string): void {
    const index = this.value.indexOf(item);
    if (index >= 0) {
      this.value = this.value.filter(v => v !== item);
      this.onChange(this.value);
    }
  }
}

