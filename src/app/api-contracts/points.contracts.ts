export interface OptimizationPointDto {
  id: string;
  projectId: string;
  name: string;
  selector: string;
  text: string;
  objective: string;
  context?: string;
  generationRules?: string;
  elementType?: 'Title' | 'CTA' | 'Subheadline' | 'Microcopy' | 'Other';
  deviceScope?: 'All' | 'Mobile' | 'Desktop';
  status?: 'Included' | 'Excluded';
  minChars?: number;
  maxChars?: number;
  maxWords?: number;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

export interface CreatePointRequest {
  name: string;
  selector?: string;
  text?: string;
  objective?: string;
  context?: string;
  generationRules?: string;
  elementType?: 'Title' | 'CTA' | 'Subheadline' | 'Microcopy' | 'Other';
  deviceScope?: 'All' | 'Mobile' | 'Desktop';
  status?: 'Included' | 'Excluded';
  minChars?: number;
  maxChars?: number;
  maxWords?: number;
}

export interface UpdatePointRequest {
  name?: string;
  selector?: string;
  text?: string;
  objective?: string;
  context?: string;
  generationRules?: string;
  elementType?: 'Title' | 'CTA' | 'Subheadline' | 'Microcopy' | 'Other';
  deviceScope?: 'All' | 'Mobile' | 'Desktop';
  status?: 'Included' | 'Excluded';
  minChars?: number;
  maxChars?: number;
  maxWords?: number;
}

// Point AI Brief Draft (Optimization Brief Helper)
export interface PointBriefDraftRequest {
  mode: 'suggest' | 'improve';
  targetLanguage: string;
  point: {
    pointName: string;
    elementType: string;
    cssSelector: string;
    deviceScope: string;
  };
  currentElementText?: string;
  existingBrief: {
    qualitativeObjective: string;
    elementContext: string;
    goodIdeas: string;
    thingsToAvoid: string;
    mustIncludeKeywords: string[];
    mustAvoidTerms: string[];
    minChars: number | null;
    maxChars: number | null;
  };
  projectContext: {
    primaryGoal?: { type: string; label: string; selector?: string };
    briefAndGuardrails: {
      productDescription?: string;
      targetAudiences?: string;
      topValueProps?: string;
      topObjections?: string;
      toneAndStyle?: string;
      pageContextAndGoal?: string;
      funnelStageAndNextAction?: string;
      brandGuidelines?: string;
      allowedProofPoints?: string;
      forbiddenWordsAndClaims?: string;
      sensitiveClaims?: string;
    };
  };
}

export interface PointBriefDraftFieldState {
  source: 'ai_draft' | 'manual';
  reviewStatus: 'ok' | 'needs_review' | 'missing';
  confidence?: 'high' | 'medium' | 'low';
}

export interface PointBriefDraftResponse {
  suggestedFields: {
    qualitativeObjective?: string;
    elementContext?: string;
    goodIdeas?: string;
    thingsToAvoid?: string;
    minChars?: number | null;
    maxChars?: number | null;
    mustIncludeKeywords?: string[];
    mustAvoidTerms?: string[];
  };
  fieldStates: {
    qualitativeObjective?: PointBriefDraftFieldState;
    elementContext?: PointBriefDraftFieldState;
    goodIdeas?: PointBriefDraftFieldState;
    thingsToAvoid?: PointBriefDraftFieldState;
    minChars?: PointBriefDraftFieldState;
    maxChars?: PointBriefDraftFieldState;
  };
  warnings?: Array<{ code: string; message: string }>;
}

