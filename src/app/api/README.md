# API Layer

This directory contains the API layer for communicating with the backend server.

## Architecture

### API Contracts (`api-contracts/`)
TypeScript interfaces defining request/response DTOs that match the backend API:
- `auth.contracts.ts` - Authentication DTOs
- `projects.contracts.ts` - Project management DTOs
- `points.contracts.ts` - Optimization point DTOs
- `variants.contracts.ts` - Variant DTOs
- `goals.contracts.ts` - Goal DTOs
- `results.contracts.ts` - Results DTOs

### ApiClient Interface (`api-client.ts`)
Defines the contract for all API operations. The `HttpApiClient` implements this interface.

### HTTP Implementation (`http/`)
- **HttpApiClient** - Implementation that calls real HTTP endpoints at the backend server

### Feature Services (`services/`)
High-level services that:
- Call `ApiClient` methods
- Map DTOs to domain models
- Provide caching where appropriate
- Handle errors consistently

## Usage

The API client is configured in `main.ts`:

```typescript
{
  provide: API_CLIENT,
  useClass: HttpApiClient
}
```

All feature services use the `API_CLIENT` token, so they automatically use the configured implementation.

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
    pageUrl: 'https://example.es'
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

## Configuration

The backend URL is configured via the proxy in `proxy.conf.json` which redirects `/api` requests to `http://localhost:3000`.
