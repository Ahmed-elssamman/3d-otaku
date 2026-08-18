import { Injectable, signal } from '@angular/core';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class TokenStorageService {
  private readonly ACCESS_TOKEN_KEY = '3d-otaku-access-token';
  private readonly REFRESH_TOKEN_KEY = '3d-otaku-refresh-token';
  private readonly AUTH_USER_KEY = '3d-otaku-auth-user';
  private accessTokenSignal = signal<string | null>(localStorage.getItem(this.ACCESS_TOKEN_KEY));

  accessToken = this.accessTokenSignal.asReadonly();

  getAccessToken(): string | null {
    return this.accessTokenSignal();
  }

  saveAccessToken(token: string): void {
    localStorage.setItem(this.ACCESS_TOKEN_KEY, token);
    this.accessTokenSignal.set(token);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  saveRefreshToken(token: string): void {
    localStorage.setItem(this.REFRESH_TOKEN_KEY, token);
  }

  getUser(): User | null {
    const raw = localStorage.getItem(this.AUTH_USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  }

  saveUser(user: User): void {
    localStorage.setItem(this.AUTH_USER_KEY, JSON.stringify(user));
  }

  clearStorage(): void {
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.AUTH_USER_KEY);
    this.accessTokenSignal.set(null);
  }
}
