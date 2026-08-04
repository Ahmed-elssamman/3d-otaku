export interface LoginFormModel {
  email: string;
  password: string;
  rememberMe: boolean;
}

export const LOGIN_DEFAULT_VALUES: LoginFormModel = {
  email: '',
  password: '',
  rememberMe: true
};
