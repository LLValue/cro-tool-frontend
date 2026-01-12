# CRO Tool Frontend

Angular-based frontend application for CRO (Conversion Rate Optimization) management using NG-MATERO as the base admin template.

## Features

- **Authentication**: Login/logout with localStorage token management
- **Projects Management**: Create, update, delete, and duplicate projects
- **Optimization Points**: Define and manage optimization points with CSS selector selection
- **Context & Guidelines**: Set global and per-point context, guidelines, and rules
- **Variants**: Generate and manage text variants with UX and compliance scoring
- **Goals**: Configure primary and secondary conversion goals
- **Reporting**: View metrics with deterministic traffic simulation
- **Preview**: Preview projects with applied variants

## Routes

- `/login` - Login page
- `/projects` - Projects list
- `/projects/:projectId/setup` - Project setup
- `/projects/:projectId/points` - Optimization points management
- `/projects/:projectId/context` - Context and guidelines
- `/projects/:projectId/variants` - Variants management
- `/projects/:projectId/goals` - Goals configuration
- `/projects/:projectId/reporting` - Reporting and metrics
- `/projects/:projectId/preview` - Preview with applied variants

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm start
```

3. Navigate to `http://localhost:4200`

## Technology Stack

- Angular 17 (Standalone components)
- Angular Material
- NG-MATERO
- RxJS (BehaviorSubject for state management)
- TypeScript

## Data Storage

All data is stored in-memory using services with BehaviorSubject. No backend required.

## Notes

- Login accepts any email/password combination
- All data is lost on page refresh (in-memory storage)
- Traffic simulation uses seeded random numbers for deterministic results

