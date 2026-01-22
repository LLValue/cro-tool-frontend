import { Component, Input, forwardRef } from '@angular/core';
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
  templateUrl: './chips-input.component.html',
  styleUrls: ['./chips-input.component.scss']
})
export class ChipsInputComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() placeholder = 'Add new item';
  @Input() addOnBlur = true;
  readonly separatorKeysCodes = [ENTER, COMMA] as const;

  value: string[] = [];
  onChange = (value: string[]) => {};
  onTouched = () => {};

  getDisplayLabel(): string {
    // If label is empty, use placeholder text or a default label
    if (this.label && this.label.trim() !== '') {
      return this.label;
    }
    // Generate a default label from placeholder or use generic text
    if (this.placeholder && this.placeholder.trim() !== '') {
      // Capitalize first letter and remove "Add" prefix if present
      const defaultLabel = this.placeholder
        .replace(/^Add\s+/i, '')
        .replace(/^add\s+/i, '');
      return defaultLabel.charAt(0).toUpperCase() + defaultLabel.slice(1);
    }
    return 'Items'; // Fallback default label
  }

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

