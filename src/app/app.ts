import { Component, DestroyRef, Injector, afterNextRender, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from './core/services/auth.service';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, take } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private auth = inject(AuthService);
  private destroyRef = inject(DestroyRef);
  private router = inject(Router);
  private injector = inject(Injector);

  constructor() {
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        take(1),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        afterNextRender(
          () => {
            if (!this.auth.currentUser()) {
              this.auth.loadCurrentUser().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
            }
          },
          { injector: this.injector },
        );
      });
  }
}
