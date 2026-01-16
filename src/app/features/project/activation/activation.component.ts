import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subscription } from 'rxjs';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ProjectsStoreService } from '../../../data/projects-store.service';
import { Project, ActivationConfig, ActivityLog } from '../../../data/models';
import { ToastHelperService } from '../../../shared/toast-helper.service';
import { PageHeaderComponent } from '../../../shared/page-header/page-header.component';

@Component({
  selector: 'app-activation',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatChipsModule,
    MatDividerModule,
    MatTooltipModule,
    PageHeaderComponent
  ],
  templateUrl: './activation.component.html',
  styleUrls: ['./activation.component.scss']
})
export class ActivationComponent implements OnInit, OnDestroy {
  projectId: string = '';
  project: Project | null = null;
  activationForm: FormGroup;
  activityLogs: ActivityLog[] = [];
  activationConfig: ActivationConfig | null = null;
  safePreviewUrl: SafeResourceUrl | null = null;
  private lastScrollY = 0;
  private subscriptions = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private store: ProjectsStoreService,
    private toast: ToastHelperService,
    private sanitizer: DomSanitizer
  ) {
    this.activationForm = this.fb.group({
      scriptSnippet: ['', Validators.required],
      scopeType: ['exact', Validators.required],
      scopeValue: ['', Validators.required],
      antiFlicker: [true],
      maxWait: [3000, [Validators.required, Validators.min(0), Validators.max(10000)]],
      status: ['Paused', Validators.required]
    });
  }

  ngOnInit(): void {
    const getProjectId = (): string | null => {
      const currentParams = this.route.snapshot.params;
      if (currentParams['projectId']) {
        return currentParams['projectId'];
      }
      const parentParams = this.route.snapshot.parent?.params;
      if (parentParams?.['projectId']) {
        return parentParams['projectId'];
      }
      return null;
    };

    const initialProjectId = getProjectId();
    if (initialProjectId) {
      this.projectId = initialProjectId;
      this.loadData();
    }

    this.route.params.subscribe(params => {
      const newProjectId = params['projectId'];
      if (newProjectId && newProjectId !== this.projectId) {
        this.projectId = newProjectId;
        this.loadData();
      }
    });

    if (this.route.parent) {
      this.route.parent.params.subscribe(params => {
        const newProjectId = params['projectId'];
        if (newProjectId && newProjectId !== this.projectId) {
          this.projectId = newProjectId;
          this.loadData();
        }
      });
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  loadData(): void {
    const projectSub = this.store.projects$.subscribe(projects => {
      this.project = projects.find(p => p.id === this.projectId) || null;
      if (this.project) {
        this.generateScriptSnippet();
        this.updateScopeValue();
        if (this.isPreviewMode) {
          this.loadPreview();
        }
      }
    });
    this.subscriptions.add(projectSub);

    this.loadActivationConfig();
    this.loadActivityLogs();
  }

  loadActivationConfig(): void {
    const config: ActivationConfig = {
      projectId: this.projectId,
      scriptSnippet: this.activationForm.get('scriptSnippet')?.value || '',
      scopeType: this.activationForm.get('scopeType')?.value || 'exact',
      scopeValue: this.activationForm.get('scopeValue')?.value || '',
      antiFlicker: this.activationForm.get('antiFlicker')?.value ?? true,
      maxWait: this.activationForm.get('maxWait')?.value || 3000,
      status: this.activationForm.get('status')?.value || 'Paused',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.activationConfig = config;
  }

  loadActivityLogs(): void {
    this.activityLogs = [
      {
        id: '1',
        projectId: this.projectId,
        action: 'created',
        message: 'Activation configuration created',
        timestamp: new Date(Date.now() - 86400000)
      },
      {
        id: '2',
        projectId: this.projectId,
        action: 'updated',
        message: 'Script snippet updated',
        timestamp: new Date(Date.now() - 43200000)
      }
    ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  generateScriptSnippet(): void {
    if (!this.project) return;

    const gtmScript = `<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-XXXXXXX');</script>
<!-- End Google Tag Manager -->`;

    const embedScript = `<script>
(function() {
  var script = document.createElement('script');
  script.src = 'https://your-cro-tool.com/embed.js?project=${this.projectId}';
  script.async = true;
  script.setAttribute('data-project-id', '${this.projectId}');
  ${this.activationForm.get('antiFlicker')?.value ? `
  script.setAttribute('data-anti-flicker', 'true');
  script.setAttribute('data-max-wait', '${this.activationForm.get('maxWait')?.value || 3000}');
  ` : ''}
  document.head.appendChild(script);
})();
</script>`;

    const snippet = `${gtmScript}\n\n${embedScript}`;
    this.activationForm.patchValue({ scriptSnippet: snippet });
  }

  updateScopeValue(): void {
    if (this.project && this.activationForm.get('scopeType')?.value === 'exact') {
      this.activationForm.patchValue({ scopeValue: this.project.pageUrl });
    }
  }

  onScopeTypeChange(): void {
    this.updateScopeValue();
  }

  onAntiFlickerChange(): void {
    this.generateScriptSnippet();
  }

  onMaxWaitChange(): void {
    this.generateScriptSnippet();
  }

  copyScript(): void {
    const script = this.activationForm.get('scriptSnippet')?.value;
    if (script) {
      navigator.clipboard.writeText(script).then(() => {
        this.toast.showSuccess('Script copied to clipboard');
      }).catch(() => {
        this.toast.showError('Failed to copy script');
      });
    }
  }

  saveActivation(): void {
    if (this.activationForm.invalid) {
      this.toast.showError('Please fill in all required fields');
      return;
    }

    this.loadActivationConfig();
    this.addActivityLog('saved', 'Activation configuration saved');
    this.toast.showSuccess('Activation configuration saved');
  }

  activateProject(): void {
    if (this.activationForm.invalid) {
      this.toast.showError('Please complete the activation configuration first');
      return;
    }

    this.activationForm.patchValue({ status: 'Live' });
    this.saveActivation();
    this.addActivityLog('activated', 'Project activated');
    this.toast.showSuccess('Project activated successfully');
  }

  pauseProject(): void {
    this.activationForm.patchValue({ status: 'Paused' });
    this.saveActivation();
    this.addActivityLog('paused', 'Project paused');
    this.toast.showSuccess('Project paused');
  }

  previewProject(): void {
    this.activationForm.patchValue({ status: 'Preview' });
    this.loadPreview();
    this.saveActivation();
    this.addActivityLog('preview', 'Switched to preview mode');
    this.toast.showSuccess('Switched to preview mode');
  }

  loadPreview(): void {
    if (!this.project || !this.project.pageUrl) {
      return;
    }

    const previewUrl = this.project.pageUrl;
    this.lastScrollY = window.scrollY || 0;
    this.safePreviewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(previewUrl);
  }

  onPreviewIframeLoad(): void {
    requestAnimationFrame(() => {
      window.scrollTo({ top: this.lastScrollY, left: 0, behavior: 'auto' });
      (document.activeElement as HTMLElement | null)?.blur?.();
      (document.body as HTMLElement).focus?.();
    });
  }

  get isPreviewMode(): boolean {
    return this.activationForm.get('status')?.value === 'Preview';
  }

  private addActivityLog(action: string, message: string): void {
    const log: ActivityLog = {
      id: Date.now().toString(),
      projectId: this.projectId,
      action,
      message,
      timestamp: new Date()
    };
    this.activityLogs.unshift(log);
    if (this.activityLogs.length > 10) {
      this.activityLogs = this.activityLogs.slice(0, 10);
    }
  }

  getStatusColor(status: string): string {
    const colors: { [key: string]: string } = {
      'Live': 'primary',
      'Paused': 'warn',
      'Preview': 'accent'
    };
    return colors[status] || 'primary';
  }

  formatTimestamp(timestamp: Date): string {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
