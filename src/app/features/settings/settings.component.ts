import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTabsModule } from '@angular/material/tabs';
import { CommonModule } from '@angular/common';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';
import { ToastHelperService } from '../../shared/toast-helper.service';
import { ThemeService } from '../../core/theme.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    MatTabsModule,
    CommonModule,
    PageHeaderComponent
  ],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {
  appearanceForm: FormGroup;
  generalForm: FormGroup;
  isDarkMode = false;

  constructor(
    private fb: FormBuilder,
    private toast: ToastHelperService,
    private themeService: ThemeService
  ) {
    this.appearanceForm = this.fb.group({
      darkMode: [false],
      compactMode: [false]
    });

    this.generalForm = this.fb.group({
      language: ['en'],
      timezone: ['UTC'],
      dateFormat: ['MM/DD/YYYY']
    });

    // Load saved settings
    this.loadSettings();
  }

  ngOnInit(): void {
    this.appearanceForm.get('darkMode')?.valueChanges.subscribe(value => {
      this.toggleDarkMode(value);
    });
  }

  loadSettings(): void {
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    const savedCompact = localStorage.getItem('compactMode') === 'true';
    const savedLanguage = localStorage.getItem('language') || 'en';

    this.appearanceForm.patchValue({
      darkMode: savedDarkMode,
      compactMode: savedCompact
    });

    this.generalForm.patchValue({
      language: savedLanguage
    });

    this.isDarkMode = savedDarkMode;
    this.toggleDarkMode(savedDarkMode);
  }

  toggleDarkMode(enabled: boolean): void {
    this.isDarkMode = enabled;
    localStorage.setItem('darkMode', enabled.toString());
    
    if (enabled) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }

  onAppearanceSave(): void {
    const values = this.appearanceForm.value;
    localStorage.setItem('darkMode', values.darkMode);
    localStorage.setItem('compactMode', values.compactMode);
    this.toast.showSuccess('Appearance settings saved');
  }

  onGeneralSave(): void {
    const values = this.generalForm.value;
    localStorage.setItem('language', values.language);
    localStorage.setItem('timezone', values.timezone);
    localStorage.setItem('dateFormat', values.dateFormat);
    this.toast.showSuccess('General settings saved');
  }
}

