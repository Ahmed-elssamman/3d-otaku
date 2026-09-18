import { Routes } from '@angular/router';
import { inject, provideEnvironmentInitializer } from '@angular/core';
import { adminGuard } from '@core/guards/admin.guard';
import { AdminLayoutComponent } from './layout/admin-layout.component';
import { PrimeNG } from 'primeng/config';
import Aura from '@primeng/themes/aura';
import { AdminOperationKind } from './enums/admin-operation.enum';
import { ADMIN_PRIME_TRANSLATION } from './data/admin-prime-translation.data';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    component: AdminLayoutComponent,
    canActivate: [adminGuard],
    providers: [
      provideEnvironmentInitializer(() => {
        inject(PrimeNG).setConfig({
          theme: { preset: Aura, options: { darkModeSelector: '.dark' } },
          translation: ADMIN_PRIME_TRANSLATION,
        });
      }),
    ],
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard',
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/dashboard/admin-dashboard-page.component').then(
            (m) => m.AdminDashboardPageComponent,
          ),
        data: { title: 'نظرة عامة' },
      },
      {
        path: 'orders',
        loadComponent: () =>
          import('./pages/operations/admin-operations-page.component').then(
            (m) => m.AdminOperationsPageComponent,
          ),
        data: { title: 'طلبات المتجر', operationKind: AdminOperationKind.Orders },
      },
      {
        path: 'custom-orders',
        loadComponent: () =>
          import('./pages/operations/admin-operations-page.component').then(
            (m) => m.AdminOperationsPageComponent,
          ),
        data: { title: 'طلبات التصميم الخاص', operationKind: AdminOperationKind.CustomOrders },
      },
      {
        path: 'contact-messages',
        loadComponent: () =>
          import('./pages/operations/admin-operations-page.component').then(
            (m) => m.AdminOperationsPageComponent,
          ),
        data: { title: 'رسائل العملاء', operationKind: AdminOperationKind.Messages },
      },
      {
        path: 'products',
        data: { title: 'المنتجات' },
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./pages/products/admin-products-page.component').then(
                (m) => m.AdminProductsPageComponent,
              ),
            data: { title: 'المنتجات' },
          },
          {
            path: 'new',
            loadComponent: () =>
              import('./pages/product-form/admin-product-form-page.component').then(
                (m) => m.AdminProductFormPageComponent,
              ),
            data: { title: 'إضافة منتج' },
          },
          {
            path: ':id/edit',
            loadComponent: () =>
              import('./pages/product-form/admin-product-form-page.component').then(
                (m) => m.AdminProductFormPageComponent,
              ),
            data: { title: 'تعديل المنتج' },
          },
        ],
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./pages/settings/admin-settings-page.component').then(
            (m) => m.AdminSettingsPageComponent,
          ),
        data: { title: 'إعدادات المتجر' },
      },
    ],
  },
];
