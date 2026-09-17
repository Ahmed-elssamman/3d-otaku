import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { DEFAULT_ADMIN_SETTINGS } from '../data/admin-settings.data';
import { AdminSettings } from '../models/admin-settings.model';
import { ApiResponse } from '@core/models/api-response.model';
import { ApiService } from '@core/api/api.service';
import { API_ENDPOINTS } from '@core/api/api-endpoints';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AdminSettingsService {
  private api = inject(ApiService);
  private settingsSignal = signal<AdminSettings>({ ...DEFAULT_ADMIN_SETTINGS });
  settings = computed(() => this.settingsSignal());

  getPublicSettings(): Observable<ApiResponse<AdminSettings>> {
    return this.api.get<AdminSettings>(API_ENDPOINTS.settings.public).pipe(
      map((response) => this.normalizeResponse(response)),
      tap((response) => this.settingsSignal.set(response.data)),
      catchError(() => {
        this.settingsSignal.set({ ...DEFAULT_ADMIN_SETTINGS });
        return of({
          success: false,
          message: 'إعدادات المتجر غير متاحة مؤقتًا.',
          data: this.settingsSignal(),
        });
      }),
    );
  }

  getAdminSettings(): Observable<ApiResponse<AdminSettings>> {
    return this.api.get<AdminSettings>(API_ENDPOINTS.admin.settings.get).pipe(
      map((response) => this.normalizeResponse(response)),
      tap((response) => this.settingsSignal.set(response.data)),
    );
  }

  updateSettings(payload: AdminSettings): Observable<ApiResponse<AdminSettings>> {
    return this.api
      .put<AdminSettings, AdminSettings>(API_ENDPOINTS.admin.settings.update, {
        ...payload,
        defaultCurrency: environment.defaultCurrency,
      })
      .pipe(
        map((response) => this.normalizeResponse(response)),
        tap((response) => this.settingsSignal.set(response.data)),
      );
  }

  getSettings(): AdminSettings {
    return this.settingsSignal();
  }

  private normalizeResponse(response: ApiResponse<AdminSettings>): ApiResponse<AdminSettings> {
    return {
      ...response,
      data: {
        ...DEFAULT_ADMIN_SETTINGS,
        ...response.data,
        defaultCurrency: environment.defaultCurrency,
      },
    };
  }
}
