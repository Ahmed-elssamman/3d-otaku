import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../../environments/environment';
import { DEFAULT_ADMIN_SETTINGS } from '../../data/admin-settings.data';
import { AdminSettingsPageComponent } from './admin-settings-page.component';

describe('Admin settings integrity', () => {
  let component: AdminSettingsPageComponent;
  let http: HttpTestingController;
  const endpoint = `${environment.apiBaseUrl}/admin/settings`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    component = TestBed.runInInjectionContext(() => new AdminSettingsPageComponent());
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('requires current server values before enabling a save and can retry a failed load', () => {
    expect(component.canSave()).toBe(false);
    component.saveSettings();
    http.expectOne(endpoint).flush({ success: false }, { status: 503, statusText: 'Unavailable' });
    expect(component.loadError()).toBeTruthy();
    expect(component.canSave()).toBe(false);
    component.saveSettings();
    http.expectNone((request) => request.method === 'PUT');
    component.loadSettings();
    http.expectOne(endpoint).flush({ success: true, data: DEFAULT_ADMIN_SETTINGS });
    expect(component.canSave()).toBe(true);
  });

  it('normalizes Egyptian contact numbers, preserves dormant settings and distinguishes zero delivery from unconfirmed', () => {
    const loaded = { ...DEFAULT_ADMIN_SETTINGS, heroTitle: 'Existing title', deliveryFee: null };
    http.expectOne(endpoint).flush({ success: true, data: loaded });
    component.settingsForm.patchValue({
      whatsappNumber: '٠١٠١٢٣٤٥٦٧٨',
      phone: '02 2345 6789',
      deliveryFee: 0,
    });
    component.saveSettings();
    const save = http.expectOne(endpoint);
    expect(save.request.method).toBe('PUT');
    expect(save.request.body.whatsappNumber).toBe('201012345678');
    expect(save.request.body.phone).toBe('+20223456789');
    expect(save.request.body.deliveryFee).toBe(0);
    expect(save.request.body.defaultCurrency).toBe('EGP');
    expect(save.request.body.heroTitle).toBe('Existing title');
    save.flush({ success: true, data: save.request.body });
    component.settingsForm.controls.deliveryFee.setValue(null);
    component.saveSettings();
    const unconfirmed = http.expectOne(endpoint);
    expect(unconfirmed.request.body.deliveryFee).toBeNull();
    unconfirmed.flush({ success: true, data: unconfirmed.request.body });
  });

  it('rejects malformed contact numbers and unsafe links before writing', () => {
    http.expectOne(endpoint).flush({ success: true, data: DEFAULT_ADMIN_SETTINGS });
    component.settingsForm.patchValue({
      whatsappNumber: '0123',
      facebookUrl: 'javascript:alert(1)',
    });
    component.saveSettings();
    expect(component.settingsForm.controls.whatsappNumber.invalid).toBe(true);
    expect(component.settingsForm.controls.facebookUrl.invalid).toBe(true);
    expect(component.saveError()).toBeTruthy();
    http.expectNone((request) => request.method === 'PUT');
  });

  it('blocks fractional-piastre and nonfinite shipping fees before any settings write', () => {
    http.expectOne(endpoint).flush({ success: true, data: DEFAULT_ADMIN_SETTINGS });
    for (const fee of [1.001, 10000.01, Number.NaN, Number.POSITIVE_INFINITY]) {
      component.settingsForm.controls.deliveryFee.setValue(fee);
      component.saveSettings();
      expect(component.invalidFee()).toBe(true);
      expect(component.isSubmitting()).toBe(false);
      expect(component.saveError()).toBeTruthy();
      http.expectNone((request) => request.method === 'PUT');
    }
  });

  it('saves exact fractional shipping fees without rounding and preserves the existing cap', () => {
    http.expectOne(endpoint).flush({ success: true, data: DEFAULT_ADMIN_SETTINGS });
    for (const fee of [0.01, 19.99, 10000]) {
      component.settingsForm.controls.deliveryFee.setValue(fee);
      component.saveSettings();
      const save = http.expectOne(endpoint);
      expect(save.request.method).toBe('PUT');
      expect(save.request.body.deliveryFee).toBe(fee);
      save.flush({ success: true, data: save.request.body });
      expect(component.invalidFee()).toBe(false);
    }
  });
});
