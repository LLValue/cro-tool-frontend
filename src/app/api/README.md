# Mock API Layer

This directory contains a complete mock API layer that behaves like a real REST backend, allowing frontend development without any backend server.

## Architecture

### API Contracts (`api-contracts/`)
TypeScript interfaces defining request/response DTOs that match what a real backend would return:
- `auth.contracts.ts` - Authentication DTOs
- `projects.contracts.ts` - Project management DTOs
- `points.contracts.ts` - Optimization point DTOs
- `variants.contracts.ts` - Variant DTOs
- `goals.contracts.ts` - Goal DTOs
- `reporting.contracts.ts` - Reporting DTOs

### ApiClient Interface (`api-client.ts`)
Defines the contract for all API operations. Both `MockApiClient` and `HttpApiClient` implement this interface.

### Mock Implementation (`mock/`)
- **MockApiClient** - Implements all API methods with:
  - Latency simulation (configurable min/max)
  - Random error injection (toggleable, configurable rate)
  - Validation rules matching backend expectations
  - Deterministic seeded random for reproducible simulations
  
- **InMemoryDbService** - In-memory database with localStorage persistence
- **MockSettingsService** - Configuration for latency, errors, and seeds

### HTTP Implementation (`http/`)
- **HttpApiClient** - Ready-to-use implementation that calls real HTTP endpoints
- Swap `MockApiClient` for `HttpApiClient` in `main.ts` when backend is available

### Feature Services (`services/`)
High-level services that:
- Call `ApiClient` methods
- Map DTOs to domain models
- Provide caching where appropriate
- Handle errors consistently

## Usage

### Current Setup (Mock)
In `main.ts`:
```typescript
{
  provide: API_CLIENT,
  useClass: MockApiClient
}
```

### Switching to Real Backend
In `main.ts`, change to:
```typescript
{
  provide: API_CLIENT,
  useClass: HttpApiClient
}
```

No other code changes needed! All feature services use the `API_CLIENT` token.

### Configuring Mock Settings
1. Navigate to `/debug/mock-settings` in the app
2. Adjust:
   - **Enable Latency**: Simulate network delays (150-700ms by default)
   - **Enable Errors**: Randomly inject HTTP errors
   - **Error Rate**: Probability of error (0-1)
   - **Fixed Seed**: Use deterministic random for reproducible results

Or programmatically:
```typescript
mockSettings.updateSettings({
  enableLatency: true,
  enableErrors: false,
  errorRate: 0.1,
  minLatencyMs: 150,
  maxLatencyMs: 700
});
```

## Features

### Validation
- Project name required
- Page URL required
- Point name required
- Goal value required
- Event name max 50 characters
- Auto-discard variants with UX < 5 or Compliance < 5

### Error Simulation
Randomly injects:
- **401 Unauthorized** - Auth failures
- **404 Not Found** - Missing resources
- **422 Unprocessable Entity** - Validation errors
- **500 Internal Server Error** - Server errors

### Data Persistence
All data persists to `localStorage` under key `mock_api_db`. Refresh the page to keep your data.

### Deterministic Simulation
Using a fixed seed ensures reproducible variant generation and reporting metrics.

## Example: Using API Services

```typescript
// In a component
constructor(
  private projectsApi: ProjectsApiService,
  private toast: ToastHelperService
) {}

createProject() {
  this.projectsApi.createProject({
    name: 'My Project',
    pageUrl: 'https://pack.stage.es/?packageId=209&from=app'
  }).subscribe({
    next: project => {
      this.toast.showSuccess('Project created');
      // Navigate to project
    },
    error: (err: HttpErrorResponse) => {
      if (err.status === 422) {
        this.toast.showError('Validation failed: ' + err.error.message);
      } else {
        this.toast.showError('Failed to create project');
      }
    }
  });
}
```

## Migration Path

When backend is ready:
1. Update `HttpApiClient.baseUrl` to your API endpoint
2. Change provider in `main.ts` from `MockApiClient` to `HttpApiClient`
3. Remove mock-specific code if desired (or keep for development)
4. All feature services continue to work unchanged

