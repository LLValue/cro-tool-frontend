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

