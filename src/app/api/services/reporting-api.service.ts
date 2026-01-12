import { Injectable, Inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { API_CLIENT } from '../api-client.token';
import { ApiClient } from '../api-client';
import {
  ReportingResponse,
  SimulationStartRequest,
  ReportingMetricsDto
} from '../../api-contracts/reporting.contracts';
import { ReportingMetrics } from '../../data/models';

@Injectable({
  providedIn: 'root'
})
export class ReportingApiService {
  constructor(@Inject(API_CLIENT) private apiClient: ApiClient) {}

  getReporting(projectId: string): Observable<ReportingMetrics[]> {
    return this.apiClient.reportingGet(projectId).pipe(
      map(response => response.metrics.map(dto => this.dtoToModel(dto)))
    );
  }

  startSimulation(projectId: string, req: SimulationStartRequest): Observable<ReportingMetrics[]> {
    return this.apiClient.simulateStart(projectId, req).pipe(
      map(response => response.metrics.map(dto => this.dtoToModel(dto)))
    );
  }

  private dtoToModel(dto: ReportingMetricsDto): ReportingMetrics {
    return {
      variantId: dto.variantId,
      pointId: dto.pointId,
      users: dto.users,
      conversions: dto.conversions,
      conversionRate: dto.conversionRate,
      confidence: dto.confidence
    };
  }
}

