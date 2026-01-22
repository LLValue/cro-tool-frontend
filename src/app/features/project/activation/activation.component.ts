import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
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
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Subscription } from 'rxjs';
import { DomSanitizer, SafeResourceUrl, SafeHtml } from '@angular/platform-browser';
import { ProjectsStoreService } from '../../../data/projects-store.service';
import { Project, ActivationConfig, ActivityLog } from '../../../data/models';
import { ToastHelperService } from '../../../shared/toast-helper.service';
import { PageHeaderComponent } from '../../../shared/page-header/page-header.component';
import { ApiClient } from '../../../api/api-client';
import { API_CLIENT } from '../../../api/api-client.token';

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
    MatProgressBarModule,
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
  safePreviewHtml: SafeHtml = '';
  loadingPreview = false;
  private lastScrollY = 0;
  private subscriptions = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private store: ProjectsStoreService,
    private toast: ToastHelperService,
    private sanitizer: DomSanitizer,
    @Inject(API_CLIENT) private apiClient: ApiClient
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
        this.syncStatusFromProject();
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

  syncStatusFromProject(): void {
    if (!this.project) return;
    
    const projectStatus = this.project.status;
    let activationStatus: 'Live' | 'Paused' | 'Preview' = 'Paused';
    
    if (projectStatus === 'active') {
      activationStatus = 'Live';
    } else if (projectStatus === 'draft') {
      const currentFormStatus = this.activationForm.get('status')?.value;
      activationStatus = currentFormStatus === 'Preview' ? 'Preview' : 'Paused';
    } else if (projectStatus === 'archived') {
      activationStatus = 'Paused';
    }
    
    this.activationForm.patchValue({ status: activationStatus }, { emitEvent: false });
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

    const formStatus = this.activationForm.get('status')?.value;
    if (formStatus === 'Live') {
      this.store.updateProject(this.projectId, { status: 'active' });
    } else if (formStatus === 'Paused' || formStatus === 'Preview') {
      this.store.updateProject(this.projectId, { status: 'draft' });
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
    this.store.updateProject(this.projectId, { status: 'active' });
    this.saveActivation();
    this.addActivityLog('activated', 'Project activated');
    this.toast.showSuccess('Project activated successfully');
  }

  pauseProject(): void {
    this.activationForm.patchValue({ status: 'Paused' });
    this.store.updateProject(this.projectId, { status: 'draft' });
    this.saveActivation();
    this.addActivityLog('paused', 'Project paused');
    this.toast.showSuccess('Project paused');
  }

  previewProject(): void {
    this.activationForm.patchValue({ status: 'Preview' });
    this.store.updateProject(this.projectId, { status: 'draft' });
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
    this.loadingPreview = true;
    this.safePreviewUrl = null;
    this.safePreviewHtml = '';

    this.apiClient.proxyFetch(previewUrl).subscribe({
      next: (response) => {
        this.loadingPreview = false;
        if (response.html && response.html.trim().length > 0) {
          const processedHtml = this.removeCookiePopupsFromHtml(response.html);
          this.safePreviewHtml = this.sanitizer.bypassSecurityTrustHtml(processedHtml);
          this.safePreviewUrl = null;
        } else {
          this.safePreviewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(previewUrl);
          this.safePreviewHtml = '';
        }
      },
      error: () => {
        this.loadingPreview = false;
        this.safePreviewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(previewUrl);
        this.safePreviewHtml = '';
      }
    });
  }

  private removeCookiePopupsFromHtml(html: string): string {
    if (!html) return html;

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      const cookieSelectors = [
        '[id*="cookie"]', '[class*="cookie"]', '[id*="Cookie"]', '[class*="Cookie"]',
        '[id*="consent"]', '[class*="consent"]', '[id*="Consent"]', '[class*="Consent"]',
        '[id*="gdpr"]', '[class*="gdpr"]', '[id*="GDPR"]', '[class*="GDPR"]',
        '[id*="onetrust"]', '[class*="onetrust"]', '[id*="OneTrust"]', '[class*="OneTrust"]',
        '[id*="cookiebot"]', '[class*="cookiebot"]', '[id*="Cookiebot"]', '[class*="Cookiebot"]',
        '[id*="cookie-banner"]', '[class*="cookie-banner"]',
        '[id*="cookie-notice"]', '[class*="cookie-notice"]',
        '[id*="cookie-consent"]', '[class*="cookie-consent"]',
        '[id*="CybotCookiebotDialog"]', '[class*="CybotCookiebotDialog"]',
        '[data-testid*="cookie"]', '[data-testid*="Cookie"]'
      ];

      cookieSelectors.forEach(selector => {
        try {
          const elements = doc.querySelectorAll(selector);
          elements.forEach(el => {
            const text = (el.textContent || '').toLowerCase();
            if (text.includes('cookie') || text.includes('consent') || text.includes('gdpr')) {
              el.remove();
            }
          });
        } catch (e) {
        }
      });

      const style = doc.createElement('style');
      style.textContent = `
        [id*="cookie"], [class*="cookie"], [id*="Cookie"], [class*="Cookie"],
        [id*="consent"], [class*="consent"], [id*="Consent"], [class*="Consent"],
        [id*="gdpr"], [class*="gdpr"], [id*="GDPR"], [class*="GDPR"],
        [id*="onetrust"], [class*="onetrust"], [id*="OneTrust"], [class*="OneTrust"],
        [id*="cookiebot"], [class*="cookiebot"], [id*="Cookiebot"], [class*="Cookiebot"],
        [id*="CybotCookiebotDialog"], [class*="CybotCookiebotDialog"],
        [data-testid*="cookie"], [data-testid*="Cookie"] {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
          height: 0 !important;
          width: 0 !important;
          overflow: hidden !important;
          position: absolute !important;
          left: -9999px !important;
          z-index: -9999 !important;
        }
      `;
      doc.head.appendChild(style);

      const script = doc.createElement('script');
      script.textContent = `
        (function() {
          function hideCookieElements() {
            const selectors = [
              '[id*="cookie"]', '[class*="cookie"]', '[id*="Cookie"]', '[class*="Cookie"]',
              '[id*="consent"]', '[class*="consent"]', '[id*="Consent"]', '[class*="Consent"]',
              '[id*="gdpr"]', '[class*="gdpr"]', '[id*="GDPR"]', '[class*="GDPR"]',
              '[id*="onetrust"]', '[class*="onetrust"]', '[id*="OneTrust"]', '[class*="OneTrust"]',
              '[id*="cookiebot"]', '[class*="cookiebot"]', '[id*="Cookiebot"]', '[class*="Cookiebot"]',
              '[id*="CybotCookiebotDialog"]', '[class*="CybotCookiebotDialog"]'
            ];
            selectors.forEach(selector => {
              try {
                document.querySelectorAll(selector).forEach(el => {
                  const text = (el.textContent || '').toLowerCase();
                  if (text.includes('cookie') || text.includes('consent') || text.includes('gdpr')) {
                    el.style.cssText = 'display:none!important;visibility:hidden!important;opacity:0!important;height:0!important;width:0!important;position:absolute!important;left:-9999px!important;z-index:-9999!important;';
                  }
                });
              } catch(e) {}
            });
          }
          
          hideCookieElements();
          
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', hideCookieElements);
          }
          
          setTimeout(hideCookieElements, 500);
          setTimeout(hideCookieElements, 1000);
          setTimeout(hideCookieElements, 2000);
          setTimeout(hideCookieElements, 3000);
          
          const observer = new MutationObserver(function(mutations) {
            hideCookieElements();
          });
          
          if (document.body) {
            observer.observe(document.body, { 
              childList: true, 
              subtree: true,
              attributes: true,
              attributeFilter: ['class', 'id', 'style']
            });
          }
          
          const docObserver = new MutationObserver(function(mutations) {
            if (document.body) {
              observer.observe(document.body, { 
                childList: true, 
                subtree: true,
                attributes: true,
                attributeFilter: ['class', 'id', 'style']
              });
              docObserver.disconnect();
            }
          });
          docObserver.observe(document.documentElement, { childList: true });
          
          const originalPushState = history.pushState;
          const originalReplaceState = history.replaceState;
          
          history.pushState = function() {
            originalPushState.apply(history, arguments);
            setTimeout(hideCookieElements, 100);
            setTimeout(hideCookieElements, 500);
          };
          
          history.replaceState = function() {
            originalReplaceState.apply(history, arguments);
            setTimeout(hideCookieElements, 100);
            setTimeout(hideCookieElements, 500);
          };
          
          window.addEventListener('popstate', function() {
            setTimeout(hideCookieElements, 100);
            setTimeout(hideCookieElements, 500);
          });
          
          document.addEventListener('click', function(e) {
            const target = e.target;
            if (target && target.tagName === 'A') {
              setTimeout(hideCookieElements, 500);
              setTimeout(hideCookieElements, 1000);
            }
          }, true);
        })();
      `;
      doc.head.appendChild(script);

      const baseUrl = this.extractBaseUrl(this.project?.pageUrl || '');
      if (baseUrl) {
        const allLinks = doc.querySelectorAll('link[href], script[src], img[src], source[src]');
        allLinks.forEach((el: Element) => {
          const href = el.getAttribute('href') || el.getAttribute('src');
          if (href && href.startsWith(baseUrl)) {
            const relativeUrl = href.replace(baseUrl, '');
            if (el.hasAttribute('href')) {
              el.setAttribute('href', relativeUrl);
            } else {
              el.setAttribute('src', relativeUrl);
            }
          }
        });
        
        const styleSheets = doc.querySelectorAll('style');
        styleSheets.forEach(style => {
          if (style.textContent) {
            style.textContent = style.textContent.replace(
              new RegExp(`url\\(['"]?${baseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^'")]+)['"]?\\)`, 'gi'),
              (match, path) => `url('${path}')`
            );
          }
        });
      }

      return doc.documentElement.outerHTML;
    } catch (error) {
      return html;
    }
  }

  private extractBaseUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      return `${urlObj.protocol}//${urlObj.host}`;
    } catch {
      return null;
    }
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
    return 'primary';
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
