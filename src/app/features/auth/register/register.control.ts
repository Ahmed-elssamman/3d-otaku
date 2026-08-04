export interface RegisterFormModel {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
}

export const REGISTER_DEFAULT_VALUES: RegisterFormModel = {
  fullName: '',
  email: '',
  password: '',
  confirmPassword: '',
  acceptTerms: false
};
