import { Routes } from '@angular/router';
import { adminGuard } from '@core/guards/admin.guard';
import { AdminLayoutComponent } from './layout/admin-layout.component';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    component: AdminLayoutComponent,
    canActivate: [adminGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard'
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/dashboard/admin-dashboard-page.component').then(m => m.AdminDashboardPageComponent),
        data: { title: 'Dashboard' }
      },
      {
        path: 'products',
        data: { title: 'Products' },
        children: [
          {
            path: '',
            loadComponent: () => import('./pages/products/admin-products-page.component').then(m => m.AdminProductsPageComponent),
            data: { title: 'Products' }
          },
          {
            path: 'new',
            loadComponent: () => import('./pages/product-form/admin-product-form-page.component').then(m => m.AdminProductFormPageComponent),
            data: { title: 'Add Product' }
          },
          {
            path: ':id/edit',
            loadComponent: () => import('./pages/product-form/admin-product-form-page.component').then(m => m.AdminProductFormPageComponent),
            data: { title: 'Edit Product' }
          }
        ]
      },
      {
        path: 'settings',
        loadComponent: () => import('./pages/settings/admin-settings-page.component').then(m => m.AdminSettingsPageComponent),
        data: { title: 'Settings' }
      }
    ]
  }
];
