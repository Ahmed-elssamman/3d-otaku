import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiResponse } from '@core/models/api-response.model';
import { ApiService } from '@core/api/api.service';
import { API_ENDPOINTS } from '@core/api/api-endpoints';
import { AdminDashboardStats } from '../models/admin-dashboard.model';

@Injectable({ providedIn: 'root' })
export class AdminDashboardService {
  private api = inject(ApiService);

  getStats(): Observable<ApiResponse<AdminDashboardStats>> {
    return this.api.get<AdminDashboardStats>(API_ENDPOINTS.admin.dashboard.stats);
  }
}
