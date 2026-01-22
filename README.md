# CRO Tool Frontend

Angular-based frontend application for CRO (Conversion Rate Optimization) management using Angular Material components.

## Features

- **Authentication**: Login/logout with Bearer token authentication
- **Projects Management**: Create, update, delete, and duplicate projects with industry and element type classification
- **Optimization Points**: Define and manage optimization points with CSS selector selection, element types, and character constraints
- **Context & Guidelines**: Set comprehensive global and per-point context including:
  - Language & Voice settings (tone, style complexity, style length)
  - Business & Page Context (product summary, page intent, funnel stage, value props, objections, market locale)
  - Proof & Source of Truth (allowed facts, must not claim)
  - Legal & Brand Guardrails (risk level, forbidden words, mandatory/prohibited claims, disclaimers, tone restrictions)
- **Variants**: Generate and manage text variants with UX and compliance scoring (status: active | discarded)
- **Goals**: Configure primary and secondary conversion goals (clickSelector, urlReached, dataLayerEvent)
- **Reporting**: View metrics with deterministic traffic simulation, animated updates, and winner/loser highlighting
- **Preview**: Preview projects with applied variants, cookie pop-up removal, and loading indicators
- **Activation**: Configure and manage project activation scripts with scope, anti-flicker, and status management

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
- RxJS (BehaviorSubject for state management)
- TypeScript
- Chart.js with ng2-charts (for reporting visualizations)
- Angular Animations

## Backend Integration

This frontend communicates with a backend API. See `API_CONTRACTS.md` for complete API documentation including:
- All endpoints and their request/response formats
- Authentication requirements
- Data validation rules
- Error handling

**Base URL:** `/api`

**Authentication:** Bearer Token (sent in `Authorization: Bearer <token>` header)

## Key Features

### Character Limits
- Text inputs have a maximum of 200 characters
- Character counters display format: `current / max` (e.g., `120 / 200`)
- Min/Max chars fields accept only numeric values

### Input Layout
- All inputs (except Min/Max chars) are limited to 60% container width
- Textareas have minimum height of 2 rows (60px)
- All inputs are displayed in a single column layout

### Variant Management
- Variants are sorted by UX score (highest first)
- Status can be `active` or `discarded` (no `pending` status)
- Discarded variants remain visible in reporting for historical metrics

### Project Status
- Projects can be `draft`, `active`, or `archived`
- Status updates automatically based on activation panel actions
- Activation panel supports `Live`, `Paused`, and `Preview` modes

## Development

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Installation
```bash
npm install
```

### Development Server
```bash
npm start
```

Navigate to `http://localhost:4200`

### Build
```bash
npm run build
```

## Project Structure

```
src/
├── app/
│   ├── api/              # API client and services
│   ├── api-contracts/    # TypeScript interfaces for API contracts
│   ├── core/             # Core services (auth, theme, guards, interceptors)
│   ├── data/             # Data models and store services
│   ├── features/         # Feature modules
│   │   ├── auth/         # Authentication
│   │   ├── projects/     # Projects list
│   │   └── project/      # Project-specific features
│   │       ├── setup/    # Project setup
│   │       ├── context/   # Context & guidelines
│   │       ├── points/    # Optimization points
│   │       ├── variants/  # Variants management
│   │       ├── goals/     # Goals configuration
│   │       ├── reporting/ # Reporting & metrics
│   │       ├── preview/  # Preview with variants
│   │       └── activation/ # Activation configuration
│   └── shared/           # Shared components and services
```

## API Documentation

See `API_CONTRACTS.md` for complete API documentation including all endpoints, request/response formats, and validation rules.

