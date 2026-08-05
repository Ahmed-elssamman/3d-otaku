import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, of, tap, catchError, map } from 'rxjs';
import { User, AuthResponseData, LoginRequest, RegisterRequest } from '../models/user.model';
import { UserRole } from '../enums/user-role.enum';
import { ApiService } from '../api/api.service';
import { API_ENDPOINTS } from '../api/api-endpoints';
import { TokenStorageService } from './token-storage.service';
import { environment } from '../../../environments/environment';
import { APP_CONSTANTS } from '../constants/app.constants';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private api = inject(ApiService);
  private tokenStorage = inject(TokenStorageService);

  private currentUserSignal = signal<User | null>(this.tokenStorage.getUser());

  currentUser = computed(() => this.currentUserSignal());
  isAuthenticated = computed(() => this.currentUserSignal() !== null);
  isAdmin = computed(() => this.currentUserSignal()?.role === UserRole.ADMIN);

  register(payload: RegisterRequest): Observable<AuthResponseData> {
    if (environment.useMockApi) {
      const now = new Date().toISOString();
      const mockUser: User = {
        id: `usr-${Date.now()}`,
        fullName: payload.fullName,
        email: payload.email,
        role: UserRole.CUSTOMER,
        avatarUrl: 'assets/images/avatar-otaku.svg',
        createdAt: now
      };
      const mockResponse: AuthResponseData = {
        user: mockUser,
        accessToken: `mock_access_${Date.now()}`,
        refreshToken: `mock_refresh_${Date.now()}`
      };
      this.handleAuthSuccess(mockResponse);
      return of(mockResponse);
    }

    return this.api.post<AuthResponseData>(API_ENDPOINTS.auth.register, payload).pipe(
      map(res => res.data),
      tap(data => this.handleAuthSuccess(data))
    );
  }

  login(payload: LoginRequest): Observable<AuthResponseData> {
    if (environment.useMockApi) {
      const normalizedEmail = payload.email.trim().toLowerCase();
      const now = new Date().toISOString();
      const isAdminLogin =
        normalizedEmail === APP_CONSTANTS.ADMIN_CREDENTIALS.EMAIL.toLowerCase() &&
        payload.password === APP_CONSTANTS.ADMIN_CREDENTIALS.PASSWORD;

      const mockUser: User = isAdminLogin
        ? {
            id: 'usr-admin-001',
            fullName: '3D Otaku Admin',
            email: APP_CONSTANTS.ADMIN_CREDENTIALS.EMAIL,
            role: UserRole.ADMIN,
            avatarUrl: 'assets/images/avatar-otaku.svg',
            createdAt: now
          }
        : {
            id: `usr-${Date.now()}`,
            fullName: normalizedEmail.split('@')[0].replace(/[._-]/g, ' '),
            email: normalizedEmail,
            role: UserRole.CUSTOMER,
            avatarUrl: 'assets/images/avatar-otaku.svg',
            createdAt: now
          };

      const mockResponse: AuthResponseData = {
        user: mockUser,
        accessToken: `mock_access_${Date.now()}`,
        refreshToken: `mock_refresh_${Date.now()}`
      };
      this.handleAuthSuccess(mockResponse);
      return of(mockResponse);
    }

    return this.api.post<AuthResponseData>(API_ENDPOINTS.auth.login, payload).pipe(
      map(res => res.data),
      tap(data => this.handleAuthSuccess(data))
    );
  }

  loadCurrentUser(): Observable<User | null> {
    if (environment.useMockApi || !this.tokenStorage.getAccessToken()) {
      return of(this.currentUserSignal());
    }

    return this.api.get<User>(API_ENDPOINTS.auth.me).pipe(
      map(res => res.data),
      tap(user => {
        this.currentUserSignal.set(user);
        this.tokenStorage.saveUser(user);
      }),
      catchError(() => {
        this.tokenStorage.clearStorage();
        this.currentUserSignal.set(null);
        return of(null);
      })
    );
  }

  refreshToken(): Observable<string> {
    const refreshToken = this.tokenStorage.getRefreshToken();
    if (!refreshToken || environment.useMockApi) {
      return of('mock_refreshed_token');
    }

    return this.api.post<{ accessToken: string }>(API_ENDPOINTS.auth.refreshToken, { refreshToken }).pipe(
      map(res => {
        this.tokenStorage.saveAccessToken(res.data.accessToken);
        return res.data.accessToken;
      })
    );
  }

  logout(): Observable<void> {
    const refreshToken = this.tokenStorage.getRefreshToken();

    if (!environment.useMockApi && refreshToken) {
      this.api.post(API_ENDPOINTS.auth.logout, { refreshToken }).pipe(catchError(() => of(null))).subscribe();
    }

    this.clearAuth();
    return of(undefined);
  }

  private handleAuthSuccess(data: AuthResponseData): void {
    this.tokenStorage.saveAccessToken(data.accessToken);
    this.tokenStorage.saveRefreshToken(data.refreshToken);
    this.tokenStorage.saveUser(data.user);
    this.currentUserSignal.set(data.user);
  }

  private clearAuth(): void {
    this.tokenStorage.clearStorage();
    this.currentUserSignal.set(null);
  }
}
