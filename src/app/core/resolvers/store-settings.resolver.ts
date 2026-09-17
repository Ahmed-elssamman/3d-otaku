import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { map } from 'rxjs';
import { AdminSettingsService } from '../../features/admin/services/admin-settings.service';

export const storeSettingsResolver: ResolveFn<boolean> = () =>
  inject(AdminSettingsService)
    .getPublicSettings()
    .pipe(map((response) => response.success));
