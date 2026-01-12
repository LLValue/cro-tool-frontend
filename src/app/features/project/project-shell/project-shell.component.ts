import { Component, OnInit } from '@angular/core';
import { Router, RouterOutlet, RouterModule, ActivatedRoute } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { ProjectsStoreService } from '../../../data/projects-store.service';
import { Project } from '../../../data/models';

@Component({
  selector: 'app-project-shell',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    CommonModule
  ],
  templateUrl: './project-shell.component.html',
  styleUrls: ['./project-shell.component.scss']
})
export class ProjectShellComponent implements OnInit {
  projectId: string = '';
  project: Project | undefined;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private store: ProjectsStoreService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.projectId = params['projectId'];
      this.project = this.store.getProject(this.projectId);
      if (!this.project) {
        this.router.navigate(['/projects']);
      }
    });
  }
}

