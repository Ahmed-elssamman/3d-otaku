import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SITE_ORIGIN } from '../api/site-origin.token';
import { DEFAULT_ADMIN_SETTINGS } from '../../features/admin/data/admin-settings.data';
import { AdminSettings } from '../../features/admin/models/admin-settings.model';
import { AdminSettingsService } from '../../features/admin/services/admin-settings.service';
import { WhatsAppService } from './whatsapp.service';

describe('Egyptian WhatsApp destinations', () => {
  const settings = signal<AdminSettings>({ ...DEFAULT_ADMIN_SETTINGS });
  let service: WhatsAppService;

  beforeEach(() => {
    settings.set({ ...DEFAULT_ADMIN_SETTINGS });
    TestBed.configureTestingModule({
      providers: [
        { provide: SITE_ORIGIN, useValue: 'https://store.example.test' },
        { provide: AdminSettingsService, useValue: { getSettings: () => settings() } },
      ],
    });
    service = TestBed.inject(WhatsAppService);
  });

  it('turns a legacy local Egyptian setting into an international click-to-chat link', () => {
    settings.update((current) => ({ ...current, whatsappNumber: '01012345678' }));
    const link = new URL(service.getDirectChatUrl());
    expect(link.origin).toBe('https://wa.me');
    expect(link.pathname).toBe('/201012345678');
    expect(link.searchParams.get('text')).toBe('أهلًا، عندي استفسار عن الطباعة والمنتجات.');
    expect(settings().whatsappNumber).toBe('01012345678');
  });

  it('uses the latest settings and keeps Arabic-digit and international forms equivalent', () => {
    settings.update((current) => ({ ...current, whatsappNumber: '٠١٠١٢٣٤٥٦٧٨' }));
    const arabicLink = service.getCheckoutContinuationUrl('ORD-10');
    settings.update((current) => ({ ...current, whatsappNumber: '+20 101 234 5678' }));
    expect(service.getCheckoutContinuationUrl('ORD-10')).toBe(arabicLink);
    expect(new URL(arabicLink).pathname).toBe('/201012345678');
  });

  it('keeps unavailable or invalid destinations hidden instead of emitting a broken link', () => {
    expect(service.getDirectChatUrl()).toBe('');
    settings.update((current) => ({ ...current, whatsappNumber: '0123' }));
    expect(service.getDirectChatUrl()).toBe('');
    settings.update((current) => ({ ...current, whatsappNumber: '+966501234567' }));
    expect(service.getCheckoutContinuationUrl('ORD-10')).toBe('');
  });
});
