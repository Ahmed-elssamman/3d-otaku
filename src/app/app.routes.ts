import { Routes } from '@angular/router';
import { MainLayoutComponent } from './core/layouts/main-layout/main-layout.component';
import { guestGuard } from './core/guards/guest.guard';
import { authGuard } from './core/guards/auth.guard';
import { storeSettingsResolver } from './core/resolvers/store-settings.resolver';

export const routes: Routes = [
  {
    path: 'admin',
    loadChildren: () => import('./features/admin/admin.routes').then((m) => m.ADMIN_ROUTES),
  },
  {
    path: '',
    component: MainLayoutComponent,
    resolve: { settingsLoaded: storeSettingsResolver },
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/home/pages/home-page/home-page.component').then(
            (m) => m.HomePageComponent,
          ),
      },
      {
        path: 'products',
        loadComponent: () =>
          import('./features/products/pages/products-page/products-page.component').then(
            (m) => m.ProductsPageComponent,
          ),
      },
      {
        path: 'products/:slug',
        loadComponent: () =>
          import('./features/product-details/pages/product-details-page/product-details-page.component').then(
            (m) => m.ProductDetailsPageComponent,
          ),
      },
      {
        path: 'cart',
        loadComponent: () =>
          import('./features/cart/pages/cart-page/cart-page.component').then(
            (m) => m.CartPageComponent,
          ),
      },
      {
        path: 'track',
        loadComponent: () =>
          import('./features/order-tracking/pages/order-tracking-page/order-tracking-page.component').then(
            (m) => m.OrderTrackingPageComponent,
          ),
      },
      {
        path: 'orders',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/orders/pages/orders-page/orders-page.component').then(
            (m) => m.OrdersPageComponent,
          ),
      },
      {
        path: 'login',
        canActivate: [guestGuard],
        loadComponent: () =>
          import('./features/auth/login/login-page/login-page.component').then(
            (m) => m.LoginPageComponent,
          ),
      },
      {
        path: 'register',
        canActivate: [guestGuard],
        loadComponent: () =>
          import('./features/auth/register/register-page/register-page.component').then(
            (m) => m.RegisterPageComponent,
          ),
      },
      {
        path: 'about',
        loadComponent: () =>
          import('./features/about/pages/about-page/about-page.component').then(
            (m) => m.AboutPageComponent,
          ),
      },
      {
        path: 'contact',
        loadComponent: () =>
          import('./features/contact/pages/contact-page/contact-page.component').then(
            (m) => m.ContactPageComponent,
          ),
      },
      {
        path: 'not-found',
        loadComponent: () =>
          import('./features/not-found/pages/not-found-page/not-found-page.component').then(
            (m) => m.NotFoundPageComponent,
          ),
      },
      {
        path: '**',
        loadComponent: () =>
          import('./features/not-found/pages/not-found-page/not-found-page.component').then(
            (m) => m.NotFoundPageComponent,
          ),
      },
    ],
  },
];
