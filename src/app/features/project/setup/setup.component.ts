import { Component, OnInit, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { CommonModule } from '@angular/common';
import { ProjectsStoreService } from '../../../data/projects-store.service';
import { ProjectsApiService } from '../../../api/services/projects-api.service';
import { PreviewService } from '../../../shared/preview.service';
import { ToastHelperService } from '../../../shared/toast-helper.service';
import { PageHeaderComponent } from '../../../shared/page-header/page-header.component';
import { PreviewPanelComponent } from '../../../shared/preview-panel/preview-panel.component';
import { DomSanitizer, SafeHtml, SafeResourceUrl } from '@angular/platform-browser';
import { Project } from '../../../data/models';
import { take } from 'rxjs/operators';
import { ApiClient } from '../../../api/api-client';
import { API_CLIENT } from '../../../api/api-client.token';

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
    MatSelectModule,
    MatCardModule,
    MatProgressBarModule,
    CommonModule,
    PageHeaderComponent,
    PreviewPanelComponent
  ],
  templateUrl: './setup.component.html',
  styleUrls: ['./setup.component.scss']
})
export class SetupComponent implements OnInit {
  form: FormGroup;
  projectId: string = '';
  project: Project | null = null;
  pageUrl: string = '';
  previewHtml: string = '';
  originalPreviewHtml: string = '';
  safePreviewHtml: SafeHtml = '';
  useIframe: boolean = false;
  safeIframeUrl: SafeResourceUrl = '';
  safeIframeHtml: SafeHtml = '';
  loadingPreview = false;
  private lastScrollY = 0;

  industries = [
    'Automotive',
    'Banking',
    'Consumer Packaged Goods (CPG)',
    'Energy & Utilities',
    'Healthcare Providers',
    'Insurance',
    'Payments & Fintech',
    'Retail & E-commerce',
    'Technology / Software (SaaS)',
    'Telecommunications'
  ];

  elementTypes = [
    'Headline (H1)',
    'Subheadline / Subheader (H2)',
    'Call to Action (CTA) Button',
    'Supporting Copy / Body Text',
    'Form Labels & Helper Text',
    'Trust & Assurance Copy',
    'Benefit Bullets (feature list)',
    'Other'
  ];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private store: ProjectsStoreService,
    private projectsApi: ProjectsApiService,
    private previewService: PreviewService,
    private toast: ToastHelperService,
    private sanitizer: DomSanitizer,
    @Inject(API_CLIENT) private apiClient: ApiClient
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      pageUrl: ['', Validators.required],
      industry: [this.industries[0]],
      notes: ['']
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
      this.loadProject();
    }

    this.route.params.subscribe(params => {
      const newProjectId = params['projectId'];
      if (newProjectId && newProjectId !== this.projectId) {
        this.projectId = newProjectId;
        this.loadProject();
      }
    });

    if (this.route.parent) {
      this.route.parent.params.subscribe(params => {
        const newProjectId = params['projectId'];
        if (newProjectId && newProjectId !== this.projectId) {
          this.projectId = newProjectId;
          this.loadProject();
        }
      });
    }

    this.form.get('pageUrl')?.valueChanges.subscribe(() => {
      setTimeout(() => {
        if (this.form.get('pageUrl')?.value) {
          this.loadPreview();
        }
      }, 500);
    });
  }

  private loadProject(): void {
    if (!this.projectId) {
      return;
    }

    const storeProject = this.store.getProject(this.projectId);
    if (storeProject) {
      this.project = storeProject;
      this.loadProjectData();
    } else {
      this.store.listProjects().pipe(take(1)).subscribe(projects => {
        const foundProject = projects.find(p => p.id === this.projectId);
        if (foundProject) {
          this.project = foundProject;
          this.loadProjectData();
        } else {
          if (this.projectId) {
            this.projectsApi.getProject(this.projectId).pipe(take(1)).subscribe({
              next: project => {
                this.project = project;
                this.loadProjectData();
              },
              error: err => {
                if (err.status !== 404) {
                  console.error('Failed to load project', err);
                  this.toast.showError('Failed to load project');
                }
              }
            });
          }
        }
      });
    }
  }

  private loadProjectData(): void {
    if (this.project) {
      this.form.patchValue({
        name: this.project.name || '',
        pageUrl: this.project.pageUrl || '',
        industry: this.project.industry || this.industries[0],
        notes: this.project.notes || ''
      });
      this.pageUrl = this.project.pageUrl || '';
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
    const formUrl = this.form.get('pageUrl')?.value;
    const urlToUse = formUrl || this.pageUrl;
    
    if (!urlToUse || !urlToUse.trim()) {
      this.pageUrl = 'https://pack.stage.es';
    } else {
      this.pageUrl = urlToUse;
    }

    this.lastScrollY = window.scrollY || 0;
    this.loadingPreview = true;
    this.useIframe = false;
    this.safeIframeUrl = '';
    this.safeIframeHtml = '';

    this.apiClient.proxyFetch(this.pageUrl).subscribe({
      next: (response) => {
        this.loadingPreview = false;
        if (response.html && response.html.trim().length > 0) {
          const processedHtml = this.removeCookiePopupsFromHtml(response.html);
          this.previewHtml = processedHtml;
          if (!this.originalPreviewHtml) {
            this.originalPreviewHtml = processedHtml;
          }
          this.safePreviewHtml = this.previewService.sanitizeHtml(processedHtml);
          this.safeIframeHtml = this.sanitizer.bypassSecurityTrustHtml(processedHtml);
          this.useIframe = true;
          this.store.updateProject(this.projectId, { previewHtml: processedHtml });
        } else {
          this.useIframe = true;
          this.safeIframeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.pageUrl);
        }
      },
      error: () => {
        this.loadingPreview = false;
        this.useIframe = true;
        this.safeIframeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.pageUrl);
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

      const baseUrl = this.extractBaseUrl(this.pageUrl);
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

  goBack(): void {
    this.router.navigate(['/projects']);
  }
}

