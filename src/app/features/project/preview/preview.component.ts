import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml, SafeResourceUrl } from '@angular/platform-browser';
import { ProjectsStoreService } from '../../../data/projects-store.service';
import { ProjectsApiService } from '../../../api/services/projects-api.service';
import { PreviewService } from '../../../shared/preview.service';
import { Variant, OptimizationPoint } from '../../../data/models';
import { PageHeaderComponent } from '../../../shared/page-header/page-header.component';
import { Subscription } from 'rxjs';
import { take } from 'rxjs/operators';
import { ApiClient } from '../../../api/api-client';
import { API_CLIENT } from '../../../api/api-client.token';

@Component({
  selector: 'app-preview',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatListModule,
    MatProgressBarModule,
    CommonModule,
    PageHeaderComponent
  ],
  templateUrl: './preview.component.html',
  styleUrls: ['./preview.component.scss']
})
export class PreviewComponent implements OnInit, OnDestroy {
  projectId: string = '';
  project: any = null;
  basePreviewHtml: string = '';
  previewHtml: string = '';
  safePreviewHtml: SafeHtml = '';
  appliedVariants: Variant[] = [];
  points: OptimizationPoint[] = [];
  useIframe: boolean = false;
  pageUrl: string = '';
  safeIframeUrl: SafeResourceUrl = '';
  safeIframeHtml: SafeHtml = '';
  loadingPreview = false;
  private lastScrollY = 0;
  private subscriptions = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private store: ProjectsStoreService,
    private projectsApi: ProjectsApiService,
    private previewService: PreviewService,
    @Inject(API_CLIENT) private apiClient: ApiClient,
    private sanitizer: DomSanitizer
  ) {}

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

    const paramsSub = this.route.params.subscribe(params => {
      const newProjectId = params['projectId'];
      if (newProjectId && newProjectId !== this.projectId) {
        this.projectId = newProjectId;
        this.loadProject();
      }
    });
    this.subscriptions.add(paramsSub);

    if (this.route.parent) {
      const parentParamsSub = this.route.parent.params.subscribe(params => {
        const newProjectId = params['projectId'];
        if (newProjectId && newProjectId !== this.projectId) {
          this.projectId = newProjectId;
          this.loadProject();
        }
      });
      this.subscriptions.add(parentParamsSub);
    }

    this.route.queryParams.subscribe(params => {
      if (params['variant']) {
        this.applyVariant(params['variant']);
      }
    });
  }

  private getProjectId(): string {
    const currentParams = this.route.snapshot.params;
    if (currentParams['projectId']) {
      return currentParams['projectId'];
    }
    const parentParams = this.route.snapshot.parent?.params;
    if (parentParams?.['projectId']) {
      return parentParams['projectId'];
    }
    return this.projectId || '';
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  loadProject(): void {
    const projectId = this.getProjectId();
    if (!projectId) {
      return;
    }
    this.projectId = projectId;

    const storeProject = this.store.getProject(this.projectId);
    if (storeProject) {
      this.project = storeProject;
      this.pageUrl = storeProject.pageUrl || 'https://pack.stage.es';
      this.loadPagePreview();
      this.loadPoints();
      this.loadVariants();
      return;
    }

    const sub = this.store.listProjects().pipe(take(1)).subscribe({
      next: projects => {
        const foundProject = projects.find(p => p.id === this.projectId);
        if (foundProject) {
          this.project = foundProject;
          this.pageUrl = foundProject.pageUrl || 'https://pack.stage.es';
          this.loadPagePreview();
          this.loadPoints();
          this.loadVariants();
        } else {
          if (this.projectId) {
            this.projectsApi.getProject(this.projectId).pipe(take(1)).subscribe({
              next: project => {
                this.project = project;
                this.pageUrl = project.pageUrl || 'https://pack.stage.es';
                this.loadPagePreview();
                this.loadPoints();
                this.loadVariants();
              },
              error: () => {
                this.useDefaultProject();
              }
            });
          } else {
            this.useDefaultProject();
          }
        }
      },
      error: () => {
        if (this.projectId) {
          this.projectsApi.getProject(this.projectId).pipe(take(1)).subscribe({
            next: project => {
              this.project = project;
              this.pageUrl = project.pageUrl || 'https://pack.stage.es';
              this.loadPagePreview();
              this.loadPoints();
              this.loadVariants();
            },
            error: () => {
              this.useDefaultProject();
            }
          });
        } else {
          this.useDefaultProject();
        }
      }
    });
    this.subscriptions.add(sub);
  }

  private useDefaultProject(): void {
    this.project = {
      id: this.projectId || '1',
      name: 'Landing Page A',
      pageUrl: 'https://pack.stage.es',
      notes: 'Main conversion page',
      status: 'active',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-10'),
      previewHtml: '',
      language: 'en',
      pageContext: 'E-commerce landing page',
      croGuidelines: 'Focus on clarity and urgency',
      brandGuardrails: 'Maintain professional tone',
      forbiddenWords: [],
      mandatoryClaims: [],
      toneAllowed: ['professional', 'friendly'],
      toneDisallowed: ['casual', 'slang']
    };
    this.pageUrl = this.project.pageUrl;
    this.loadPagePreview();
    this.loadPoints();
    this.loadVariants();
  }

  loadPagePreview(): void {
    if (!this.pageUrl) {
      this.pageUrl = 'https://pack.stage.es';
    }

    if (!this.pageUrl && this.project?.previewHtml) {
      this.basePreviewHtml = this.project.previewHtml;
      this.useIframe = false;
      this.updatePreview();
      return;
    }

    this.lastScrollY = window.scrollY || 0;

    this.apiClient.proxyFetch(this.pageUrl).subscribe({
      next: (response) => {
        if (response.html && response.html.trim().length > 0) {
          const processedHtml = this.removeCookiePopupsFromHtml(response.html);
          this.basePreviewHtml = processedHtml;
          this.useIframe = true;
          this.safeIframeHtml = this.sanitizer.bypassSecurityTrustHtml(processedHtml);
          this.updatePreview();
        } else {
          this.useIframe = true;
          this.safeIframeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.pageUrl);
          this.updatePreview();
        }
      },
      error: () => {
        this.useIframe = true;
        this.safeIframeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.pageUrl);
        this.updatePreview();
      }
    });
  }

  onPreviewIframeLoad(): void {
    requestAnimationFrame(() => {
      window.scrollTo({ top: this.lastScrollY, left: 0, behavior: 'auto' });
      (document.activeElement as HTMLElement | null)?.blur?.();
      (document.body as HTMLElement).focus?.();
    });
  }

  loadPoints(): void {
    if (!this.projectId) {
      return;
    }
    
    const sub = this.store.listPoints(this.projectId).subscribe({
      next: points => {
        this.points = points;
        this.updatePreview();
      },
      error: err => {
        console.warn('No points found for project', this.projectId);
        this.points = [];
      }
    });
    this.subscriptions.add(sub);
  }

  loadVariants(): void {
    const sub = this.store.variants$.subscribe(variants => {
      const activeVariants = variants.filter(v => 
        v.status === 'active' && 
        this.points.some(p => p.id === v.optimizationPointId)
      );
      this.appliedVariants = activeVariants;
      this.updatePreview();
    });
    this.subscriptions.add(sub);
  }

  applyVariant(variantId: string): void {
    this.store.variants$.subscribe(variants => {
      const variant = variants.find(v => v.id === variantId && v.projectId === this.projectId);
      if (variant) {
        this.appliedVariants = [variant];
        this.updatePreview();
      }
    }).unsubscribe();
  }

  updatePreview(): void {
    if (!this.basePreviewHtml && !this.useIframe) {
      return;
    }

    if (this.useIframe) {
      return;
    }

    let html = this.basePreviewHtml;
    if (this.appliedVariants.length > 0 && this.points.length > 0) {
      html = this.previewService.applyVariantsToHtml(html, this.appliedVariants, this.points);
    }

    this.previewHtml = html;
    this.safePreviewHtml = this.previewService.sanitizeHtml(html);
  }

  getPointName(pointId: string): string {
    const point = this.points.find(p => p.id === pointId);
    return point?.name || 'Unknown Point';
  }

  goBack(): void {
    this.router.navigate(['/projects', this.projectId, 'reporting']);
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
}

