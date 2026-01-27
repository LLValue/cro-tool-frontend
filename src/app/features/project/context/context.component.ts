import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import { ProjectsStoreService } from '../../../data/projects-store.service';
import { OptimizationPoint } from '../../../data/models';
import { ToastHelperService } from '../../../shared/toast-helper.service';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PageHeaderComponent } from '../../../shared/page-header/page-header.component';
import { ChipsInputComponent } from '../../../shared/chips-input/chips-input.component';
import { InfoModalComponent } from '../../../shared/info-modal/info-modal.component';

@Component({
  selector: 'app-context',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    CommonModule,
    PageHeaderComponent,
    ChipsInputComponent,
    MatDialogModule,
    MatTooltipModule
  ],
  templateUrl: './context.component.html',
  styleUrls: ['./context.component.scss']
})
export class ContextComponent implements OnInit, OnDestroy {
  globalForm: FormGroup;
  projectId: string = '';
  private subscriptions = new Subscription();
  private isUpdatingForm = false;
  businessContextSubmitted = false;
  journeyContextSubmitted = false;
  guardrailsSubmitted = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private store: ProjectsStoreService,
    private toast: ToastHelperService,
    private dialog: MatDialog
  ) {
    this.globalForm = this.fb.group({
      // Business context
      productDescription: ['', Validators.required],
      targetAudiences: ['', Validators.required],
      valueProps: ['', Validators.required],
      typicalObjections: [''],
      // Journey context
      language: ['es-ES', [Validators.required, Validators.maxLength(50)]],
      toneAndStyle: ['', Validators.required],
      pageContextAndGoal: ['', Validators.required],
      funnelStage: [''],
      nextAction: [''],
      // Guardrails
      brandGuidelines: [''],
      allowedFacts: [''],
      forbiddenWordsAndClaims: [''],
      sensitiveClaims: ['']
    });
  }

  ngOnInit(): void {
    // Get projectId from multiple sources (for nested routes)
    const getProjectId = (): string | null => {
      // Try current route params first
      const currentParams = this.route.snapshot.params;
      if (currentParams['projectId']) {
        return currentParams['projectId'];
      }
      // Try parent route params (for nested routes)
      const parentParams = this.route.snapshot.parent?.params;
      if (parentParams?.['projectId']) {
        return parentParams['projectId'];
      }
      return null;
    };

    const initialProjectId = getProjectId();
    if (initialProjectId) {
      this.projectId = initialProjectId;
      this.loadProjectData();
    }

    // Subscribe to params changes (both current and parent)
    const paramsSub = this.route.params.subscribe((params: any) => {
      const newProjectId = params['projectId'];
        if (newProjectId && newProjectId !== this.projectId) {
          this.projectId = newProjectId;
          this.loadProjectData();
        }
    });
    this.subscriptions.add(paramsSub);

    // Also subscribe to parent params (for nested routes)
    if (this.route.parent) {
      const parentParamsSub = this.route.parent.params.subscribe((params: any) => {
        const newProjectId = params['projectId'];
        if (newProjectId && newProjectId !== this.projectId) {
          this.projectId = newProjectId;
          this.loadProjectData();
        }
      });
      this.subscriptions.add(parentParamsSub);
    }

  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private getProjectId(): string {
    // Try current route params first
    const currentParams = this.route.snapshot.params;
    if (currentParams['projectId']) {
      return currentParams['projectId'];
    }
    // Try parent route params (for nested routes)
    const parentParams = this.route.snapshot.parent?.params;
    if (parentParams?.['projectId']) {
      return parentParams['projectId'];
    }
    // Fallback to instance variable
    return this.projectId || '';
  }

  private loadProjectData(): void {
    const projectId = this.getProjectId();
    if (!projectId) {
      return;
    }
    this.projectId = projectId; // Update instance variable

    const project = this.store.getProject(this.projectId);
    if (project) {
      this.isUpdatingForm = true;
      // Map old fields to new structure for backward compatibility
      const toneAndStyle = project.tone 
        ? `${project.tone}${project.styleComplexity ? `, ${project.styleComplexity}` : ''}${project.styleLength ? `, ${project.styleLength}` : ''}`
        : '';
      
      // Combine forbiddenWords and mustNotClaim into forbiddenWordsAndClaims
      const forbiddenWordsAndClaims = [
        ...(project.forbiddenWords || []),
        ...(project.mustNotClaim || [])
      ];

      // Extract targetAudiences and nextAction from legacy fields
      let targetAudiences = '';
      try {
        const pageContextData = project.pageContext ? JSON.parse(project.pageContext) : {};
        if (Array.isArray(pageContextData.targetAudiences)) {
          targetAudiences = pageContextData.targetAudiences.join('\n');
        } else if (typeof pageContextData.targetAudiences === 'string') {
          targetAudiences = pageContextData.targetAudiences;
        }
      } catch {
        // If parsing fails, use empty string
      }

      let nextAction = '';
      try {
        const croGuidelinesData = project.croGuidelines ? JSON.parse(project.croGuidelines) : {};
        nextAction = croGuidelinesData.nextAction || '';
      } catch {
        // If parsing fails, use empty string
      }

      // Convert arrays to text (one item per line)
      const valuePropsText = Array.isArray(project.valueProps) ? project.valueProps.join('\n') : (project.valueProps || '');
      const typicalObjectionsText = Array.isArray(project.typicalObjections) ? project.typicalObjections.join('\n') : (project.typicalObjections || '');
      const allowedFactsText = Array.isArray(project.allowedFacts) ? project.allowedFacts.join('\n') : (project.allowedFacts || '');
      const forbiddenWordsAndClaimsText = Array.isArray(forbiddenWordsAndClaims) ? forbiddenWordsAndClaims.join('\n') : (forbiddenWordsAndClaims || '');
      const sensitiveClaimsText = Array.isArray(project.prohibitedClaims) ? project.prohibitedClaims.join('\n') : (project.prohibitedClaims || '');

      this.globalForm.patchValue({
        productDescription: project.productSummary || '',
        targetAudiences: targetAudiences,
        valueProps: valuePropsText,
        typicalObjections: typicalObjectionsText,
        language: project.language || 'es-ES',
        toneAndStyle: toneAndStyle || '',
        pageContextAndGoal: project.pageIntent || project.pageContext || '',
        funnelStage: project.funnelStage || '',
        nextAction: nextAction,
        brandGuidelines: project.brandGuardrails || '',
        allowedFacts: allowedFactsText,
        forbiddenWordsAndClaims: forbiddenWordsAndClaimsText,
        sensitiveClaims: sensitiveClaimsText
      }, { emitEvent: false });
      this.isUpdatingForm = false;
    }
  }


  saveBusinessContext(): void {
    this.businessContextSubmitted = true;
    if (this.globalForm.get('productDescription')?.invalid || 
        this.globalForm.get('targetAudiences')?.invalid || 
        this.globalForm.get('valueProps')?.invalid) {
      return;
    }
    const values = this.globalForm.value;
    // Convert text to arrays (split by newlines, filter empty)
    const targetAudiencesArray = values.targetAudiences ? values.targetAudiences.split('\n').filter((line: string) => line.trim()) : [];
    const valuePropsArray = values.valueProps ? values.valueProps.split('\n').filter((line: string) => line.trim()) : [];
    const typicalObjectionsArray = values.typicalObjections ? values.typicalObjections.split('\n').filter((line: string) => line.trim()) : [];
    
    this.store.updateProject(this.projectId, {
      productSummary: values.productDescription,
      valueProps: valuePropsArray,
      typicalObjections: typicalObjectionsArray,
      // Store targetAudiences in legacy field for now
      pageContext: JSON.stringify({ targetAudiences: values.targetAudiences })
    });
    this.toast.showSuccess('Business context saved');
    this.businessContextSubmitted = false;
  }

  saveJourneyContext(): void {
    this.journeyContextSubmitted = true;
    if (this.globalForm.get('language')?.invalid || 
        this.globalForm.get('toneAndStyle')?.invalid || 
        this.globalForm.get('pageContextAndGoal')?.invalid) {
      return;
    }
    const values = this.globalForm.value;
    this.store.updateProject(this.projectId, {
      language: values.language,
      pageIntent: values.pageContextAndGoal,
      funnelStage: values.funnelStage,
      // Store toneAndStyle and nextAction in legacy fields for backward compatibility
      tone: values.toneAndStyle?.split(',')[0]?.trim() || '',
      styleComplexity: values.toneAndStyle?.split(',')[1]?.trim() || '',
      styleLength: values.toneAndStyle?.split(',')[2]?.trim() || '',
      croGuidelines: JSON.stringify({ nextAction: values.nextAction })
    });
    this.toast.showSuccess('Journey context saved');
    this.journeyContextSubmitted = false;
  }

  saveGuardrails(): void {
    const values = this.globalForm.value;
    // Convert text to arrays (split by newlines, filter empty)
    const allowedFactsArray = values.allowedFacts ? values.allowedFacts.split('\n').filter((line: string) => line.trim()) : [];
    const forbiddenWordsAndClaimsArray = values.forbiddenWordsAndClaims ? values.forbiddenWordsAndClaims.split('\n').filter((line: string) => line.trim()) : [];
    const sensitiveClaimsArray = values.sensitiveClaims ? values.sensitiveClaims.split('\n').filter((line: string) => line.trim()) : [];
    
    this.store.updateProject(this.projectId, {
      brandGuardrails: values.brandGuidelines,
      allowedFacts: allowedFactsArray,
      forbiddenWords: forbiddenWordsAndClaimsArray,
      mustNotClaim: [], // Empty as we're combining into forbiddenWordsAndClaims
      prohibitedClaims: sensitiveClaimsArray
    });
    this.toast.showSuccess('Guardrails saved');
  }

  // Character counter helpers
  getCharacterCount(controlName: string): number {
    const value = this.globalForm.get(controlName)?.value || '';
    return typeof value === 'string' ? value.length : 0;
  }

  getMaxLength(controlName: string): number {
    const fieldsWithMaxLength: { [key: string]: number } = {
      'productDescription': 5000,
      'targetAudiences': 5000,
      'valueProps': 5000,
      'typicalObjections': 5000,
      'language': 50,
      'toneAndStyle': 5000,
      'pageContextAndGoal': 5000,
      'nextAction': 5000,
      'brandGuidelines': 5000,
      'allowedFacts': 5000,
      'forbiddenWordsAndClaims': 5000,
      'sensitiveClaims': 5000
    };
    return fieldsWithMaxLength[controlName] || 0;
  }

  // Info modal content
  getInfoModalContent(field: string): string {
    const contents: { [key: string]: string } = {
      language: `
        <p><strong>Set the language and locale format</strong> for the copy (e.g., en-GB, es-ES).</p>
        <p>This controls spelling, phrasing, and locale conventions. Use standard locale codes (language-country) so the AI writes naturally for that market.</p>
        <p><strong>Examples:</strong> es-ES (Spain), es-MX (Mexico), en-GB (UK), en-US (USA).</p>
        <p><strong>Banking example (credit cards):</strong> "es-ES" (Spanish for Spain), so the AI uses local phrasing and tone expected on Spanish banking sites.</p>
      `,
      productDescription: `
        <p><strong>Use this field to give the AI the "source narrative" for the product:</strong> what it is, what problem it solves, and the core benefits—without marketing fluff. Keep it accurate and high-level (no unverified numbers unless you will also include them in Allowed proof points).</p>
        <p><strong>Include:</strong> product type, key features, eligibility level (if relevant), and the main user needs it addresses.</p>
        <p><strong>Banking example (credit cards):</strong></p>
        <p>"Credit card designed for everyday spending with flexible repayment options. It helps customers manage monthly expenses, build credit history, and access purchase protection features. Suitable for customers who want convenience, secure payments, and clear control of their spending through a mobile app."</p>
      `,
      targetAudiences: `
        <p><strong>Define 2–5 audience types</strong> so the AI can tailor tone, motivations, and objections. For each segment, include a short description: their goal, their typical concerns, and what drives trust. Avoid overly broad labels like "everyone."</p>
        <p>You can format it as bullets (recommended), one segment per bullet.</p>
        <p><strong>Banking example (credit cards):</strong></p>
        <ul>
          <li>"Young professionals: want convenience, digital-first management, and transparent fees."</li>
          <li>"Families: want budgeting control, security, and protections for purchases."</li>
          <li>"Frequent travelers: value international acceptance, fraud protection, and travel-related benefits (if applicable)."</li>
          <li>"Credit builders: want clarity, responsible limits, and guidance without shame or jargon."</li>
        </ul>
      `,
      valueProps: `
        <p><strong>These are the primary "reasons to choose this product"</strong> that the AI should use to shape headlines, CTA copy, and supporting microcopy. Keep them short, specific, and customer-facing. If a value prop depends on a specific feature or claim (e.g., "no annual fee"), only include it if it's verified and allowed.</p>
        <p><strong>Recommended format:</strong> bullet list, each bullet starting with a user benefit.</p>
        <p><strong>Banking example (credit cards):</strong></p>
        <ul>
          <li>"Pay securely online and in-store with real-time card controls."</li>
          <li>"Manage spending and repayments easily from the app."</li>
          <li>"Clear repayment options that fit your monthly budget."</li>
          <li>"Extra protection for eligible purchases (where applicable)."</li>
          <li>"Fast, simple application experience with transparent steps."</li>
        </ul>
      `,
      typicalObjections: `
        <p><strong>Use this to help the AI proactively reduce friction.</strong> Include 3–8 objections commonly seen in banking journeys: trust, fees, eligibility, complexity, hidden conditions, and fear of rejection. Keep them in the user's voice.</p>
        <p><strong>Recommended format:</strong> bullets.</p>
        <p><strong>Banking example (credit cards):</strong></p>
        <ul>
          <li>"Will I be approved, or will I waste time applying?"</li>
          <li>"Are there hidden fees or conditions?"</li>
          <li>"Will I lose control and overspend?"</li>
          <li>"Is the repayment process complicated?"</li>
          <li>"Is it secure if I use it online or abroad?"</li>
          <li>"What happens if I miss a payment?"</li>
        </ul>
      `,
      toneAndStyle: `
        <p><strong>Define the voice in practical terms.</strong> Include tone (e.g., confident, reassuring), formality level, and wording preferences (simple vs technical). Add 2–3 "do" and "don't" examples to anchor the style.</p>
        <p>If the industry is regulated, keep urgency and claims conservative unless explicitly allowed.</p>
        <p><strong>Banking example (credit cards):</strong></p>
        <p><strong>Tone:</strong> "Clear, calm, and trustworthy. Professional but not cold. Focus on clarity and reassurance."</p>
        <p><strong>Do:</strong> "Use simple sentences, explain steps, emphasize control and security."</p>
        <p><strong>Don't:</strong> "Avoid hype, pressure tactics, slang, or absolute guarantees."</p>
      `,
      pageContextAndGoal: `
        <p><strong>Describe the page's role in the journey and the desired user action.</strong> Include: what the user likely knows when they arrive, what information they're seeking, and what should happen next (apply, check eligibility, compare options, request info).</p>
        <p>This helps the AI write copy that matches intent, not just product marketing.</p>
        <p><strong>Banking example (credit cards):</strong></p>
        <p>"This is a product landing page for a credit card. Users arrive from paid search and comparison pages. The goal is to encourage them to start an application or eligibility check. The page should reduce fear of hidden fees and help users feel in control of spending and repayments."</p>
      `,
      brandGuidelines: `
        <p><strong>Use this for concrete, enforceable rules:</strong> preferred terms, banned phrasing, capitalization rules, naming conventions, and how to refer to the product. This complements tone/style by making rules explicit.</p>
        <p>Keep it bullet-based when possible.</p>
        <p><strong>Banking example (credit cards):</strong></p>
        <ul>
          <li>"Use 'credit card' (not 'card' alone) on first mention."</li>
          <li>"Avoid exclamation marks."</li>
          <li>"Do not use slang or humor."</li>
          <li>"Use 'apply' rather than 'get instantly'."</li>
          <li>"Refer to the bank as 'Brand X' consistently."</li>
        </ul>
      `,
      allowedFacts: `
        <p><strong>This is your "safe facts list."</strong> It prevents the AI from inventing features, pricing, time-to-approval, or guarantees. Only include items that are accurate and approved for marketing use.</p>
        <p>If this field is empty, the system should avoid strong factual claims and use safer, non-absolute wording.</p>
        <p><strong>Banking example (credit cards):</strong></p>
        <ul>
          <li>"Manage your card in the mobile app (freeze/unfreeze, notifications)."</li>
          <li>"Secure online payments with fraud monitoring."</li>
          <li>"Contactless payments supported."</li>
          <li>"Application subject to approval."</li>
          <li>"Terms and conditions apply."</li>
        </ul>
      `,
      forbiddenWordsAndClaims: `
        <p><strong>Use this to block risky or non-compliant language:</strong> "guaranteed", "no risk", "instant approval", or any internal red-flag terms. Include both single words and short phrases.</p>
        <p>This list should be treated as a hard filter during generation and review.</p>
        <p><strong>Banking example (credit cards):</strong></p>
        <ul>
          <li>"Guaranteed approval"</li>
          <li>"No credit check" (if not allowed)</li>
          <li>"Instant approval" (if not allowed)</li>
          <li>"Best rates" / "Lowest fees" (absolute superlatives)</li>
          <li>"Free money"</li>
        </ul>
      `,
      sensitiveClaims: `
        <p><strong>Sensitive claims are not always forbidden, but they often require legal review or specific disclaimers.</strong> Use this list to flag variants for "needs review" if they mention these topics.</p>
        <p><strong>Examples:</strong> fees, APR, interest, rewards, eligibility, credit impact, approval speed, "no annual fee", or comparisons vs competitors.</p>
        <p><strong>Banking example (credit cards):</strong></p>
        <ul>
          <li>"APR / interest rate mentions"</li>
          <li>"Fees (annual fee, foreign transaction fee)"</li>
          <li>"Rewards/cashback claims"</li>
          <li>"Approval time or acceptance rate"</li>
          <li>"Eligibility / credit score implications"</li>
        </ul>
      `
    };
    return contents[field] || '';
  }

  // Info modal
  openInfoModal(title: string, field: string): void {
    const content = this.getInfoModalContent(field);
    if (content) {
      this.dialog.open(InfoModalComponent, {
        width: '600px',
        data: { title, content }
      });
    }
  }
}

