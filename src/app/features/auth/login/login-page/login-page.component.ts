import { Component, inject, signal, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '@core/services/auth.service';
import { SeoService } from '@core/services/seo.service';
import { LOGIN_DEFAULT_VALUES } from '../login.control';

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

  readonly loginForm: FormGroup = this.fb.group({
    email: [LOGIN_DEFAULT_VALUES.email, [Validators.required, Validators.email]],
    password: [LOGIN_DEFAULT_VALUES.password, [Validators.required, Validators.minLength(6)]],
    rememberMe: [LOGIN_DEFAULT_VALUES.rememberMe]
  });

  readonly isSubmitting = signal<boolean>(false);
  readonly errorMessage = signal<string>('');

  ngOnInit(): void {
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
        this.router.navigate([this.authService.isAdmin() ? '/admin/dashboard' : '/products']);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err?.message || 'Unable to sign in with those credentials.');
      }
    });
  }
}
