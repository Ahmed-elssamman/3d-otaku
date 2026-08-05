import { Routes } from '@angular/router';
import { MainLayoutComponent } from './core/layouts/main-layout/main-layout.component';
import { guestGuard } from './core/guards/guest.guard';

export const routes: Routes = [
  {
    path: 'admin',
    loadChildren: () => import('./features/admin/admin.routes').then(m => m.ADMIN_ROUTES)
  },
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      {
        path: '',
        loadComponent: () => import('./features/home/pages/home-page/home-page.component').then(m => m.HomePageComponent)
      },
      {
        path: 'products',
        loadComponent: () => import('./features/products/pages/products-page/products-page.component').then(m => m.ProductsPageComponent)
      },
      {
        path: 'products/:slug',
        loadComponent: () => import('./features/product-details/pages/product-details-page/product-details-page.component').then(m => m.ProductDetailsPageComponent)
      },
      {
        path: 'login',
        canActivate: [guestGuard],
        loadComponent: () => import('./features/auth/login/login-page/login-page.component').then(m => m.LoginPageComponent)
      },
      {
        path: 'register',
        canActivate: [guestGuard],
        loadComponent: () => import('./features/auth/register/register-page/register-page.component').then(m => m.RegisterPageComponent)
      },
      {
        path: 'about',
        loadComponent: () => import('./features/about/pages/about-page/about-page.component').then(m => m.AboutPageComponent)
      },
      {
        path: 'contact',
        loadComponent: () => import('./features/contact/pages/contact-page/contact-page.component').then(m => m.ContactPageComponent)
      },
      {
        path: 'not-found',
        loadComponent: () => import('./features/not-found/pages/not-found-page/not-found-page.component').then(m => m.NotFoundPageComponent)
      },
      {
        path: '**',
        redirectTo: 'not-found'
      }
    ]
  }
];
