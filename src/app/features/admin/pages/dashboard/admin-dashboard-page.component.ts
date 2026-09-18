import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { EMPTY, Subject, catchError, finalize, startWith, switchMap, tap } from 'rxjs';
import { AdminDashboardService } from '../../services/admin-dashboard.service';
import { AdminDashboardStats } from '../../models/admin-dashboard.model';
import { ADMIN_DASHBOARD_LINKS, buildDashboardCards } from './admin-dashboard-page.control';

@Component({
  selector: 'app-admin-dashboard-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './admin-dashboard-page.component.html',
  styleUrl: './admin-dashboard-page.component.scss',
})
export class AdminDashboardPageComponent {
  private service = inject(AdminDashboardService);
  private destroyRef = inject(DestroyRef);
  private reload = new Subject<void>();
  stats = signal<AdminDashboardStats | null>(null);
  isLoading = signal(true);
  loadError = signal('');
  links = ADMIN_DASHBOARD_LINKS;
  cards = computed(() => {
    const stats = this.stats();
    return stats ? buildDashboardCards(stats) : [];
  });

  constructor() {
    this.reload
      .pipe(
        startWith(null),
        switchMap(() => {
          this.isLoading.set(true);
          this.loadError.set('');
          return this.service.getStats().pipe(
            tap((response) => this.stats.set(response.data)),
            catchError(() => {
              this.stats.set(null);
              this.loadError.set('تعذّر تحميل ملخص المتجر. أعد المحاولة لعرض الأرقام الحالية.');
              return EMPTY;
            }),
            finalize(() => this.isLoading.set(false)),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  refresh(): void {
    this.reload.next();
  }
}
