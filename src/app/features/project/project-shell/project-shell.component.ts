import { Component, OnInit, AfterViewInit } from '@angular/core';
import { Router, RouterOutlet, RouterModule, ActivatedRoute } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { ProjectsStoreService } from '../../../data/projects-store.service';
import { SidebarService } from '../../../core/sidebar.service';
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
export class ProjectShellComponent implements OnInit, AfterViewInit {
  projectId: string = '';
  project: Project | undefined;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private store: ProjectsStoreService,
    private sidebarService: SidebarService
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

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.sidebarService.closeSidebar();
    }, 0);
  }
}

