import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Message } from 'primeng/message';
import { Tabs, TabList, TabPanels, TabPanel, Tab } from 'primeng/tabs';
import { Textarea } from 'primeng/textarea';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { AdminSettingsService } from '../../services/admin-settings.service';
import { AdminSettings } from '../../models/admin-settings.model';

@Component({
  selector: 'app-admin-settings-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    Button,
    InputText,
    Message,
    Tabs,
    Tab,
    TabList,
    TabPanel,
    TabPanels,
    Textarea,
    ToggleSwitch
  ],
  templateUrl: './admin-settings-page.component.html',
  styleUrl: './admin-settings-page.component.scss'
})
export class AdminSettingsPageComponent implements OnInit {
  private formBuilder = inject(FormBuilder);
  private adminSettingsService = inject(AdminSettingsService);
  private messageService = inject(MessageService);
  private router = inject(Router);

  isSubmitting = signal<boolean>(false);
  isLoading = signal<boolean>(true);

  settingsForm = this.formBuilder.group({
    brandName: ['', [Validators.required]],
    slogan: ['', [Validators.required]],
    whatsappNumber: ['', [Validators.pattern(/^\+?[0-9\s-]{8,20}$/)]],
    whatsappDefaultMessage: ['', [Validators.required]],
    email: ['', [Validators.email]],
    phone: [''],
    address: [''],
    facebookUrl: [''],
    instagramUrl: [''],
    tiktokUrl: [''],
    youtubeUrl: [''],
    heroTitle: ['', [Validators.required]],
    heroSubtitle: ['', [Validators.required]],
    heroImageUrl: [''],
    defaultCurrency: ['', [Validators.required, Validators.pattern(/^[A-Z]{3}$/)]],
    deliveryNote: [''],
    safetyNote: [''],
    maintenanceMode: [false],
    deliveryFee: [null as number | null, [Validators.min(0)]],
    deliveryDays: [''],
    deliveryInfoNote: ['']
  });

  ngOnInit(): void {
    this.adminSettingsService.getAdminSettings().subscribe({
      next: (res) => {
        if (res.data) {
          this.settingsForm.patchValue(res.data);
        } else {
          this.settingsForm.patchValue(this.adminSettingsService.getSettings());
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.settingsForm.patchValue(this.adminSettingsService.getSettings());
        this.isLoading.set(false);
      }
    });
  }

  saveSettings(): void {
    if (this.settingsForm.invalid) {
      this.settingsForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const updatedPayload = this.settingsForm.getRawValue() as AdminSettings;

    this.adminSettingsService.updateSettings(updatedPayload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Settings saved',
          detail: 'Storefront settings were updated successfully.'
        });
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Save failed',
          detail: err?.message || 'Failed to update storefront settings.'
        });
      }
    });
  }

  resetSettings(): void {
    this.isSubmitting.set(true);
    this.adminSettingsService.resetSettings().subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        if (res.data) {
          this.settingsForm.reset(res.data);
        } else {
          this.settingsForm.reset(this.adminSettingsService.getSettings());
        }
        this.messageService.add({
          severity: 'info',
          summary: 'Defaults restored',
          detail: 'Admin settings were reset to default values.'
        });
      },
      error: () => {
        this.isSubmitting.set(false);
      }
    });
  }

  previewWebsite(): void {
    this.router.navigate(['/']);
  }
}
