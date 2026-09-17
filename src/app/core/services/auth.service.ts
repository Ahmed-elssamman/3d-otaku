import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  Observable,
  of,
  tap,
  catchError,
  map,
  throwError,
  finalize,
  shareReplay,
  switchMap,
} from 'rxjs';
import {
  User,
  AuthResponseData,
  LoginRequest,
  RegisterRequest,
  RefreshTokenRequest,
  RefreshTokenResponse,
} from '../models/user.model';
import { UserRole } from '../enums/user-role.enum';
import { ApiService } from '../api/api.service';
import { API_ENDPOINTS } from '../api/api-endpoints';
import { TokenStorageService } from './token-storage.service';
import { ApiErrorResponse } from '../models/api-response.model';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private api = inject(ApiService);
  private tokenStorage = inject(TokenStorageService);
  private destroyRef = inject(DestroyRef);

  private currentUserSignal = signal<User | null>(this.tokenStorage.getUser());
  private refreshRequest: Observable<string> | null = null;
  private sessionRequest: Observable<User | null> | null = null;
  private sessionVersion = 0;

  currentUser = computed(() => (this.tokenStorage.accessToken() ? this.currentUserSignal() : null));
  isAuthenticated = computed(() => this.currentUser() !== null);
  isAdmin = computed(() => this.currentUser()?.role === UserRole.ADMIN);

  register(payload: RegisterRequest): Observable<AuthResponseData> {
    return this.api
      .post<AuthResponseData, RegisterRequest>(API_ENDPOINTS.auth.register, payload)
      .pipe(
        map((res) => res.data),
        tap((data) => this.handleAuthSuccess(data)),
      );
  }

  login(payload: LoginRequest): Observable<AuthResponseData> {
    return this.api.post<AuthResponseData, LoginRequest>(API_ENDPOINTS.auth.login, payload).pipe(
      map((res) => res.data),
      tap((data) => this.handleAuthSuccess(data)),
    );
  }

  loadCurrentUser(): Observable<User | null> {
    this.tokenStorage.initialize();
    this.currentUserSignal.set(this.tokenStorage.getUser());
    if (this.sessionRequest) return this.sessionRequest;
    const accessToken = this.tokenStorage.getAccessToken();
    if (!accessToken && !this.tokenStorage.getRefreshToken()) return of(null);
    const version = this.sessionVersion;
    const tokenRequest = accessToken ? of(accessToken) : this.refreshToken();
    this.sessionRequest = tokenRequest.pipe(
      switchMap(() => this.api.get<User>(API_ENDPOINTS.auth.me)),
      map((res) => {
        if (version !== this.sessionVersion) return null;
        this.currentUserSignal.set(res.data);
        this.tokenStorage.saveUser(res.data);
        return res.data;
      }),
      catchError((error: ApiErrorResponse) => {
        if (error.statusCode === 401 || error.statusCode === 403) this.clearAuth();
        return of(this.currentUser());
      }),
      finalize(() => (this.sessionRequest = null)),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    return this.sessionRequest;
  }

  refreshToken(): Observable<string> {
    if (this.refreshRequest) return this.refreshRequest;
    const refreshToken = this.tokenStorage.getRefreshToken();
    if (!refreshToken) return throwError(() => new Error('No refresh token is available.'));

    const version = this.sessionVersion;
    this.refreshRequest = this.api
      .post<RefreshTokenResponse, RefreshTokenRequest>(API_ENDPOINTS.auth.refreshToken, {
        refreshToken,
      })
      .pipe(
        map((res) => {
          if (version !== this.sessionVersion)
            throw new Error('The session changed during refresh.');
          this.tokenStorage.saveAccessToken(res.data.accessToken);
          this.tokenStorage.saveRefreshToken(res.data.refreshToken);
          return res.data.accessToken;
        }),
        finalize(() => (this.refreshRequest = null)),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    return this.refreshRequest;
  }

  logout(): Observable<null> {
    const refreshToken = this.tokenStorage.getRefreshToken();

    if (refreshToken) {
      this.api
        .post(API_ENDPOINTS.auth.logout, { refreshToken })
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          catchError(() => of(null)),
        )
        .subscribe();
    }

    this.clearAuth();
    return of(null);
  }

  private handleAuthSuccess(data: AuthResponseData): void {
    this.sessionVersion += 1;
    this.tokenStorage.saveAccessToken(data.accessToken);
    this.tokenStorage.saveRefreshToken(data.refreshToken);
    this.tokenStorage.saveUser(data.user);
    this.currentUserSignal.set(data.user);
  }

  clearAuth(): void {
    this.sessionVersion += 1;
    this.tokenStorage.clearStorage();
    this.currentUserSignal.set(null);
  }
}
