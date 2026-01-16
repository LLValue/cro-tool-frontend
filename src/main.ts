import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { API_CLIENT } from './app/api/api-client.token';
import { MockApiClient } from './app/api/mock/mock-api-client';
import { HttpApiClient } from './app/api/http/http-api-client';
import { InMemoryDbService } from './app/api/mock/in-memory-db.service';
import { MockSettingsService } from './app/api/mock/mock-settings.service';
import { authInterceptor } from './app/core/interceptors/auth.interceptor';
import { unauthorizedInterceptor } from './app/core/interceptors/unauthorized.interceptor';

// Switch to HttpApiClient to test with real backend at http://localhost:3000
// Make sure the backend is running and proxy.conf.json is configured
const USE_REAL_API = true; // Set to false to use mock API

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideAnimations(),
    provideHttpClient(
      withInterceptors([authInterceptor, unauthorizedInterceptor])
    ),
    InMemoryDbService,
    MockSettingsService,
    {
      provide: API_CLIENT,
      useClass: USE_REAL_API ? HttpApiClient : MockApiClient
    }
  ]
}).catch(err => console.error(err));

