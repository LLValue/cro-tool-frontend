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

  viewMode: 'desktop' | 'mobile' = 'desktop';
  safePreviewHtml: SafeHtml = '';
  safeIframeUrl: SafeResourceUrl = '';
  safeIframeHtml: SafeHtml = '';
  private highlightTimeout?: number;
  private highlightStyleElement?: HTMLStyleElement;

  constructor(private sanitizer: DomSanitizer) {}

  ngOnInit(): void {
    this.updateSafeHtml();
  }

  ngAfterViewInit(): void {
    if (this.highlightSelector) {
      setTimeout(() => this.highlightElement(this.highlightSelector), 100);
    }
  }

  ngOnDestroy(): void {
    this.clearHighlight();
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
            // Use persistent highlight for hover (no fade-out)
            const isHover = !changes['highlightSelector'].previousValue || changes['highlightSelector'].previousValue === '';
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

  onIframeLoad(): void {
    if (this.highlightSelector && this.previewIframe?.nativeElement?.contentWindow) {
      setTimeout(() => this.highlightElementInIframe(this.highlightSelector), 100);
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
        if (!persistent && duration > 0) {
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
