import { Injectable, Inject } from '@angular/core';
import { Observable } from 'rxjs';
import { shareReplay, map } from 'rxjs/operators';
import { API_CLIENT } from '../api-client.token';
import { ApiClient } from '../api-client';
import {
  ProjectDto,
  CreateProjectRequest,
  UpdateProjectRequest,
  ProjectsListResponse
} from '../../api-contracts/projects.contracts';
import { Project } from '../../data/models';

@Injectable({
  providedIn: 'root'
})
export class ProjectsApiService {
  private projectsCache$?: Observable<Project[]>;

  constructor(@Inject(API_CLIENT) private apiClient: ApiClient) {}

  listProjects(): Observable<Project[]> {
    if (!this.projectsCache$) {
      this.projectsCache$ = this.apiClient.projectsList().pipe(
        map(response => response.projects.map(dto => this.dtoToModel(dto))),
        shareReplay(1)
      );
    }
    return this.projectsCache$;
  }

  getProject(id: string): Observable<Project> {
    return this.apiClient.projectsGet(id).pipe(
      map(dto => this.dtoToModel(dto))
    );
  }

  createProject(req: CreateProjectRequest): Observable<Project> {
    this.invalidateCache();
    return this.apiClient.projectsCreate(req).pipe(
      map(dto => this.dtoToModel(dto))
    );
  }

  updateProject(id: string, req: UpdateProjectRequest): Observable<Project> {
    this.invalidateCache();
    return this.apiClient.projectsUpdate(id, req).pipe(
      map(dto => this.dtoToModel(dto))
    );
  }

  deleteProject(id: string): Observable<void> {
    this.invalidateCache();
    return this.apiClient.projectsDelete(id);
  }

  duplicateProject(id: string): Observable<Project> {
    this.invalidateCache();
    return this.apiClient.projectsDuplicate(id).pipe(
      map(dto => this.dtoToModel(dto))
    );
  }

  loadPreview(projectId: string): Observable<string> {
    return this.apiClient.previewLoad(projectId).pipe(
      map(response => response.previewHtml)
    );
  }

  private invalidateCache(): void {
    this.projectsCache$ = undefined;
  }

  private dtoToModel(dto: ProjectDto): Project {
    return {
      id: dto.id,
      name: dto.name,
      pageUrl: dto.pageUrl,
      industry: dto.industry,
      notes: dto.notes,
      status: dto.status,
      previewHtml: dto.previewHtml,
      language: dto.language,
      createdAt: new Date(dto.createdAt),
      updatedAt: new Date(dto.updatedAt)
    };
  }
}

