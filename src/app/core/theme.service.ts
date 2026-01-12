import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type Theme = 'purple' | 'blue' | 'green' | 'orange' | 'red';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private currentThemeSubject = new BehaviorSubject<Theme>('purple');
  public currentTheme$ = this.currentThemeSubject.asObservable();

  private themes: Record<Theme, { primary: string; accent: string }> = {
    purple: { primary: '#673ab7', accent: '#9c27b0' },
    blue: { primary: '#2196f3', accent: '#03a9f4' },
    green: { primary: '#4caf50', accent: '#8bc34a' },
    orange: { primary: '#ff9800', accent: '#ff5722' },
    red: { primary: '#f44336', accent: '#e91e63' }
  };

  constructor() {
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme && this.themes[savedTheme]) {
      this.setTheme(savedTheme);
    } else {
      this.setTheme('purple');
    }
  }

  setTheme(theme: Theme): void {
    this.currentThemeSubject.next(theme);
    localStorage.setItem('theme', theme);
    this.applyTheme(theme);
  }

  getCurrentTheme(): Theme {
    return this.currentThemeSubject.value;
  }

  private applyTheme(theme: Theme): void {
    const themeColors = this.themes[theme];
    const root = document.documentElement;
    
    root.style.setProperty('--theme-primary', themeColors.primary);
    root.style.setProperty('--theme-accent', themeColors.accent);
    
    // Calculate RGB values for rgba() usage
    const primaryRgb = this.hexToRgb(themeColors.primary);
    const accentRgb = this.hexToRgb(themeColors.accent);
    
    if (primaryRgb) {
      root.style.setProperty('--theme-primary-rgb', `${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}`);
    }
    if (accentRgb) {
      root.style.setProperty('--theme-accent-rgb', `${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}`);
    }
    
    // Update Material theme class
    document.body.classList.remove('theme-purple', 'theme-blue', 'theme-green', 'theme-orange', 'theme-red');
    document.body.classList.add(`theme-${theme}`);
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }
}

