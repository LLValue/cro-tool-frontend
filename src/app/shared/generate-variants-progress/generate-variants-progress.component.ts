import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { Observable, Subject, interval, takeUntil, map } from 'rxjs';

export interface GenerateVariantsProgressData {
  generateObservable: Observable<any>;
  pointName?: string;
}

export interface ProgressStep {
  label: string;
  status: 'pending' | 'in-progress' | 'done';
}

@Component({
  selector: 'app-generate-variants-progress',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatProgressBarModule,
    MatIconModule
  ],
  templateUrl: './generate-variants-progress.component.html',
  styleUrls: ['./generate-variants-progress.component.scss']
})
export class GenerateVariantsProgressComponent implements OnInit, OnDestroy {
  progress = 0;
  currentMessage = '';
  variantCount = 0;
  error: string | null = null;
  generatedData: any = null; // Store the generated data
  isComplete = false;
  Math = Math; // Expose Math to template
  
  private destroy$ = new Subject<void>();
  private messageIndex = 0;
  private confidenceIndex = 0;
  private startTime = Date.now();
  private longWaitThreshold = 45000; // 45 seconds
  private minDisplayTime = 5000; // Minimum 5 seconds to show the progress
  private responseReceived = false;
  private progressSimulationActive = true;

  // Status messages for variants generation (rotate every 4-6s)
  private statusMessagesVariants = [
    'Building the context pack for this page and element…',
    'Applying UX best practices for this element type…',
    'Generating diverse copy options…',
    'Checking length limits and required keywords…',
    'Filtering risky language and sensitive claims…',
    'Validating against your brand and legal guardrails…',
    'Scoring variants for clarity and conversion potential…',
    'Selecting the best options to review…',
    'Finalizing and saving variants to your project…'
  ];

  // Status messages for brief generation
  private statusMessagesBrief = [
    'Analyzing your sources and extracting key information…',
    'Summarizing content from URLs and documents…',
    'Extracting business context and value propositions…',
    'Identifying target audiences and journey stages…',
    'Drafting tone and style guidelines…',
    'Extracting proof points and allowed facts…',
    'Identifying sensitive claims and forbidden words…',
    'Validating content against compliance requirements…',
    'Finalizing draft brief content…'
  ];

  // Confidence boosters (intercalables, 1 de cada 3 mensajes)
  private confidenceMessages = [
    'Designed for regulated environments and review workflows.',
    'Balanced for performance and compliance.',
    'Optimized for readability on mobile and desktop.'
  ];

  // Steps for variants generation
  stepsVariants: ProgressStep[] = [
    { label: 'Preparing context pack', status: 'pending' },
    { label: 'Loading UX best practices', status: 'pending' },
    { label: 'Generating candidate variants', status: 'pending' },
    { label: 'Applying hard constraints (length, keywords, blocked terms)', status: 'pending' },
    { label: 'Running compliance & risk checks', status: 'pending' },
    { label: 'Scoring variants (UX + compliance)', status: 'pending' },
    { label: 'Selecting top variants for review', status: 'pending' },
    { label: 'Finalizing and saving results', status: 'pending' }
  ];

  // Steps for brief generation
  stepsBrief: ProgressStep[] = [
    { label: 'Analyzing sources', status: 'pending' },
    { label: 'Extracting business context', status: 'pending' },
    { label: 'Drafting journey context', status: 'pending' },
    { label: 'Extracting guardrails and proof points', status: 'pending' },
    { label: 'Validating content quality', status: 'pending' },
    { label: 'Reviewing compliance requirements', status: 'pending' },
    { label: 'Finalizing draft brief', status: 'pending' }
  ];

  steps: ProgressStep[] = [];
  private statusMessages: string[] = [];

  constructor(
    public dialogRef: MatDialogRef<GenerateVariantsProgressComponent>,
    @Inject(MAT_DIALOG_DATA) public data: GenerateVariantsProgressData
  ) {
    // Determine if this is brief generation or variants generation
    const isBriefGeneration = this.data.pointName === 'Brief Generation';
    
    if (isBriefGeneration) {
      this.statusMessages = this.statusMessagesBrief;
      this.steps = this.stepsBrief;
    } else {
      this.statusMessages = this.statusMessagesVariants;
      this.steps = this.stepsVariants;
    }
    
    this.currentMessage = this.statusMessages[0];
  }

  ngOnInit(): void {
    // Start message rotation
    this.startMessageRotation();
    
    // Start progress simulation
    this.startProgressSimulation();
    
    // Subscribe to the actual generation observable
    this.data.generateObservable.subscribe({
      next: (result) => {
        // Store the generated data (could be variants array or brief data object)
        this.generatedData = result;
        this.variantCount = Array.isArray(result) ? result.length : (result?.variantCount || 10);
        this.responseReceived = true;
        this.completeProgress();
      },
      error: (err) => {
        this.responseReceived = true;
        this.handleError(err);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private startMessageRotation(): void {
    // Rotate status messages every 5 seconds
    interval(5000).pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      // Every 3rd message, show a confidence booster
      if (this.messageIndex % 3 === 2) {
        this.currentMessage = this.confidenceMessages[this.confidenceIndex % this.confidenceMessages.length];
        this.confidenceIndex++;
      } else {
        this.currentMessage = this.statusMessages[this.messageIndex % this.statusMessages.length];
      }
      this.messageIndex++;
    });
  }

  private startProgressSimulation(): void {
    const elapsed = () => Date.now() - this.startTime;
    const isBriefGeneration = this.data.pointName === 'Brief Generation';
    const totalSteps = this.steps.length;
    
    // Progress checkpoints based on timing
    // For brief generation (7 steps) vs variants (8 steps)
    const checkpoints = isBriefGeneration
      ? [
          { time: 0, progress: 10, stepIndex: 0 },      // 0-10% (instant)
          { time: 15000, progress: 30, stepIndex: 1 }, // 10-30% (15s)
          { time: 30000, progress: 50, stepIndex: 2 }, // 30-50% (15s)
          { time: 45000, progress: 70, stepIndex: 3 }, // 50-70% (15s)
          { time: 60000, progress: 90, stepIndex: 5 }  // 70-90% (15s) - skip to step 5 for brief
        ]
      : [
          { time: 0, progress: 10, stepIndex: 0 },      // 0-10% (instant)
          { time: 15000, progress: 35, stepIndex: 1 }, // 10-35% (15-20s)
          { time: 30000, progress: 55, stepIndex: 2 }, // 35-55% (10-15s)
          { time: 45000, progress: 75, stepIndex: 3 }, // 55-75% (10-15s)
          { time: 60000, progress: 90, stepIndex: 4 }  // 75-90% (5-10s)
        ];

    // Update progress every 200ms
    interval(200).pipe(
      takeUntil(this.destroy$),
      map(() => elapsed())
    ).subscribe(time => {
      if (this.isComplete || this.error || !this.progressSimulationActive) return;

      // Find current checkpoint
      let currentCheckpoint = checkpoints[0];
      let nextCheckpoint = checkpoints[1];
      
      for (let i = 0; i < checkpoints.length - 1; i++) {
        if (time >= checkpoints[i].time && time < checkpoints[i + 1].time) {
          currentCheckpoint = checkpoints[i];
          nextCheckpoint = checkpoints[i + 1];
          break;
        }
      }

      if (time >= checkpoints[checkpoints.length - 1].time) {
        currentCheckpoint = checkpoints[checkpoints.length - 1];
        const lastStepIndex = totalSteps - 1;
        nextCheckpoint = { time: Infinity, progress: 99, stepIndex: lastStepIndex };
      }

      // Interpolate progress between checkpoints
      const timeDiff = nextCheckpoint.time - currentCheckpoint.time;
      const progressDiff = nextCheckpoint.progress - currentCheckpoint.progress;
      const timeInSegment = time - currentCheckpoint.time;
      
      if (timeDiff > 0) {
        this.progress = Math.min(
          currentCheckpoint.progress + (progressDiff * (timeInSegment / timeDiff)),
          99 // Never reach 100% until actual completion
        );
      } else {
        this.progress = currentCheckpoint.progress;
      }

      // Update step statuses only if simulation is still active
      if (this.progressSimulationActive) {
        this.updateStepStatuses(currentCheckpoint.stepIndex);
      }

      // Handle long wait messages
      if (time > this.longWaitThreshold && !this.isComplete) {
        const isBriefGeneration = this.data.pointName === 'Brief Generation';
        const longWaitMessages = isBriefGeneration 
          ? [
              'Still analyzing sources—ensuring comprehensive coverage…',
              'Almost there—finalizing draft brief content…'
            ]
          : [
              'Still working—running additional checks for quality and compliance…',
              'Almost there—finalizing results…'
            ];
        const longWaitIndex = Math.floor((time - this.longWaitThreshold) / 10000) % longWaitMessages.length;
        this.currentMessage = longWaitMessages[longWaitIndex];
      }
    });
  }

  private updateStepStatuses(currentStepIndex: number): void {
    this.steps.forEach((step, index) => {
      if (index < currentStepIndex) {
        step.status = 'done';
      } else if (index === currentStepIndex) {
        step.status = 'in-progress';
      } else {
        step.status = 'pending';
      }
    });
  }

  private completeProgress(): void {
    // Stop the automatic progress simulation
    this.progressSimulationActive = false;
    
    const elapsed = Date.now() - this.startTime;
    const remainingTime = Math.max(0, this.minDisplayTime - elapsed);
    
    // If we haven't shown the modal for the minimum time, wait
    if (remainingTime > 0) {
      // Animate through all remaining steps during the wait
      this.animateThroughAllSteps(remainingTime);
      
      // Complete after minimum time
      setTimeout(() => {
        this.finishProgress();
      }, remainingTime);
    } else {
      // Already shown for minimum time, complete immediately
      this.finishProgress();
    }
  }

  private animateThroughAllSteps(duration: number): void {
    const totalSteps = this.steps.length;
    // Find the last step that is done or in-progress
    let currentStepIndex = -1;
    for (let i = 0; i < this.steps.length; i++) {
      if (this.steps[i].status === 'done' || this.steps[i].status === 'in-progress') {
        currentStepIndex = i;
      }
    }
    
    // Start from the next step after the last completed one
    const startStepIndex = currentStepIndex + 1;
    const remainingSteps = totalSteps - startStepIndex;
    
    if (remainingSteps <= 0) {
      // All steps already done, just update progress
      this.progress = 95;
      return;
    }
    
    // Time per step (distribute remaining time across remaining steps)
    const timePerStep = duration / remainingSteps;
    
    // Animate through each remaining step
    for (let i = 0; i < remainingSteps; i++) {
      const stepIndex = startStepIndex + i;
      const stepDelay = i * timePerStep;
      
      setTimeout(() => {
        // Mark current step as in-progress first
        if (stepIndex < this.steps.length) {
          this.steps[stepIndex].status = 'in-progress';
        }
        
        // Then mark as done after a short delay (to show it was in-progress)
        setTimeout(() => {
          if (stepIndex < this.steps.length) {
            this.steps[stepIndex].status = 'done';
          }
          
          // Update progress based on step completion
          const progressPercent = Math.min(10 + (stepIndex + 1) * (85 / totalSteps), 95);
          this.progress = progressPercent;
        }, Math.min(200, timePerStep * 0.3)); // Show in-progress for 30% of step time or 200ms, whichever is less
      }, stepDelay);
    }
  }

  private finishProgress(): void {
    this.isComplete = true;
    this.progress = 100;
    this.steps.forEach(step => step.status = 'done');
    this.currentMessage = 'Done ✅';
  }

  private handleError(err: any): void {
    const isBriefGeneration = this.data.pointName === 'Brief Generation';
    const defaultError = isBriefGeneration
      ? 'An error occurred while generating the draft brief. Please try again.'
      : 'An error occurred while generating variants. Please try again.';
    this.error = err?.message || defaultError;
    this.steps.forEach(step => {
      if (step.status === 'in-progress') {
        step.status = 'pending';
      }
    });
  }

  onReviewVariants(): void {
    this.dialogRef.close({ 
      action: 'review',
      success: true,
      data: this.generatedData
    });
  }

  onRetry(): void {
    this.dialogRef.close({ action: 'retry' });
  }

  onClose(): void {
    // If completed successfully, return the data
    if (this.isComplete && !this.error && this.generatedData) {
      this.dialogRef.close({ 
        action: 'close',
        success: true,
        data: this.generatedData
      });
    } else {
      this.dialogRef.close({ action: 'close' });
    }
  }

  onGenerateFallback(): void {
    this.dialogRef.close({ action: 'fallback' });
  }
}
