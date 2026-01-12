import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { provideHttpClient } from '@angular/common/http';
import { API_CLIENT } from './app/api/api-client.token';
import { MockApiClient } from './app/api/mock/mock-api-client';
import { InMemoryDbService } from './app/api/mock/in-memory-db.service';
import { MockSettingsService } from './app/api/mock/mock-settings.service';

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideAnimations(),
    provideHttpClient(),
    InMemoryDbService,
    MockSettingsService,
    {
      provide: API_CLIENT,
      useClass: MockApiClient
    }
  ]
}).catch(err => console.error(err));

