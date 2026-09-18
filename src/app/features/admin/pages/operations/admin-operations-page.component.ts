import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { EMPTY, Subject, catchError, finalize, startWith, switchMap, tap } from 'rxjs';
import { ApiErrorResponse, ApiMeta } from '@core/models/api-response.model';
import { AdminOperationsService } from '../../services/admin-operations.service';
import {
  ADMIN_OPERATIONS_META,
  ADMIN_OPERATION_CONFIG,
  ADMIN_OPERATION_PAGE_SIZES,
} from '../../data/admin-operations.data';
import {
  AdminOperationKind,
  AdminOperationSort,
  AdminOperationStatus,
} from '../../enums/admin-operation.enum';
import {
  AdminOperationDetail,
  AdminOperationQuery,
  AdminOperationStatusRequest,
  AdminOperationSummary,
} from '../../models/admin-operation.model';
import { ADMIN_OPERATION_SORT_OPTIONS } from './admin-operations-page.control';
import { AdminOrderShippingComponent } from '../../components/order-shipping/admin-order-shipping.component';
import { AdminOrderPaymentsComponent } from '../../components/order-payments/admin-order-payments.component';
import { AdminOrderManufacturingComponent } from '../../components/order-manufacturing/admin-order-manufacturing.component';
import { OrderItemConfigurationComponent } from '@shared/components/order-item-configuration/order-item-configuration.component';
import { preserveAdminManufacturingDetail } from '../../utils/admin-order-manufacturing.util';

@Component({
  selector: 'app-admin-operations-page',
  standalone: true,
  imports: [
    DatePipe,
    DecimalPipe,
    ReactiveFormsModule,
    AdminOrderShippingComponent,
    AdminOrderPaymentsComponent,
    AdminOrderManufacturingComponent,
    OrderItemConfigurationComponent,
  ],
  templateUrl: './admin-operations-page.component.html',
  styleUrl: './admin-operations-page.component.scss',
})
export class AdminOperationsPageComponent {
  private route = inject(ActivatedRoute);
  private service = inject(AdminOperationsService);
  private destroyRef = inject(DestroyRef);
  private listRequests = new Subject<AdminOperationQuery>();
  private detailRequests = new Subject<string>();
  private kind = this.route.snapshot.data['operationKind'] as AdminOperationKind;

  config = ADMIN_OPERATION_CONFIG[this.kind];
  pageSizes = ADMIN_OPERATION_PAGE_SIZES;
  sortOptions = ADMIN_OPERATION_SORT_OPTIONS;
  searchControl = new FormControl('', { nonNullable: true });
  filterControl = new FormControl<AdminOperationStatus | null>(null);
  limitControl = new FormControl(10, { nonNullable: true });
  sortControl = new FormControl(AdminOperationSort.Newest, { nonNullable: true });
  nextStatusControl = new FormControl<AdminOperationStatus | null>(null);
  noteControl = new FormControl('', { nonNullable: true });
  filtersForm = new FormGroup({
    search: this.searchControl,
    status: this.filterControl,
    limit: this.limitControl,
    sort: this.sortControl,
  });
  statusForm = new FormGroup({ status: this.nextStatusControl, note: this.noteControl });
  private nextStatus = toSignal(this.nextStatusControl.valueChanges, { initialValue: null });
  private note = toSignal(this.noteControl.valueChanges, { initialValue: '' });

  records = signal<AdminOperationSummary[]>([]);
  meta = signal<ApiMeta>({ ...ADMIN_OPERATIONS_META });
  isLoading = signal(true);
  loadError = signal('');
  selected = signal<AdminOperationDetail | null>(null);
  selectedId = signal('');
  isLoadingDetail = signal(false);
  detailError = signal('');
  isSaving = signal(false);
  isShippingBusy = signal(false);
  hasShippingDraft = signal(false);
  hasShippingConflict = signal(false);
  isPaymentBusy = signal(false);
  hasPaymentDraft = signal(false);
  hasPaymentConflict = signal(false);
  isOperationBusy = computed(
    () => this.isSaving() || this.isShippingBusy() || this.isPaymentBusy(),
  );
  navigationLocked = computed(
    () => this.isOperationBusy() || this.hasShippingDraft() || this.hasPaymentDraft(),
  );
  statusLocked = computed(
    () => this.navigationLocked() || this.hasShippingConflict() || this.hasPaymentConflict(),
  );
  actionError = signal('');
  successMessage = signal('');
  staleDetail = signal(false);
  shippingDisabled = computed(
    () =>
      this.isSaving() ||
      this.staleDetail() ||
      this.isPaymentBusy() ||
      this.hasPaymentDraft() ||
      this.hasPaymentConflict(),
  );
  paymentDisabled = computed(
    () =>
      this.isSaving() ||
      this.staleDetail() ||
      this.isShippingBusy() ||
      this.hasShippingDraft() ||
      this.hasShippingConflict(),
  );
  shippingRecoveryDisabled = computed(() => this.isSaving() || this.isPaymentBusy());
  paymentRecoveryDisabled = computed(() => this.isSaving() || this.isShippingBusy());
  confirmRequested = signal(false);
  hasNote = this.kind !== AdminOperationKind.Messages;
  selectedStatusLabel = computed(
    () =>
      this.selected()?.nextStatuses.find((option) => option.value === this.nextStatus())?.label ||
      '',
  );
  canSave = computed(
    () =>
      Boolean(this.selectedStatusLabel()) &&
      !this.statusLocked() &&
      !this.staleDetail() &&
      this.note().length <= 1000,
  );
  canPrevious = computed(
    () =>
      this.meta().hasPreviousPage &&
      !this.isLoading() &&
      !this.navigationLocked() &&
      !this.loadError(),
  );
  canNext = computed(
    () =>
      this.meta().hasNextPage && !this.isLoading() && !this.navigationLocked() && !this.loadError(),
  );
  pageCount = computed(() => Math.max(1, this.meta().totalPages));

  constructor() {
    this.listRequests
      .pipe(
        startWith(this.currentQuery(1)),
        switchMap((query) => {
          this.isLoading.set(true);
          this.loadError.set('');
          return this.service.getList(this.kind, query).pipe(
            tap((response) => {
              this.records.set(response.data);
              this.meta.set(response.meta);
            }),
            catchError(() => {
              this.records.set([]);
              this.loadError.set('تعذّر تحميل القائمة. تحقق من الاتصال ثم أعد المحاولة.');
              return EMPTY;
            }),
            finalize(() => this.isLoading.set(false)),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();

    this.detailRequests
      .pipe(
        switchMap((id) => {
          this.isLoadingDetail.set(true);
          this.detailError.set('');
          return this.service.getDetail(this.kind, id).pipe(
            tap((response) => {
              this.selected.set(response.data);
              this.staleDetail.set(false);
              requestAnimationFrame(() =>
                document.getElementById('operation-detail-title')?.focus(),
              );
            }),
            catchError(() => {
              this.detailError.set(
                'تعذّر تحميل التفاصيل. قد يكون السجل غير متاح أو الاتصال منقطعًا.',
              );
              return EMPTY;
            }),
            finalize(() => this.isLoadingDetail.set(false)),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();

    this.nextStatusControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.confirmRequested.set(false));
    this.noteControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.confirmRequested.set(false));
  }

  applyFilters(): void {
    if (this.navigationLocked()) return;
    this.listRequests.next(this.currentQuery(1));
  }

  resetFilters(): void {
    if (this.navigationLocked()) return;
    this.searchControl.setValue('');
    this.filterControl.reset(null);
    this.sortControl.setValue(AdminOperationSort.Newest);
    this.applyFilters();
  }

  retryList(): void {
    if (this.navigationLocked()) return;
    this.listRequests.next(this.currentQuery(this.meta().page));
  }

  previousPage(): void {
    if (this.canPrevious()) this.listRequests.next(this.currentQuery(this.meta().page - 1));
  }

  nextPage(): void {
    if (this.canNext()) this.listRequests.next(this.currentQuery(this.meta().page + 1));
  }

  openDetail(id: string): void {
    if (this.navigationLocked()) return;
    this.hasShippingConflict.set(false);
    this.hasShippingDraft.set(false);
    this.isShippingBusy.set(false);
    this.hasPaymentConflict.set(false);
    this.hasPaymentDraft.set(false);
    this.isPaymentBusy.set(false);
    this.selectedId.set(id);
    this.selected.set(null);
    this.nextStatusControl.reset(null);
    this.noteControl.setValue('');
    this.actionError.set('');
    this.successMessage.set('');
    this.confirmRequested.set(false);
    this.detailRequests.next(id);
  }

  retryDetail(): void {
    this.openDetail(this.selectedId());
  }

  closeDetail(): void {
    if (this.navigationLocked()) return;
    const id = this.selectedId();
    this.selectedId.set('');
    this.selected.set(null);
    this.hasShippingConflict.set(false);
    this.detailError.set('');
    this.hasPaymentConflict.set(false);
    requestAnimationFrame(() => document.getElementById(`operation-${id}`)?.focus());
  }

  requestConfirmation(): void {
    if (this.canSave()) this.confirmRequested.set(true);
  }

  cancelConfirmation(): void {
    this.confirmRequested.set(false);
  }

  shippingBusyChanged(value: boolean): void {
    this.isShippingBusy.set(value);
    if (value) this.confirmRequested.set(false);
  }

  shippingDraftChanged(value: boolean): void {
    this.hasShippingDraft.set(value);
    if (value) this.confirmRequested.set(false);
  }

  shippingStaleChanged(value: boolean): void {
    this.hasShippingConflict.set(value);
    if (value) this.confirmRequested.set(false);
  }

  orderUpdated(detail: AdminOperationDetail): void {
    if (detail.id !== this.selectedId()) return;
    this.selected.set(preserveAdminManufacturingDetail(this.selected(), detail));
    this.confirmRequested.set(false);
    this.staleDetail.set(false);
    this.actionError.set('');
    this.listRequests.next(this.currentQuery(this.meta().page));
  }

  paymentBusyChanged(value: boolean): void {
    this.isPaymentBusy.set(value);
    if (value) this.confirmRequested.set(false);
  }

  paymentDraftChanged(value: boolean): void {
    this.hasPaymentDraft.set(value);
    if (value) this.confirmRequested.set(false);
  }

  paymentStaleChanged(value: boolean): void {
    this.hasPaymentConflict.set(value);
    if (value) this.confirmRequested.set(false);
  }

  saveStatus(): void {
    const detail = this.selected();
    const status = this.nextStatus();
    if (!detail || !status || !this.canSave() || !this.confirmRequested()) return;
    const request: AdminOperationStatusRequest = { status, expectedStatus: detail.status };
    if (this.kind === AdminOperationKind.Orders) request.publicNote = this.note().trim();
    if (this.kind === AdminOperationKind.CustomOrders) request.note = this.note().trim();
    this.isSaving.set(true);
    this.actionError.set('');
    this.successMessage.set('');
    this.service
      .updateStatus(this.kind, detail.id, request)
      .pipe(
        finalize(() => this.isSaving.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          this.selected.set(preserveAdminManufacturingDetail(this.selected(), response.data));
          this.nextStatusControl.reset(null);
          this.noteControl.setValue('');
          this.confirmRequested.set(false);
          this.successMessage.set('تم حفظ الحالة وتحديث سجل المتابعة.');
          this.listRequests.next(this.currentQuery(1));
        },
        error: (error: ApiErrorResponse) => {
          this.confirmRequested.set(false);
          this.staleDetail.set(true);
          this.actionError.set(
            error.statusCode === 409
              ? 'تغيّرت الحالة بواسطة جلسة أخرى. أعد تحميل التفاصيل قبل التعديل.'
              : 'لم يتم تأكيد حفظ التغيير. أعد تحميل التفاصيل للتحقق من الحالة ثم حاول مجددًا.',
          );
        },
      });
  }

  private currentQuery(page: number): AdminOperationQuery {
    return {
      page,
      limit: this.limitControl.value,
      search: this.searchControl.value.trim(),
      status: this.filterControl.value,
      sort: this.sortControl.value,
    };
  }
}
