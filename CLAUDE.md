# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CRO (Conversion Rate Optimization) tool frontend — an Angular 17 standalone-components app for managing A/B testing projects. Users define test points on web pages, generate variants via AI, configure goals, run simulations, and view results.

## Commands

- `npm start` — dev server at http://localhost:4200 (proxies `/api/*` to localhost:3000)
- `npm run build` — production build to `dist/cro-tool-frontend`
- `npm run watch` — build in watch mode
- No test framework is currently configured

## Architecture

**Angular 17 with standalone components** — no NgModules. All components declare their imports explicitly.

### Key layers

- **`src/app/api/`** — HTTP abstraction. An abstract `ApiClient` interface (`api-client.ts`) is implemented by `HttpApiClient` and injected via `API_CLIENT` token. Domain-specific services (projects, points, variants, goals, results, briefing-guardrails) wrap this client and map DTOs to domain models.
- **`src/app/api-contracts/`** — TypeScript request/response DTOs matching the backend API. Kept separate from domain models.
- **`src/app/data/`** — State management via RxJS BehaviorSubjects in `ProjectsStoreService`. This is the central store for projects, points, variants, goals, and metrics. Observables exposed with `shareReplay(1)`.
- **`src/app/features/`** — Route-level feature folders. The `project/` feature is a shell with child routes: setup, context, points, variants, goals, results, preview, activation.
- **`src/app/core/`** — Auth guard, theme service, HTTP interceptors (auth token injection, 401 handling).
- **`src/app/shared/`** — Reusable components (page-header, preview-panel, dialogs) and services (toast-helper, preview).

### Important patterns

- **Job polling**: Long-running backend operations (variant generation, briefing assist) return a job ID. The client polls `GET /api/jobs/:jobId` every 5s with a 12-minute timeout.
- **API service caching**: `ProjectsApiService` caches the projects list and invalidates manually after mutations.
- **DTO → domain mapping**: API services map between `*Dto`/`*Response` types and domain `models.ts` types. Don't return raw DTOs to components.
- **Subscription cleanup**: Components use `Subscription.add()` in `ngOnInit` and `unsubscribe()` in `ngOnDestroy`.

## Infrastructure (GCP)

The project runs on Google Cloud Platform. The backend Terraform config lives at `../cro-tool-backend/terraform/`.

- **GCP Project:** `stone-notch-483715-k4`
- **Region:** `europe-west1`
- **Services:** Cloud Run (API), Cloud SQL (PostgreSQL 15), Artifact Registry, Secret Manager, VPC
- **Environments:** controlled by `environment` variable in `terraform.tfvars` (dev/staging/prod)

### Obtaining credentials and connection strings

**Never ask the user for database URLs, passwords, or other infra credentials.** Extract them from Terraform:

```bash
# From ../cro-tool-backend/terraform/
terraform output db_password        # database password (sensitive)
terraform output database_connection_name  # Cloud SQL connection name
terraform output cloud_run_url      # backend API URL
terraform output artifact_registry_url
```

Database connection follows this format:
`postgresql://cro_tool_user:{password}@localhost/cro_tool?host=/cloudsql/{connection_name}`

The JWT secret is in Google Secret Manager (`cro-tool-jwt-secret-{environment}`).

### Production safety rules

**ALWAYS ask the user for explicit authorization before executing any action that touches production infrastructure.** This includes but is not limited to:
- Running database migrations against production
- Applying Terraform changes (`terraform apply`) for prod
- Deploying to production Cloud Run
- Modifying Secret Manager secrets
- Any `gcloud` command targeting the production environment

Read-only commands (viewing logs, describing resources) are fine without confirmation.

### Useful gcloud commands

```bash
# Logs — backend API
gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="cro-tool-api-{env}"' --project=stone-notch-483715-k4 --limit=50 --format=json

# Logs — filter errors only
gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="cro-tool-api-{env}" AND severity>=ERROR' --project=stone-notch-483715-k4 --limit=20

# Cloud Run service status
gcloud run services describe cro-tool-api-{env} --region=europe-west1 --project=stone-notch-483715-k4

# Cloud Run revisions (deploy history)
gcloud run revisions list --service=cro-tool-api-{env} --region=europe-west1 --project=stone-notch-483715-k4

# Cloud SQL instance status
gcloud sql instances describe cro-tool-db-{env} --project=stone-notch-483715-k4

# Active Cloud SQL connections
gcloud sql operations list --instance=cro-tool-db-{env} --project=stone-notch-483715-k4 --limit=10

# Cloud Run metrics (request count, latency)
gcloud monitoring metrics list --project=stone-notch-483715-k4 --filter='metric.type = starts_with("run.googleapis.com")'
```

Replace `{env}` with the target environment (dev, staging, prod).

## Styling

SCSS with Angular Material 17. Theme colors defined as CSS variables in `src/styles.scss` (`--theme-primary: #7EF473`). Dark mode toggled via `body.dark-mode` class (persisted in localStorage).

## Conventions

- **Commits**: conventional commits (`fix:`, `feat:`, `refactor:`, `chore:`). No Co-Authored-By lines.
- **File naming**: kebab-case with `.component.ts`, `.service.ts` suffixes.
- **Component selectors**: `app-` prefix.
- **Routing**: lazy-loaded via `loadComponent` in `app.routes.ts`.
- **Auth**: Bearer token stored in localStorage, injected by `authInterceptor`.

## Workflow Orchestration

### 1. Plan Mode Default

- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately — don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy

- Offload research, exploration, and parallel analysis to subagents to keep main context window clean
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

### 3. Self-Improvement Loop

- After ANY correction from the user: update `tasks/lessons.md` with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

### 4. Verification Before Done

- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 5. Demand Elegance (Balanced)

- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes — don't over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing

- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests → then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

## Task Management

1. **Plan First**: Write plan to `tasks/todo.md` with checkable items
2. **Verify Plan**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Explain Changes**: High-level summary at each step
5. **Document Results**: Add review to `tasks/todo.md`
6. **Capture Lessons**: Update `tasks/lessons.md` after corrections

## Core Principles

- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.
