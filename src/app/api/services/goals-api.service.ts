import { Injectable, Inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { API_CLIENT } from '../api-client.token';
import { ApiClient } from '../api-client';
import {
  GoalDto,
  SetGoalsRequest
} from '../../api-contracts/goals.contracts';
import { Goal } from '../../data/models';

@Injectable({
  providedIn: 'root'
})
export class GoalsApiService {
  constructor(@Inject(API_CLIENT) private apiClient: ApiClient) {}

  getGoals(projectId: string): Observable<Goal[]> {
    return this.apiClient.goalsGet(projectId).pipe(
      map(dtos => dtos.map(dto => this.dtoToModel(dto)))
    );
  }

  setGoals(projectId: string, goals: Omit<Goal, 'id' | 'projectId'>[]): Observable<Goal[]> {
    const req: SetGoalsRequest = {
      goals: goals.map(g => ({
        name: g.name,
        type: g.type,
        isPrimary: g.isPrimary,
        value: g.value
      }))
    };
    return this.apiClient.goalsSet(projectId, req).pipe(
      map(dtos => dtos.map(dto => this.dtoToModel(dto)))
    );
  }

  private dtoToModel(dto: GoalDto): Goal {
    return {
      id: dto.id,
      projectId: dto.projectId,
      name: dto.name,
      type: dto.type,
      isPrimary: dto.isPrimary,
      value: dto.value
    };
  }
}

