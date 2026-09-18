import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  signal,
  inject,
  viewChild,
} from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { NAV_ITEMS } from './app-header.control';
import { AuthService } from '@core/services/auth.service';
import { CartService } from '@core/services/cart.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './app-header.component.html',
  styleUrl: './app-header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppHeaderComponent {
  authService = inject(AuthService);
  private cartService = inject(CartService);
  private router = inject(Router);
  private menuButton = viewChild<ElementRef<HTMLButtonElement>>('menuButton');
  navItems = NAV_ITEMS;
  isMobileMenuOpen = signal(false);
  searchTerm = signal('');
  cartItemCount = this.cartService.itemCount;
  cartLabel = computed(() => 'سلة التسوق، ' + this.cartItemCount() + ' قطعة');
  menuLabel = computed(() => (this.isMobileMenuOpen() ? 'إغلاق القائمة' : 'فتح القائمة'));
  menuIcon = computed(() => (this.isMobileMenuOpen() ? 'pi pi-times' : 'pi pi-bars'));
  accountLink = computed(() => (this.authService.isAdmin() ? '/admin/dashboard' : '/orders'));
  accountLabel = computed(() => (this.authService.isAdmin() ? 'إدارة المتجر' : 'طلباتي'));

  toggleMobileMenu(): void {
    this.isMobileMenuOpen.update((value) => !value);
  }
  closeMobileMenu(): void {
    this.isMobileMenuOpen.set(false);
  }
  onMenuEscape(): void {
    this.closeMobileMenu();
    this.menuButton()?.nativeElement.focus();
  }
  onSearchInput(event: Event): void {
    if (event.target instanceof HTMLInputElement) this.searchTerm.set(event.target.value);
  }
  search(event: Event): void {
    event.preventDefault();
    const search = this.searchTerm().trim();
    this.closeMobileMenu();
    this.router.navigate(['/products'], { queryParams: search ? { search } : {} });
  }
  onLogout(): void {
    this.authService.logout();
    this.closeMobileMenu();
    this.router.navigate(['/']);
  }
}
