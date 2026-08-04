import { Component, inject, signal, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { AuthService } from '@core/services/auth.service';
import { SeoService } from '@core/services/seo.service';
import { REGISTER_DEFAULT_VALUES } from '../register.control';

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

  readonly registerForm: FormGroup = this.fb.group({
    fullName: [REGISTER_DEFAULT_VALUES.fullName, [Validators.required, Validators.minLength(3)]],
    email: [REGISTER_DEFAULT_VALUES.email, [Validators.required, Validators.email]],
    password: [REGISTER_DEFAULT_VALUES.password, [Validators.required, Validators.minLength(6)]],
    confirmPassword: [REGISTER_DEFAULT_VALUES.confirmPassword, [Validators.required]],
    acceptTerms: [REGISTER_DEFAULT_VALUES.acceptTerms, [Validators.requiredTrue]]
  }, { validators: this.passwordMatchValidator });

  readonly isSubmitting = signal<boolean>(false);
  readonly errorMessage = signal<string>('');

  ngOnInit(): void {
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

    setTimeout(() => {
      const { fullName, email } = this.registerForm.value;
      this.authService.register(fullName, email);
      this.isSubmitting.set(false);
      this.router.navigate(['/products']);
    }, 600);
  }
}
