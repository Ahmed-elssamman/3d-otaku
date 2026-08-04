import { Injectable, signal, computed } from '@angular/core';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly storageKey = '3d_otaku_user';
  private readonly currentUserSignal = signal<User | null>(this.loadUserFromStorage());

  currentUser = computed(() => this.currentUserSignal());
  isAuthenticated = computed(() => this.currentUserSignal() !== null);

  private loadUserFromStorage(): User | null {
    try {
      const raw = localStorage.getItem(this.storageKey);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  login(email: string): User {
    const mockUser: User = {
      id: 'usr-101',
      fullName: email.split('@')[0].toUpperCase(),
      email,
      avatarUrl: 'assets/images/avatar-otaku.svg',
      createdAt: new Date().toISOString()
    };
    this.currentUserSignal.set(mockUser);
    localStorage.setItem(this.storageKey, JSON.stringify(mockUser));
    return mockUser;
  }

  register(fullName: string, email: string): User {
    const mockUser: User = {
      id: `usr-${Date.now()}`,
      fullName,
      email,
      avatarUrl: 'assets/images/avatar-otaku.svg',
      createdAt: new Date().toISOString()
    };
    this.currentUserSignal.set(mockUser);
    localStorage.setItem(this.storageKey, JSON.stringify(mockUser));
    return mockUser;
  }

  logout(): void {
    this.currentUserSignal.set(null);
    localStorage.removeItem(this.storageKey);
  }
}
