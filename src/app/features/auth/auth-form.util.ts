import { FormControl } from '@angular/forms';
import { ApiErrorResponse } from '@core/models/api-response.model';
import { AuthAction } from './auth.control';

export function fieldError(control: FormControl<string>, message: string): string {
  return control.touched && control.invalid ? message : '';
}

export function authErrorMessage(error: ApiErrorResponse, action: AuthAction): string {
  switch (error.statusCode) {
    case 0:
      return 'تعذّر الاتصال بالمتجر. تحقق من اتصالك بالإنترنت وحاول مرة أخرى.';
    case 401:
      return 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
    case 409:
      return 'هذا البريد مسجل بالفعل. يمكنك تسجيل الدخول بحسابك.';
    case 429:
      return 'محاولات كثيرة في وقت قصير. انتظر قليلًا ثم حاول مرة أخرى.';
    case 400:
    case 422:
      return 'راجع البيانات المدخلة ثم حاول مرة أخرى.';
    default:
      return action === AuthAction.Login
        ? 'تعذّر تسجيل الدخول الآن. حاول مرة أخرى بعد قليل.'
        : 'تعذّر إنشاء الحساب الآن. حاول مرة أخرى بعد قليل.';
  }
}
