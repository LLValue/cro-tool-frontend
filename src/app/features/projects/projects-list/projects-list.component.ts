import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCardModule } from '@angular/material/card';
import { CommonModule } from '@angular/common';
import { ProjectsStoreService } from '../../../data/projects-store.service';
import { Project } from '../../../data/models';
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog/confirm-dialog.component';
import { ToastHelperService } from '../../../shared/toast-helper.service';
import { PageHeaderComponent } from '../../../shared/page-header/page-header.component';
import { CreateProjectDialogComponent } from '../create-project-dialog/create-project-dialog.component';

@Component({
  selector: 'app-projects-list',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatChipsModule,
    MatTooltipModule,
    MatCardModule,
    PageHeaderComponent
  ],
  templateUrl: './projects-list.component.html',
  styleUrls: ['./projects-list.component.scss']
})
export class ProjectsListComponent implements OnInit {
  projects: Project[] = [];
  displayedColumns: string[] = ['name', 'pageUrl', 'updatedAt', 'status', 'actions'];

  constructor(
    private store: ProjectsStoreService,
    private router: Router,
    private dialog: MatDialog,
    private toast: ToastHelperService
  ) {}

  ngOnInit(): void {
    this.store.refreshProjects();
    this.store.projects$.subscribe(projects => {
      this.projects = projects;
    });
  }

  openProject(id: string): void {
    this.router.navigate(['/projects', id, 'setup']);
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(CreateProjectDialogComponent, {
      width: '500px'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Use the API service directly for better async handling
        const createdProject = this.store.createProject(result);
        if (createdProject && createdProject.id) {
          this.toast.showSuccess('Project created');
          this.router.navigate(['/projects', createdProject.id, 'setup']);
        } else {
          // Fallback: wait for project to appear in list
          const subscription = this.store.projects$.subscribe(projects => {
            const newProject = projects.find(p => 
              p.name === result.name && 
              p.pageUrl === result.pageUrl &&
              Math.abs(new Date(p.createdAt).getTime() - Date.now()) < 5000
            );
            if (newProject) {
              subscription.unsubscribe();
              this.toast.showSuccess('Project created');
              this.router.navigate(['/projects', newProject.id, 'setup']);
            }
          });
        }
      }
    });
  }

  duplicateProject(project: Project): void {
    const duplicated = this.store.duplicateProject(project.id);
    this.toast.showSuccess('Project duplicated');
  }

  deleteProject(project: Project): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Delete Project',
        message: `Are you sure you want to delete "${project.name}"?`
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.store.deleteProject(project.id);
        this.toast.showSuccess('Project deleted');
      }
    });
  }
}

