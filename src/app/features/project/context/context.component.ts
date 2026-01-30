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
import { Subscription, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ProjectsStoreService } from '../../../data/projects-store.service';
import { OptimizationPoint, BriefingGuardrails } from '../../../data/models';
import { ToastHelperService } from '../../../shared/toast-helper.service';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatExpansionModule } from '@angular/material/expansion';
import { PageHeaderComponent } from '../../../shared/page-header/page-header.component';
import { ChipsInputComponent } from '../../../shared/chips-input/chips-input.component';
import { InfoModalComponent } from '../../../shared/info-modal/info-modal.component';
import { GenerateVariantsProgressComponent } from '../../../shared/generate-variants-progress/generate-variants-progress.component';

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
    MatChipsModule,
    MatCheckboxModule,
    MatExpansionModule,
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
  aiAssistantForm: FormGroup;
  projectId: string = '';
  private subscriptions = new Subscription();
  private isUpdatingForm = false;
  businessContextSubmitted = false;
  journeyContextSubmitted = false;
  guardrailsSubmitted = false;

  // AI Assistant state
  aiAssistantExpanded = true; // Expanded by default
  aiAssistantUsed = false; // Track if it has been used
  urls: string[] = [];
  uploadedFiles: { name: string; file: File }[] = [];
  urlInputControl: any;

  // Field states for badges
  fieldStates: { [key: string]: { source: 'manual' | 'ai_draft'; reviewStatus: 'ok' | 'needs_review' | 'missing'; confidence: 'high' | 'medium' | 'low' } } = {};

  // Locales for language selector
  locales = [
    { value: 'es-ES', label: 'Spanish (Spain) - es-ES' },
    { value: 'es-MX', label: 'Spanish (Mexico) - es-MX' },
    { value: 'en-GB', label: 'English (UK) - en-GB' },
    { value: 'en-US', label: 'English (USA) - en-US' },
    { value: 'fr-FR', label: 'French (France) - fr-FR' },
    { value: 'de-DE', label: 'German (Germany) - de-DE' },
    { value: 'it-IT', label: 'Italian (Italy) - it-IT' },
    { value: 'pt-PT', label: 'Portuguese (Portugal) - pt-PT' },
    { value: 'pt-BR', label: 'Portuguese (Brazil) - pt-BR' },
    { value: 'nl-NL', label: 'Dutch (Netherlands) - nl-NL' }
  ];

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
      topObjections: [''],
      // Journey context
      language: ['', Validators.required],
      toneAndStyle: ['', Validators.required],
      pageContextAndGoal: ['', Validators.required],
      funnelStage: [''],
      nextAction: [''],
      // Guardrails
      brandGuidelines: [''],
      allowedFacts: [''],
      forbiddenWords: [''],
      sensitiveClaims: ['']
    });

    this.aiAssistantForm = this.fb.group({
      targetLanguage: ['es-ES'],
      fillBusinessContext: [true],
      fillJourneyContext: [true],
      fillGuardrails: [true]
    });

    // Initialize URL input control
    this.urlInputControl = this.fb.control('');

    // Note: Language is only in AI Assistant, not in main form

    // Note: Language is no longer in the form, it's only in the AI Assistant
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

    this.store.getBriefingGuardrails(this.projectId).subscribe({
      next: (bg: BriefingGuardrails | undefined) => {
        if (bg) {
          this.isUpdatingForm = true;
          
          // Convert arrays to text (one item per line)
          const valuePropsText = Array.isArray(bg.valueProps) ? bg.valueProps.join('\n') : (bg.valueProps || '');
          const topObjectionsText = Array.isArray(bg.topObjections) ? bg.topObjections.join('\n') : (bg.topObjections || '');
          const allowedFactsText = Array.isArray(bg.allowedFacts) ? bg.allowedFacts.join('\n') : (bg.allowedFacts || '');
          const forbiddenWordsText = Array.isArray(bg.forbiddenWords) ? bg.forbiddenWords.join('\n') : (bg.forbiddenWords || '');
          const sensitiveClaimsText = Array.isArray(bg.sensitiveClaims) ? bg.sensitiveClaims.join('\n') : (bg.sensitiveClaims || '');

          this.globalForm.patchValue({
            productDescription: bg.productDescription || '',
            targetAudiences: bg.targetAudiences || '',
            valueProps: valuePropsText,
            topObjections: topObjectionsText,
            language: bg.language || '',
            toneAndStyle: bg.toneAndStyle || '',
            pageContextAndGoal: bg.pageContextAndGoal || '',
            funnelStage: bg.funnelStage || '',
            nextAction: bg.nextAction || '',
            brandGuidelines: bg.brandGuidelines || '',
            allowedFacts: allowedFactsText,
            forbiddenWords: forbiddenWordsText,
            sensitiveClaims: sensitiveClaimsText
          }, { emitEvent: false });
          this.isUpdatingForm = false;
        }
      },
      error: () => {
        // If briefing_guardrails doesn't exist yet, form stays empty
        this.isUpdatingForm = false;
      }
    });
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
    const topObjectionsArray = values.topObjections ? values.topObjections.split('\n').filter((line: string) => line.trim()) : [];
    
    this.store.updateBriefingGuardrails(this.projectId, {
      productDescription: values.productDescription,
      targetAudiences: values.targetAudiences,
      valueProps: valuePropsArray,
      topObjections: topObjectionsArray
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
    
    // Store funnelStage as enum if it's one of the valid values
    let funnelStageEnum: 'discovery' | 'consideration' | 'conversion' | undefined = undefined;
    const funnelStageValue = values.funnelStage?.trim() || '';
    if (funnelStageValue === 'discovery' || funnelStageValue === 'consideration' || funnelStageValue === 'conversion') {
      funnelStageEnum = funnelStageValue;
    }
    
    // Store nextAction as text
    const nextActionText = values.nextAction?.trim() || '';
    
    this.store.updateBriefingGuardrails(this.projectId, {
      language: values.language || '',
      toneAndStyle: values.toneAndStyle || '',
      pageContextAndGoal: values.pageContextAndGoal,
      funnelStage: funnelStageEnum,
      nextAction: nextActionText || undefined
    });
    this.toast.showSuccess('Journey context saved');
    this.journeyContextSubmitted = false;
  }

  saveGuardrails(): void {
    const values = this.globalForm.value;
    // Convert text to arrays (split by newlines, filter empty)
    const allowedFactsArray = values.allowedFacts ? values.allowedFacts.split('\n').filter((line: string) => line.trim()) : [];
    const forbiddenWordsArray = values.forbiddenWords ? values.forbiddenWords.split('\n').filter((line: string) => line.trim()) : [];
    const sensitiveClaimsArray = values.sensitiveClaims ? values.sensitiveClaims.split('\n').filter((line: string) => line.trim()) : [];
    
    this.store.updateBriefingGuardrails(this.projectId, {
      brandGuidelines: values.brandGuidelines,
      allowedFacts: allowedFactsArray,
      forbiddenWords: forbiddenWordsArray,
      sensitiveClaims: sensitiveClaimsArray
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
      'topObjections': 5000,
      'toneAndStyle': 5000,
      'pageContextAndGoal': 5000,
      'funnelStage': 5000,
      'brandGuidelines': 5000,
      'allowedFacts': 5000,
      'forbiddenWords': 5000,
      'sensitiveClaims': 5000
    };
    return fieldsWithMaxLength[controlName] || 0;
  }

  // Info modal content
  getInfoModalContent(field: string): string {
    const contents: { [key: string]: string } = {
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
      topObjections: `
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
      language: `
        <p><strong>Set the language and locale format for the copy (e.g., en-GB, es-ES).</strong></p>
        <p>This controls spelling, phrasing, and locale conventions. Use standard locale codes (language-country) so the AI writes naturally for that market.</p>
        <p><strong>Examples:</strong> es-ES (Spain), es-MX (Mexico), en-GB (UK), en-US (USA).</p>
        <p><strong>Banking example (credit cards):</strong> "es-ES" (Spanish for Spain), so the AI uses local phrasing and tone expected on Spanish banking sites.</p>
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
      funnelStage: `
        <p><strong>Choose where the user is in the journey.</strong> This helps the AI calibrate messaging density and CTA strength.</p>
        <p><strong>Examples:</strong></p>
        <ul>
          <li><strong>Discovery (learn):</strong> User is exploring and learning about the product</li>
          <li><strong>Consideration (compare):</strong> User is comparing options and evaluating</li>
          <li><strong>Conversion (apply):</strong> User is ready to take action</li>
        </ul>
        <p><strong>Banking example (credit cards):</strong> "Consideration"</p>
      `,
      nextAction: `
        <p><strong>The single action you want them to take next (one short line).</strong></p>
        <p><strong>Next action examples:</strong> "Start application", "Check eligibility", "Get a quote", "Compare plans".</p>
        <p><strong>Banking example (credit cards):</strong></p>
        <p><strong>Next action:</strong> "Start application" (secondary: "Check eligibility")</p>
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
      forbiddenWords: `
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

  // AI Assistant methods
  toggleAiAssistant(): void {
    this.aiAssistantExpanded = !this.aiAssistantExpanded;
  }

  openHowItWorksModal(event: Event): void {
    event.stopPropagation();
    const dialogRef = this.dialog.open(InfoModalComponent, {
      width: '600px',
      data: {
        title: 'How AI Briefing Assistant Works',
        content: `
          <p><strong>The AI Briefing Assistant helps you quickly populate your brief by analyzing trusted sources.</strong></p>
          <ol>
            <li><strong>Add Sources:</strong> Paste up to 5 URLs or upload PDF documents containing product information, pricing, FAQs, or approved content.</li>
            <li><strong>Select Language:</strong> Choose the target language for the drafted brief and generated variants.</li>
            <li><strong>Choose Sections:</strong> Select which sections you want the assistant to draft (Business context, Journey context, Guardrails).</li>
            <li><strong>Generate:</strong> Click "Generate draft brief" to let the AI analyze your sources and propose content.</li>
            <li><strong>Review:</strong> Review the auto-filled content. Fields will be marked with badges indicating their source and review status.</li>
            <li><strong>Edit:</strong> You can edit any field at any time. Manual edits will be marked accordingly.</li>
          </ol>
          <p><strong>Note:</strong> The assistant extracts information from your sources but you should always review and approve the content before using it.</p>
        `
      }
    });
  }

  addUrl(event: Event): void {
    event.preventDefault();
    const url = this.urlInputControl.value?.trim();
    if (url && this.urls.length < 5 && !this.urls.includes(url)) {
      // Basic URL validation
      try {
        new URL(url);
        this.urls.push(url);
        this.urlInputControl.setValue('');
      } catch {
        this.toast.showError('Please enter a valid URL');
      }
    }
  }

  addUrlFromButton(): void {
    const url = this.urlInputControl.value?.trim();
    if (url && this.urls.length < 5 && !this.urls.includes(url)) {
      try {
        new URL(url);
        this.urls.push(url);
        this.urlInputControl.setValue('');
      } catch {
        this.toast.showError('Please enter a valid URL');
      }
    }
  }

  removeUrl(index: number): void {
    this.urls.splice(index, 1);
  }

  uploadDocument(): void {
    // Fake functionality for now
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf';
    input.onchange = (event: any) => {
      const file = event.target.files[0];
      if (file && file.type === 'application/pdf') {
        if (this.uploadedFiles.length < 5) {
          this.uploadedFiles.push({ name: file.name, file: file });
        } else {
          this.toast.showError('Maximum 5 files allowed');
        }
      } else {
        this.toast.showError('Please upload a PDF file');
      }
    };
    input.click();
  }

  removeFile(index: number): void {
    this.uploadedFiles.splice(index, 1);
  }

  clearSources(): void {
    this.urls = [];
    this.uploadedFiles = [];
    this.urlInputControl.setValue('');
  }

  generateDraftBrief(): void {
    if (this.urls.length === 0 && this.uploadedFiles.length === 0) {
      this.toast.showError('Please add at least one source (URL or document)');
      return;
    }

    // Show progress modal (reuse the generate variants progress component)
    const generateObservable = this.simulateBriefGeneration();
    
    const dialogRef = this.dialog.open(GenerateVariantsProgressComponent, {
      width: '600px',
      disableClose: true,
      data: {
        generateObservable: generateObservable,
        pointName: 'Brief Generation'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.success) {
        this.applyGeneratedBrief(result.data);
        this.aiAssistantUsed = true;
        // Collapse after first use
        if (this.aiAssistantUsed) {
          this.aiAssistantExpanded = false;
        }
      }
    });
  }

  private simulateBriefGeneration(): Observable<any> {
    // Simulate API call - using example data for demonstration
    return new Observable(observer => {
      setTimeout(() => {
        // Example brief data based on CaixaBank account example
        const mockBrief = {
          productDescription: 'CaixaBank ofrece una cuenta 100% online que permite abrir y gestionar una cuenta bancaria sin comisiones. Entre sus características destacadas se incluyen la ausencia de comisiones de mantenimiento o administración, una tarjeta de débito gratuita y un atractivo incentivo de hasta 250€ por domiciliar una nómina. El proceso es completamente digital y se puede completar en minutos, con verificación de identidad a través de vídeo. La cuenta permite realizar transacciones básicas como transferencias, pagos de recibos y recibir ingresos, todo desde la app o la web de CaixaBank, con acceso a más de 11.000 cajeros automáticos en España.',
          targetAudiences: 'Jóvenes profesionales - Buscan una cuenta sin altas comisiones para empezar su camino financiero. Son usuarios que prefieren la banca online por su rapidez y comodidad.\n\nFamilias - Necesitan una cuenta confiable y económica para gestionar sus finanzas del hogar, con beneficios como una tarjeta de débito gratuita y un incentivo por domiciliar ingresos.\n\nEntusiastas de la tecnología - Prefieren servicios totalmente digitales y se sienten atraídos por la facilidad de apertura de la cuenta y la capacidad de gestionar sus finanzas online de manera continua.',
          valueProps: 'Sin comisiones de mantenimiento a lo largo de toda la vida de la cuenta.\n\nTarjeta de débito gratuita sin cargos adicionales.\n\nIncentivos por domiciliar nóminas, hasta 250€.\n\nProceso 100% digital con verificación de identidad por vídeo de forma segura.\n\nAcceso a más de 11.000 cajeros automáticos en España para retirar efectivo.',
          topObjections: 'Preocupaciones sobre la seguridad de la banca completamente online sin interacción presencial.\n\nDudas sobre la falta de intereses o recompensas en la cuenta.\n\nIncertidumbre sobre posibles comisiones ocultas a pesar de la promesa de no tener comisiones de mantenimiento.',
          toneAndStyle: 'Tono: Cercano, profesional y directo. Se debe transmitir confianza y claridad, destacando los beneficios de la cuenta online y su fácil acceso.\n\nNo usar: Términos complicados o técnicos que puedan generar confusión.\n\nSí usar: Un lenguaje accesible, destacando la comodidad, seguridad y facilidad de uso de la cuenta online.',
          pageContextAndGoal: 'Esta página tiene como objetivo ofrecer a los usuarios la posibilidad de abrir una cuenta bancaria 100% online, destacando las ventajas de su proceso sencillo y sin comisiones. El visitante llega aquí buscando información para tomar la decisión de abrir una cuenta con CaixaBank. El objetivo es que el usuario complete la apertura de su cuenta online a través del formulario disponible.',
          funnelStage: 'consideration',
          nextAction: 'Start application (secondary: Check eligibility)',
          brandGuidelines: 'Terminología: Se debe usar un lenguaje sencillo, accesible y sin jerga bancaria.\n\nFormato: El contenido debe estar bien estructurado, fácil de leer, y visualmente atractivo.\n\nTono: Cercano y confiable, evitando excesiva formalidad o términos complicados.',
          allowedFacts: 'No se deben realizar afirmaciones sin respaldar con hechos verificables, como "más de 11.000 cajeros en España" y "incentivos de hasta 250€ por domiciliar una nómina."',
          forbiddenWords: 'No se deben usar frases que sugieran costos ocultos o comisiones no explícitas.\n\nEvitar el uso de términos como "gratis" sin aclarar claramente los términos y condiciones.',
          sensitiveClaims: 'Cualquier afirmación relacionada con la seguridad de los datos debe ser revisada manualmente, garantizando que se están usando términos que realmente cumplan con las normativas legales y de privacidad.'
        };
        observer.next(mockBrief);
        observer.complete();
      }, 5000); // Minimum 5 seconds
    });
  }

  private applyGeneratedBrief(data: any): void {
    this.isUpdatingForm = true;

    // Helper function to check if content looks like corrupted JSON
    const isCorruptedJson = (content: string): boolean => {
      if (!content || typeof content !== 'string') return false;
      const trimmed = content.trim();
      // Check for JSON-like patterns
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        // Count braces/quotes - if too many, likely JSON
        const braceCount = (trimmed.match(/[{}]/g) || []).length;
        const quoteCount = (trimmed.match(/["']/g) || []).length;
        if (braceCount > 5 || quoteCount > 10) {
          return true;
        }
      }
      return false;
    };

    // Helper function to apply field with validation
    const applyField = (fieldName: string, value: any, isMandatory: boolean = false) => {
      if (value && value.trim()) {
        const cleanValue = value.trim();
        const hasFormatIssue = isCorruptedJson(cleanValue);
        
        if (hasFormatIssue) {
          // Mark as needs review if JSON corrupted
          this.globalForm.patchValue({ [fieldName]: cleanValue });
          this.setFieldState(fieldName, 'ai_draft', 'needs_review', 'low');
          this.animateField(fieldName);
        } else {
          // Normal auto-fill
          this.globalForm.patchValue({ [fieldName]: cleanValue });
          this.setFieldState(fieldName, 'ai_draft', 'ok', 'high');
          this.animateField(fieldName);
        }
      } else if (isMandatory) {
        // Mandatory field is empty after generation
        this.setFieldState(fieldName, 'ai_draft', 'missing', 'low');
      }
    };

    // Apply generated content based on selected sections
    if (this.aiAssistantForm.get('fillBusinessContext')?.value) {
      applyField('productDescription', data.productDescription, true);
      applyField('targetAudiences', data.targetAudiences, true);
      applyField('valueProps', data.valueProps, true);
      applyField('topObjections', data.topObjections, false);
    }

    if (this.aiAssistantForm.get('fillJourneyContext')?.value) {
      applyField('toneAndStyle', data.toneAndStyle, true);
      applyField('pageContextAndGoal', data.pageContextAndGoal, true);
      applyField('funnelStage', data.funnelStage, false);
      applyField('nextAction', data.nextAction, false);
    }

    if (this.aiAssistantForm.get('fillGuardrails')?.value) {
      applyField('brandGuidelines', data.brandGuidelines, false);
      applyField('allowedFacts', data.allowedFacts, false);
      applyField('forbiddenWords', data.forbiddenWords, false);
      applyField('sensitiveClaims', data.sensitiveClaims, false);
    }

    this.isUpdatingForm = false;
    this.toast.showSuccess('Draft brief generated successfully. Please review the auto-filled fields.');
  }

  private setFieldState(fieldName: string, source: 'manual' | 'ai_draft', reviewStatus: 'ok' | 'needs_review' | 'missing', confidence: 'high' | 'medium' | 'low'): void {
    this.fieldStates[fieldName] = { source, reviewStatus, confidence };
  }

  private animateField(fieldName: string): void {
    // Add animation class to field
    setTimeout(() => {
      const fieldElement = document.querySelector(`[formControlName="${fieldName}"]`);
      if (fieldElement) {
        fieldElement.classList.add('ai-filled-animation');
        setTimeout(() => {
          fieldElement.classList.remove('ai-filled-animation');
        }, 900);
      }
    }, 100);
  }

  getFieldBadge(fieldName: string): string | null {
    const state = this.fieldStates[fieldName];
    if (!state) return null;

    if (state.source === 'ai_draft' && state.reviewStatus === 'ok') {
      return 'Auto-filled (Draft)';
    } else if (state.reviewStatus === 'needs_review') {
      return 'Needs review';
    } else if (state.source === 'manual') {
      return 'Manual';
    } else if (state.reviewStatus === 'missing') {
      return 'Missing';
    }
    return null;
  }

  hasFieldBeenEdited(fieldName: string): boolean {
    const state = this.fieldStates[fieldName];
    return state?.source === 'manual';
  }

  onFieldEdit(fieldName: string): void {
    // When user edits a field, mark it as manual
    const state = this.fieldStates[fieldName];
    if (state && state.source === 'ai_draft') {
      this.setFieldState(fieldName, 'manual', state.reviewStatus, state.confidence);
    } else if (!state) {
      // Field was never auto-filled, mark as manual
      this.setFieldState(fieldName, 'manual', 'ok', 'high');
    }
    
    // Check if field is cleared
    const fieldValue = this.globalForm.get(fieldName)?.value;
    if (!fieldValue || !fieldValue.trim()) {
      // Check if field is mandatory
      const isMandatory = this.globalForm.get(fieldName)?.hasError('required') || 
                         ['productDescription', 'targetAudiences', 'valueProps', 'language', 'toneAndStyle', 'pageContextAndGoal'].includes(fieldName);
      if (isMandatory) {
        this.setFieldState(fieldName, 'ai_draft', 'missing', 'low');
      } else {
        // Optional field cleared - remove badge or keep as manual
        delete this.fieldStates[fieldName];
      }
    }
  }

  hasFormatIssue(fieldName: string): boolean {
    const state = this.fieldStates[fieldName];
    if (!state) return false;
    
    // Check if content looks like corrupted JSON
    const fieldValue = this.globalForm.get(fieldName)?.value;
    if (!fieldValue || typeof fieldValue !== 'string') return false;
    
    const trimmed = fieldValue.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      const braceCount = (trimmed.match(/[{}]/g) || []).length;
      const quoteCount = (trimmed.match(/["']/g) || []).length;
      if (braceCount > 5 || quoteCount > 10) {
        return true;
      }
    }
    
    return state.reviewStatus === 'needs_review' && state.confidence === 'low';
  }
}

