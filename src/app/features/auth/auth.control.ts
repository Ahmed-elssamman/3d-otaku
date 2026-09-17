export enum AuthAction {
  Login = 'login',
  Register = 'register',
}

export interface AuthReturnQueryParams {
  returnUrl?: string;
}

export interface AccountBenefit {
  icon: string;
  title: string;
  description: string;
}

export const ACCOUNT_BENEFITS: AccountBenefit[] = [
  {
    icon: 'pi pi-box',
    title: 'طلباتك في مكان واحد',
    description: 'راجع تفاصيل الطلبات المسجلة بحسابك وحالتها.',
  },
  {
    icon: 'pi pi-map-marker',
    title: 'قطع مطبوعة داخل مصر',
    description: 'منتجات ملموسة للبيت والمكتب والهدايا. التوصيل داخل مصر فقط.',
  },
];
