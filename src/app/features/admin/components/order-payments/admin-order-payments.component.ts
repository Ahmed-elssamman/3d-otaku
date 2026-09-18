import { DatePipe, DecimalPipe, isPlatformBrowser } from '@angular/common';
import {
  Component,
  DestroyRef,
  PLATFORM_ID,
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
import { Observable, finalize, map, merge } from 'rxjs';
import { ApiErrorResponse, ApiResponse } from '@core/models/api-response.model';
import { PaymentSummaryState } from '@core/enums/payment-summary-state.enum';
import { OrderPaymentSummaryComponent } from '@shared/components/order-payment-summary/order-payment-summary.component';
import { AdminOperationKind } from '../../enums/admin-operation.enum';
import {
  PaymentAttemptOutcome,
  PaymentEditorMode,
  PaymentEditorState,
  PaymentEntryKind,
  PaymentEntryMethod,
} from '../../enums/order-payment.enum';
import { AdminOperationDetail } from '../../models/admin-operation.model';
import {
  AdminPaymentAttempt,
  AdminPaymentContext,
  AdminPaymentDetailResult,
  AdminPaymentEntryView,
  AdminPaymentReview,
  AdminPaymentSnapshot,
} from '../../models/admin-order-payment.model';
import { AdminOperationsService } from '../../services/admin-operations.service';
import {
  EMPTY_CORRECTION_FORM,
  EMPTY_PAYMENT_FORM,
  PAYMENT_FAILURE_FIELDS,
  PAYMENT_KINDS,
  PAYMENT_KIND_LABELS,
  PAYMENT_LIMITS,
  PAYMENT_MESSAGES,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_MODE_LABELS,
  PAYMENT_REJECTED_STATUSES,
  PAYMENT_STORAGE_PREFIX,
  createCorrectionForm,
  createPaymentForm,
  parsePaymentAttempt,
  parsePaymentRecoveryKey,
} from './admin-order-payments.control';

@Component({
  selector: 'app-admin-order-payments',
  standalone: true,
  imports: [DatePipe, DecimalPipe, ReactiveFormsModule, OrderPaymentSummaryComponent],
  templateUrl: './admin-order-payments.component.html',
  styleUrl: './admin-order-payments.component.scss',
})
export class AdminOrderPaymentsComponent {
  private service = inject(AdminOperationsService);
  private destroyRef = inject(DestroyRef);
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  order = input.required<AdminPaymentSnapshot>();
  disabled = input(false);
  recoveryDisabled = input(false);
  updated = output<AdminOperationDetail>();
  busyChange = output<boolean>();
  dirtyChange = output<boolean>();
  staleChange = output<boolean>();
  kinds = PAYMENT_KINDS;
  methods = PAYMENT_METHODS;
  limits = PAYMENT_LIMITS;
  form = createPaymentForm();
  correctionForm = createCorrectionForm();
  values = toSignal(this.form.valueChanges.pipe(map(() => this.form.getRawValue())), {
    initialValue: { ...EMPTY_PAYMENT_FORM },
  });
  correctionValues = toSignal(
    this.correctionForm.valueChanges.pipe(map(() => this.correctionForm.getRawValue())),
    { initialValue: { ...EMPTY_CORRECTION_FORM } },
  );
  private formStatus = toSignal(this.form.statusChanges, { initialValue: this.form.status });
  private correctionStatus = toSignal(this.correctionForm.statusChanges, {
    initialValue: this.correctionForm.status,
  });
  snapshot = signal<AdminPaymentSnapshot | null>(null);
  mode = signal(PaymentEditorMode.Transaction);
  state = signal(PaymentEditorState.Editing);
  targetEntryId = signal('');
  attempt = signal<AdminPaymentAttempt | null>(null);
  review = signal<AdminPaymentReview | null>(null);
  error = signal('');
  message = signal('');
  storageNotice = signal('');
  storageInvalid = signal(false);
  private recoveryKey = signal('');
  hasRecovery = computed(() => this.attempt() !== null || Boolean(this.recoveryKey()));
  attempted = signal(false);
  recoveryChecked = signal(false);
  private requestIdentity = signal(0);
  isCorrection = computed(() => this.mode() === PaymentEditorMode.Correction);
  isSaving = computed(() => this.state() === PaymentEditorState.Saving);
  isLoading = computed(() => this.state() === PaymentEditorState.Loading);
  isBusy = computed(() => this.isSaving() || this.isLoading());
  isStale = computed(() => this.state() === PaymentEditorState.Stale);
  isUncertain = computed(() => this.attempt()?.outcome === PaymentAttemptOutcome.Uncertain);
  ledgerAvailable = computed(
    () => this.snapshot()?.summary.state !== PaymentSummaryState.Unavailable,
  );
  fieldsDisabled = computed(
    () =>
      this.disabled() ||
      this.isBusy() ||
      this.isUncertain() ||
      this.storageInvalid() ||
      !this.ledgerAvailable(),
  );
  isDirty = computed(() => {
    const value = this.values();
    return (
      this.attempt() !== null ||
      this.storageInvalid() ||
      this.isCorrection() ||
      value.kind !== null ||
      value.amount !== null ||
      value.method !== null ||
      Boolean(value.reference || value.note) ||
      value.completed
    );
  });
  referenceRequired = computed(
    () => this.values().method !== null && this.values().method !== PaymentEntryMethod.Cash,
  );
  referenceValid = computed(() => {
    const value = this.values().reference.trim();
    return (
      value.length <= this.limits.reference && (!this.referenceRequired() || value.length >= 3)
    );
  });
  refundAllowed = computed(() => {
    const value = this.values();
    const net = this.snapshot()?.summary.recordedNet;
    return (
      value.kind !== PaymentEntryKind.Refund ||
      (typeof net === 'number' && value.amount !== null && value.amount <= net)
    );
  });
  canReview = computed(() => {
    if (this.fieldsDisabled() || this.isStale()) return false;
    if (this.isCorrection())
      return (
        this.correctionStatus() === 'VALID' &&
        this.correctionValues().reason.trim().length >= 3 &&
        this.targetEntry() !== null
      );
    return (
      this.formStatus() === 'VALID' &&
      this.referenceValid() &&
      this.refundAllowed() &&
      this.values().kind !== PaymentEntryKind.Correction
    );
  });
  canSave = computed(() => this.review() !== null && this.canReview());
  canRead = computed(() => !this.recoveryDisabled() && !this.isBusy());
  canRecover = computed(() => this.hasRecovery() && this.canRead());
  canRetry = computed(() => this.isUncertain() && this.recoveryChecked() && this.canRead());
  canDiscard = computed(
    () =>
      !this.isBusy() && !this.recoveryDisabled() && !this.isUncertain() && !this.storageInvalid(),
  );
  canStartCorrection = computed(
    () =>
      !this.disabled() &&
      !this.isBusy() &&
      !this.isDirty() &&
      !this.isStale() &&
      this.ledgerAvailable(),
  );
  targetEntry = computed(
    () =>
      this.snapshot()?.history.find(
        (entry) =>
          entry.id === this.targetEntryId() &&
          !entry.isCorrected &&
          entry.kind !== PaymentEntryKind.Correction,
      ) || null,
  );
  history = computed<AdminPaymentEntryView[]>(() =>
    (this.snapshot()?.history || []).map((entry) => ({
      ...entry,
      kindLabel: PAYMENT_KIND_LABELS[entry.kind],
      methodLabel: PAYMENT_METHOD_LABELS[entry.method],
      correctionAvailable: entry.kind !== PaymentEntryKind.Correction && !entry.isCorrected,
    })),
  );
  amountError = computed(() => {
    this.formStatus();
    return (this.attempted() || this.values().amount !== null) && this.form.controls.amount.invalid;
  });
  referenceError = computed(
    () => (this.attempted() || Boolean(this.values().reference)) && !this.referenceValid(),
  );
  refundError = computed(() => !this.refundAllowed());
  reviewLabel = computed(() => PAYMENT_MODE_LABELS[this.mode()].review);
  confirmationLabel = computed(() => PAYMENT_MODE_LABELS[this.mode()].confirmation);
  saveLabel = computed(() => PAYMENT_MODE_LABELS[this.mode()].save);

  constructor() {
    effect(() => {
      const incoming = this.order();
      untracked(() => this.receiveSnapshot(incoming));
    });
    effect(() => this.busyChange.emit(this.isBusy()));
    effect(() => this.dirtyChange.emit(this.isDirty()));
    effect(() => this.staleChange.emit(this.isStale()));
    merge(
      this.form.controls.kind.valueChanges,
      this.form.controls.amount.valueChanges,
      this.form.controls.method.valueChanges,
      this.form.controls.reference.valueChanges,
      this.form.controls.note.valueChanges,
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.form.controls.completed.value) this.form.controls.completed.setValue(false);
      });
    this.correctionForm.controls.reason.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.correctionForm.controls.confirmed.value)
          this.correctionForm.controls.confirmed.setValue(false);
        if (this.correctionForm.controls.noMoneyMoved.value)
          this.correctionForm.controls.noMoneyMoved.setValue(false);
      });
    merge(this.form.valueChanges, this.correctionForm.valueChanges)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.review.set(null);
        this.message.set('');
        if (
          this.state() === PaymentEditorState.Reviewing ||
          this.state() === PaymentEditorState.Saved
        )
          this.state.set(PaymentEditorState.Editing);
      });
  }

  requestReview(): void {
    this.attempted.set(true);
    if (!this.canReview()) return;
    const review = this.currentReview();
    if (!review) return;
    this.review.set(review);
    this.state.set(PaymentEditorState.Reviewing);
  }

  cancelReview(): void {
    if (this.isBusy()) return;
    this.review.set(null);
    this.state.set(PaymentEditorState.Editing);
  }

  startCorrection(entryId: string): void {
    if (!this.canStartCorrection()) return;
    const entry = this.snapshot()?.history.find(
      (item) =>
        item.id === entryId && item.kind !== PaymentEntryKind.Correction && !item.isCorrected,
    );
    if (!entry) return;
    this.mode.set(PaymentEditorMode.Correction);
    this.targetEntryId.set(entryId);
    this.clearAttestations();
    this.attempted.set(false);
    this.error.set('');
    this.message.set('');
  }

  savePayment(): void {
    const review = this.review();
    const saved = this.snapshot();
    if (
      !review ||
      !saved ||
      !this.canSave() ||
      JSON.stringify(review) !== JSON.stringify(this.currentReview())
    )
      return;
    const previous = this.attempt();
    const same =
      previous &&
      previous.mode === review.mode &&
      previous.targetEntryId === review.targetEntryId &&
      JSON.stringify(previous.transaction) === JSON.stringify(review.transaction) &&
      JSON.stringify(previous.correction) === JSON.stringify(review.correction);
    const attempt: AdminPaymentAttempt = same
      ? previous
      : {
          orderId: saved.orderId,
          key: crypto.randomUUID(),
          mode: review.mode,
          targetEntryId: review.targetEntryId,
          transaction: review.transaction,
          correction: review.correction,
          outcome: PaymentAttemptOutcome.Rejected,
        };
    this.submitAttempt(attempt);
  }

  retryAttempt(): void {
    const attempt = this.attempt();
    if (attempt && this.canRetry()) this.submitAttempt(attempt);
  }

  recoverAttempt(): void {
    const attempt = this.attempt();
    const orderId = attempt?.orderId || this.snapshot()?.orderId || '';
    const key = attempt?.key || this.recoveryKey();
    if (!orderId || !key || !this.canRecover()) return;
    const identity = this.beginRequest(PaymentEditorState.Loading);
    this.service
      .recoverPayment(orderId, key)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.finishRequest(identity, orderId)),
      )
      .subscribe({
        next: (response) => {
          if (!this.isCurrent(identity, orderId)) return;
          const detail = response.data.order;
          if (!detail.payments) {
            this.failRead();
            return;
          }
          if (response.data.recorded) {
            if (!response.data.entryId) {
              this.failRead();
              return;
            }
            this.acceptRecorded(detail, PAYMENT_MESSAGES.recovered);
            return;
          }
          if (response.data.entryId !== null) {
            this.failRead();
            return;
          }
          this.snapshot.set(detail.payments);
          this.clearAttestations();
          this.attempted.set(false);
          this.recoveryChecked.set(true);
          const rejected = attempt?.outcome === PaymentAttemptOutcome.Rejected;
          this.state.set(rejected ? PaymentEditorState.Editing : PaymentEditorState.Stale);
          this.message.set(
            this.storageInvalid()
              ? PAYMENT_MESSAGES.storageInvalid
              : rejected
                ? PAYMENT_MESSAGES.rejected
                : PAYMENT_MESSAGES.negative,
          );
          this.updated.emit(detail);
        },
        error: (error: ApiErrorResponse) => {
          if (!this.isCurrent(identity, orderId)) return;
          this.state.set(PaymentEditorState.Stale);
          this.error.set(
            error.errors?.['paymentRequest']
              ? PAYMENT_MESSAGES.paymentRequest
              : PAYMENT_MESSAGES.reloadFailed,
          );
        },
      });
  }

  reloadOrder(): void {
    const saved = this.snapshot();
    if (!saved || !this.canRead()) return;
    if (this.hasRecovery()) {
      this.recoverAttempt();
      return;
    }
    const identity = this.beginRequest(PaymentEditorState.Loading);
    this.service
      .getDetail(AdminOperationKind.Orders, saved.orderId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.finishRequest(identity, saved.orderId)),
      )
      .subscribe({
        next: (response) => {
          if (!this.isCurrent(identity, saved.orderId)) return;
          const current = response.data.payments;
          if (!current) {
            this.failRead();
            return;
          }
          this.snapshot.set(current);
          this.clearAttestations();
          this.attempted.set(false);
          this.state.set(PaymentEditorState.Editing);
          this.message.set(PAYMENT_MESSAGES.loaded);
          this.updated.emit(response.data);
        },
        error: () => {
          if (this.isCurrent(identity, saved.orderId)) this.failRead();
        },
      });
  }

  discardDraft(): void {
    if (!this.canDiscard()) return;
    this.storeAttempt(null);
    this.resetForms();
    this.message.set('');
    if (!this.isStale()) this.state.set(PaymentEditorState.Editing);
  }

  private submitAttempt(attempt: AdminPaymentAttempt): void {
    let request: Observable<ApiResponse<AdminPaymentDetailResult>>;
    if (
      attempt.mode === PaymentEditorMode.Correction &&
      attempt.correction &&
      attempt.targetEntryId
    ) {
      request = this.service.correctPayment(
        attempt.orderId,
        attempt.targetEntryId,
        attempt.correction,
        attempt.key,
      );
    } else if (attempt.mode === PaymentEditorMode.Transaction && attempt.transaction) {
      request = this.service.recordPayment(attempt.orderId, attempt.transaction, attempt.key);
    } else return;
    const previouslyUncertain = attempt.outcome === PaymentAttemptOutcome.Uncertain;
    this.storeAttempt({ ...attempt, outcome: PaymentAttemptOutcome.Uncertain });
    this.recoveryChecked.set(false);
    const identity = this.beginRequest(PaymentEditorState.Saving);
    request
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.finishRequest(identity, attempt.orderId)),
      )
      .subscribe({
        next: (response) => {
          if (!this.isCurrent(identity, attempt.orderId)) return;
          if (!response.data.entryId || !response.data.order.payments) {
            this.failRead();
            return;
          }
          this.acceptRecorded(
            response.data.order,
            response.data.replayed ? PAYMENT_MESSAGES.recovered : PAYMENT_MESSAGES.saved,
          );
        },
        error: (error: ApiErrorResponse) => {
          if (!this.isCurrent(identity, attempt.orderId)) return;
          const terminalReasons = error.errors?.['paymentNotRecorded'];
          const terminalRejection =
            error.statusCode === 409 &&
            Array.isArray(terminalReasons) &&
            terminalReasons.length > 0 &&
            terminalReasons.every(
              (reason: string) => typeof reason === 'string' && reason.trim().length > 0,
            ) &&
            !error.errors?.['paymentRequest']?.length;
          const definitelyRejected =
            terminalRejection ||
            (!previouslyUncertain && PAYMENT_REJECTED_STATUSES.includes(error.statusCode));
          this.storeAttempt({
            ...attempt,
            outcome: definitelyRejected
              ? PaymentAttemptOutcome.Rejected
              : PaymentAttemptOutcome.Uncertain,
          });
          this.clearAttestations();
          this.state.set(PaymentEditorState.Stale);
          this.error.set(
            terminalRejection ? PAYMENT_MESSAGES.paymentNotRecorded : this.errorMessage(error),
          );
        },
      });
  }

  private currentReview(): AdminPaymentReview | null {
    const saved = this.snapshot();
    if (!saved) return null;
    const context: AdminPaymentContext = {
      expectedPaymentRevision: saved.paymentRevision,
      expectedShippingRevision: saved.shippingRevision,
      expectedStatus: saved.status,
      expectedTotal: saved.total,
      expectedDeliveryFeeConfirmed: saved.deliveryFeeConfirmed,
    };
    if (this.isCorrection()) {
      const target = this.targetEntry();
      const value = this.correctionForm.getRawValue();
      if (!target || !value.confirmed || !value.noMoneyMoved) return null;
      return {
        mode: PaymentEditorMode.Correction,
        targetEntryId: target.id,
        transaction: null,
        correction: {
          ...context,
          reason: value.reason.trim(),
          correctionConfirmed: true,
          noMoneyMovedConfirmed: true,
        },
        actionLabel: PAYMENT_KIND_LABELS[PaymentEntryKind.Correction],
        methodLabel: PAYMENT_METHOD_LABELS[target.method],
        amount: target.amount,
        reference: target.reference,
        note: value.reason.trim(),
      };
    }
    const value = this.form.getRawValue();
    if (!value.kind || !value.method || value.amount === null || !value.completed) return null;
    return {
      mode: PaymentEditorMode.Transaction,
      targetEntryId: '',
      correction: null,
      transaction: {
        ...context,
        kind: value.kind,
        amount: value.amount,
        method: value.method,
        transactionCompletedConfirmed: true,
        ...(value.reference.trim() ? { reference: value.reference.trim() } : {}),
        ...(value.note.trim() ? { note: value.note.trim() } : {}),
      },
      actionLabel: PAYMENT_KIND_LABELS[value.kind],
      methodLabel: PAYMENT_METHOD_LABELS[value.method],
      amount: value.amount,
      reference: value.reference.trim(),
      note: value.note.trim(),
    };
  }

  private receiveSnapshot(incoming: AdminPaymentSnapshot): void {
    const previous = this.snapshot();
    if (!previous || previous.orderId !== incoming.orderId) {
      this.requestIdentity.update((value) => value + 1);
      this.snapshot.set(incoming);
      this.resetForms();
      this.error.set('');
      this.message.set('');
      this.attempt.set(null);
      this.storageInvalid.set(false);
      this.recoveryKey.set('');
      this.storageNotice.set('');
      const stored = this.readAttempt(incoming.orderId);
      if (stored) {
        this.attempt.set(stored);
        this.restoreAttemptForm(stored);
        this.state.set(PaymentEditorState.Stale);
        this.message.set(
          stored.outcome === PaymentAttemptOutcome.Rejected
            ? PAYMENT_MESSAGES.rejectedPendingRecovery
            : PAYMENT_MESSAGES.uncertain,
        );
      } else if (this.storageInvalid()) {
        this.state.set(PaymentEditorState.Stale);
        this.error.set(PAYMENT_MESSAGES.storageInvalid);
      } else this.state.set(PaymentEditorState.Editing);
      return;
    }
    if (
      previous.paymentRevision === incoming.paymentRevision &&
      previous.shippingRevision === incoming.shippingRevision &&
      previous.status === incoming.status &&
      previous.total === incoming.total &&
      previous.deliveryFeeConfirmed === incoming.deliveryFeeConfirmed
    )
      return;
    this.requestIdentity.update((value) => value + 1);
    const dirty = this.isDirty();
    this.snapshot.set(incoming);
    this.clearAttestations();
    this.review.set(null);
    this.state.set(dirty ? PaymentEditorState.Stale : PaymentEditorState.Editing);
    if (dirty) this.error.set(PAYMENT_MESSAGES.conflict);
  }

  private acceptRecorded(detail: AdminOperationDetail, message: string): void {
    if (!detail.payments) return;
    this.snapshot.set(detail.payments);
    this.storeAttempt(null);
    this.storageInvalid.set(false);
    this.recoveryKey.set('');
    this.resetForms();
    this.state.set(PaymentEditorState.Saved);
    this.message.set(message);
    this.updated.emit(detail);
  }

  private beginRequest(state: PaymentEditorState): number {
    this.requestIdentity.update((value) => value + 1);
    this.state.set(state);
    this.error.set('');
    this.message.set('');
    this.review.set(null);
    return this.requestIdentity();
  }

  private isCurrent(identity: number, orderId: string): boolean {
    return this.requestIdentity() === identity && this.order().orderId === orderId;
  }

  private finishRequest(identity: number, orderId: string): void {
    if (this.isCurrent(identity, orderId) && this.isBusy())
      this.state.set(PaymentEditorState.Stale);
  }

  private failRead(): void {
    this.state.set(PaymentEditorState.Stale);
    this.error.set(PAYMENT_MESSAGES.reloadFailed);
  }

  private clearAttestations(): void {
    this.form.controls.completed.setValue(false);
    this.correctionForm.controls.confirmed.setValue(false);
    this.correctionForm.controls.noMoneyMoved.setValue(false);
  }

  private resetForms(): void {
    this.form.reset({ ...EMPTY_PAYMENT_FORM });
    this.correctionForm.reset({ ...EMPTY_CORRECTION_FORM });
    this.mode.set(PaymentEditorMode.Transaction);
    this.targetEntryId.set('');
    this.review.set(null);
    this.attempted.set(false);
    this.recoveryChecked.set(false);
  }

  private restoreAttemptForm(attempt: AdminPaymentAttempt): void {
    this.mode.set(attempt.mode);
    this.targetEntryId.set(attempt.targetEntryId);
    if (attempt.transaction)
      this.form.reset({
        kind: attempt.transaction.kind,
        amount: attempt.transaction.amount,
        method: attempt.transaction.method,
        reference: attempt.transaction.reference || '',
        note: attempt.transaction.note || '',
        completed: false,
      });
    if (attempt.correction)
      this.correctionForm.reset({
        reason: attempt.correction.reason,
        confirmed: false,
        noMoneyMoved: false,
      });
  }

  private storeAttempt(attempt: AdminPaymentAttempt | null): void {
    this.attempt.set(attempt);
    const id = attempt?.orderId || this.snapshot()?.orderId || '';
    if (!this.isBrowser || !id) return;
    try {
      const key = `${PAYMENT_STORAGE_PREFIX}${id}`;
      if (attempt) sessionStorage.setItem(key, JSON.stringify(attempt));
      else sessionStorage.removeItem(key);
      this.storageNotice.set('');
    } catch {
      this.storageNotice.set(PAYMENT_MESSAGES.storageFailed);
    }
  }

  private readAttempt(orderId: string): AdminPaymentAttempt | null {
    if (!this.isBrowser) return null;
    try {
      const raw = sessionStorage.getItem(`${PAYMENT_STORAGE_PREFIX}${orderId}`);
      if (!raw) return null;
      const attempt = parsePaymentAttempt(raw, orderId);
      this.storageInvalid.set(attempt === null);
      if (!attempt) this.recoveryKey.set(parsePaymentRecoveryKey(raw, orderId));
      return attempt;
    } catch {
      this.storageInvalid.set(true);
      return null;
    }
  }

  private errorMessage(error: ApiErrorResponse): string {
    for (const key of PAYMENT_FAILURE_FIELDS) {
      if (error.errors?.[key]?.length) return PAYMENT_MESSAGES[key];
    }
    if (error.statusCode === 409) return PAYMENT_MESSAGES.conflict;
    return error.statusCode === 422 ? PAYMENT_MESSAGES.validation : PAYMENT_MESSAGES.uncertain;
  }
}
