import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface MockSettings {
  enableLatency: boolean;
  enableErrors: boolean;
  errorRate: number; // 0..1
  fixedSeed?: number;
  minLatencyMs: number;
  maxLatencyMs: number;
}

@Injectable({
  providedIn: 'root'
})
export class MockSettingsService {
  private readonly STORAGE_KEY = 'mock_api_settings';
  private settingsSubject = new BehaviorSubject<MockSettings>(this.loadSettings());
  public settings$ = this.settingsSubject.asObservable();

  private loadSettings(): MockSettings {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        // fall through to default
      }
    }
    return {
      enableLatency: true,
      enableErrors: false,
      errorRate: 0.1,
      minLatencyMs: 150,
      maxLatencyMs: 700
    };
  }

  getSettings(): MockSettings {
    return this.settingsSubject.value;
  }

  updateSettings(updates: Partial<MockSettings>): void {
    const newSettings = { ...this.settingsSubject.value, ...updates };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(newSettings));
    this.settingsSubject.next(newSettings);
  }

  resetSettings(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    this.settingsSubject.next(this.loadSettings());
  }
}

