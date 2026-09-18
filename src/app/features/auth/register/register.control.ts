import { RegisterRequest } from '@core/models/user.model';

export const REGISTER_DEFAULT_VALUES: RegisterRequest = {
  fullName: '',
  email: '',
  password: '',
  confirmPassword: '',
};

export const REGISTER_PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,128}$/;
