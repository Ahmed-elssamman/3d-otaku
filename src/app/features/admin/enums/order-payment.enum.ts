export enum PaymentEntryKind {
  Collection = 'collection',
  Refund = 'refund',
  Correction = 'correction',
}

export enum PaymentEntryMethod {
  Cash = 'cash',
  BankTransfer = 'bank_transfer',
  MobileWallet = 'mobile_wallet',
  Card = 'card',
  Other = 'other',
}

export enum PaymentEditorMode {
  Transaction = 'transaction',
  Correction = 'correction',
}

export enum PaymentEditorState {
  Editing = 'editing',
  Reviewing = 'reviewing',
  Saving = 'saving',
  Loading = 'loading',
  Stale = 'stale',
  Saved = 'saved',
}

export enum PaymentAttemptOutcome {
  Uncertain = 'uncertain',
  Rejected = 'rejected',
}
