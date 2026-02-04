import { Injectable, Inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { API_CLIENT } from '../api-client.token';
import { ApiClient } from '../api-client';
import {
  OptimizationPointDto,
  CreatePointRequest,
  UpdatePointRequest,
  PointBriefDraftRequest,
  PointBriefDraftResponse
} from '../../api-contracts/points.contracts';
import { OptimizationPoint } from '../../data/models';

@Injectable({
  providedIn: 'root'
})
export class PointsApiService {
  constructor(@Inject(API_CLIENT) private apiClient: ApiClient) {}

  listPoints(projectId: string): Observable<OptimizationPoint[]> {
    return this.apiClient.pointsList(projectId).pipe(
      map(dtos => dtos.map(dto => this.dtoToModel(dto)))
    );
  }

  createPoint(projectId: string, req: CreatePointRequest): Observable<OptimizationPoint> {
    return this.apiClient.pointsCreate(projectId, req).pipe(
      map(dto => this.dtoToModel(dto))
    );
  }

  updatePoint(projectId: string, pointId: string, req: UpdatePointRequest): Observable<OptimizationPoint> {
    return this.apiClient.pointsUpdate(projectId, pointId, req).pipe(
      map(dto => this.dtoToModel(dto))
    );
  }

  deletePoint(projectId: string, pointId: string): Observable<void> {
    return this.apiClient.pointsDelete(projectId, pointId);
  }

  getBriefDraft(projectId: string, pointId: string, req: PointBriefDraftRequest): Observable<PointBriefDraftResponse> {
    return this.apiClient.pointsBriefDraft(projectId, pointId, req);
  }

  private dtoToModel(dto: OptimizationPointDto): OptimizationPoint {
    return {
      id: dto.id,
      projectId: dto.projectId,
      name: dto.name,
      selector: dto.selector,
      text: dto.text || '',
      objective: dto.objective,
      generationRules: dto.generationRules || '',
      elementType: dto.elementType,
      deviceScope: dto.deviceScope,
      status: dto.status,
      createdAt: dto.createdAt ? new Date(dto.createdAt) : undefined,
      updatedAt: dto.updatedAt ? new Date(dto.updatedAt) : undefined
    };
  }
}

