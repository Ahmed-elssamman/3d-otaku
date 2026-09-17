import {
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { AuthService } from '@core/services/auth.service';
import { SeoService } from '@core/services/seo.service';
import { ApiErrorResponse } from '@core/models/api-response.model';
import { LOGIN_DEFAULT_VALUES } from '../login.control';
import { getAccountDestination, getSafeReturnUrl } from '@core/utils/auth-navigation.util';
import { ACCOUNT_BENEFITS, AuthAction, AuthReturnQueryParams } from '../../auth.control';
import { authErrorMessage, fieldError } from '../../auth-form.util';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.scss',
})
export class LoginPageComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private seoService = inject(SeoService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);
  private formElement = viewChild<ElementRef<HTMLFormElement>>('formElement');

  loginForm = this.fb.nonNullable.group({
    email: [
      LOGIN_DEFAULT_VALUES.email,
      [Validators.required, Validators.email, Validators.maxLength(254)],
    ],
    password: [LOGIN_DEFAULT_VALUES.password, Validators.required],
  });
  private formState = toSignal(this.loginForm.events, { initialValue: null });
  benefits = ACCOUNT_BENEFITS;
  isSubmitting = signal(false);
  errorMessage = signal('');
  showPassword = signal(false);
  passwordType = computed(() => (this.showPassword() ? 'text' : 'password'));
  passwordToggleLabel = computed(() =>
    this.showPassword() ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور',
  );
  returnUrl = signal('');
  returnUrlQueryParams = computed<AuthReturnQueryParams>(() =>
    this.returnUrl() ? { returnUrl: this.returnUrl() } : {},
  );
  fieldErrors = computed(() => {
    this.formState();
    return {
      email: fieldError(this.loginForm.controls.email, 'أدخل بريدًا إلكترونيًا صحيحًا.'),
      password: fieldError(this.loginForm.controls.password, 'أدخل كلمة المرور.'),
    };
  });

  ngOnInit(): void {
    this.returnUrl.set(getSafeReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl')));
    this.seoService.setTitle('تسجيل الدخول');
    this.seoService.setMetaDescription(
      'سجّل الدخول إلى حسابك في 3D Otaku لمراجعة طلبات المنتجات المطبوعة ثلاثية الأبعاد داخل مصر.',
    );
  }

  togglePassword(): void {
    this.showPassword.update((value) => !value);
  }

  onSubmit(): void {
    if (this.isSubmitting()) return;
    this.loginForm.controls.email.setValue(this.loginForm.controls.email.value.trim());
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      this.formElement()
        ?.nativeElement.querySelector<HTMLInputElement>('input.ng-invalid')
        ?.focus();
      return;
    }
    this.isSubmitting.set(true);
    this.errorMessage.set('');
    const payload = this.loginForm.getRawValue();
    this.authService
      .login(payload)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isSubmitting.set(false)),
      )
      .subscribe({
        next: () =>
          void this.router.navigateByUrl(
            getAccountDestination(this.returnUrl(), this.authService.isAdmin()),
          ),
        error: (error: ApiErrorResponse) =>
          this.errorMessage.set(authErrorMessage(error, AuthAction.Login)),
      });
  }
}
