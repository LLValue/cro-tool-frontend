import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, OnInit, OnDestroy, AfterViewInit, OnChanges, SimpleChanges } from '@angular/core';
import { DomSanitizer, SafeHtml, SafeResourceUrl } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

export interface HighlightElement {
  selector: string;
  duration?: number;
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
    setTimeout(() => this.updateFitScale(), 200);
    
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
    if (changes['previewHtml'] || changes['previewUrl']) {
      this.updateSafeHtml();
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
        setTimeout(() => {
          console.log('[PreviewPanel] Attempting to highlight element:', this.highlightSelector);
          if (this.useIframe && this.previewIframe?.nativeElement?.contentWindow) {
            console.log('[PreviewPanel] Using iframe highlight');
            const previousWasEmpty = !changes['highlightSelector'].previousValue || changes['highlightSelector'].previousValue.trim() === '';
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
    
    let iframe: HTMLIFrameElement | null = null;
    if (this.previewIframe?.nativeElement) {
      iframe = this.previewIframe.nativeElement;
    } else {
      const container = document.querySelector('.iframe-container');
      if (container) {
        iframe = container.querySelector('.preview-iframe') as HTMLIFrameElement;
      }
    }

    if (!iframe) {
      console.log('[PreviewPanel] No iframe found, will retry');
      setTimeout(() => this.updateFitScale(), 100);
      return;
    }

    console.log('[PreviewPanel] Iframe found, updating scale', { zoomMode: this.zoomMode });

    if (this.viewMode === 'mobile') {
      iframe.style.width = '375px';
      iframe.style.height = '100%';
      iframe.style.display = 'block';
      iframe.style.transformOrigin = 'top center';
      
      const container = iframe.parentElement;
      const wrapper = container?.parentElement;
      
      if (!wrapper || !container) {
        console.warn('[PreviewPanel] No container/wrapper found');
        return;
      }
      
      const wrapperWidth = wrapper.clientWidth;
      const containerWidth = wrapperWidth - 40;
      const iframeWidth = 375;
      
      console.log('[PreviewPanel] Container dimensions', {
        wrapperWidth,
        containerWidth,
        iframeWidth,
        zoomMode: this.zoomMode,
        willScale: containerWidth < iframeWidth
      });
      
      if (this.zoomMode === 'fit') {
        // FIT: Scale to fit available width in the container
        // Key behavior: ALWAYS ensures content fits completely, NO horizontal scroll
        // - If container >= 375px: show 375px at scale 1 (fits perfectly, no scroll)
        // - If container < 375px: scale down to fit exactly (no scroll)
        const scale = Math.min(1, containerWidth / iframeWidth);
        iframe.style.width = '375px';
        iframe.style.maxWidth = '100%';
        iframe.style.transform = `scale(${scale})`;
        // CRITICAL: No horizontal scroll in Fit mode - content always fits
        wrapper.style.overflowX = 'hidden';
        container.style.overflowX = 'hidden';
        container.style.width = '100%';
        console.log('[PreviewPanel] Fit: Container=' + containerWidth + 'px, iframe=375px, scale=' + scale.toFixed(3) + ' (' + (scale * 100).toFixed(1) + '%), visual width=' + (375 * scale).toFixed(1) + 'px, overflowX=hidden (NO scroll)');
      } else if (this.zoomMode === '100%') {
        // 100%: Always show at actual size (375px), NO scaling, ALLOWS scroll for detail inspection
        // Key behavior: NEVER scales, always 375px, allows horizontal scroll for inspection
        // This is the key difference: 100% allows scroll even when container is wider
        iframe.style.width = '375px';
        iframe.style.maxWidth = 'none';
        iframe.style.transform = 'scale(1)';
        // CRITICAL: Allow horizontal scroll in 100% mode for detail inspection
        // Even if container is wider, scroll is enabled to allow inspecting content inside iframe
        wrapper.style.overflowX = 'auto';
        container.style.overflowX = 'auto';
        container.style.width = 'auto';
        container.style.minWidth = '375px';
        const needsScroll = containerWidth < iframeWidth;
        console.log('[PreviewPanel] 100%: Always 375px at scale 1 (NO scaling), container=' + containerWidth + 'px, overflowX=auto (scroll enabled, needs scroll: ' + needsScroll + ')');
      } else if (this.zoomMode === '75%') {
        iframe.style.width = '375px';
        iframe.style.maxWidth = 'none';
        iframe.style.transform = 'scale(0.75)';
        wrapper.style.overflowX = 'auto';
        container.style.overflowX = 'auto';
        console.log('[PreviewPanel] 75%: 375px scaled to 75% = 281.25px visually');
      } else if (this.zoomMode === '125%') {
        iframe.style.width = '375px';
        iframe.style.maxWidth = 'none';
        iframe.style.transform = 'scale(1.25)';
        wrapper.style.overflowX = 'auto';
        container.style.overflowX = 'auto';
        console.log('[PreviewPanel] 125%: 375px scaled to 125% = 468.75px visually');
      }
    } else {
      console.log('[PreviewPanel] Resetting to desktop mode');
      iframe.style.transform = 'none';
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.maxWidth = '100%';
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

      this.clearHighlight();

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
        htmlElement.style.transition = 'all 0.3s ease-out';
        htmlElement.style.zIndex = '9999';
        htmlElement.style.position = 'relative';

        if (!persistent && duration > 0) {
          this.highlightTimeout = window.setTimeout(() => {
            htmlElement.style.transition = 'all 0.8s ease-out';
            htmlElement.style.outline = originalOutline;
            htmlElement.style.outlineOffset = '0';
            htmlElement.style.boxShadow = originalBoxShadow;

            setTimeout(() => {
              htmlElement.style.transition = originalTransition;
              htmlElement.style.zIndex = '';
              htmlElement.style.position = '';
              delete (htmlElement as any).__originalOutline;
              delete (htmlElement as any).__originalBoxShadow;
              delete (htmlElement as any).__originalTransition;
            }, 800);
          }, Math.max(200, duration - 200));
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

        htmlElement.style.outline = '3px solid #673ab7';
        htmlElement.style.outlineOffset = '2px';
        htmlElement.style.boxShadow = '0 0 0 4px rgba(103, 58, 183, 0.2)';
        htmlElement.style.transition = 'all 0.3s ease-out';
        htmlElement.style.zIndex = '9999';
        htmlElement.style.position = 'relative';

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

    if (this.useIframe && this.previewIframe?.nativeElement?.contentDocument) {
      try {
        const doc = this.previewIframe.nativeElement.contentDocument;
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
        
        console.log('[PreviewPanel] Cleared', clearedCount, 'highlighted elements');
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
