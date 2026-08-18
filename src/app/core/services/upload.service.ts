import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { ApiResponse } from '../models/api-response.model';
import { UploadResult } from '../models/upload-result.model';
import { ApiService } from '../api/api.service';
import { API_ENDPOINTS } from '../api/api-endpoints';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UploadService {
  private api = inject(ApiService);

  uploadImage(file: File, folder: string = 'products'): Observable<ApiResponse<UploadResult>> {
    if (environment.useMockApi) {
      const mockResult: UploadResult = {
        url: URL.createObjectURL(file),
        fileName: file.name,
        size: file.size,
        mimeType: file.type || 'image/webp'
      };
      return of({
        success: true,
        message: 'Image uploaded successfully (mock mode).',
        data: mockResult
      });
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    return this.api.upload<UploadResult>(API_ENDPOINTS.uploads.image, formData);
  }

  uploadModel(file: File, productId: string | null = null): Observable<ApiResponse<UploadResult>> {
    if (environment.useMockApi) {
      const mockResult: UploadResult = {
        url: URL.createObjectURL(file),
        fileName: file.name,
        size: file.size,
        mimeType: file.type || 'model/gltf-binary'
      };
      return of({
        success: true,
        message: '3D model uploaded successfully (mock mode).',
        data: mockResult
      });
    }

    const formData = new FormData();
    formData.append('file', file);
    if (productId) {
      formData.append('productId', productId);
    }

    return this.api.upload<UploadResult>(API_ENDPOINTS.uploads.model, formData);
  }
}
