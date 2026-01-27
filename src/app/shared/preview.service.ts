import { Injectable } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { Variant, OptimizationPoint } from '../data/models';

@Injectable({
  providedIn: 'root'
})
export class PreviewService {
  constructor(
    private http: HttpClient,
    private sanitizer: DomSanitizer
  ) {}

  loadPageFromUrl(url: string): Observable<string> {
    if (!url || !url.trim()) {
      return of('');
    }

    return this.http.get(url, { responseType: 'text' }).pipe(
      map(html => this.removeCookiePopups(html)),
      catchError(err => {
        if (err.status !== 0) {
          console.warn('Could not fetch page directly', err);
        }
        return of('');
      })
    );
  }

  private removeCookiePopups(html: string): string {
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
          const observer = new MutationObserver(hideCookieElements);
          if (document.body) {
            observer.observe(document.body, { childList: true, subtree: true });
          }
        })();
      `;
      doc.head.appendChild(script);

      return doc.documentElement.outerHTML;
    } catch (error) {
      return this.removeCookiePopupsWithRegex(html);
    }
  }

  private removeCookiePopupsWithRegex(html: string): string {
    html = html.replace(/<script[^>]*>[\s\S]*?(cookie|consent|gdpr|onetrust|cookiebot)[\s\S]*?<\/script>/gi, '');
    html = html.replace(/<div[^>]*(id|class)=["'][^"']*(cookie|consent|gdpr|onetrust|cookiebot)[^"']*["'][^>]*>[\s\S]*?<\/div>/gi, '');
    
    return html;
  }

  applyVariantsToHtml(
    html: string,
    variants: Variant[],
    points: OptimizationPoint[]
  ): string {
    console.log('[PreviewService] applyVariantsToHtml called', {
      htmlLength: html?.length,
      variantsCount: variants?.length,
      pointsCount: points?.length
    });

    if (!html || !variants || variants.length === 0) {
      console.log('[PreviewService] Early return - missing data', { hasHtml: !!html, hasVariants: !!variants, variantsLength: variants?.length });
      return html;
    }

    let modifiedHtml = html;

    variants.forEach((variant, index) => {
      console.log(`[PreviewService] Processing variant ${index + 1}/${variants.length}`, {
        variantId: variant.id,
        variantText: variant.text,
        optimizationPointId: variant.optimizationPointId
      });

      const point = points.find(p => p.id === variant.optimizationPointId);
      if (!point || !point.selector) {
        console.error('[PreviewService] Point not found or missing selector', { 
          pointFound: !!point,
          pointId: variant.optimizationPointId,
          selector: point?.selector
        });
        return;
      }

      console.log('[PreviewService] Applying variant to HTML', {
        selector: point.selector,
        newText: variant.text
      });

      modifiedHtml = this.applyVariantToHtml(modifiedHtml, point.selector, variant.text);
      console.log('[PreviewService] HTML modified', { newLength: modifiedHtml.length });
    });

    console.log('[PreviewService] All variants applied', { finalLength: modifiedHtml.length });
    return modifiedHtml;
  }

  private applyVariantToHtml(html: string, selector: string, newText: string): string {
    console.log('[PreviewService] applyVariantToHtml', { 
      selectorLength: selector?.length, 
      newTextLength: newText?.length,
      selector,
      newText
    });

    if (!selector || !newText) {
      console.log('[PreviewService] Missing selector or newText');
      return html;
    }

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      const elements = doc.querySelectorAll(selector);
      
      console.log('[PreviewService] Elements found with DOMParser:', elements.length);
      
      if (elements.length === 0) {
        console.log('[PreviewService] No elements found, trying regex fallback');
        return this.applyVariantWithRegex(html, selector, newText);
      }

      elements.forEach((element, idx) => {
        console.log(`[PreviewService] Updating element ${idx + 1}/${elements.length}`, {
          tagName: element.tagName,
          oldText: element.textContent?.substring(0, 50),
          newText: newText.substring(0, 50)
        });
        if (element.textContent !== null) {
          element.textContent = newText;
        } else {
          element.innerHTML = newText;
        }
      });

      const result = doc.documentElement.outerHTML;
      console.log('[PreviewService] DOM modification complete');
      return result;
    } catch (error) {
      console.error('[PreviewService] Error applying variant with DOMParser, using regex fallback', error);
      return this.applyVariantWithRegex(html, selector, newText);
    }
  }

  private applyVariantWithRegex(html: string, selector: string, newText: string): string {
    let modifiedHtml = html;

    if (selector.startsWith('#')) {
      const id = selector.substring(1);
      const regex = new RegExp(`(<[^>]+id=["']${id}["'][^>]*>)([^<]*)(</[^>]+>)`, 'gi');
      modifiedHtml = modifiedHtml.replace(regex, (match, openTag, oldText, closeTag) => {
        return openTag + newText + closeTag;
      });
    }
    else if (selector.startsWith('.')) {
      const className = selector.substring(1);
      const regex = new RegExp(`(<[^>]+class=["'][^"']*${className}[^"']*["'][^>]*>)([^<]*)(</[^>]+>)`, 'gi');
      modifiedHtml = modifiedHtml.replace(regex, (match, openTag, oldText, closeTag) => {
        return openTag + newText + closeTag;
      });
    }
    else {
      const regex = new RegExp(`(<${selector}[^>]*>)([^<]*)(</${selector}>)`, 'gi');
      modifiedHtml = modifiedHtml.replace(regex, (match, openTag, oldText, closeTag) => {
        return openTag + newText + closeTag;
      });
    }

    return modifiedHtml;
  }

  sanitizeHtml(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  shouldUseIframe(url: string): boolean {
    if (!url) return false;
    
    try {
      const pageUrl = new URL(url);
      const currentUrl = new URL(window.location.href);
      return pageUrl.origin !== currentUrl.origin;
    } catch {
      return true;
    }
  }
}

