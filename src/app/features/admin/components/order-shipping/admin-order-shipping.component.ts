import { DatePipe, DecimalPipe } from '@angular/common';
import {
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule } from '@angular/forms';
import { finalize, map, merge } from 'rxjs';
import { ApiErrorResponse } from '@core/models/api-response.model';
import { AdminOperationKind } from '../../enums/admin-operation.enum';
import { AdminOperationDetail } from '../../models/admin-operation.model';
import {
  AdminOrderShippingAttempt,
  AdminOrderShippingReview,
  AdminOrderShippingSnapshot,
  UpdateAdminOrderShippingRequest,
} from '../../models/admin-order-shipping.model';
import { AdminOperationsService } from '../../services/admin-operations.service';
import {
  EMPTY_SHIPPING_FORM,
  SHIPPING_LIMITS,
  SHIPPING_MESSAGES,
  ShippingEditorState,
  createOrderShippingForm,
} from './admin-order-shipping.control';

@Component({
  selector: 'app-admin-order-shipping',
  standalone: true,
  imports: [DatePipe, DecimalPipe, ReactiveFormsModule],
  templateUrl: './admin-order-shipping.component.html',
  styleUrl: './admin-order-shipping.component.scss',
})
export class AdminOrderShippingComponent {
  private service = inject(AdminOperationsService);
  private destroyRef = inject(DestroyRef);
  order = input.required<AdminOrderShippingSnapshot>();
  disabled = input(false);
  recoveryDisabled = input(false);
  updated = output<AdminOperationDetail>();
  busyChange = output<boolean>();
  dirtyChange = output<boolean>();
  staleChange = output<boolean>();
  limits = SHIPPING_LIMITS;
  form = createOrderShippingForm();
  values = toSignal(this.form.valueChanges.pipe(map(() => this.form.getRawValue())), {
    initialValue: { ...EMPTY_SHIPPING_FORM },
  });
  private formStatus = toSignal(this.form.statusChanges, { initialValue: this.form.status });
  snapshot = signal<AdminOrderShippingSnapshot | null>(null);
  state = signal(ShippingEditorState.Editing);
  review = signal<AdminOrderShippingReview | null>(null);
  error = signal('');
  message = signal('');
  attempted = signal(false);
  feeTouched = signal(false);
  private attempt = signal<AdminOrderShippingAttempt | null>(null);
  private baselineNote = signal('');
  private activeRequest = signal(0);
  isBusy = computed(
    () =>
      this.state() === ShippingEditorState.Saving || this.state() === ShippingEditorState.Reloading,
  );
  isStale = computed(() => this.state() === ShippingEditorState.Stale);
  isSaving = computed(() => this.state() === ShippingEditorState.Saving);
  isReloading = computed(() => this.state() === ShippingEditorState.Reloading);
  isEditable = computed(() => this.snapshot()?.canConfirmShipping === true);
  fieldsDisabled = computed(() => this.disabled() || this.isBusy() || !this.isEditable());
  isDirty = computed(() => {
    const saved = this.snapshot();
    const value = this.values();
    const initialFee = saved?.deliveryFeeConfirmed ? saved.deliveryFee : null;
    return (
      value.deliveryFee !== initialFee ||
      value.note.trim() !== this.baselineNote() ||
      value.agreement
    );
  });
  feeChanged = computed(() => {
    const saved = this.snapshot();
    return (
      saved !== null &&
      (!saved.deliveryFeeConfirmed || this.values().deliveryFee !== saved.deliveryFee)
    );
  });
  canReview = computed(
    () =>
      this.isEditable() &&
      !this.disabled() &&
      !this.isBusy() &&
      !this.isStale() &&
      this.formStatus() === 'VALID' &&
      this.feeChanged(),
  );
  canConfirm = computed(() => this.review() !== null && this.canReview());
  canReload = computed(() => !this.recoveryDisabled() && !this.isBusy());
  showValidation = computed(() => this.attempted() && this.formStatus() !== 'VALID');
  feeError = computed(() => {
    this.formStatus();
    return (
      (this.attempted() || this.feeTouched() || this.values().deliveryFee !== null) &&
      this.form.controls.deliveryFee.invalid
    );
  });
  agreementError = computed(() => this.showValidation() && !this.values().agreement);
  noteError = computed(
    () => this.showValidation() && this.values().note.length > this.limits.noteLength,
  );
  unchangedConfirmed = computed(
    () => this.snapshot()?.deliveryFeeConfirmed === true && !this.feeChanged(),
  );

  constructor() {
    effect(() => {
      const order = this.order();
      untracked(() => this.receiveSnapshot(order));
    });
    effect(() => this.busyChange.emit(this.isBusy()));
    effect(() => this.dirtyChange.emit(this.isDirty()));
    effect(() => this.staleChange.emit(this.isStale()));
    merge(this.form.controls.deliveryFee.valueChanges, this.form.controls.note.valueChanges)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.form.controls.agreement.value) this.form.controls.agreement.setValue(false);
      });
    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.review.set(null);
      this.message.set('');
      if (
        this.state() === ShippingEditorState.Reviewing ||
        this.state() === ShippingEditorState.Saved
      ) {
        this.state.set(ShippingEditorState.Editing);
      }
    });
  }

  requestReview(): void {
    this.attempted.set(true);
    if (!this.canReview()) return;
    const saved = this.snapshot();
    const request = this.currentRequest();
    if (!saved || !request) return;
    const totalPiastres =
      Math.round(saved.subtotal * 100) -
      Math.round(saved.discount * 100) +
      Math.round(request.deliveryFee * 100);
    this.review.set({ request, total: totalPiastres / 100 });
    this.state.set(ShippingEditorState.Reviewing);
  }

  feeBlurred(): void {
    this.feeTouched.set(true);
  }

  cancelReview(): void {
    if (this.isBusy()) return;
    this.review.set(null);
    this.state.set(ShippingEditorState.Editing);
  }

  saveShipping(): void {
    const reviewed = this.review();
    const saved = this.snapshot();
    const request = this.currentRequest();
    if (
      !reviewed ||
      !saved ||
      !request ||
      !this.canConfirm() ||
      JSON.stringify(request) !== JSON.stringify(reviewed.request)
    )
      return;
    const previous = this.attempt();
    const attempt =
      previous && JSON.stringify(previous.request) === JSON.stringify(request)
        ? previous
        : { key: crypto.randomUUID(), request };
    this.attempt.set(attempt);
    this.activeRequest.update((value) => value + 1);
    const requestId = this.activeRequest();
    this.state.set(ShippingEditorState.Saving);
    this.error.set('');
    this.message.set('');
    this.service
      .updateShipping(saved.orderId, attempt.request, attempt.key)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          if (
            this.activeRequest() === requestId &&
            this.order().orderId === saved.orderId &&
            this.state() === ShippingEditorState.Saving
          )
            this.state.set(ShippingEditorState.Stale);
        }),
      )
      .subscribe({
        next: (response) => {
          if (this.activeRequest() !== requestId || this.order().orderId !== saved.orderId) return;
          const shipping = response.data.shipping;
          if (!shipping) {
            this.error.set(SHIPPING_MESSAGES.uncertain);
            this.state.set(ShippingEditorState.Stale);
            return;
          }
          this.snapshot.set(shipping);
          this.resetForm(shipping);
          this.attempt.set(null);
          this.state.set(ShippingEditorState.Saved);
          this.message.set(SHIPPING_MESSAGES.saved);
          this.updated.emit(response.data);
        },
        error: (error: ApiErrorResponse) => {
          if (this.activeRequest() !== requestId || this.order().orderId !== saved.orderId) return;
          this.review.set(null);
          this.form.controls.agreement.setValue(false);
          this.state.set(ShippingEditorState.Stale);
          this.error.set(this.errorMessage(error));
        },
      });
  }

  reloadOrder(): void {
    const saved = this.snapshot();
    if (!saved || !this.canReload()) return;
    this.activeRequest.update((value) => value + 1);
    const requestId = this.activeRequest();
    this.state.set(ShippingEditorState.Reloading);
    this.error.set('');
    this.message.set('');
    this.review.set(null);
    this.form.controls.agreement.setValue(false);
    this.service
      .getDetail(AdminOperationKind.Orders, saved.orderId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          if (
            this.activeRequest() === requestId &&
            this.order().orderId === saved.orderId &&
            this.state() === ShippingEditorState.Reloading
          )
            this.state.set(ShippingEditorState.Stale);
        }),
      )
      .subscribe({
        next: (response) => {
          if (this.activeRequest() !== requestId || this.order().orderId !== saved.orderId) return;
          const shipping = response.data.shipping;
          if (!shipping) {
            this.error.set(SHIPPING_MESSAGES.reload);
            this.state.set(ShippingEditorState.Stale);
            return;
          }
          const draft = this.form.getRawValue();
          const latest = shipping.history.at(-1);
          const alreadySaved =
            shipping.deliveryFeeConfirmed &&
            shipping.deliveryFee === draft.deliveryFee &&
            latest?.note === draft.note.trim();
          this.snapshot.set(shipping);
          this.baselineNote.set(alreadySaved ? draft.note.trim() : '');
          this.form.controls.agreement.setValue(false);
          this.attempted.set(false);
          this.state.set(ShippingEditorState.Editing);
          this.message.set(SHIPPING_MESSAGES.loaded);
          this.updated.emit(response.data);
        },
        error: () => {
          if (this.activeRequest() !== requestId || this.order().orderId !== saved.orderId) return;
          this.state.set(ShippingEditorState.Stale);
          this.error.set(SHIPPING_MESSAGES.reload);
        },
      });
  }

  discardDraft(): void {
    const saved = this.snapshot();
    if (!saved || this.isBusy() || this.recoveryDisabled()) return;
    this.resetForm(saved);
    this.attempt.set(null);
    this.message.set('');
  }

  private receiveSnapshot(incoming: AdminOrderShippingSnapshot): void {
    const saved = this.snapshot();
    if (!saved || saved.orderId !== incoming.orderId) {
      this.activeRequest.update((value) => value + 1);
      this.snapshot.set(incoming);
      this.resetForm(incoming);
      this.attempt.set(null);
      this.error.set('');
      this.state.set(ShippingEditorState.Editing);
      return;
    }
    if (
      saved.shippingRevision === incoming.shippingRevision &&
      saved.status === incoming.status &&
      saved.canConfirmShipping === incoming.canConfirmShipping
    )
      return;
    this.activeRequest.update((value) => value + 1);
    const dirty = this.isDirty();
    this.snapshot.set(incoming);
    this.review.set(null);
    this.form.controls.agreement.setValue(false);
    if (dirty) {
      this.state.set(ShippingEditorState.Stale);
      this.error.set(SHIPPING_MESSAGES.changed);
    } else {
      this.resetForm(incoming);
      this.state.set(ShippingEditorState.Editing);
    }
  }

  private resetForm(saved: AdminOrderShippingSnapshot): void {
    this.baselineNote.set('');
    this.form.reset({
      deliveryFee: saved.deliveryFeeConfirmed ? saved.deliveryFee : null,
      agreement: false,
      note: '',
    });
    this.review.set(null);
    this.attempted.set(false);
    this.feeTouched.set(false);
  }

  private currentRequest(): UpdateAdminOrderShippingRequest | null {
    const saved = this.snapshot();
    const value = this.form.getRawValue();
    if (!saved || value.deliveryFee === null) return null;
    return {
      expectedShippingRevision: saved.shippingRevision,
      expectedStatus: saved.status,
      deliveryFee: value.deliveryFee,
      customerAgreementConfirmed: value.agreement,
      ...(value.note.trim() ? { note: value.note.trim() } : {}),
    };
  }

  private errorMessage(error: ApiErrorResponse): string {
    if (error.errors?.['shippingUnavailable']?.length) return SHIPPING_MESSAGES.unavailable;
    if (error.errors?.['shippingRequest']?.length) return SHIPPING_MESSAGES.request;
    if (error.errors?.['shippingInvoice']?.length) return SHIPPING_MESSAGES.invoice;
    if (error.statusCode === 409) return SHIPPING_MESSAGES.conflict;
    return error.statusCode === 422 ? SHIPPING_MESSAGES.validation : SHIPPING_MESSAGES.uncertain;
  }
}
