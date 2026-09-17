import {
  ManufacturingHistoryAction,
  ManufacturingMaterial,
  ManufacturingReviewStatus,
  ManufacturingRounding,
} from '../enums/manufacturing-review.enum';

export interface ManufacturingCostingInputs {
  material: ManufacturingMaterial | null;
  consumptionIncludesSupportAndWaste: boolean | null;
  machineCostPerHourEgp: number | null;
  electricityCostPerHourEgp: number | null;
  laborCostEgp: number | null;
  packagingCostEgp: number | null;
  hardwareCostEgp: number | null;
  overheadCostEgp: number | null;
  fixedPaymentFeeEgp: number | null;
  failureRatePercent: number | null;
  targetGrossMarginPercent: number | null;
  variablePaymentFeePercent: number | null;
  returnReservePercent: number | null;
  retailRounding: ManufacturingRounding | null;
}

export interface ManufacturingReviewInputs {
  consumedFilamentGrams: number | null;
  verifiedWeightGrams: number | null;
  verifiedPrintHours: number | null;
  measurementReference: string;
  sampleReference: string;
  rightsReference: string;
  costing: ManufacturingCostingInputs;
}

export interface SaveManufacturingReviewRequest extends ManufacturingReviewInputs {
  expectedRevision: number;
}

export interface StartManufacturingReviewRequest {
  expectedUpdatedAt: string;
}

export interface QuoteManufacturingReviewRequest {
  expectedRevision: number;
}

export interface UnpublishManufacturingProductRequest {
  isActive: boolean;
}

export interface ApproveManufacturingReviewRequest {
  expectedRevision: number;
  quoteFingerprint: string;
  sampleApproved: boolean;
  rightsReviewed: boolean;
  pricingApproved: boolean;
}

export interface ManufacturingCostBreakdown {
  material: number;
  machine: number;
  electricity: number;
  failureAllowance: number;
  expectedPrint: number;
  labor: number;
  packaging: number;
  hardware: number;
  overhead: number;
  fixedPaymentFee: number;
  costBeforeSalesFees: number;
  variablePaymentFee: number;
  returnReserve: number;
  expectedProfit: number;
  minimumPrice: number;
  roundingIncrease: number;
  retailPrice: number;
}

export interface ManufacturingCostQuote {
  currency: string;
  material: ManufacturingMaterial;
  consumedFilamentGrams: number;
  materialPiastresPerGram: number;
  breakdownPiastres: ManufacturingCostBreakdown;
  retailPriceEgp: number;
  achievedMarginBasisPoints: number;
  targetMarginBasisPoints: number;
  retailRounding: ManufacturingRounding;
  excludedCosts: string[];
  shippingIncluded: boolean;
  taxesCalculated: boolean;
  manufacturingApprovalGranted: boolean;
}

export interface ManufacturingQuoteResult {
  revision: number;
  quoteFingerprint: string;
  effectiveSellingPriceEgp: number;
  meetsQuoteTarget: boolean;
  quote: ManufacturingCostQuote;
}

export interface ManufacturingReviewHistory {
  action: ManufacturingHistoryAction;
  revision: number;
  createdAt: string;
  actorId: string;
  reason: string;
}

export interface ManufacturingReview extends ManufacturingReviewInputs {
  revision: number;
  status: ManufacturingReviewStatus;
  sampleApproved: boolean;
  pricingApproved: boolean;
  rightsReviewed: boolean;
  approvedAt: string | null;
  approvedBy: string | null;
  approvedFingerprint: string | null;
  approvedQuote: ManufacturingQuoteResult | null;
  history: ManufacturingReviewHistory[];
}
