import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, PaginatedResponse } from '../models/api-response.model';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiBaseUrl;

  private createParams<TParams extends object>(params: TParams | null = null): HttpParams {
    let httpParams = new HttpParams();
    if (!params) {
      return httpParams;
    }

    (Object.keys(params) as Array<keyof TParams>).forEach((key) => {
      const value = params[key];
      if (value !== null && value !== '') {
        httpParams = httpParams.set(String(key), String(value));
      }
    });

    return httpParams;
  }

  get<T, TParams extends object = object>(
    endpoint: string,
    params: TParams | null = null,
  ): Observable<ApiResponse<T>> {
    return this.http.get<ApiResponse<T>>(`${this.baseUrl}${endpoint}`, {
      params: this.createParams(params),
    });
  }

  getPaginated<T, TParams extends object = object>(
    endpoint: string,
    params: TParams | null = null,
  ): Observable<PaginatedResponse<T>> {
    return this.http.get<PaginatedResponse<T>>(`${this.baseUrl}${endpoint}`, {
      params: this.createParams(params),
    });
  }

  post<T, TBody extends object = object>(
    endpoint: string,
    body: TBody | null = null,
  ): Observable<ApiResponse<T>> {
    return this.http.post<ApiResponse<T>>(`${this.baseUrl}${endpoint}`, body);
  }

  put<T, TBody extends object = object>(
    endpoint: string,
    body: TBody | null = null,
  ): Observable<ApiResponse<T>> {
    return this.http.put<ApiResponse<T>>(`${this.baseUrl}${endpoint}`, body);
  }

  patch<T, TBody extends object = object>(
    endpoint: string,
    body: TBody | null = null,
  ): Observable<ApiResponse<T>> {
    return this.http.patch<ApiResponse<T>>(`${this.baseUrl}${endpoint}`, body);
  }

  delete<T, TBody extends object = object>(
    endpoint: string,
    body: TBody | null = null,
  ): Observable<ApiResponse<T>> {
    return this.http.delete<ApiResponse<T>>(`${this.baseUrl}${endpoint}`, { body });
  }

  upload<T>(endpoint: string, formData: FormData): Observable<ApiResponse<T>> {
    return this.http.post<ApiResponse<T>>(`${this.baseUrl}${endpoint}`, formData);
  }
}
