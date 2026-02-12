import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, OnInit, OnDestroy, AfterViewInit, OnChanges, SimpleChanges } from '@angular/core';
import { DomSanitizer, SafeHtml, SafeResourceUrl } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import { calculateFitScale, fitScaleToPercent } from './device-zoom.utils';

export interface HighlightElement {
  selector: string;
  duration?: number;
}

export type ZoomModeOption = 'fit' | '125%' | '100%' | '75%' | '50%';

@Component({
  selector: 'app-preview-panel',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatSelectModule
  ],
  templateUrl: './preview-panel.component.html',
  styleUrls: ['./preview-panel.component.scss']
})
export class PreviewPanelComponent implements OnInit, AfterViewInit, OnDestroy, OnChanges {
  @Input() previewHtml: string = '';
  @Input() previewUrl: string = '';
  @Input() loading: boolean = false;
  @Input() useIframe: boolean = true;
  @Input() showReset: boolean = true;
  @Input() originalHtml: string = '';
  @Input() highlightSelector: string = '';
  @Input() selectionMode: boolean = false;
  @Output() reset = new EventEmitter<void>();
  @Output() reload = new EventEmitter<void>();
  @Output() elementSelected = new EventEmitter<{ selector: string; text: string }>();

  @ViewChild('previewIframe', { static: false }) previewIframe?: ElementRef<HTMLIFrameElement>;
  @ViewChild('previewContent', { static: false }) previewContent?: ElementRef<HTMLDivElement>;
  @ViewChild('iframeContainer', { static: false }) iframeContainer?: ElementRef<HTMLDivElement>;
  @ViewChild('deviceFrame', { static: false }) deviceFrame?: ElementRef<HTMLDivElement>;

  /** iPhone 14 Pro Max viewport at 100%. */
  private readonly deviceWidth = 430;
  private readonly deviceHeight = 932;

  viewMode: 'desktop' | 'mobile' = 'mobile';
  /** Chrome Device Toolbar style: Fit, 125%, 100%, 75%, 50%. Default 75%. */
  zoomMode: ZoomModeOption = '75%';
  /** Current scale factor applied (0..1). In fit mode, recalculated on container resize. */
  currentScale = 1;
  /** Integer 0–125 for display (Fit shows percentage; 50/75/100/125 fixed). */
  fitScalePercent = 75;
  /** Viewport size in px (device size × scale). Set in updateFitScale for mobile; template binds these. */
  deviceViewW = 0;
  deviceViewH = 0;
  safePreviewHtml: SafeHtml = '';
  safeIframeUrl: SafeResourceUrl = '';
  safeIframeHtml: SafeHtml = '';
  private highlightTimeout?: number;
  private highlightStyleElement?: HTMLStyleElement;
  private resizeListener?: () => void;
  private resizeObserver?: ResizeObserver;
  private selectionStyleElement?: HTMLStyleElement;
  private selectionEventListeners: { type: string; listener: (e: Event) => void }[] = [];
  private iframeWriteRetryCount = 0;
  private readonly MAX_IFRAME_WRITE_RETRIES = 4;

  constructor(private sanitizer: DomSanitizer) {}

  ngOnInit(): void {
    this.updateSafeHtml();
  }

  ngAfterViewInit(): void {
    if (this.highlightSelector) {
      setTimeout(() => this.highlightElement(this.highlightSelector), 100);
    }
    setTimeout(() => this.updateFitScale(), 200);

    this.resizeListener = () => {
      if (this.viewMode === 'mobile') {
        this.updateFitScale();
      }
    };
    window.addEventListener('resize', this.resizeListener);

    const wrapper = document.querySelector('.preview-wrapper');
    if (wrapper && typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        if (this.viewMode === 'mobile') {
          requestAnimationFrame(() => this.updateFitScale());
        }
      });
      this.resizeObserver.observe(wrapper);
    }
  }

  ngOnDestroy(): void {
    try {
      this.clearHighlight();
    } catch (_) {
      // Cross-origin iframe can make clearHighlight throw SecurityError
    }
    try {
      this.disableSelectionMode();
    } catch (_) {
      // Cross-origin iframe can make disableSelectionMode throw SecurityError
    }
    if (this.resizeListener) {
      window.removeEventListener('resize', this.resizeListener);
    }
    this.resizeObserver?.disconnect();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['previewHtml'] || changes['previewUrl']) {
      this.updateSafeHtml();
      this.iframeWriteRetryCount = 0;
      if (this.previewHtml?.trim() && this.useIframe && !this.loading) {
        this.scheduleIframeWriteRetries();
      }
      setTimeout(() => this.updateFitScale(), 200);
    }
    if (changes['zoomMode'] || changes['viewMode']) {
      setTimeout(() => this.updateFitScale(), 100);
    }
    if (changes['selectionMode']) {
      if (this.selectionMode) {
        this.setupSelectionMode();
      } else {
        this.disableSelectionMode();
      }
    }
    if (changes['highlightSelector']) {
      if (this.highlightSelector && this.highlightSelector.trim() !== '') {
        setTimeout(() => {
          if (this.useIframe && this.previewIframe?.nativeElement?.contentWindow) {
            const previousWasEmpty = !changes['highlightSelector'].previousValue || changes['highlightSelector'].previousValue.trim() === '';
            const isHover = previousWasEmpty;
            this.highlightElementInIframe(this.highlightSelector, 1000, isHover);
          } else if (this.previewContent?.nativeElement) {
            this.highlightElementInDiv(this.highlightSelector);
          } else {
            console.error('[PreviewPanel] No iframe or content element found');
          }
        }, 200);
      } else {
        this.clearHighlight();
      }
    }
  }

  private updateSafeHtml(): void {
    if (this.previewHtml && this.previewHtml.trim().length > 0) {
      this.safePreviewHtml = this.sanitizer.bypassSecurityTrustHtml(this.previewHtml);
      this.safeIframeHtml = this.sanitizer.bypassSecurityTrustHtml(this.previewHtml);
    } else {
      this.safePreviewHtml = '';
      this.safeIframeHtml = '';
    }
    if (this.previewUrl) {
      this.safeIframeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.previewUrl);
    }
  }


  onReset(): void {
    this.reset.emit();
  }

  onReload(): void {
    this.reload.emit();
  }

  /** Trigger: con Fit seleccionado se muestra solo el porcentaje (ej. 87%); con 75%/100% el valor. */
  get zoomSelectLabel(): string {
    if (this.zoomMode === 'fit') return `${this.fitScalePercent}%`;
    return this.zoomMode;
  }

  setZoomMode(mode: ZoomModeOption): void {
    this.zoomMode = mode;
    setTimeout(() => this.updateFitScale(), 0);
  }

  setViewMode(mode: 'desktop' | 'mobile'): void {
    this.viewMode = mode;
    setTimeout(() => this.updateFitScale(), 0);
  }

  onIframeLoad(): void {
    if (this.previewHtml?.trim() && this.previewIframe?.nativeElement) {
      this.writeIframeContent();
    }
    if (this.highlightSelector && this.previewIframe?.nativeElement?.contentWindow) {
      setTimeout(() => this.highlightElementInIframe(this.highlightSelector), 100);
    }
    if (this.selectionMode) {
      setTimeout(() => this.setupSelectionMode(), 200);
    }
    setTimeout(() => this.updateFitScale(), 100);
  }

  /** Schedule several write attempts so one of them runs when the iframe is ready (avoids intermittent blank). */
  private scheduleIframeWriteRetries(): void {
    const delays = [0, 80, 180, 350];
    delays.forEach((ms, i) => {
      setTimeout(() => {
        if (this.iframeWriteRetryCount >= this.MAX_IFRAME_WRITE_RETRIES) return;
        if (!this.previewHtml?.trim() || this.loading) return;
        const wrote = this.writeIframeContent();
        if (wrote) this.iframeWriteRetryCount = this.MAX_IFRAME_WRITE_RETRIES;
      }, ms);
    });
  }

  /** Write previewHtml into the iframe via contentDocument. Returns true if write was done. Skips if doc already has substantial content. */
  private writeIframeContent(): boolean {
    const iframe = this.previewIframe?.nativeElement;
    if (!iframe || !this.previewHtml?.trim()) return false;
    try {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc) return false;
      const bodyLength = doc.body?.innerHTML?.length ?? 0;
      if (bodyLength > 500) return true; // already has content, consider success
      doc.open();
      doc.write(this.previewHtml);
      doc.close();
      this.iframeWriteRetryCount++;
      void iframe.offsetHeight;
      requestAnimationFrame(() => this.updateFitScale());
      return true;
    } catch (_) {
      return false;
    }
  }

  private setupSelectionMode(): void {
    if (!this.useIframe || !this.previewIframe?.nativeElement) {
      console.warn('[PreviewPanel] Cannot setup selection mode: no iframe');
      return;
    }

    const iframe = this.previewIframe.nativeElement;
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
      console.warn('[PreviewPanel] Cannot access iframe document (CORS restriction)');
      // Retry after a short delay if iframe is not ready
      setTimeout(() => {
        if (this.selectionMode) {
          this.setupSelectionMode();
        }
      }, 200);
      return;
    }

    // Remove existing selection styles and listeners first
    this.disableSelectionMode();
    
    // Small delay to ensure cleanup is complete
    setTimeout(() => {
      if (!this.selectionMode) return; // Check if still in selection mode
      
      const currentIframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!currentIframeDoc) return;

      // Add selection styles
      const style = currentIframeDoc.createElement('style');
      style.id = 'point-editor-selection';
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
      `;
      currentIframeDoc.head.appendChild(style);
      this.selectionStyleElement = style;

      // Add event listeners
      const hoverListener = (e: Event) => this.onElementHover(e as MouseEvent);
      const outListener = (e: Event) => this.onElementOut(e as MouseEvent);
      const clickListener = (e: Event) => this.onElementClick(e as MouseEvent);

      currentIframeDoc.addEventListener('mouseover', hoverListener, true);
      currentIframeDoc.addEventListener('mouseout', outListener, true);
      currentIframeDoc.addEventListener('click', clickListener, true);

      this.selectionEventListeners = [
        { type: 'mouseover', listener: hoverListener },
        { type: 'mouseout', listener: outListener },
        { type: 'click', listener: clickListener }
      ];
    }, 50);
  }

  private disableSelectionMode(): void {
    if (!this.useIframe || !this.previewIframe?.nativeElement) return;

    try {
      const iframe = this.previewIframe.nativeElement;
      const iframeDoc = iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document);
      if (!iframeDoc) return;

      this.selectionEventListeners.forEach(({ type, listener }) => {
        iframeDoc.removeEventListener(type, listener, true);
      });
      this.selectionEventListeners = [];

      const highlights = iframeDoc.querySelectorAll('.point-editor-highlight, .point-editor-selected');
      highlights.forEach(el => {
        el.classList.remove('point-editor-highlight', 'point-editor-selected');
      });

      if (this.selectionStyleElement) {
        try {
          const parent = this.selectionStyleElement.parentNode;
          if (parent) parent.removeChild(this.selectionStyleElement);
        } catch (_) {}
        this.selectionStyleElement = undefined;
      }
    } catch (_) {
      // Cross-origin iframe: contentDocument/contentWindow.document throw SecurityError
    }
  }

  private onElementHover(event: MouseEvent): void {
    if (!this.selectionMode) return;
    
    const target = event.target as HTMLElement;
    if (!target) return;

    const iframeDoc = this.previewIframe?.nativeElement?.contentDocument;
    if (!iframeDoc) return;

    const prevHighlight = iframeDoc.querySelector('.point-editor-highlight');
    if (prevHighlight && prevHighlight !== target) {
      prevHighlight.classList.remove('point-editor-highlight');
    }

    if (!target.classList.contains('point-editor-selected')) {
      target.classList.add('point-editor-highlight');
    }
  }

  private onElementOut(event: MouseEvent): void {
    if (!this.selectionMode) return;
    
    const target = event.target as HTMLElement;
    if (!target) return;

    if (!target.classList.contains('point-editor-selected')) {
      target.classList.remove('point-editor-highlight');
    }
  }

  private onElementClick(event: MouseEvent): void {
    if (!this.selectionMode) return;
    
    event.preventDefault();
    event.stopPropagation();

    const target = event.target as HTMLElement;
    if (!target) return;

    const iframeDoc = this.previewIframe?.nativeElement?.contentDocument;
    if (!iframeDoc) return;

    // Remove previous selection
    const prevSelected = iframeDoc.querySelector('.point-editor-selected');
    if (prevSelected) {
      prevSelected.classList.remove('point-editor-selected');
    }

    // Mark as selected
    target.classList.add('point-editor-selected');
    target.classList.remove('point-editor-highlight');

    // Generate selector and extract text
    const selector = this.generateSelectorForElement(target);
    const text = this.extractTextFromElement(target);

    // Emit selection event
    this.elementSelected.emit({ selector, text });

    // Disable selection mode
    this.selectionMode = false;
  }

  /** Classes we add during selection; must be excluded when building the selector. */
  private static readonly SELECTION_MARKER_CLASSES = ['point-editor-selected', 'point-editor-highlight', 'highlighted-element'];

  private generateSelectorForElement(element: HTMLElement): string {
    const iframeDoc = this.previewIframe?.nativeElement?.contentDocument;
    if (!iframeDoc) return '';

    // Try ID first
    if (element.id) {
      const idSelector = `#${element.id}`;
      if (iframeDoc.querySelectorAll(idSelector).length === 1) {
        return idSelector;
      }
    }

    // Try classes (exclude our own selection markers)
    if (element.className && typeof element.className === 'string') {
      const classes = element.className.split(/\s+/).filter(c => c)
        .filter(c => !PreviewPanelComponent.SELECTION_MARKER_CLASSES.includes(c));
      if (classes.length > 0) {
        const classSelector = '.' + classes.join('.');
        if (iframeDoc.querySelectorAll(classSelector).length === 1) {
          return classSelector;
        }
      }
    }

    // Prefer short "ancestor class + tag" selector so it works when HTML is re-fetched
    const targetTag = element.tagName.toLowerCase();
    let ancestor: HTMLElement | null = element.parentElement;
    while (ancestor && ancestor !== iframeDoc.body) {
      if (ancestor.className && typeof ancestor.className === 'string') {
        const aClasses = ancestor.className.split(/\s+/).filter(c => c)
          .filter(c => !PreviewPanelComponent.SELECTION_MARKER_CLASSES.includes(c));
        if (aClasses.length > 0) {
          const shortSelector = '.' + aClasses.join('.') + ' ' + targetTag;
          if (iframeDoc.querySelectorAll(shortSelector).length === 1) {
            return shortSelector;
          }
        }
      }
      ancestor = ancestor.parentElement;
    }

    // Build path
    const path: string[] = [];
    let current: HTMLElement | null = element;

    while (current && current !== iframeDoc.body) {
      let selector = current.tagName.toLowerCase();
      
      if (current.id) {
        selector += `#${current.id}`;
        path.unshift(selector);
        break;
      }
      
      if (current.className && typeof current.className === 'string') {
        const classes = current.className.split(/\s+/).filter(c => c)
          .filter(c => !PreviewPanelComponent.SELECTION_MARKER_CLASSES.includes(c));
        if (classes.length > 0) {
          selector += '.' + classes.join('.');
        }
      }

      if (current.parentElement) {
        const siblings = Array.from(current.parentElement.children);
        const index = siblings.indexOf(current) + 1;
        if (siblings.length > 1) {
          selector += `:nth-of-type(${index})`;
        }
      }

      path.unshift(selector);
      current = current.parentElement;
    }

    return path.join(' > ');
  }

  private extractTextFromElement(element: HTMLElement): string {
    // Get text content, excluding script and style tags
    const clone = element.cloneNode(true) as HTMLElement;
    const scripts = clone.querySelectorAll('script, style');
    scripts.forEach(s => s.remove());
    return (clone.textContent || '').trim();
  }

  private updateFitScale(): void {
    const iframe = this.previewIframe?.nativeElement ?? document.querySelector('.iframe-container .preview-iframe') as HTMLIFrameElement;
    const container = this.iframeContainer?.nativeElement ?? document.querySelector('.iframe-container');
    const deviceFrameEl = this.deviceFrame?.nativeElement ?? container?.querySelector('.device-frame');

    if (!iframe) {
      setTimeout(() => this.updateFitScale(), 100);
      return;
    }

    if (this.viewMode === 'mobile' && container) {
      const wrapper = container.closest('.preview-wrapper');
      const wrapperW = wrapper ? (wrapper as HTMLElement).clientWidth : 400;
      const wrapperH = wrapper ? (wrapper as HTMLElement).clientHeight : 500;
      const padding = 24;
      const preferredW = Math.max(1, wrapperW - padding);
      const preferredH = Math.max(1, wrapperH - padding);

      const fitScale = calculateFitScale({
        screenWidth: this.deviceWidth,
        screenHeight: this.deviceHeight,
        preferredWidth: preferredW,
        preferredHeight: preferredH
      });
      this.fitScalePercent = fitScaleToPercent(fitScale);

      let scale: number;
      switch (this.zoomMode) {
        case 'fit':
          scale = fitScale;
          break;
        case '125%':
          scale = 1.25;
          break;
        case '100%':
          scale = 1;
          break;
        case '75%':
          scale = 0.75;
          break;
        case '50%':
          scale = 0.5;
          break;
        default:
          scale = 1;
      }
      this.currentScale = scale;
      this.deviceViewW = Math.round(this.deviceWidth * scale);
      this.deviceViewH = Math.round(this.deviceHeight * scale);

      iframe.style.width = this.deviceWidth + 'px';
      iframe.style.height = this.deviceHeight + 'px';
      iframe.style.maxWidth = '';
      iframe.style.transform = 'none';
      iframe.style.display = 'block';

      if (wrapper) {
        (wrapper as HTMLElement).style.overflow = 'hidden';
      }
    } else {
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.maxWidth = '';
      iframe.style.minWidth = '';
      iframe.style.minHeight = '';
      iframe.style.transform = '';
      iframe.style.display = '';
      this.deviceViewW = 0;
      this.deviceViewH = 0;
      const wrapperEl = document.querySelector('.preview-wrapper');
      if (wrapperEl) (wrapperEl as HTMLElement).style.overflow = '';
    }
  }

  highlightElement(selector: string, duration: number = 1000): void {
    this.clearHighlight();

    if (this.useIframe && this.previewIframe?.nativeElement?.contentWindow) {
      this.highlightElementInIframe(selector, duration);
    } else if (this.previewContent?.nativeElement) {
      this.highlightElementInDiv(selector, duration);
    }
  }

  private highlightElementInIframe(selector: string, duration: number = 1000, persistent: boolean = false): void {
    const iframe = this.previewIframe?.nativeElement;
    if (!iframe?.contentWindow || !iframe.contentDocument) {
      console.error('[PreviewPanel] Iframe not ready', { 
        hasIframe: !!iframe, 
        hasContentWindow: !!iframe?.contentWindow,
        hasContentDocument: !!iframe?.contentDocument
      });
      return;
    }

    try {
      const doc = iframe.contentDocument;
      // Support comma-separated selectors: query each part and collect all elements (so all combination points are highlighted)
      const parts = selector.split(',').map(s => this.cleanSelector(s.trim())).filter(Boolean);
      const seen = new Set<Element>();
      const elements: Element[] = [];
      for (const part of parts) {
        doc.querySelectorAll(part).forEach(el => {
          if (!seen.has(el)) {
            seen.add(el);
            elements.push(el);
          }
        });
      }

      if (elements.length === 0) {
        console.error('[PreviewPanel] No elements found for selector:', selector);
        return;
      }

      this.clearHighlight();

      const toClear: Array<{ el: HTMLElement; outline: string; boxShadow: string; transition: string }> = [];
      elements.forEach((element: Element) => {
        const htmlElement = element as HTMLElement;
        const originalOutline = htmlElement.style.outline;
        const originalBoxShadow = htmlElement.style.boxShadow;
        const originalTransition = htmlElement.style.transition;

        (htmlElement as any).__originalOutline = originalOutline;
        (htmlElement as any).__originalBoxShadow = originalBoxShadow;
        (htmlElement as any).__originalTransition = originalTransition;

        htmlElement.style.outline = '3px solid #673ab7';
        htmlElement.style.outlineOffset = '2px';
        htmlElement.style.boxShadow = '0 0 0 4px rgba(103, 58, 183, 0.2)';
        htmlElement.style.transition = 'all 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        htmlElement.style.zIndex = '9999';
        htmlElement.style.position = 'relative';
        toClear.push({ el: htmlElement, outline: originalOutline, boxShadow: originalBoxShadow, transition: originalTransition });
      });

      if (!persistent && duration > 0 && toClear.length > 0) {
        this.highlightTimeout = window.setTimeout(() => {
          toClear.forEach(({ el, outline, boxShadow, transition }) => {
            el.style.transition = 'all 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            el.style.outline = outline;
            el.style.outlineOffset = '0';
            el.style.boxShadow = boxShadow;
            setTimeout(() => {
              el.style.transition = transition;
              el.style.zIndex = '';
              el.style.position = '';
              delete (el as any).__originalOutline;
              delete (el as any).__originalBoxShadow;
              delete (el as any).__originalTransition;
            }, 500);
          });
        }, Math.max(200, duration - 200));
      }
    } catch (error) {
      console.warn('Could not highlight element in iframe', error);
    }
  }

  private highlightElementInDiv(selector: string, duration: number = 1000): void {
    const container = this.previewContent?.nativeElement;
    if (!container) return;

    try {
      const parts = selector.split(',').map(s => this.cleanSelector(s.trim())).filter(Boolean);
      const seen = new Set<Element>();
      const elements: Element[] = [];
      for (const part of parts) {
        container.querySelectorAll(part).forEach(el => {
          if (!seen.has(el)) {
            seen.add(el);
            elements.push(el);
          }
        });
      }
      if (elements.length === 0) return;

      const toClear: Array<{ el: HTMLElement; outline: string; boxShadow: string; transition: string }> = [];
      elements.forEach((element: Element) => {
        const htmlElement = element as HTMLElement;
        const originalOutline = htmlElement.style.outline;
        const originalBoxShadow = htmlElement.style.boxShadow;
        const originalTransition = htmlElement.style.transition;

        htmlElement.style.outline = '3px solid #673ab7';
        htmlElement.style.outlineOffset = '2px';
        htmlElement.style.boxShadow = '0 0 0 4px rgba(103, 58, 183, 0.2)';
        htmlElement.style.transition = 'all 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        htmlElement.style.zIndex = '9999';
        htmlElement.style.position = 'relative';
        toClear.push({ el: htmlElement, outline: originalOutline, boxShadow: originalBoxShadow, transition: originalTransition });
      });

      this.highlightTimeout = window.setTimeout(() => {
        toClear.forEach(({ el, outline, boxShadow, transition }) => {
          el.style.transition = 'all 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
          el.style.outline = outline;
          el.style.outlineOffset = '0';
          el.style.boxShadow = boxShadow;
          setTimeout(() => {
            el.style.transition = transition;
            el.style.zIndex = '';
            el.style.position = '';
          }, 500);
        });
      }, Math.max(200, duration - 200));
    } catch (error) {
      console.warn('Could not highlight element in div', error);
    }
  }

  private clearHighlight(): void {
    if (this.highlightTimeout) {
      clearTimeout(this.highlightTimeout);
      this.highlightTimeout = undefined;
    }
    if (this.highlightStyleElement) {
      this.highlightStyleElement.remove();
      this.highlightStyleElement = undefined;
    }

    if (this.useIframe && this.previewIframe?.nativeElement) {
      try {
        const doc = this.previewIframe.nativeElement.contentDocument;
        if (!doc) return;
        const allElements = doc.querySelectorAll('*');
        let clearedCount = 0;
        
        allElements.forEach((element: Element) => {
          const htmlElement = element as HTMLElement;
          const style = htmlElement.style;
          
          if (style.outline && style.outline.includes('rgb(103, 58, 183)')) {
            const originalOutline = (htmlElement as any).__originalOutline || '';
            const originalBoxShadow = (htmlElement as any).__originalBoxShadow || '';
            const originalTransition = (htmlElement as any).__originalTransition || '';
            
            htmlElement.style.outline = originalOutline;
            htmlElement.style.outlineOffset = '0';
            htmlElement.style.boxShadow = originalBoxShadow;
            htmlElement.style.transition = originalTransition;
            htmlElement.style.zIndex = '';
            htmlElement.style.position = '';
            
            delete (htmlElement as any).__originalOutline;
            delete (htmlElement as any).__originalBoxShadow;
            delete (htmlElement as any).__originalTransition;
            
            clearedCount++;
          }
        });
        
      } catch (error) {
        console.warn('[PreviewPanel] Could not clear highlight in iframe', error);
      }
    }
    
    if (this.previewContent?.nativeElement) {
      try {
        const container = this.previewContent.nativeElement;
        const allElements = container.querySelectorAll('*');
        
        allElements.forEach((element: Element) => {
          const htmlElement = element as HTMLElement;
          const style = htmlElement.style;
          
          if (style.outline && style.outline.includes('rgb(103, 58, 183)')) {
            const originalOutline = (htmlElement as any).__originalOutline || '';
            const originalBoxShadow = (htmlElement as any).__originalBoxShadow || '';
            const originalTransition = (htmlElement as any).__originalTransition || '';
            
            htmlElement.style.outline = originalOutline;
            htmlElement.style.outlineOffset = '0';
            htmlElement.style.boxShadow = originalBoxShadow;
            htmlElement.style.transition = originalTransition;
            htmlElement.style.zIndex = '';
            htmlElement.style.position = '';
            
            delete (htmlElement as any).__originalOutline;
            delete (htmlElement as any).__originalBoxShadow;
            delete (htmlElement as any).__originalTransition;
          }
        });
      } catch (error) {
        console.warn('[PreviewPanel] Could not clear highlight in div', error);
      }
    }
  }

  /**
   * Clean selector by removing temporary classes added during element selection
   */
  private cleanSelector(selector: string): string {
    if (!selector) return selector;
    
    const temporaryClasses = [
      '.point-editor-selected',
      '.point-editor-highlight',
      '.highlighted-element'
    ];
    
    let cleanedSelector = selector;
    temporaryClasses.forEach(tempClass => {
      cleanedSelector = cleanedSelector.replace(tempClass, '');
    });
    
    cleanedSelector = cleanedSelector.replace(/\.{2,}/g, '.');
    cleanedSelector = cleanedSelector.replace(/\.$/, '');
    
    return cleanedSelector.trim();
  }
}
