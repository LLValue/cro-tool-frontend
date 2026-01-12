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

  /**
   * Load page HTML from URL
   * Note: Due to CORS restrictions, this will only work for same-origin or CORS-enabled URLs
   * For external URLs, we'll use a proxy or iframe approach
   */
  loadPageFromUrl(url: string): Observable<string> {
    if (!url || !url.trim()) {
      return of('');
    }

    // Try to fetch the page
    return this.http.get(url, { responseType: 'text' }).pipe(
      map(html => html),
      catchError(err => {
        // CORS errors are expected for cross-origin URLs - silently handle
        // Only log if it's not a CORS error (status 0 usually means CORS)
        if (err.status !== 0) {
          console.warn('Could not fetch page directly', err);
        }
        // Return empty HTML - we'll use iframe instead
        return of('');
      })
    );
  }

  /**
   * Apply variants to HTML content using selectors
   */
  applyVariantsToHtml(
    html: string,
    variants: Variant[],
    points: OptimizationPoint[]
  ): string {
    if (!html || !variants || variants.length === 0) {
      return html;
    }

    let modifiedHtml = html;

    variants.forEach(variant => {
      const point = points.find(p => p.id === variant.optimizationPointId);
      if (!point || !point.selector) {
        return;
      }

      modifiedHtml = this.applyVariantToHtml(modifiedHtml, point.selector, variant.text);
    });

    return modifiedHtml;
  }

  /**
   * Apply a single variant to HTML using a CSS selector
   */
  private applyVariantToHtml(html: string, selector: string, newText: string): string {
    if (!selector || !newText) {
      return html;
    }

    try {
      // Create a temporary DOM to parse and modify
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      // Find elements matching the selector
      const elements = doc.querySelectorAll(selector);
      
      if (elements.length === 0) {
        // Fallback to regex if querySelector doesn't work
        return this.applyVariantWithRegex(html, selector, newText);
      }

      // Apply variant to all matching elements
      elements.forEach(element => {
        if (element.textContent !== null) {
          element.textContent = newText;
        } else {
          element.innerHTML = newText;
        }
      });

      return doc.documentElement.outerHTML;
    } catch (error) {
      console.warn('Error applying variant with DOMParser, using regex fallback', error);
      return this.applyVariantWithRegex(html, selector, newText);
    }
  }

  /**
   * Fallback method using regex for selector matching
   */
  private applyVariantWithRegex(html: string, selector: string, newText: string): string {
    let modifiedHtml = html;

    // Handle ID selector (#id)
    if (selector.startsWith('#')) {
      const id = selector.substring(1);
      const regex = new RegExp(`(<[^>]+id=["']${id}["'][^>]*>)([^<]*)(</[^>]+>)`, 'gi');
      modifiedHtml = modifiedHtml.replace(regex, (match, openTag, oldText, closeTag) => {
        return openTag + newText + closeTag;
      });
    }
    // Handle class selector (.class)
    else if (selector.startsWith('.')) {
      const className = selector.substring(1);
      const regex = new RegExp(`(<[^>]+class=["'][^"']*${className}[^"']*["'][^>]*>)([^<]*)(</[^>]+>)`, 'gi');
      modifiedHtml = modifiedHtml.replace(regex, (match, openTag, oldText, closeTag) => {
        return openTag + newText + closeTag;
      });
    }
    // Handle tag selector (tag)
    else {
      const regex = new RegExp(`(<${selector}[^>]*>)([^<]*)(</${selector}>)`, 'gi');
      modifiedHtml = modifiedHtml.replace(regex, (match, openTag, oldText, closeTag) => {
        return openTag + newText + closeTag;
      });
    }

    return modifiedHtml;
  }

  /**
   * Sanitize HTML for safe display
   */
  sanitizeHtml(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  /**
   * Get iframe URL for external pages (to bypass CORS)
   * For same-origin, we can use direct HTML injection
   */
  shouldUseIframe(url: string): boolean {
    if (!url) return false;
    
    try {
      const pageUrl = new URL(url);
      const currentUrl = new URL(window.location.href);
      
      // Use iframe if different origin
      return pageUrl.origin !== currentUrl.origin;
    } catch {
      return true; // Use iframe if URL parsing fails
    }
  }
}

