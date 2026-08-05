import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, of, tap, map, catchError } from 'rxjs';
import { APP_CONSTANTS } from '@core/constants/app.constants';
import { DEFAULT_ADMIN_SETTINGS } from '../data/admin-settings.data';
import { AdminSettings } from '../models/admin-settings.model';
import { ApiResponse } from '@core/models/api-response.model';
import { ApiService } from '@core/api/api.service';
import { API_ENDPOINTS } from '@core/api/api-endpoints';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AdminSettingsService {
  private api = inject(ApiService);
  private settingsSignal = signal<AdminSettings>(this.loadFromStorage());

  settings = computed(() => this.settingsSignal());

  getPublicSettings(): Observable<ApiResponse<AdminSettings>> {
    if (environment.useMockApi) {
      return of({
        success: true,
        message: 'Public settings fetched successfully.',
        data: this.settingsSignal()
      });
    }

    return this.api.get<AdminSettings>(API_ENDPOINTS.settings.public).pipe(
      tap(res => {
        if (res.success && res.data) {
          this.settingsSignal.set(res.data);
          this.saveToStorage();
        }
      }),
      catchError(() =>
        of({
          success: true,
          message: 'Fallback settings loaded.',
          data: this.settingsSignal()
        })
      )
    );
  }

  getAdminSettings(): Observable<ApiResponse<AdminSettings>> {
    if (environment.useMockApi) {
      return of({
        success: true,
        message: 'Admin settings fetched successfully.',
        data: this.settingsSignal()
      });
    }

    return this.api.get<AdminSettings>(API_ENDPOINTS.admin.settings.get).pipe(
      tap(res => {
        if (res.success && res.data) {
          this.settingsSignal.set(res.data);
          this.saveToStorage();
        }
      })
    );
  }

  updateSettings(settingsPayload: AdminSettings): Observable<ApiResponse<AdminSettings>> {
    if (environment.useMockApi) {
      this.settingsSignal.set(settingsPayload);
      this.saveToStorage();
      return of({
        success: true,
        message: 'Settings updated successfully.',
        data: settingsPayload
      });
    }

    return this.api.put<AdminSettings>(API_ENDPOINTS.admin.settings.update, settingsPayload).pipe(
      tap(res => {
        if (res.success && res.data) {
          this.settingsSignal.set(res.data);
          this.saveToStorage();
        }
      })
    );
  }

  resetSettings(): Observable<ApiResponse<AdminSettings>> {
    if (environment.useMockApi) {
      this.settingsSignal.set({ ...DEFAULT_ADMIN_SETTINGS });
      this.saveToStorage();
      return of({
        success: true,
        message: 'Settings reset successfully.',
        data: { ...DEFAULT_ADMIN_SETTINGS }
      });
    }

    return this.api.post<AdminSettings>(API_ENDPOINTS.admin.settings.reset).pipe(
      tap(res => {
        if (res.success && res.data) {
          this.settingsSignal.set(res.data);
          this.saveToStorage();
        }
      })
    );
  }

  // Legacy sync getter for components requiring immediate value
  getSettings(): AdminSettings {
    return this.settingsSignal();
  }

  saveToStorage(): void {
    localStorage.setItem(APP_CONSTANTS.STORAGE_KEYS.SETTINGS, JSON.stringify(this.settingsSignal()));
  }

  loadFromStorage(): AdminSettings {
    const raw = localStorage.getItem(APP_CONSTANTS.STORAGE_KEYS.SETTINGS);
    if (!raw) {
      return { ...DEFAULT_ADMIN_SETTINGS };
    }

    try {
      return { ...DEFAULT_ADMIN_SETTINGS, ...JSON.parse(raw) };
    } catch {
      return { ...DEFAULT_ADMIN_SETTINGS };
    }
  }
}
