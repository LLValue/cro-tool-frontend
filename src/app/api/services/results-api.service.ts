import { Injectable, Inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { API_CLIENT } from '../api-client.token';
import { ApiClient } from '../api-client';
import {
  ResultsResponse,
  SimulationStartRequest,
  ResultsMetricsDto
} from '../../api-contracts/results.contracts';
import { ResultsMetrics } from '../../data/models';

@Injectable({
  providedIn: 'root'
})
export class ResultsApiService {
  constructor(@Inject(API_CLIENT) private apiClient: ApiClient) {}

  getResults(projectId: string): Observable<ResultsMetrics[]> {
    return this.apiClient.resultsGet(projectId).pipe(
      map(response => response.metrics.map(dto => this.dtoToModel(dto)))
    );
  }

  startSimulation(projectId: string, req: SimulationStartRequest): Observable<ResultsMetrics[]> {
    return this.apiClient.simulateStart(projectId, req).pipe(
      map(response => response.metrics.map(dto => this.dtoToModel(dto)))
    );
  }

  private dtoToModel(dto: ResultsMetricsDto): ResultsMetrics {
    return {
      variantId: dto.variantId,
      pointId: dto.pointId,
      goalType: dto.goalType,
      users: dto.users,
      conversions: dto.conversions,
      conversionRate: dto.conversionRate,
      confidence: dto.confidence
    };
  }
}

