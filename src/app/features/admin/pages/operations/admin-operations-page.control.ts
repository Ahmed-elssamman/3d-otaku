import { AdminOperationSort } from '../../enums/admin-operation.enum';

export interface AdminSortOption {
  value: AdminOperationSort;
  label: string;
}

export const ADMIN_OPERATION_SORT_OPTIONS: AdminSortOption[] = [
  { value: AdminOperationSort.Newest, label: 'الأحدث أولًا' },
  { value: AdminOperationSort.Oldest, label: 'الأقدم أولًا' },
];
