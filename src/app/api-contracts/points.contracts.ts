export interface OptimizationPointDto {
  id: string;
  projectId: string;
  name: string;
  selector: string;
  text: string;
  objective: string;
  generationRules: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

export interface CreatePointRequest {
  name: string;
  selector?: string;
  text?: string;
  objective?: string;
  generationRules?: string;
}

export interface UpdatePointRequest {
  name?: string;
  selector?: string;
  text?: string;
  objective?: string;
  generationRules?: string;
}

