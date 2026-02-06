import { Injectable, Inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { API_CLIENT } from '../api-client.token';
import { ApiClient } from '../api-client';
import {
  BriefingGuardrailsDto,
  CreateBriefingGuardrailsRequest,
  UpdateBriefingGuardrailsRequest
} from '../../api-contracts/projects.contracts';
import { BriefingGuardrails } from '../../data/models';

@Injectable({
  providedIn: 'root'
})
export class BriefingGuardrailsApiService {
  constructor(@Inject(API_CLIENT) private apiClient: ApiClient) {}

  getBriefingGuardrails(projectId: string): Observable<BriefingGuardrails> {
    return this.apiClient.briefingGuardrailsGet(projectId).pipe(
      map(dto => this.dtoToModel(dto))
    );
  }

  createBriefingGuardrails(projectId: string, req: CreateBriefingGuardrailsRequest): Observable<BriefingGuardrails> {
    return this.apiClient.briefingGuardrailsCreate(projectId, req).pipe(
      map(dto => this.dtoToModel(dto))
    );
  }

  updateBriefingGuardrails(projectId: string, req: UpdateBriefingGuardrailsRequest): Observable<BriefingGuardrails> {
    return this.apiClient.briefingGuardrailsUpdate(projectId, req).pipe(
      map(dto => this.dtoToModel(dto))
    );
  }

  private dtoToModel(dto: BriefingGuardrailsDto): BriefingGuardrails {
    const targetAudiences = Array.isArray(dto.targetAudiences)
      ? (dto.targetAudiences as string[]).map(s => (s != null ? String(s).trim() : '')).filter(Boolean).join('\n')
      : (dto.targetAudiences != null ? String(dto.targetAudiences) : undefined);
    return {
      id: dto.id,
      projectId: dto.projectId,
      productDescription: dto.productDescription,
      targetAudiences: targetAudiences || undefined,
      valueProps: dto.valueProps,
      topObjections: dto.topObjections,
      language: dto.language,
      toneAndStyle: dto.toneAndStyle,
      pageContextAndGoal: dto.pageContextAndGoal,
      nextAction: dto.nextAction,
      funnelStage: dto.funnelStage,
      brandGuidelines: dto.brandGuidelines,
      allowedFacts: dto.allowedFacts,
      forbiddenWords: dto.forbiddenWords,
      sensitiveClaims: dto.sensitiveClaims
    };
  }
}
