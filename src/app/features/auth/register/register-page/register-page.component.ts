import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { AuthService } from '@core/services/auth.service';
import { SeoService } from '@core/services/seo.service';
import { REGISTER_DEFAULT_VALUES } from '../register.control';
import { getSafeReturnUrl } from '@core/utils/auth-navigation.util';

@Component({
  selector: 'app-register-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register-page.component.html',
  styleUrl: './register-page.component.scss'
})
export class RegisterPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly seoService = inject(SeoService);
  private readonly router = inject(Router);
  private route = inject(ActivatedRoute);

  readonly registerForm: FormGroup = this.fb.group({
    fullName: [REGISTER_DEFAULT_VALUES.fullName, [Validators.required, Validators.minLength(3)]],
    email: [REGISTER_DEFAULT_VALUES.email, [Validators.required, Validators.email]],
    password: [REGISTER_DEFAULT_VALUES.password, [Validators.required, Validators.minLength(6)]],
    confirmPassword: [REGISTER_DEFAULT_VALUES.confirmPassword, [Validators.required]],
    acceptTerms: [REGISTER_DEFAULT_VALUES.acceptTerms, [Validators.requiredTrue]]
  }, { validators: this.passwordMatchValidator });

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
    this.seoService.setTitle('Register - Join 3D Otaku Guild');
    this.seoService.setMetaDescription('Create a free 3D Otaku account to order custom 3D anime props, save favorites, and track printing builds.');
  }

  private passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password')?.value;
    const confirm = control.get('confirmPassword')?.value;
    return password && confirm && password !== confirm ? { passwordMismatch: true } : null;
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    const fullName = this.registerForm.value.fullName ?? '';
    const email = this.registerForm.value.email ?? '';
    const password = this.registerForm.value.password ?? '';
    const confirmPassword = this.registerForm.value.confirmPassword ?? '';

    this.authService.register({ fullName, email, password, confirmPassword }).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        const requestedUrl = this.returnUrl();
        const destinationUrl = requestedUrl && !requestedUrl.startsWith('/admin') ? requestedUrl : '/products';
        void this.router.navigateByUrl(destinationUrl);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err?.message || 'Unable to register account. Please try again.');
      }
    });
  }
}
