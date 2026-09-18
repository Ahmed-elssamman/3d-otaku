import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { AuthService } from '@core/services/auth.service';
import { AuthResponseData } from '@core/models/user.model';
import { ApiErrorResponse } from '@core/models/api-response.model';
import { LoginPageComponent } from './login/login-page/login-page.component';
import { RegisterPageComponent } from './register/register-page/register-page.component';

describe('account form submit boundaries', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [LoginPageComponent, RegisterPageComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    localStorage.clear();
  });

  it('rejects weak passwords and mismatched confirmation before registering', () => {
    const component = TestBed.createComponent(RegisterPageComponent).componentInstance;
    const register = vi.spyOn(TestBed.inject(AuthService), 'register');
    component.registerForm.setValue({
      fullName: 'Customer',
      email: 'customer@example.test',
      password: 'short',
      confirmPassword: 'short',
    });
    component.onSubmit();
    expect(register).not.toHaveBeenCalled();
    component.registerForm.patchValue({
      password: 'ValidPassword9',
      confirmPassword: 'DifferentPassword9',
    });
    component.onSubmit();
    expect(register).not.toHaveBeenCalled();
    expect(component.fieldErrors().confirmPassword).toBe('كلمتا المرور غير متطابقتين.');
  });

  it('trims registration name and email, preserves password bytes and blocks duplicate submits', () => {
    const component = TestBed.createComponent(RegisterPageComponent).componentInstance;
    const response = new Subject<AuthResponseData>();
    const register = vi.spyOn(TestBed.inject(AuthService), 'register').mockReturnValue(response);
    component.registerForm.setValue({
      fullName: '  Test Customer  ',
      email: '  customer@example.test  ',
      password: ' ValidPassword9 ',
      confirmPassword: ' ValidPassword9 ',
    });
    component.onSubmit();
    component.onSubmit();
    expect(register).toHaveBeenCalledTimes(1);
    expect(register).toHaveBeenCalledWith({
      fullName: 'Test Customer',
      email: 'customer@example.test',
      password: ' ValidPassword9 ',
      confirmPassword: ' ValidPassword9 ',
    });
    expect(component.isSubmitting()).toBe(true);
    const error: ApiErrorResponse = {
      success: false,
      message: 'Unavailable',
      statusCode: 503,
      path: '/auth/register',
      timestamp: '',
    };
    response.error(error);
    expect(component.isSubmitting()).toBe(false);
    expect(component.errorMessage()).toContain('تعذّر إنشاء الحساب');
  });

  it('trims login email without modifying the password or imposing registration rules', () => {
    const component = TestBed.createComponent(LoginPageComponent).componentInstance;
    const response = new Subject<AuthResponseData>();
    const login = vi.spyOn(TestBed.inject(AuthService), 'login').mockReturnValue(response);
    component.loginForm.setValue({ email: '  customer@example.test  ', password: ' p ' });
    component.onSubmit();
    component.onSubmit();
    expect(login).toHaveBeenCalledTimes(1);
    expect(login).toHaveBeenCalledWith({ email: 'customer@example.test', password: ' p ' });
    response.complete();
    expect(component.isSubmitting()).toBe(false);
  });
});
