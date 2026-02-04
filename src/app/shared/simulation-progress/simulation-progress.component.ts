import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { Observable, Subject, interval, takeUntil } from 'rxjs';

export interface SimulationProgressData {
  simulateObservable: Observable<any>;
}

export interface ProgressStep {
  label: string;
  status: 'pending' | 'in-progress' | 'done';
}

@Component({
  selector: 'app-simulation-progress',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatProgressBarModule,
    MatIconModule
  ],
  templateUrl: './simulation-progress.component.html',
  styleUrls: ['./simulation-progress.component.scss']
})
export class SimulationProgressComponent implements OnInit, OnDestroy {
  progress = 0;
  currentMessage = '';
  error: string | null = null;
  simulatedData: any = null;
  isComplete = false;
  Math = Math;
  
  private destroy$ = new Subject<void>();
  private messageIndex = 0;
  private startTime = Date.now();
  private minDisplayTime = 5000; // Minimum 5 seconds
  private responseReceived = false;
  private progressSimulationActive = true;

  // Status messages (rotate every 4-6s)
  private statusMessages = [
    'Preparing simulation model…',
    'Generating traffic distribution…',
    'Estimating conversion outcomes…',
    'Computing uplift vs control…',
    'Calculating win probability…',
    'Finalizing results…'
  ];

  steps: ProgressStep[] = [
    { label: 'Preparing simulation model', status: 'pending' },
    { label: 'Generating traffic distribution', status: 'pending' },
    { label: 'Estimating conversion outcomes', status: 'pending' },
    { label: 'Computing uplift vs control', status: 'pending' },
    { label: 'Calculating win probability', status: 'pending' },
    { label: 'Finalizing results', status: 'pending' }
  ];

  constructor(
    public dialogRef: MatDialogRef<SimulationProgressComponent>,
    @Inject(MAT_DIALOG_DATA) public data: SimulationProgressData
  ) {
    this.currentMessage = this.statusMessages[0];
  }

  ngOnInit(): void {
    this.startMessageRotation();
    this.startProgressSimulation();
    
    this.data.simulateObservable.subscribe({
      next: (result) => {
        this.simulatedData = result;
        this.responseReceived = true;
        this.progressSimulationActive = false;
        
        // Wait for minimum display time
        const elapsed = Date.now() - this.startTime;
        const remaining = Math.max(0, this.minDisplayTime - elapsed);
        
        setTimeout(() => {
          this.completeSimulation();
        }, remaining);
      },
      error: (err) => {
        this.progressSimulationActive = false;
        this.error = err?.error?.message || err?.message || 'An error occurred during simulation';
        console.error('Simulation error:', err);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private startMessageRotation(): void {
    interval(5000).pipe(takeUntil(this.destroy$)).subscribe(() => {
      if (!this.isComplete && !this.error) {
        this.messageIndex = (this.messageIndex + 1) % this.statusMessages.length;
        this.currentMessage = this.statusMessages[this.messageIndex];
      }
    });
  }

  private startProgressSimulation(): void {
    const progressInterval = interval(100).pipe(takeUntil(this.destroy$));
    
    progressInterval.subscribe(() => {
      if (this.progressSimulationActive && !this.responseReceived) {
        // Simulate progress from 10% to 95% during minimum display time
        const elapsed = Date.now() - this.startTime;
        const progressDuration = this.minDisplayTime;
        
        if (elapsed < progressDuration) {
          // Progress from 10% to 95% over the minimum display time
          this.progress = 10 + (elapsed / progressDuration) * 85;
        } else {
          // After minimum time, slowly approach 95%
          this.progress = Math.min(95, this.progress + 0.5);
        }
        
        // Animate through steps
        this.animateThroughAllSteps();
      } else if (this.responseReceived && !this.isComplete) {
        // When response received, complete progress
        this.progress = 100;
      }
    });
  }

  private animateThroughAllSteps(): void {
    const progressPerStep = 85 / this.steps.length;
    const currentStepIndex = Math.floor((this.progress - 10) / progressPerStep);
    
    this.steps.forEach((step, index) => {
      if (index < currentStepIndex) {
        step.status = 'done';
      } else if (index === currentStepIndex && this.progress > 10) {
        step.status = 'in-progress';
      } else {
        step.status = 'pending';
      }
    });
  }

  private completeSimulation(): void {
    this.isComplete = true;
    this.progress = 100;
    this.steps.forEach(step => {
      if (step.status === 'in-progress') {
        step.status = 'done';
      }
    });
    
    // Close dialog after a brief moment
    setTimeout(() => {
      this.dialogRef.close({ success: true, data: this.simulatedData });
    }, 500);
  }

  cancel(): void {
    this.dialogRef.close({ success: false, cancelled: true });
  }
}
