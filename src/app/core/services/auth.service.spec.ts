import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { TokenStorageService } from './token-storage.service';

describe('AuthService refresh token rotation', () => {
  it('uses the rotated refresh token for the next refresh', () => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const service = TestBed.inject(AuthService);
    const storage = TestBed.inject(TokenStorageService);
    const http = TestBed.inject(HttpTestingController);
    storage.saveRefreshToken('original-refresh');

    service.refreshToken().subscribe();
    const firstRefresh = http.expectOne(`${environment.apiBaseUrl}/auth/refresh-token`);
    expect(firstRefresh.request.body.refreshToken).toBe('original-refresh');
    firstRefresh.flush({
      success: true,
      message: 'Refreshed',
      data: { accessToken: 'access-1', refreshToken: 'rotated-refresh' },
    });

    service.refreshToken().subscribe();
    const secondRefresh = http.expectOne(`${environment.apiBaseUrl}/auth/refresh-token`);
    expect(secondRefresh.request.body.refreshToken).toBe('rotated-refresh');
    secondRefresh.flush({
      success: true,
      message: 'Refreshed',
      data: { accessToken: 'access-2', refreshToken: 'refresh-2' },
    });
    expect(storage.getAccessToken()).toBe('access-2');
    expect(storage.getRefreshToken()).toBe('refresh-2');
    http.verify();
  });
});
