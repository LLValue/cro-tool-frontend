import { Component, OnInit, OnDestroy, ViewChild, ElementRef, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import { API_CLIENT } from '../../../../api/api-client.token';
import { ApiClient } from '../../../../api/api-client';
import { ToastHelperService } from '../../../../shared/toast-helper.service';
import { ProjectsStoreService } from '../../../../data/projects-store.service';
import { ProjectsApiService } from '../../../../api/services/projects-api.service';
import { take } from 'rxjs/operators';

interface SelectedElement {
  element: HTMLElement;
  selector: string;
  text: string;
}

@Component({
  selector: 'app-point-editor',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule
  ],
  templateUrl: './point-editor.component.html',
  styleUrls: ['./point-editor.component.scss']
})
export class PointEditorComponent implements OnInit, OnDestroy {
  @ViewChild('previewFrame', { static: false }) previewFrame!: ElementRef<HTMLIFrameElement>;
  
  html: string = '';
  safeHtml: SafeHtml | null = null;
  loading = true;
  error: string | null = null;
  selectionMode = false;
  selectedElement: SelectedElement | null = null;
  viewMode: 'mobile' | 'desktop' = 'desktop';
  form: FormGroup;
  private subscriptions = new Subscription();
  private highlightStyle: HTMLStyleElement | null = null;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { projectId: string },
    private dialogRef: MatDialogRef<PointEditorComponent>,
    @Inject(API_CLIENT) private apiClient: ApiClient,
    private sanitizer: DomSanitizer,
    private fb: FormBuilder,
    private toast: ToastHelperService,
    private store: ProjectsStoreService,
    private projectsApi: ProjectsApiService
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      elementType: ['Title', Validators.required], // First option as default
      selector: ['', Validators.required],
      text: ['']
    });
  }

  ngOnInit(): void {
    this.loadPreview();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.removeHighlightStyle();
  }

  loadPreview(): void {
    this.loading = true;
    this.error = null;

    // First, get the project to obtain its pageUrl
    const projectSub = this.store.listProjects().pipe(take(1)).subscribe({
      next: (projects) => {
        let project = projects.find(p => p.id === this.data.projectId);
        
        // If not in store, try API
        if (!project) {
          this.projectsApi.getProject(this.data.projectId).pipe(take(1)).subscribe({
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
        this.projectsApi.getProject(this.data.projectId).pipe(take(1)).subscribe({
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

        this.html = response.html;
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
        `;
        iframeDoc.head.appendChild(style);
        this.highlightStyle = style;

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
    this.form.patchValue({
      selector,
      text,
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

  onSave(): void {
    if (this.form.valid) {
      this.dialogRef.close(this.form.value);
    } else {
      this.toast.showError('Please fill in all required fields');
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}

