import { Component, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ADMIN_NAV_ITEMS, AdminNavItem } from '../data/admin-navigation.data';

@Component({
  selector: 'app-admin-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './admin-sidebar.component.html',
  styleUrl: './admin-sidebar.component.scss',
})
export class AdminSidebarComponent {
  isOpen = input.required<boolean>();
  navItems: AdminNavItem[] = ADMIN_NAV_ITEMS;
  logout = output<void>();
  closeMobile = output<void>();

  requestClose(): void {
    this.closeMobile.emit();
  }

  requestLogout(): void {
    this.logout.emit();
  }
}
