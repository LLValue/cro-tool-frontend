import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly PRIMARY_COLOR = '#7EF473';
  private readonly PRIMARY_RGB = '126, 244, 115';

  constructor() {
    this.setTheme();
  }

  setTheme(): void {
    this.applyTheme();
  }

  getCurrentTheme(): string {
    return this.PRIMARY_COLOR;
  }

  private applyTheme(): void {
    const root = document.documentElement;
    
    root.style.setProperty('--theme-primary', this.PRIMARY_COLOR);
    root.style.setProperty('--theme-primary-rgb', this.PRIMARY_RGB);
  }
}

