import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '@core/services/auth.service';
import { SeoService } from '@core/services/seo.service';
import { LOGIN_DEFAULT_VALUES } from '../login.control';
import { getSafeReturnUrl } from '@core/utils/auth-navigation.util';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.scss'
})
export class LoginPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly seoService = inject(SeoService);
  private readonly router = inject(Router);
  private route = inject(ActivatedRoute);

  readonly loginForm: FormGroup = this.fb.group({
    email: [LOGIN_DEFAULT_VALUES.email, [Validators.required, Validators.email]],
    password: [LOGIN_DEFAULT_VALUES.password, [Validators.required, Validators.minLength(6)]],
    rememberMe: [LOGIN_DEFAULT_VALUES.rememberMe]
  });

  readonly isSubmitting = signal<boolean>(false);
  readonly errorMessage = signal<string>('');
  returnUrl = signal<string>('');
  returnUrlQueryParams = computed<Record<string, string>>(() => {
    const returnUrl = this.returnUrl();
    const queryParams: Record<string, string> = {};
    if (returnUrl) {
      queryParams['returnUrl'] = returnUrl;
    }
    return queryParams;
  });

  ngOnInit(): void {
    this.returnUrl.set(getSafeReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl')));
    this.seoService.setTitle('Login - 3D Otaku Account');
    this.seoService.setMetaDescription('Log in to your 3D Otaku account to track custom 3D printing orders and anime collectibles.');
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    const email = this.loginForm.value.email ?? '';
    const password = this.loginForm.value.password ?? '';

    this.authService.login({ email, password }).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        const fallbackUrl = this.authService.isAdmin() ? '/admin/dashboard' : '/products';
        const requestedUrl = this.returnUrl();
        const canOpenRequestedUrl = requestedUrl && (!requestedUrl.startsWith('/admin') || this.authService.isAdmin());
        void this.router.navigateByUrl(canOpenRequestedUrl ? requestedUrl : fallbackUrl);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err?.message || 'Unable to sign in with those credentials.');
      }
    });
  }
}
