import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { API_CLIENT } from './app/api/api-client.token';
import { HttpApiClient } from './app/api/http/http-api-client';
import { authInterceptor } from './app/core/interceptors/auth.interceptor';
import { unauthorizedInterceptor } from './app/core/interceptors/unauthorized.interceptor';

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideAnimations(),
    provideHttpClient(
      withInterceptors([authInterceptor, unauthorizedInterceptor])
    ),
    {
      provide: API_CLIENT,
      useClass: HttpApiClient
    }
  ]
}).catch(err => console.error(err));

