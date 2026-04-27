import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideAuth0 } from '@auth0/auth0-angular';
import { routes } from './app.routes';
import { authInterceptor } from './interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
    provideAuth0({
      domain: 'dev-gomvag3j4o0jyjxx.us.auth0.com',       
      clientId: 'Q5I5Erk1lq9xOKFVoBRbsZsMOb4vBKOS',  
      authorizationParams: {
        redirect_uri: window.location.origin + '/login'
      }
    })
  ]
};