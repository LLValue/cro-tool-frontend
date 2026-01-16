import { Injectable, inject, Inject } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { API_CLIENT } from '../api/api-client.token';
import { ApiClient } from '../api/api-client';
import { LoginRequest } from '../api-contracts/auth.contracts';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_KEY = 'auth_user';
  private apiClient = inject(API_CLIENT);
  private isLoggedInSubject = new BehaviorSubject<boolean>(this.hasToken());
  private currentUserSubject = new BehaviorSubject<any>(this.getStoredUser());
  public isLoggedIn$ = this.isLoggedInSubject.asObservable();
  public currentUser$ = this.currentUserSubject.asObservable();

  private hasToken(): boolean {
    return !!localStorage.getItem(this.TOKEN_KEY);
  }

  private getStoredUser(): any {
    const userStr = localStorage.getItem(this.USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  }

  login(email: string, password: string): Observable<boolean> {
    const request: LoginRequest = { email, password };
    return this.apiClient.authLogin(request).pipe(
      tap(response => {
        if (response.token) {
          localStorage.setItem(this.TOKEN_KEY, response.token);
          localStorage.setItem(this.USER_KEY, JSON.stringify(response.user));
          this.isLoggedInSubject.next(true);
          this.currentUserSubject.next(response.user);
        }
      }),
      map(() => true),
      catchError((error) => {
        // Re-throw error so component can handle it
        throw error;
      })
    );
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.isLoggedInSubject.next(false);
    this.currentUserSubject.next(null);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  getCurrentUser(): any {
    return this.currentUserSubject.value;
  }

  checkAuth(): Observable<boolean> {
    const token = this.getToken();
    if (!token) {
      this.isLoggedInSubject.next(false);
      return of(false);
    }

    return this.apiClient.authMe().pipe(
      tap(user => {
        this.currentUserSubject.next(user);
        this.isLoggedInSubject.next(true);
      }),
      map(() => true),
      catchError(() => {
        this.logout();
        return of(false);
      })
    );
  }
}

