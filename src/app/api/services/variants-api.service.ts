import { Injectable, Inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { API_CLIENT } from '../api-client.token';
import { ApiClient } from '../api-client';
import {
  VariantDto,
  GenerateVariantsRequest,
  CreateVariantRequest,
  UpdateVariantRequest
} from '../../api-contracts/variants.contracts';
import { Variant } from '../../data/models';

@Injectable({
  providedIn: 'root'
})
export class VariantsApiService {
  constructor(@Inject(API_CLIENT) private apiClient: ApiClient) {}

  listVariants(projectId: string, pointId: string): Observable<Variant[]> {
    return this.apiClient.variantsList(projectId, pointId).pipe(
      map(dtos => dtos.map(dto => this.dtoToModel(dto)))
    );
  }

  createVariant(projectId: string, pointId: string, req: CreateVariantRequest): Observable<Variant> {
    return this.apiClient.variantsCreate(projectId, pointId, req).pipe(
      map(dto => this.dtoToModel(dto))
    );
  }

  generateVariants(projectId: string, pointId: string, req: GenerateVariantsRequest): Observable<Variant[]> {
    return this.apiClient.variantsGenerate(projectId, pointId, req).pipe(
      map(dtos => dtos.map(dto => this.dtoToModel(dto)))
    );
  }

  updateVariant(projectId: string, variantId: string, req: UpdateVariantRequest): Observable<Variant> {
    return this.apiClient.variantsUpdate(projectId, variantId, req).pipe(
      map(dto => this.dtoToModel(dto))
    );
  }

  approveVariant(projectId: string, variantId: string): Observable<Variant> {
    return this.apiClient.variantsApprove(projectId, variantId).pipe(
      map(dto => this.dtoToModel(dto))
    );
  }

  discardVariant(projectId: string, variantId: string): Observable<Variant> {
    return this.apiClient.variantsDiscard(projectId, variantId).pipe(
      map(dto => this.dtoToModel(dto))
    );
  }

  deleteVariant(projectId: string, variantId: string): Observable<void> {
    return this.apiClient.variantsDelete(projectId, variantId);
  }

  private dtoToModel(dto: VariantDto): Variant {
    return {
      id: dto.id,
      projectId: dto.projectId,
      optimizationPointId: dto.optimizationPointId,
      text: dto.text,
      uxScore: dto.uxScore,
      uxRationale: dto.uxRationale,
      complianceScore: dto.complianceScore,
      complianceRationale: dto.complianceRationale,
      status: dto.status,
      createdAt: new Date(dto.createdAt),
      source: dto.source,
      angle: dto.angle,
      reviewStatus: dto.reviewStatus,
      riskFlags: dto.riskFlags
    };
  }
}

