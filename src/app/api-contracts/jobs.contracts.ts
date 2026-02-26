export interface JobStatusResponse {
  id: string;
  type: string;
  status: 'running' | 'done' | 'failed';
  result?: unknown;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

export interface JobStartedResponse {
  jobId: string;
}
