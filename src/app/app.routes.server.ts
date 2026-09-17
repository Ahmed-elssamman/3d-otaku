import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  { path: 'admin/**', renderMode: RenderMode.Client },
  { path: 'cart', renderMode: RenderMode.Client },
  {
    path: 'track',
    renderMode: RenderMode.Client,
    headers: { 'X-Robots-Tag': 'noindex, noarchive', 'Cache-Control': 'no-store' },
  },
  { path: 'orders', renderMode: RenderMode.Client },
  { path: 'login', renderMode: RenderMode.Client },
  { path: 'register', renderMode: RenderMode.Client },
  { path: '**', renderMode: RenderMode.Server },
];
