import { ProductModelType } from '@core/enums/product-model-type.enum';
import { ProductConfigurationVersion } from '@core/enums/product-configuration-version.enum';
import { OrderItem } from '@core/models/order.model';
import { ProductConfiguration } from '@core/models/product-configuration.model';
import { AdminManufacturingSnapshotState } from '../enums/admin-manufacturing-snapshot.enum';
import { ManufacturingReviewStatus } from '../enums/manufacturing-review.enum';

export interface AdminOrderManufacturingSource {
  manifestPath: string;
  manifestSha256: string;
  provenanceUrl: string;
  attribution: string;
  previewLabel: string;
}

export interface AdminOrderManufacturingSnapshot {
  version: ProductConfigurationVersion;
  modelUrl: string | null;
  modelType: ProductModelType | null;
  gallery: string[];
  source: AdminOrderManufacturingSource | null;
  requiresManufacturingReview: boolean;
  reviewRevision: number | null;
  reviewStatus: ManufacturingReviewStatus | null;
  approvedFingerprint: string | null;
  approvedAt: string | null;
  approvedBy: string | null;
  verifiedWeightGrams: number | null;
  consumedFilamentGrams: number | null;
  verifiedPrintHours: number | null;
  measurementReference: string | null;
  sampleReference: string | null;
  rightsReference: string | null;
}

export interface AdminOrderItemRecord extends OrderItem {
  manufacturingSnapshot?: AdminOrderManufacturingSnapshot | null;
}

export interface AdminOrderItem extends OrderItem {
  configuration: ProductConfiguration | null;
  configurationFingerprint: string | null;
  manufacturingSnapshot: AdminOrderManufacturingSnapshot | null;
  manufacturingSnapshotState: AdminManufacturingSnapshotState;
}

export interface AdminManufacturingSnapshotRow {
  id: string;
  label: string;
  value: string;
}
