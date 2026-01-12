import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'projects',
    loadComponent: () => import('./features/projects/projects-list/projects-list.component').then(m => m.ProjectsListComponent),
    canActivate: [authGuard]
  },
  {
    path: 'projects/:projectId',
    loadComponent: () => import('./features/project/project-shell/project-shell.component').then(m => m.ProjectShellComponent),
    canActivate: [authGuard],
    children: [
      {
        path: 'setup',
        loadComponent: () => import('./features/project/setup/setup.component').then(m => m.SetupComponent)
      },
      {
        path: 'points',
        loadComponent: () => import('./features/project/points/points.component').then(m => m.PointsComponent)
      },
      {
        path: 'context',
        loadComponent: () => import('./features/project/context/context.component').then(m => m.ContextComponent)
      },
      {
        path: 'variants',
        loadComponent: () => import('./features/project/variants/variants.component').then(m => m.VariantsComponent)
      },
      {
        path: 'goals',
        loadComponent: () => import('./features/project/goals/goals.component').then(m => m.GoalsComponent)
      },
      {
        path: 'reporting',
        loadComponent: () => import('./features/project/reporting/reporting.component').then(m => m.ReportingComponent)
      },
      {
        path: 'preview',
        loadComponent: () => import('./features/project/preview/preview.component').then(m => m.PreviewComponent)
      },
      {
        path: '',
        redirectTo: 'setup',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: 'profile',
    loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent),
    canActivate: [authGuard]
  },
  {
    path: 'settings',
    loadComponent: () => import('./features/settings/settings.component').then(m => m.SettingsComponent),
    canActivate: [authGuard]
  },
  {
    path: 'debug/mock-settings',
    loadComponent: () => import('./features/debug/mock-settings/mock-settings.component').then(m => m.MockSettingsComponent),
    canActivate: [authGuard]
  },
  {
    path: '',
    redirectTo: '/projects',
    pathMatch: 'full'
  }
];

