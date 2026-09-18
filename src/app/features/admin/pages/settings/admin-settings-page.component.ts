import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { finalize, map } from 'rxjs';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { AdminSettingsService } from '../../services/admin-settings.service';
import { AdminSettings } from '../../models/admin-settings.model';
import { normalizeEgyptMobile } from '@core/utils/egypt-phone.util';
import { environment } from '../../../../../environments/environment';
import {
  ADMIN_SETTINGS_DELIVERY_FEE_ERROR,
  ADMIN_SETTINGS_INPUT,
  ADMIN_SETTINGS_SECTIONS,
  createAdminSettingsForm,
  normalizeEgyptContactPhone,
} from './admin-settings-page.control';

@Component({
  selector: 'app-admin-settings-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, ToggleSwitch],
  templateUrl: './admin-settings-page.component.html',
  styleUrl: './admin-settings-page.component.scss',
})
export class AdminSettingsPageComponent {
  private service = inject(AdminSettingsService);
  private destroyRef = inject(DestroyRef);
  settingsForm = createAdminSettingsForm(inject(FormBuilder));
  private formEvents = toSignal(
    this.settingsForm.events.pipe(map(() => this.settingsForm.getRawValue())),
    { initialValue: this.settingsForm.getRawValue() },
  );
  private loadedSettings = signal<AdminSettings | null>(null);
  isSubmitting = signal(false);
  isLoading = signal(true);
  loadError = signal('');
  saveError = signal('');
  savedMessage = signal('');
  attemptedSubmit = signal(false);
  inputTypes = ADMIN_SETTINGS_INPUT;
  deliveryFeeError = ADMIN_SETTINGS_DELIVERY_FEE_ERROR;
  canSave = computed(
    () =>
      !this.isLoading() &&
      !this.isSubmitting() &&
      !this.loadError() &&
      this.loadedSettings() !== null,
  );
  sections = computed(() => {
    this.formEvents();
    return ADMIN_SETTINGS_SECTIONS.map((section) => ({
      ...section,
      fields: section.fields.map((field) => {
        const control = this.settingsForm.controls[field.key];
        return {
          ...field,
          invalid: control.invalid && (control.touched || this.attemptedSubmit()),
        };
      }),
    }));
  });
  invalidFee = computed(() => {
    this.formEvents();
    return (
      this.settingsForm.controls.deliveryFee.invalid &&
      (this.settingsForm.controls.deliveryFee.touched || this.attemptedSubmit())
    );
  });
  invalidDays = computed(() => {
    this.formEvents();
    return (
      this.settingsForm.controls.deliveryDays.invalid &&
      (this.settingsForm.controls.deliveryDays.touched || this.attemptedSubmit())
    );
  });

  constructor() {
    this.loadSettings();
  }

  loadSettings(): void {
    if (this.isSubmitting()) return;
    this.isLoading.set(true);
    this.loadError.set('');
    this.service
      .getAdminSettings()
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          this.loadedSettings.set(response.data);
          this.applyLoadedSettings();
        },
        error: () => {
          this.loadedSettings.set(null);
          this.loadError.set('تعذّر تحميل الإعدادات الحالية. أعد المحاولة قبل إجراء تعديلات.');
        },
      });
  }

  discardChanges(): void {
    if (this.isSubmitting()) return;
    this.applyLoadedSettings();
  }

  saveSettings(): void {
    if (!this.canSave()) return;
    this.attemptedSubmit.set(true);
    this.saveError.set('');
    this.savedMessage.set('');
    if (this.settingsForm.invalid) {
      this.settingsForm.markAllAsTouched();
      this.saveError.set('راجع الحقول الموضحة قبل حفظ الإعدادات.');
      return;
    }
    const current = this.loadedSettings();
    if (!current) return;
    const values = this.settingsForm.getRawValue();
    const payload: AdminSettings = {
      ...current,
      ...values,
      brandName: values.brandName.trim(),
      slogan: values.slogan.trim(),
      whatsappNumber: normalizeEgyptMobile(values.whatsappNumber).replace('+', ''),
      phone: normalizeEgyptContactPhone(values.phone),
      whatsappDefaultMessage: values.whatsappDefaultMessage.trim(),
      email: values.email.trim().toLowerCase(),
      facebookUrl: values.facebookUrl.trim(),
      instagramUrl: values.instagramUrl.trim(),
      tiktokUrl: values.tiktokUrl.trim(),
      youtubeUrl: values.youtubeUrl.trim(),
      deliveryDays: values.deliveryDays.trim(),
      defaultCurrency: environment.defaultCurrency,
    };
    this.isSubmitting.set(true);
    this.service
      .updateSettings(payload)
      .pipe(
        finalize(() => this.isSubmitting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          this.loadedSettings.set(response.data);
          this.applyLoadedSettings();
          this.savedMessage.set('تم حفظ الإعدادات في المتجر.');
        },
        error: () =>
          this.saveError.set(
            'لم يتم تأكيد حفظ الإعدادات. احتُفظ بتعديلاتك؛ أعد تحميل القيم المحفوظة للتحقق قبل إعادة المحاولة.',
          ),
      });
  }

  private applyLoadedSettings(): void {
    const settings = this.loadedSettings();
    if (!settings) return;
    this.settingsForm.reset({
      ...settings,
      deliveryFee: settings.deliveryFee ?? null,
      deliveryDays: settings.deliveryDays || '',
    });
    this.attemptedSubmit.set(false);
    this.saveError.set('');
    this.savedMessage.set('');
  }
}
