import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { CommonModule } from '@angular/common';
import { ProjectsStoreService } from '../../../data/projects-store.service';
import { ProjectsApiService } from '../../../api/services/projects-api.service';
import { PreviewService } from '../../../shared/preview.service';
import { ToastHelperService } from '../../../shared/toast-helper.service';
import { PageHeaderComponent } from '../../../shared/page-header/page-header.component';
import { DomSanitizer, SafeHtml, SafeResourceUrl } from '@angular/platform-browser';
import { Project } from '../../../data/models';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-setup',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    CommonModule,
    PageHeaderComponent
  ],
  template: `
    <app-page-header title="Project Setup" [subtitle]="project?.name || ''">
      <button mat-button (click)="goBack()">
        <mat-icon>arrow_back</mat-icon>
        Back
      </button>
    </app-page-header>

    <form [formGroup]="form" (ngSubmit)="onSave()">
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Project Name</mat-label>
        <input matInput formControlName="name" required>
        <mat-error *ngIf="form.get('name')?.hasError('required')">
          Name is required
        </mat-error>
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Page URL</mat-label>
        <input matInput formControlName="pageUrl" type="url">
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Notes</mat-label>
        <textarea matInput formControlName="notes" rows="4"></textarea>
      </mat-form-field>

      <div class="actions">
        <button mat-raised-button color="primary" type="submit" [disabled]="form.invalid">
          <mat-icon>save</mat-icon>
          Save
        </button>
        <button mat-button type="button" (click)="loadPreview()">
          <mat-icon>refresh</mat-icon>
          Load Page Preview
        </button>
        <button mat-button type="button" (click)="goBack()">
          <mat-icon>arrow_back</mat-icon>
          Back
        </button>
      </div>
    </form>

    <div class="preview-section">
      <div class="preview-header">
        <h3>Page Preview</h3>
        <button mat-icon-button (click)="loadPreview()" matTooltip="Reload page">
          <mat-icon>refresh</mat-icon>
        </button>
      </div>
      <div class="preview-wrapper">
        <iframe 
          *ngIf="useIframe && safeIframeUrl" 
          [src]="safeIframeUrl" 
          class="preview-iframe"
          frameborder="0">
        </iframe>
        <div 
          *ngIf="!useIframe && previewHtml" 
          class="preview-content" 
          [innerHTML]="safePreviewHtml">
        </div>
      </div>
    </div>
  `,
  styles: [`
    form {
      margin-top: 48px;
    }
    .full-width {
      width: 100%;
      margin-bottom: 16px;
    }
    .actions {
      display: flex;
      gap: 8px;
      margin-top: 16px;
    }
    .preview-section {
      margin-top: 32px;
      padding: 16px;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
    }
    .preview-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    .preview-header h3 {
      margin: 0;
    }
    .preview-wrapper {
      border: 1px solid #ccc;
      border-radius: 4px;
      overflow: hidden;
      background: white;
      min-height: 400px;
    }
    .preview-iframe {
      width: 100%;
      height: 600px;
      border: none;
    }
    .preview-content {
      padding: 16px;
      min-height: 400px;
    }
    :host-context(body.dark-mode) {
      .preview-section {
        border-color: rgba(255, 255, 255, 0.12);
      }
      .preview-header {
        h3 {
          color: #ffffff !important;
        }
        button {
          color: #ffffff !important;
          mat-icon {
            color: #ffffff !important;
          }
          &:hover {
            color: var(--theme-primary) !important;
            mat-icon {
              color: var(--theme-primary) !important;
            }
          }
        }
      }
      .preview-wrapper {
        border-color: rgba(255, 255, 255, 0.12);
        background: #1e1e1e;
      }
    }
  `]
})
export class SetupComponent implements OnInit {
  form: FormGroup;
  projectId: string = '';
  project: Project | null = null;
  pageUrl: string = '';
  previewHtml: string = '';
  safePreviewHtml: SafeHtml = '';
  useIframe: boolean = false;
  safeIframeUrl: SafeResourceUrl = '';

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private store: ProjectsStoreService,
    private projectsApi: ProjectsApiService,
    private previewService: PreviewService,
    private toast: ToastHelperService,
    private sanitizer: DomSanitizer
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      pageUrl: [''],
      notes: ['']
    });
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.projectId = params['projectId'];
      this.loadProject();
    });

    // Watch for changes in pageUrl to update preview
    this.form.get('pageUrl')?.valueChanges.subscribe(() => {
      // Debounce to avoid too many requests
      setTimeout(() => {
        if (this.form.get('pageUrl')?.value) {
          this.loadPreview();
        }
      }, 500);
    });
  }

  private loadProject(): void {
    // Try to get from store first (synchronous, faster)
    const storeProject = this.store.getProject(this.projectId);
    if (storeProject) {
      this.project = storeProject;
      this.loadProjectData();
    } else {
      // Wait for projects to load, then try again
      this.store.listProjects().pipe(take(1)).subscribe(projects => {
        const foundProject = projects.find(p => p.id === this.projectId);
        if (foundProject) {
          this.project = foundProject;
          this.loadProjectData();
        } else {
          // If still not found, try API
          this.projectsApi.getProject(this.projectId).pipe(take(1)).subscribe({
            next: project => {
              this.project = project;
              this.loadProjectData();
            },
            error: err => {
              // Only show error if it's not a 404 (project might be new)
              if (err.status !== 404) {
                console.error('Failed to load project', err);
                this.toast.showError('Failed to load project');
              }
              // For 404, project might be new, so just initialize empty form
            }
          });
        }
      });
    }
  }

  private loadProjectData(): void {
    if (this.project) {
      this.form.patchValue({
        name: this.project.name || '',
        pageUrl: this.project.pageUrl || '',
        notes: this.project.notes || ''
      });
      this.pageUrl = this.project.pageUrl || '';
      // Load preview automatically
      this.loadPreview();
    }
  }

  onSave(): void {
    if (this.form.valid) {
      this.store.updateProject(this.projectId, this.form.value);
      this.toast.showSuccess('Project saved');
    }
  }

  loadPreview(): void {
    // Get URL from form or use stored pageUrl
    const formUrl = this.form.get('pageUrl')?.value;
    const urlToUse = formUrl || this.pageUrl;
    
    // Use default URL if not configured (for development)
    if (!urlToUse || !urlToUse.trim()) {
      this.pageUrl = 'https://pack.stage.es';
    } else {
      this.pageUrl = urlToUse;
    }

    // Check if we need to use iframe (different origin)
    this.useIframe = this.previewService.shouldUseIframe(this.pageUrl);

    if (this.useIframe) {
      // For external URLs, we'll use iframe in the template
      this.previewHtml = '';
      this.safeIframeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.pageUrl);
    } else {
      // Try to load HTML directly
      this.previewService.loadPageFromUrl(this.pageUrl).subscribe({
        next: html => {
          if (html) {
            this.previewHtml = html;
            this.safePreviewHtml = this.previewService.sanitizeHtml(html);
            this.store.updateProject(this.projectId, { previewHtml: html });
          } else {
            // Fallback to iframe
            this.useIframe = true;
            this.safeIframeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.pageUrl);
          }
        },
        error: () => {
          // Fallback to iframe
          this.useIframe = true;
          this.safeIframeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.pageUrl);
        }
      });
    }
  }

  goBack(): void {
    this.router.navigate(['/projects']);
  }
}

