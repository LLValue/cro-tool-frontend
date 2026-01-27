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
    if (changes['previewHtml'] || changes['previewUrl']) {
      this.updateSafeHtml();
    }
    if (changes['highlightSelector']) {
      if (this.highlightSelector) {
        // Wait for iframe/content to be ready
        setTimeout(() => {
          if (this.useIframe && this.previewIframe?.nativeElement?.contentWindow) {
            this.highlightElementInIframe(this.highlightSelector);
          } else if (this.previewContent?.nativeElement) {
            this.highlightElementInDiv(this.highlightSelector);
          }
        }, 200);
      } else {
        this.clearHighlight();
      }
    }
  }

  private updateSafeHtml(): void {
    if (this.previewHtml) {
      this.safePreviewHtml = this.sanitizer.bypassSecurityTrustHtml(this.previewHtml);
      this.safeIframeHtml = this.sanitizer.bypassSecurityTrustHtml(this.previewHtml);
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

  private highlightElementInIframe(selector: string, duration: number = 1000): void {
    const iframe = this.previewIframe?.nativeElement;
    if (!iframe?.contentWindow || !iframe.contentDocument) return;

    try {
      const doc = iframe.contentDocument;
      const elements = doc.querySelectorAll(selector);

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
    if (this.highlightTimeout) {
      clearTimeout(this.highlightTimeout);
      this.highlightTimeout = undefined;
    }
    if (this.highlightStyleElement) {
      this.highlightStyleElement.remove();
      this.highlightStyleElement = undefined;
    }
  }
}
