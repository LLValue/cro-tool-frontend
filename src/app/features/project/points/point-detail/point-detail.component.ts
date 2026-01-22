import { Component, OnInit, OnDestroy, ViewChild, ElementRef, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { PageHeaderComponent } from '../../../../shared/page-header/page-header.component';
import { ChipsInputComponent } from '../../../../shared/chips-input/chips-input.component';
import { InfoModalComponent } from '../../../../shared/info-modal/info-modal.component';
import { ProjectsStoreService } from '../../../../data/projects-store.service';
import { ProjectsApiService } from '../../../../api/services/projects-api.service';
import { OptimizationPoint, Variant } from '../../../../data/models';
import { ToastHelperService } from '../../../../shared/toast-helper.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { API_CLIENT } from '../../../../api/api-client.token';
import { ApiClient } from '../../../../api/api-client';
import { Subscription } from 'rxjs';
import { take } from 'rxjs/operators';

interface SelectedElement {
  element: HTMLElement;
  selector: string;
  text: string;
}

@Component({
  selector: 'app-point-detail',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FormsModule,
    CommonModule,
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatChipsModule,
    MatSlideToggleModule,
    MatTooltipModule,
    MatProgressBarModule,
    MatDialogModule,
    PageHeaderComponent,
    ChipsInputComponent
  ],
  templateUrl: './point-detail.component.html',
  styleUrls: ['./point-detail.component.scss']
})
export class PointDetailComponent implements OnInit, OnDestroy {
  @ViewChild('previewFrame', { static: false }) previewFrame!: ElementRef<HTMLIFrameElement>;
  
  pointId: string = '';
  projectId: string = '';
  point: OptimizationPoint | null = null;
  variants: Variant[] = [];
  filteredVariants: Variant[] = [];
  variantFilter: string = 'all';
  
  setupForm: FormGroup;
  briefForm: FormGroup;
  
  goodIdeas: string[] = [];
  thingsToAvoid: string[] = [];
  mustIncludeKeywords: string[] = [];
  mustAvoidTerms: string[] = [];
  
  // Preview and selection properties
  html: string = '';
  safeHtml: SafeHtml | null = null;
  loading = false;
  error: string | null = null;
  selectionMode = false;
  selectedElement: SelectedElement | null = null;
  viewMode: 'mobile' | 'desktop' = 'desktop';
  private highlightStyle: HTMLStyleElement | null = null;
  
  private subscriptions = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private store: ProjectsStoreService,
    private fb: FormBuilder,
    private toast: ToastHelperService,
    @Inject(API_CLIENT) private apiClient: ApiClient,
    private sanitizer: DomSanitizer,
    private projectsApi: ProjectsApiService,
    private dialog: MatDialog
  ) {
    this.setupForm = this.fb.group({
      name: ['', Validators.required],
      elementType: ['Title'], // First option as default
      selector: ['', Validators.required],
      deviceScope: ['All'],
      status: ['Active']
    });

    this.briefForm = this.fb.group({
      objective: ['', Validators.required],
      context: ['', Validators.required],
      minChars: [0, [Validators.min(0), Validators.pattern(/^\d+$/)]],
      maxChars: [0, [Validators.min(0), Validators.pattern(/^\d+$/)]],
      maxWords: [0, [Validators.min(0), Validators.pattern(/^\d+$/)]]
    });
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.pointId = params['pointId'];
      this.projectId = params['projectId'] || this.route.snapshot.parent?.params['projectId'] || '';
      this.loadPoint();
      this.loadVariants();
      this.loadPreview();
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.removeHighlightStyle();
  }

  loadPoint(): void {
    if (!this.pointId) return;
    
    const sub = this.store.points$.subscribe(points => {
      this.point = points.find(p => p.id === this.pointId) || null;
      if (this.point) {
        this.setupForm.patchValue({
          name: this.point.name || '',
          elementType: this.point.elementType || 'Title', // First option
          selector: this.point.selector || '',
          deviceScope: this.point.deviceScope || 'All', // First option
          status: this.point.status || 'Active'
        });
        this.briefForm.patchValue({
          objective: this.point.objective || '',
          context: (this.point as any).context || ''
        });

        const generationRules = this.point.generationRules ? JSON.parse(this.point.generationRules || '{}') : {};
        this.goodIdeas = generationRules.goodIdeas || [];
        this.thingsToAvoid = generationRules.thingsToAvoid || [];
        this.mustIncludeKeywords = generationRules.mustIncludeKeywords || [];
        this.mustAvoidTerms = generationRules.mustAvoidTerms || [];
        this.briefForm.patchValue({
          minChars: generationRules.minChars || 0,
          maxChars: generationRules.maxChars || 0,
          maxWords: generationRules.maxWords || 0
        });
      } else {
        // No point data, ensure defaults are set
        if (!this.setupForm.get('elementType')?.value) {
          this.setupForm.patchValue({ elementType: 'Title' });
        }
        if (!this.setupForm.get('deviceScope')?.value) {
          this.setupForm.patchValue({ deviceScope: 'All' });
        }
      }
    });
    this.subscriptions.add(sub);
  }

  loadVariants(): void {
    if (!this.pointId) return;

    const sub = this.store.variants$.subscribe(variants => {
      this.variants = variants
        .filter(v => v.optimizationPointId === this.pointId)
        .sort((a, b) => b.uxScore - a.uxScore);
      this.filterVariants();
    });
    this.subscriptions.add(sub);

    this.store.listVariants(this.pointId).subscribe();
  }

  filterVariants(): void {
    let filtered: Variant[];
    if (this.variantFilter === 'all') {
      filtered = this.variants;
    } else {
      filtered = this.variants.filter(v => {
        if (this.variantFilter === 'active') return v.status === 'active';
        if (this.variantFilter === 'discarded') return v.status === 'discarded';
        return true;
      });
    }
    this.filteredVariants = filtered.sort((a, b) => b.uxScore - a.uxScore);
  }

  saveSetup(): void {
    if (this.setupForm.invalid || !this.point) return;

    const status = this.setupForm.get('status')?.value ? 'Active' : 'Paused';
    
    this.store.updatePoint(this.pointId, {
      name: this.setupForm.get('name')?.value,
      elementType: this.setupForm.get('elementType')?.value,
      selector: this.setupForm.get('selector')?.value,
      deviceScope: this.setupForm.get('deviceScope')?.value,
      status: status,
      updatedAt: new Date()
    });

    this.toast.showSuccess('Point setup saved');
  }

  saveBrief(): void {
    if (!this.point) return;

    const generationRules = {
      goodIdeas: this.goodIdeas,
      thingsToAvoid: this.thingsToAvoid,
      mustIncludeKeywords: this.mustIncludeKeywords,
      mustAvoidTerms: this.mustAvoidTerms,
      minChars: this.briefForm.get('minChars')?.value || 0,
      maxChars: this.briefForm.get('maxChars')?.value || 0,
      maxWords: this.briefForm.get('maxWords')?.value || 0
    };

    this.store.updatePoint(this.pointId, {
      objective: this.briefForm.get('objective')?.value,
      generationRules: JSON.stringify(generationRules),
      updatedAt: new Date()
    });

    this.toast.showSuccess('Optimization brief saved');
  }

  generateVariants(): void {
    if (!this.pointId) return;

    this.store.generateVariants(this.pointId, 10);
    this.toast.showSuccess('Generating 10 variants...');
  }

  approveVariant(variantId: string): void {
    this.store.approveVariant(variantId);
    this.toast.showSuccess('Variant approved');
  }

  unapproveVariant(variantId: string): void {
    this.store.updateVariant(variantId, { status: 'discarded' });
    this.toast.showSuccess('Variant disabled');
  }

  deleteVariant(variantId: string): void {
    if (!confirm('Are you sure you want to delete this variant?')) return;
    
    this.store.deleteVariant(variantId);
    this.toast.showSuccess('Variant deleted');
  }

  updateVariant(variant: Variant): void {
    if (variant.status === 'active') return;
    
    this.store.updateVariant(variant.id, { text: variant.text });
  }

  onStatusToggleChange(checked: boolean): void {
    if (!this.point) return;

    const newStatus = checked ? 'Active' : 'Paused';
    this.setupForm.patchValue({ status: newStatus });
    
    this.store.updatePoint(this.pointId, {
      status: newStatus,
      updatedAt: new Date()
    });
    this.toast.showSuccess(`Point ${newStatus === 'Active' ? 'activated' : 'paused'}`);
  }

  toggleStatus(): void {
    if (!this.point) return;

    const newStatus = this.point.status === 'Active' ? 'Paused' : 'Active';
    this.store.updatePoint(this.pointId, {
      status: newStatus,
      updatedAt: new Date()
    });
    this.toast.showSuccess(`Point ${newStatus === 'Active' ? 'activated' : 'paused'}`);
  }

  formatDate(date: Date | string | undefined): string {
    if (!date) return 'Unknown';
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return 'Unknown';
    return d.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  goBack(): void {
    this.router.navigate(['/projects', this.projectId, 'points']);
  }

  // Preview and selection methods
  loadPreview(): void {
    if (!this.projectId) return;
    
    this.loading = true;
    this.error = null;

    // First, get the project to obtain its pageUrl
    const projectSub = this.store.listProjects().pipe(take(1)).subscribe({
      next: (projects) => {
        let project = projects.find(p => p.id === this.projectId);
        
        // If not in store, try API
        if (!project) {
          this.projectsApi.getProject(this.projectId).pipe(take(1)).subscribe({
            next: (p) => {
              project = p;
              this.fetchPageHtml(project?.pageUrl);
            },
            error: () => {
              this.error = 'Project not found. Please check the project ID.';
              this.loading = false;
              this.toast.showError(this.error);
            }
          });
        } else {
          this.fetchPageHtml(project?.pageUrl);
        }
      },
      error: () => {
        // Try API directly
        this.projectsApi.getProject(this.projectId).pipe(take(1)).subscribe({
          next: (project) => {
            this.fetchPageHtml(project?.pageUrl);
          },
          error: () => {
            this.error = 'Project not found. Please check the project ID.';
            this.loading = false;
            this.toast.showError(this.error);
          }
        });
      }
    });
    this.subscriptions.add(projectSub);
  }

  private fetchPageHtml(pageUrl: string | undefined): void {
    if (!pageUrl || !pageUrl.trim()) {
      this.error = 'Project does not have a page URL configured. Please set it in Project Setup.';
      this.loading = false;
      this.toast.showError(this.error);
      return;
    }

    // Use proxyFetch to get HTML directly (returns text/html, not JSON)
    const sub = this.apiClient.proxyFetch(pageUrl).subscribe({
      next: (response) => {
        if (!response.html || response.html.trim().length === 0) {
          this.error = 'The page preview is empty. The URL may be invalid or the page may not be accessible.';
          this.loading = false;
          this.toast.showError(this.error);
          return;
        }

        // Process HTML to remove cookie pop-ups before displaying
        this.html = this.removeCookiePopupsFromHtml(response.html);
        this.safeHtml = this.sanitizer.bypassSecurityTrustHtml(this.html);
        this.loading = false;
        
        // Wait for iframe to load, then inject selection script
        setTimeout(() => {
          this.injectSelectionScript();
        }, 500);
      },
      error: (err: any) => {
        this.loading = false;
        
        // Extract error message from response
        let errorMessage = 'Failed to load page preview.';
        if (err.error?.message) {
          errorMessage = `Failed to load page preview: ${err.error.message}`;
        } else if (err.message) {
          errorMessage = `Failed to load page preview: ${err.message}`;
        } else if (err.status === 400) {
          errorMessage = 'Invalid URL. Please check the project\'s page URL in Project Setup.';
        } else if (err.status === 502) {
          errorMessage = 'Unable to fetch the page. The URL may be invalid, unreachable, or the page may be taking too long to load.';
        } else if (err.status === 0) {
          errorMessage = 'Cannot connect to the server. Please make sure the backend is running.';
        }

        this.error = errorMessage;
        this.toast.showError(errorMessage);
      }
    });
    this.subscriptions.add(sub);
  }

  injectSelectionScript(): void {
    const iframe = this.previewFrame?.nativeElement;
    if (!iframe) return;

    // Wait for iframe to load
    iframe.onload = () => {
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!iframeDoc) {
          console.warn('Cannot access iframe document (CORS restriction)');
          return;
        }

        // Remove existing highlight style if any
        this.removeHighlightStyle();

        // Create highlight style
        const style = iframeDoc.createElement('style');
        style.id = 'point-editor-highlight';
        style.textContent = `
          .point-editor-highlight {
            outline: 3px solid #2196F3 !important;
            outline-offset: 2px !important;
            background-color: rgba(33, 150, 243, 0.1) !important;
            cursor: pointer !important;
          }
          .point-editor-selected {
            outline: 3px solid #4CAF50 !important;
            outline-offset: 2px !important;
            background-color: rgba(76, 175, 80, 0.2) !important;
          }
          
          /* Hide cookie consent pop-ups and banners */
          [id*="cookie"],
          [class*="cookie"],
          [id*="Cookie"],
          [class*="Cookie"],
          [id*="consent"],
          [class*="consent"],
          [id*="Consent"],
          [class*="Consent"],
          [id*="gdpr"],
          [class*="gdpr"],
          [id*="GDPR"],
          [class*="GDPR"],
          [id*="cookie-banner"],
          [class*="cookie-banner"],
          [id*="cookie-notice"],
          [class*="cookie-notice"],
          [id*="cookie-consent"],
          [class*="cookie-consent"],
          [id*="onetrust"],
          [class*="onetrust"],
          [id*="OneTrust"],
          [class*="OneTrust"],
          [id*="cookiebot"],
          [class*="cookiebot"],
          [id*="Cookiebot"],
          [class*="Cookiebot"],
          [id*="CybotCookiebotDialog"],
          [class*="CybotCookiebotDialog"],
          [data-testid*="cookie"],
          [data-testid*="Cookie"] {
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
        iframeDoc.head.appendChild(style);
        this.highlightStyle = style;
        
        // Inject script to auto-close cookie pop-ups
        const cookieScript = iframeDoc.createElement('script');
        cookieScript.textContent = `
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
            const observer = new MutationObserver(hideCookieElements);
            observer.observe(document.body, { childList: true, subtree: true });
          })();
        `;
        iframeDoc.head.appendChild(cookieScript);

        // Add event listeners for element selection
        iframeDoc.addEventListener('mouseover', this.onElementHover.bind(this), true);
        iframeDoc.addEventListener('mouseout', this.onElementOut.bind(this), true);
        iframeDoc.addEventListener('click', this.onElementClick.bind(this), true);
      } catch (err) {
        console.warn('Could not inject selection script (CORS):', err);
        this.toast.showError('Cannot access iframe content. Please use manual selector input.');
      }
    };
  }

  onElementHover(event: MouseEvent): void {
    if (!this.selectionMode) return;
    
    const target = event.target as HTMLElement;
    if (!target || target === this.selectedElement?.element) return;

    // Remove previous highlight
    const prevHighlight = this.previewFrame?.nativeElement?.contentDocument?.querySelector('.point-editor-highlight');
    if (prevHighlight) {
      prevHighlight.classList.remove('point-editor-highlight');
    }

    // Add highlight to current element
    target.classList.add('point-editor-highlight');
  }

  onElementOut(event: MouseEvent): void {
    if (!this.selectionMode) return;
    
    const target = event.target as HTMLElement;
    if (!target || target === this.selectedElement?.element) return;

    target.classList.remove('point-editor-highlight');
  }

  onElementClick(event: MouseEvent): void {
    if (!this.selectionMode) return;
    
    event.preventDefault();
    event.stopPropagation();

    const target = event.target as HTMLElement;
    if (!target) return;

    // Remove previous selection
    const prevSelected = this.previewFrame?.nativeElement?.contentDocument?.querySelector('.point-editor-selected');
    if (prevSelected) {
      prevSelected.classList.remove('point-editor-selected');
    }

    // Add selection to current element
    target.classList.add('point-editor-selected');
    target.classList.remove('point-editor-highlight');

    // Generate selector and extract text
    const selector = this.generateSelector(target);
    const text = this.extractText(target);

    this.selectedElement = {
      element: target,
      selector,
      text
    };

    // Update form
    this.setupForm.patchValue({
      selector,
      name: this.generateDefaultName(target, text)
    });

    // Disable selection mode
    this.selectionMode = false;
    this.toast.showSuccess('Element selected! Review the details below.');
  }

  generateSelector(element: HTMLElement): string {
    // Try ID first
    if (element.id) {
      return `#${element.id}`;
    }

    // Try class
    if (element.className && typeof element.className === 'string') {
      const classes = element.className.split(' ').filter(c => c.trim());
      if (classes.length > 0) {
        const classSelector = '.' + classes.join('.');
        // Check if this selector is unique
        const iframeDoc = this.previewFrame?.nativeElement?.contentDocument;
        if (iframeDoc && iframeDoc.querySelectorAll(classSelector).length === 1) {
          return classSelector;
        }
      }
    }

    // Try data attributes
    for (let i = 0; i < element.attributes.length; i++) {
      const attr = element.attributes[i];
      if (attr.name.startsWith('data-')) {
        const selector = `[${attr.name}="${attr.value}"]`;
        const iframeDoc = this.previewFrame?.nativeElement?.contentDocument;
        if (iframeDoc && iframeDoc.querySelectorAll(selector).length === 1) {
          return selector;
        }
      }
    }

    // Build path
    const path: string[] = [];
    let current: HTMLElement | null = element;

    while (current && current.nodeType === Node.ELEMENT_NODE) {
      let selector = current.tagName.toLowerCase();
      
      if (current.id) {
        selector += `#${current.id}`;
        path.unshift(selector);
        break;
      }
      
      if (current.className && typeof current.className === 'string') {
        const classes = current.className.split(' ').filter(c => c.trim());
        if (classes.length > 0) {
          selector += '.' + classes.join('.');
        }
      }

      // Add nth-child if needed
      const parent: HTMLElement | null = current.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter(
          (child: Element) => (child as HTMLElement).tagName === current!.tagName
        );
        if (siblings.length > 1) {
          const index = siblings.indexOf(current) + 1;
          selector += `:nth-of-type(${index})`;
        }
      }

      path.unshift(selector);
      current = parent;
    }

    return path.join(' > ');
  }

  extractText(element: HTMLElement): string {
    // Get text content, but exclude nested interactive elements
    const clone = element.cloneNode(true) as HTMLElement;
    const interactiveElements = clone.querySelectorAll('button, a, input, textarea, select');
    interactiveElements.forEach(el => el.remove());
    return clone.textContent?.trim() || '';
  }

  generateDefaultName(element: HTMLElement, text: string): string {
    const tagName = element.tagName.toLowerCase();
    const shortText = text.substring(0, 30).replace(/\s+/g, ' ');
    
    if (tagName === 'h1' || tagName === 'h2' || tagName === 'h3') {
      return `Title: ${shortText}`;
    }
    if (tagName === 'button' || (element.closest('button'))) {
      return `CTA: ${shortText}`;
    }
    if (tagName === 'p') {
      return `Text: ${shortText}`;
    }
    
    return `${tagName}: ${shortText}`;
  }

  enableSelectionMode(): void {
    this.selectionMode = true;
    this.toast.showInfo('Click on any element in the preview to select it');
  }

  disableSelectionMode(): void {
    this.selectionMode = false;
    
    // Remove all highlights
    const iframeDoc = this.previewFrame?.nativeElement?.contentDocument;
    if (iframeDoc) {
      const highlights = iframeDoc.querySelectorAll('.point-editor-highlight');
      highlights.forEach(el => el.classList.remove('point-editor-highlight'));
    }
  }

  removeHighlightStyle(): void {
    if (this.highlightStyle && this.highlightStyle.parentNode) {
      this.highlightStyle.parentNode.removeChild(this.highlightStyle);
      this.highlightStyle = null;
    }
  }

  // Character counter helpers
  getCharacterCount(controlName: string): number {
    const value = this.briefForm.get(controlName)?.value || '';
    return value.length;
  }

  getMaxChars(): number {
    return this.briefForm.get('maxChars')?.value || 0;
  }

  // Info modal content
  getInfoModalContent(field: string): string {
    const contents: { [key: string]: string } = {
      objective: `
        <p><strong>Explain the element's goal:</strong> What "success" looks like, and the user friction it should address.</p>
        <p><strong>Example objectives:</strong></p>
        <ul>
          <li>Improve clarity and reduce confusion about the pricing structure</li>
          <li>Increase trust and reduce perceived risk in the signup process</li>
          <li>Drive clicks to the pricing page with a clear value proposition</li>
        </ul>
        <p><strong>Common mistakes:</strong></p>
        <ul>
          <li>Too solution-led (focusing on features instead of outcomes)</li>
          <li>Too broad (not specific enough to guide the AI)</li>
          <li>Not measurable (no clear success criteria)</li>
        </ul>
      `,
      context: `
        <p><strong>Capture what's around the element:</strong> Nearby text/visuals, what the user likely knows at this point, key constraints.</p>
        <p><strong>Good context example:</strong></p>
        <p>"User has just seen the pricing table. They know the product costs $99/month. They're comparing plans. The CTA appears right after the feature comparison table."</p>
        <p><strong>Bad context example:</strong></p>
        <p>"User is on the pricing page." (Too vague - doesn't capture the user's mindset or surrounding content)</p>
      `,
      goodIdeas: `
        <p><strong>Suggested angles and structures:</strong> Patterns that fit this element type (H1/CTA/microcopy).</p>
        <p><strong>Example patterns:</strong></p>
        <ul>
          <li>Reassurance-first: "Start your free trial - no credit card required"</li>
          <li>Benefit-first: "Get 3x more conversions with AI-powered copy"</li>
          <li>Process clarity: "See how it works in 2 minutes"</li>
          <li>Social proof: "Join 10,000+ marketers already using this"</li>
        </ul>
        <p><strong>When to use each:</strong> Match the pattern to the user's stage in the funnel and the element's purpose.</p>
      `,
      thingsToAvoid: `
        <p><strong>Known pitfalls and compliance-sensitive language:</strong> "No-go" styles for this client/market.</p>
        <p><strong>Risky phrasing examples:</strong></p>
        <ul>
          <li>Overpromising: "Guaranteed to double your revenue"</li>
          <li>Jargon: "Leverage our synergistic solution"</li>
          <li>Aggressive urgency: "Only 2 hours left! Buy now!"</li>
          <li>Sensitive claims: "FDA approved" (without verification)</li>
        </ul>
        <p><strong>Safer alternatives:</strong> Focus on benefits you can prove, use clear language, create urgency through value, not scarcity.</p>
      `,
      minChars: `
        <p><strong>Why limits matter:</strong> Layout constraints, readability, mobile experience.</p>
        <p><strong>Suggested ranges by element type:</strong></p>
        <ul>
          <li>CTA: 6-18 characters</li>
          <li>H1: 25-60 characters</li>
          <li>Subheadline: 40-80 characters</li>
          <li>Microcopy: 10-50 characters</li>
        </ul>
        <p><strong>What happens if variants exceed limits:</strong> They can be auto-rejected or rewritten to fit the constraints.</p>
      `,
      maxChars: `
        <p><strong>Why limits matter:</strong> Layout constraints, readability, mobile experience.</p>
        <p><strong>Suggested ranges by element type:</strong></p>
        <ul>
          <li>CTA: 6-18 characters</li>
          <li>H1: 25-60 characters</li>
          <li>Subheadline: 40-80 characters</li>
          <li>Microcopy: 10-50 characters</li>
        </ul>
        <p><strong>What happens if variants exceed limits:</strong> They can be auto-rejected or rewritten to fit the constraints.</p>
      `,
      mustIncludeKeywords: `
        <p><strong>Use for required terms:</strong> Product name, "APR", "quote", etc.</p>
        <p><strong>Recommendation:</strong> 0-3 items max. Too many requirements reduces creativity and can harm UX.</p>
        <p><strong>Matching rules:</strong></p>
        <ul>
          <li>Exact match: The keyword must appear exactly as specified</li>
          <li>Contains: The keyword can appear as part of a larger phrase</li>
        </ul>
        <p><strong>Warning:</strong> Over-constraining can lead to awkward or forced copy that doesn't feel natural.</p>
      `,
      mustAvoidTerms: `
        <p><strong>Use for local constraints:</strong> Avoid "free" on CTA, avoid urgency on regulated pages, etc.</p>
        <p><strong>How this interacts with global guardrails:</strong> This is additive - local constraints are in addition to global forbidden terms.</p>
        <p><strong>How violations are handled:</strong> Variants with forbidden terms can be auto-filtered or rewritten to remove the problematic language.</p>
        <p><strong>Example:</strong> If "free" is globally forbidden but you also want to avoid "trial" on this specific CTA, both will be checked.</p>
      `
    };
    return contents[field] || '';
  }

  // Info modal
  openInfoModal(title: string, field: string): void {
    const content = this.getInfoModalContent(field);
    this.dialog.open(InfoModalComponent, {
      width: '600px',
      data: { title, content }
    });
  }

  /**
   * Remove cookie consent pop-ups and banners from HTML
   */
  private removeCookiePopupsFromHtml(html: string): string {
    if (!html) return html;

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      // List of common cookie pop-up selectors
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
          // Ignore selector errors
        }
      });

      return doc.documentElement.outerHTML;
    } catch (error) {
      // If parsing fails, return original HTML
      return html;
    }
  }
}
