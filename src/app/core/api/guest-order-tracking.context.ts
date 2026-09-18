import { HttpContextToken } from '@angular/common/http';

export const GUEST_ORDER_TRACKING = new HttpContextToken<boolean>(() => false);
