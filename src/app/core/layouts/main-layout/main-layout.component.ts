import { Location } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { AppHeaderComponent } from '@shared/components/app-header/app-header.component';
import { AppFooterComponent } from '@shared/components/app-footer/app-footer.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, AppHeaderComponent, AppFooterComponent],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss',
})
export class MainLayoutComponent {
  private location = inject(Location);
  private router = inject(Router);
  private currentPath = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.location.path()),
    ),
    { initialValue: this.location.path() },
  );

  contentLink = computed(() =>
    this.location.prepareExternalUrl(`${this.currentPath()}#main-content`),
  );
}
