import { Component, signal, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { NAV_ITEMS, NavItem } from './app-header.control';
import { AuthService } from '@core/services/auth.service';
import { CartService } from '@core/services/cart.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './app-header.component.html',
  styleUrl: './app-header.component.scss'
})
export class AppHeaderComponent {
  readonly authService = inject(AuthService);
  readonly cartService = inject(CartService);
  private readonly router = inject(Router);

  readonly navItems: NavItem[] = NAV_ITEMS;
  readonly isMobileMenuOpen = signal<boolean>(false);
  readonly cartItemCount = this.cartService.itemCount;

  toggleMobileMenu(): void {
    this.isMobileMenuOpen.update(val => !val);
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen.set(false);
  }

  onLogout(): void {
    this.authService.logout();
    this.closeMobileMenu();
    this.router.navigate(['/']);
  }
}
