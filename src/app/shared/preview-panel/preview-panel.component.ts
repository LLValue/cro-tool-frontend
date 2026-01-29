import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, OnInit, OnDestroy, AfterViewInit, OnChanges, SimpleChanges } from '@angular/core';
import { DomSanitizer, SafeHtml, SafeResourceUrl } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

export interface HighlightElement {
  selector: string;
  duration?: number; // milliseconds, default 1000
}

@Component({
  selector: 'app-preview-panel',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatTooltipModule
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
  @Output() reset = new EventEmitter<void>();
  @Output() reload = new EventEmitter<void>();

  @ViewChild('previewIframe', { static: false }) previewIframe?: ElementRef<HTMLIFrameElement>;
  @ViewChild('previewContent', { static: false }) previewContent?: ElementRef<HTMLDivElement>;

  viewMode: 'desktop' | 'mobile' = 'mobile';
  zoomMode: 'fit' | '100%' | '75%' | '125%' = 'fit';
  safePreviewHtml: SafeHtml = '';
  safeIframeUrl: SafeResourceUrl = '';
  safeIframeHtml: SafeHtml = '';
  private highlightTimeout?: number;
  private highlightStyleElement?: HTMLStyleElement;
  private resizeListener?: () => void;

  constructor(private sanitizer: DomSanitizer) {}

  ngOnInit(): void {
    this.updateSafeHtml();
  }

  ngAfterViewInit(): void {
    if (this.highlightSelector) {
      setTimeout(() => this.highlightElement(this.highlightSelector), 100);
    }
    // Calculate fit scale for mobile view
    setTimeout(() => this.updateFitScale(), 200);
    
    // Add resize listener to recalculate fit scale
    this.resizeListener = () => {
      if (this.viewMode === 'mobile' && this.zoomMode === 'fit') {
        this.updateFitScale();
      }
    };
    window.addEventListener('resize', this.resizeListener);
  }

  ngOnDestroy(): void {
    this.clearHighlight();
    if (this.resizeListener) {
      window.removeEventListener('resize', this.resizeListener);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    console.log('[PreviewPanel] ngOnChanges called', {
      hasPreviewHtmlChange: !!changes['previewHtml'],
      hasPreviewUrlChange: !!changes['previewUrl'],
      hasHighlightSelectorChange: !!changes['highlightSelector'],
      previewHtml: this.previewHtml?.substring(0, 100),
      previewUrl: this.previewUrl,
      highlightSelector: this.highlightSelector
    });

    if (changes['previewHtml'] || changes['previewUrl']) {
      console.log('[PreviewPanel] Updating safe HTML');
      this.updateSafeHtml();
      // Update fit scale after content loads
      setTimeout(() => this.updateFitScale(), 200);
    }
    if (changes['zoomMode'] || changes['viewMode']) {
      setTimeout(() => this.updateFitScale(), 100);
    }
    if (changes['highlightSelector']) {
      console.log('[PreviewPanel] Highlight selector changed:', {
        current: changes['highlightSelector'].currentValue,
        previous: changes['highlightSelector'].previousValue
      });
      if (this.highlightSelector && this.highlightSelector.trim() !== '') {
        // Wait for iframe/content to be ready
        setTimeout(() => {
          console.log('[PreviewPanel] Attempting to highlight element:', this.highlightSelector);
          if (this.useIframe && this.previewIframe?.nativeElement?.contentWindow) {
            console.log('[PreviewPanel] Using iframe highlight');
            // Determine if this is a hover (temporary) or click (with fade-out)
            // Hover: previous value was empty, current is set, and will be cleared soon
            // Click: previous value might exist or this is a deliberate preview action
            // For now, we'll use persistent=false (with fade-out) for all cases except hover
            // Hover detection: if previous was empty and this is a quick change, it's likely hover
            const previousWasEmpty = !changes['highlightSelector'].previousValue || changes['highlightSelector'].previousValue.trim() === '';
            // Use persistent highlight only if we detect it's a hover (previous was empty)
            // For clicks/preview actions, use fade-out (persistent=false)
            const isHover = previousWasEmpty;
            console.log('[PreviewPanel] Highlight type:', isHover ? 'HOVER (persistent)' : 'CLICK (with fade-out)');
            this.highlightElementInIframe(this.highlightSelector, 1000, isHover);
          } else if (this.previewContent?.nativeElement) {
            console.log('[PreviewPanel] Using div highlight');
            this.highlightElementInDiv(this.highlightSelector);
          } else {
            console.error('[PreviewPanel] No iframe or content element found');
          }
        }, 200);
      } else {
        console.log('[PreviewPanel] Clearing highlight - selector is empty');
        this.clearHighlight();
      }
    }
  }

  private updateSafeHtml(): void {
    console.log('[PreviewPanel] updateSafeHtml called', {
      hasPreviewHtml: !!this.previewHtml,
      previewHtmlLength: this.previewHtml?.length,
      hasPreviewUrl: !!this.previewUrl
    });
    if (this.previewHtml) {
      this.safePreviewHtml = this.sanitizer.bypassSecurityTrustHtml(this.previewHtml);
      this.safeIframeHtml = this.sanitizer.bypassSecurityTrustHtml(this.previewHtml);
      console.log('[PreviewPanel] Safe HTML updated');
    }
    if (this.previewUrl) {
      this.safeIframeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.previewUrl);
      console.log('[PreviewPanel] Safe URL updated');
    }
  }


  onReset(): void {
    this.reset.emit();
  }

  onReload(): void {
    this.reload.emit();
  }

  setZoomMode(mode: 'fit' | '100%' | '75%' | '125%'): void {
    this.zoomMode = mode;
    setTimeout(() => this.updateFitScale(), 0);
  }

  setViewMode(mode: 'desktop' | 'mobile'): void {
    this.viewMode = mode;
    setTimeout(() => this.updateFitScale(), 0);
  }

  onIframeLoad(): void {
    if (this.highlightSelector && this.previewIframe?.nativeElement?.contentWindow) {
      setTimeout(() => this.highlightElementInIframe(this.highlightSelector), 100);
    }
    setTimeout(() => this.updateFitScale(), 100);
  }

  private updateFitScale(): void {
    console.log('[PreviewPanel] updateFitScale called', { viewMode: this.viewMode, zoomMode: this.zoomMode });
    
    // Try to find iframe using ViewChild first, then fallback to querySelector
    let iframe: HTMLIFrameElement | null = null;
    if (this.previewIframe?.nativeElement) {
      iframe = this.previewIframe.nativeElement;
    } else {
      // Fallback: find iframe in the DOM
      const container = document.querySelector('.iframe-container');
      if (container) {
        iframe = container.querySelector('.preview-iframe') as HTMLIFrameElement;
      }
    }

    if (!iframe) {
      console.log('[PreviewPanel] No iframe found, will retry');
      // Retry after a short delay if iframe is not ready
      setTimeout(() => this.updateFitScale(), 100);
      return;
    }

    console.log('[PreviewPanel] Iframe found, updating scale', { zoomMode: this.zoomMode });

    if (this.viewMode === 'mobile') {
      if (this.zoomMode === 'fit') {
        // Fit: scale to fit available width
        const container = iframe.parentElement;
        if (container) {
          const containerWidth = container.clientWidth - 40; // Account for padding
          const iframeWidth = 375; // Mobile width
          const scale = Math.min(1, Math.max(0.1, containerWidth / iframeWidth));
          console.log('[PreviewPanel] Fit scale calculated', { containerWidth, iframeWidth, scale });
          iframe.style.width = '375px';
          iframe.style.height = '100%';
          iframe.style.maxWidth = '100%';
          iframe.style.transform = `scale(${scale})`;
          iframe.style.transformOrigin = 'top center';
          iframe.style.display = 'block';
        }
      } else {
        // Fixed scale modes
        iframe.style.width = '375px';
        iframe.style.height = '100%';
        iframe.style.maxWidth = 'none';
        let scale = 1;
        if (this.zoomMode === '100%') {
          scale = 1;
        } else if (this.zoomMode === '75%') {
          scale = 0.75;
        } else if (this.zoomMode === '125%') {
          scale = 1.25;
        }
        console.log('[PreviewPanel] Fixed scale applied', { zoomMode: this.zoomMode, scale });
        iframe.style.transform = `scale(${scale})`;
        iframe.style.transformOrigin = 'top center';
        iframe.style.display = 'block';
      }
    } else {
      // Desktop mode: reset transforms
      console.log('[PreviewPanel] Resetting to desktop mode');
      iframe.style.transform = 'none';
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.maxWidth = '100%';
      iframe.style.display = 'block';
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
    console.log('[PreviewPanel] highlightElementInIframe called', { selector, duration, persistent });
    const iframe = this.previewIframe?.nativeElement;
    if (!iframe?.contentWindow || !iframe.contentDocument) {
      console.error('[PreviewPanel] Iframe not ready', { 
        hasIframe: !!iframe, 
        hasContentWindow: !!iframe?.contentWindow,
        hasContentDocument: !!iframe?.contentDocument
      });
      return;
    }

    // Clean selector: remove temporary classes
    const cleanSelector = this.cleanSelector(selector);
    console.log('[PreviewPanel] Cleaned selector for highlight:', { original: selector, clean: cleanSelector });

    try {
      const doc = iframe.contentDocument;
      const elements = doc.querySelectorAll(cleanSelector);

      console.log('[PreviewPanel] Elements found:', elements.length);
      if (elements.length === 0) {
        console.error('[PreviewPanel] No elements found for selector:', cleanSelector);
        return;
      }

      // Clear any existing highlight first
      this.clearHighlight();

      elements.forEach((element: Element) => {
        const htmlElement = element as HTMLElement;
        const originalOutline = htmlElement.style.outline;
        const originalBoxShadow = htmlElement.style.boxShadow;
        const originalTransition = htmlElement.style.transition;

        // Store original styles for cleanup
        (htmlElement as any).__originalOutline = originalOutline;
        (htmlElement as any).__originalBoxShadow = originalBoxShadow;
        (htmlElement as any).__originalTransition = originalTransition;

        // Apply highlight
        htmlElement.style.outline = '3px solid #673ab7';
        htmlElement.style.outlineOffset = '2px';
        htmlElement.style.boxShadow = '0 0 0 4px rgba(103, 58, 183, 0.2)';
        htmlElement.style.transition = 'all 0.3s ease-out';
        htmlElement.style.zIndex = '9999';
        htmlElement.style.position = 'relative';

        // Only fade out if not persistent (for hover, keep it visible)
        // For click/preview actions, fade out after duration
        if (!persistent && duration > 0) {
          // Fade out after showing the highlight for a bit
          this.highlightTimeout = window.setTimeout(() => {
            htmlElement.style.transition = 'all 0.8s ease-out';
            htmlElement.style.outline = originalOutline;
            htmlElement.style.outlineOffset = '0';
            htmlElement.style.boxShadow = originalBoxShadow;

            setTimeout(() => {
              htmlElement.style.transition = originalTransition;
              htmlElement.style.zIndex = '';
              htmlElement.style.position = '';
              // Clean up stored values
              delete (htmlElement as any).__originalOutline;
              delete (htmlElement as any).__originalBoxShadow;
              delete (htmlElement as any).__originalTransition;
            }, 800);
          }, Math.max(200, duration - 200)); // Start fading out slightly before the full duration, but at least 200ms
        }
      });
    } catch (error) {
      console.warn('Could not highlight element in iframe', error);
    }
  }

  private highlightElementInDiv(selector: string, duration: number = 1000): void {
    const container = this.previewContent?.nativeElement;
    if (!container) return;

    try {
      const elements = container.querySelectorAll(selector);

      if (elements.length === 0) return;

      elements.forEach((element: Element) => {
        const htmlElement = element as HTMLElement;
        const originalOutline = htmlElement.style.outline;
        const originalBoxShadow = htmlElement.style.boxShadow;
        const originalTransition = htmlElement.style.transition;

        // Apply highlight
        htmlElement.style.outline = '3px solid #673ab7';
        htmlElement.style.outlineOffset = '2px';
        htmlElement.style.boxShadow = '0 0 0 4px rgba(103, 58, 183, 0.2)';
        htmlElement.style.transition = 'all 0.3s ease-out';
        htmlElement.style.zIndex = '9999';
        htmlElement.style.position = 'relative';

        // Fade out
        this.highlightTimeout = window.setTimeout(() => {
          htmlElement.style.transition = 'all 0.8s ease-out';
          htmlElement.style.outline = originalOutline;
          htmlElement.style.outlineOffset = '0';
          htmlElement.style.boxShadow = originalBoxShadow;

          setTimeout(() => {
            htmlElement.style.transition = originalTransition;
            htmlElement.style.zIndex = '';
            htmlElement.style.position = '';
          }, 800);
        }, 200);
      });
    } catch (error) {
      console.warn('Could not highlight element in div', error);
    }
  }

  private clearHighlight(): void {
    console.log('[PreviewPanel] clearHighlight called');
    
    if (this.highlightTimeout) {
      clearTimeout(this.highlightTimeout);
      this.highlightTimeout = undefined;
    }
    if (this.highlightStyleElement) {
      this.highlightStyleElement.remove();
      this.highlightStyleElement = undefined;
    }

    // Clear any highlighted elements in iframe
    if (this.useIframe && this.previewIframe?.nativeElement?.contentDocument) {
      try {
        const doc = this.previewIframe.nativeElement.contentDocument;
        // Find all elements with the purple outline (highlight style)
        const allElements = doc.querySelectorAll('*');
        let clearedCount = 0;
        
        allElements.forEach((element: Element) => {
          const htmlElement = element as HTMLElement;
          const style = htmlElement.style;
          
          // Check if element has the highlight outline
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
            
            // Clean up stored original values
            delete (htmlElement as any).__originalOutline;
            delete (htmlElement as any).__originalBoxShadow;
            delete (htmlElement as any).__originalTransition;
            
            clearedCount++;
          }
        });
        
        console.log('[PreviewPanel] Cleared', clearedCount, 'highlighted elements');
      } catch (error) {
        console.warn('[PreviewPanel] Could not clear highlight in iframe', error);
      }
    }
    
    // Also clear in div content if used
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
    
    // Remove temporary classes used during element selection/highlighting
    const temporaryClasses = [
      '.point-editor-selected',
      '.point-editor-highlight',
      '.highlighted-element'
    ];
    
    let cleanedSelector = selector;
    temporaryClasses.forEach(tempClass => {
      cleanedSelector = cleanedSelector.replace(tempClass, '');
    });
    
    // Clean up any double dots or trailing dots
    cleanedSelector = cleanedSelector.replace(/\.{2,}/g, '.');
    cleanedSelector = cleanedSelector.replace(/\.$/, '');
    
    return cleanedSelector.trim();
  }
}
