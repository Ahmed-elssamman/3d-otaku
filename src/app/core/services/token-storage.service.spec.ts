import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TokenStorageService } from './token-storage.service';

describe('browser session initialization', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('keeps the initial public render anonymous and restores a saved token only on initialization', () => {
    localStorage.setItem('3d-otaku-access-token', 'saved-access');
    localStorage.setItem('3d-otaku-refresh-token', 'saved-refresh');
    const service = TestBed.inject(TokenStorageService);
    expect(service.getAccessToken()).toBeNull();
    expect(service.getRefreshToken()).toBeNull();
    service.initialize();
    expect(service.getAccessToken()).toBe('saved-access');
    expect(service.getRefreshToken()).toBe('saved-refresh');
    service.clearStorage();
    service.initialize();
    expect(service.getAccessToken()).toBeNull();
  });

  it('does not access browser storage during server rendering', () => {
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'server' }] });
    const read = vi.spyOn(Storage.prototype, 'getItem');
    const write = vi.spyOn(Storage.prototype, 'setItem');
    const remove = vi.spyOn(Storage.prototype, 'removeItem');
    const service = TestBed.inject(TokenStorageService);
    service.initialize();
    service.clearStorage();
    expect(service.getAccessToken()).toBeNull();
    expect(read).not.toHaveBeenCalled();
    expect(write).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
  });

  it('keeps login and logout usable if the browser blocks storage', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Blocked');
    });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('Blocked');
    });
    const service = TestBed.inject(TokenStorageService);
    service.saveAccessToken('memory-access');
    service.saveRefreshToken('memory-refresh');
    expect(service.getAccessToken()).toBe('memory-access');
    expect(service.getRefreshToken()).toBe('memory-refresh');
    service.clearStorage();
    expect(service.getAccessToken()).toBeNull();
    expect(service.getRefreshToken()).toBeNull();
  });
});
