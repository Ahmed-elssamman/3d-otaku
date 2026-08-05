import { Component, DestroyRef, inject, signal } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Toast } from 'primeng/toast';
import { AdminConfirmDialogComponent } from '../components/admin-confirm-dialog.component';
import { AdminSidebarComponent } from './admin-sidebar.component';
import { AdminTopbarComponent } from './admin-topbar.component';
import { AuthService } from '@core/services/auth.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, Toast, AdminConfirmDialogComponent, AdminSidebarComponent, AdminTopbarComponent],
  providers: [ConfirmationService, MessageService],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.scss'
})
export class AdminLayoutComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);
  private destroyRef = inject(DestroyRef);

  sidebarOpen = signal<boolean>(false);
  pageTitle = signal<string>('Dashboard');
  adminName = signal<string>(this.authService.currentUser()?.fullName ?? '3D Otaku Admin');

  constructor() {
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        let activeRoute = this.route;
        while (activeRoute.firstChild) {
          activeRoute = activeRoute.firstChild;
        }

        const title = activeRoute.snapshot.data['title'];
        this.pageTitle.set(typeof title === 'string' ? title : 'Dashboard');
      });
  }

  toggleSidebar(): void {
    this.sidebarOpen.update(value => !value);
  }

  closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
