import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { User } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  private platformId = inject(PLATFORM_ID);
  private accessTokenKey = '3d-otaku-access-token';
  private refreshTokenKey = '3d-otaku-refresh-token';
  private userKey = '3d-otaku-auth-user';
  private initialized = false;
  private accessTokenSignal = signal<string | null>(null);
  private refreshToken: string | null = null;
  private user: User | null = null;

  accessToken = this.accessTokenSignal.asReadonly();

  initialize(): void {
    if (this.initialized || !isPlatformBrowser(this.platformId)) return;
    this.initialized = true;
    try {
      this.accessTokenSignal.set(localStorage.getItem(this.accessTokenKey));
      this.refreshToken = localStorage.getItem(this.refreshTokenKey);
      const raw = localStorage.getItem(this.userKey);
      this.user = raw ? (JSON.parse(raw) as User) : null;
    } catch {
      this.user = null;
    }
  }

  getAccessToken(): string | null {
    return this.accessTokenSignal();
  }

  saveAccessToken(token: string): void {
    this.initialize();
    this.accessTokenSignal.set(token);
    this.persist(this.accessTokenKey, token);
  }

  getRefreshToken(): string | null {
    return this.refreshToken;
  }

  saveRefreshToken(token: string): void {
    this.initialize();
    this.refreshToken = token;
    this.persist(this.refreshTokenKey, token);
  }

  getUser(): User | null {
    return this.user;
  }

  saveUser(user: User): void {
    this.initialize();
    this.user = user;
    this.persist(this.userKey, JSON.stringify(user));
  }

  clearStorage(): void {
    this.initialized = true;
    this.accessTokenSignal.set(null);
    this.refreshToken = null;
    this.user = null;
    this.persist(this.accessTokenKey, null);
    this.persist(this.refreshTokenKey, null);
    this.persist(this.userKey, null);
  }

  private persist(key: string, value: string | null): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    } catch {
      // Keep the current session usable when browser storage is unavailable.
    }
  }
}
