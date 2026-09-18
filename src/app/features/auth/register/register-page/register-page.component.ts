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
import { REGISTER_DEFAULT_VALUES, REGISTER_PASSWORD_PATTERN } from '../register.control';
import { getAccountDestination, getSafeReturnUrl } from '@core/utils/auth-navigation.util';
import { ACCOUNT_BENEFITS, AuthAction, AuthReturnQueryParams } from '../../auth.control';
import { authErrorMessage, fieldError } from '../../auth-form.util';

@Component({
  selector: 'app-register-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register-page.component.html',
  styleUrl: './register-page.component.scss',
})
export class RegisterPageComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private seoService = inject(SeoService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);
  private formElement = viewChild<ElementRef<HTMLFormElement>>('formElement');

  registerForm = this.fb.nonNullable.group({
    fullName: [
      REGISTER_DEFAULT_VALUES.fullName,
      [Validators.required, Validators.minLength(2), Validators.maxLength(100)],
    ],
    email: [
      REGISTER_DEFAULT_VALUES.email,
      [Validators.required, Validators.email, Validators.maxLength(254)],
    ],
    password: [
      REGISTER_DEFAULT_VALUES.password,
      [Validators.required, Validators.pattern(REGISTER_PASSWORD_PATTERN)],
    ],
    confirmPassword: [REGISTER_DEFAULT_VALUES.confirmPassword, Validators.required],
  });
  private formState = toSignal(this.registerForm.events, { initialValue: null });
  benefits = ACCOUNT_BENEFITS;
  isSubmitting = signal(false);
  errorMessage = signal('');
  showPassword = signal(false);
  passwordType = computed(() => (this.showPassword() ? 'text' : 'password'));
  passwordToggleLabel = computed(() =>
    this.showPassword() ? 'إخفاء كلمتي المرور' : 'إظهار كلمتي المرور',
  );
  returnUrl = signal('');
  returnUrlQueryParams = computed<AuthReturnQueryParams>(() =>
    this.returnUrl() ? { returnUrl: this.returnUrl() } : {},
  );
  fieldErrors = computed(() => {
    this.formState();
    const fields = this.registerForm.controls;
    const mismatch =
      fields.confirmPassword.touched && fields.password.value !== fields.confirmPassword.value;
    return {
      fullName: fieldError(fields.fullName, 'أدخل اسمًا من حرفين إلى ١٠٠ حرف.'),
      email: fieldError(fields.email, 'أدخل بريدًا إلكترونيًا صحيحًا.'),
      password: fieldError(
        fields.password,
        'استخدم ٨ إلى ١٢٨ حرفًا، بينها حرف إنجليزي كبير وصغير ورقم.',
      ),
      confirmPassword: mismatch
        ? 'كلمتا المرور غير متطابقتين.'
        : fieldError(fields.confirmPassword, 'أعد إدخال كلمة المرور.'),
    };
  });

  ngOnInit(): void {
    this.returnUrl.set(getSafeReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl')));
    this.seoService.setTitle('إنشاء حساب');
    this.seoService.setMetaDescription(
      'أنشئ حسابك في 3D Otaku لطلب قطع مطبوعة ثلاثية الأبعاد ومراجعة طلباتك داخل مصر.',
    );
  }

  togglePassword(): void {
    this.showPassword.update((value) => !value);
  }

  onSubmit(): void {
    if (this.isSubmitting()) return;
    this.registerForm.patchValue({
      fullName: this.registerForm.controls.fullName.value.trim(),
      email: this.registerForm.controls.email.value.trim(),
    });
    this.registerForm.markAllAsTouched();
    const payload = this.registerForm.getRawValue();
    if (this.registerForm.invalid || payload.password !== payload.confirmPassword) {
      this.formElement()
        ?.nativeElement.querySelector<HTMLInputElement>(
          'input.ng-invalid, #register-confirm-password',
        )
        ?.focus();
      return;
    }
    this.isSubmitting.set(true);
    this.errorMessage.set('');
    this.authService
      .register(payload)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isSubmitting.set(false)),
      )
      .subscribe({
        next: () => void this.router.navigateByUrl(getAccountDestination(this.returnUrl(), false)),
        error: (error: ApiErrorResponse) =>
          this.errorMessage.set(authErrorMessage(error, AuthAction.Register)),
      });
  }
}
