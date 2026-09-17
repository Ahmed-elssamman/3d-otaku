import { ProductConfigurationVersion } from '@core/enums/product-configuration-version.enum';
import {
  normalizeConfigurationFingerprint,
  normalizeProductConfiguration,
} from '@core/utils/product-configuration.util';
import {
  ADMIN_MANUFACTURING_FIELD_LABELS,
  ADMIN_MANUFACTURING_MODEL_TYPES,
  ADMIN_MANUFACTURING_REVIEW_LABELS,
  ADMIN_MANUFACTURING_SNAPSHOT_RULES,
  ADMIN_MANUFACTURING_SNAPSHOT_TEXT,
} from '../data/admin-manufacturing-snapshot.data';
import { AdminManufacturingSnapshotState } from '../enums/admin-manufacturing-snapshot.enum';
import { ManufacturingReviewStatus } from '../enums/manufacturing-review.enum';
import { AdminOperationDetail } from '../models/admin-operation.model';
import {
  AdminManufacturingSnapshotRow,
  AdminOrderItem,
  AdminOrderItemRecord,
  AdminOrderManufacturingSnapshot,
  AdminOrderManufacturingSource,
} from '../models/admin-order-manufacturing.model';

function validText(value: string | null, maximum: number): boolean {
  return value === null || (typeof value === 'string' && value.length <= maximum);
}

function validMeasurement(value: number | null, maximum: number): boolean {
  return (
    value === null ||
    (typeof value === 'number' && Number.isFinite(value) && value >= 0.001 && value <= maximum)
  );
}

function validSource(source: AdminOrderManufacturingSource | null): boolean {
  if (source === null) return true;
  const rules = ADMIN_MANUFACTURING_SNAPSHOT_RULES;
  return (
    Boolean(source) &&
    !Array.isArray(source) &&
    typeof source.manifestPath === 'string' &&
    source.manifestPath.length <= rules.referenceLength &&
    typeof source.manifestSha256 === 'string' &&
    (source.manifestSha256 === '' || rules.fingerprint.test(source.manifestSha256)) &&
    typeof source.provenanceUrl === 'string' &&
    source.provenanceUrl.length <= rules.urlLength &&
    typeof source.attribution === 'string' &&
    source.attribution.length <= rules.attributionLength &&
    typeof source.previewLabel === 'string' &&
    source.previewLabel.length <= rules.referenceLength
  );
}

export function normalizeAdminManufacturingSnapshot(
  value: AdminOrderManufacturingSnapshot | null,
): AdminOrderManufacturingSnapshot | null {
  const rules = ADMIN_MANUFACTURING_SNAPSHOT_RULES;
  if (
    !value ||
    Array.isArray(value) ||
    value.version !== ProductConfigurationVersion.Current ||
    !validText(value.modelUrl, rules.urlLength) ||
    (value.modelType !== null && !ADMIN_MANUFACTURING_MODEL_TYPES.includes(value.modelType)) ||
    !Array.isArray(value.gallery) ||
    value.gallery.length > rules.galleryLength ||
    !value.gallery.every((url) => typeof url === 'string' && url.length <= rules.urlLength) ||
    !validSource(value.source) ||
    typeof value.requiresManufacturingReview !== 'boolean' ||
    (value.reviewRevision !== null &&
      (!Number.isSafeInteger(value.reviewRevision) || value.reviewRevision < 0)) ||
    ![null, ManufacturingReviewStatus.Pending, ManufacturingReviewStatus.Approved].includes(
      value.reviewStatus,
    ) ||
    (value.reviewRevision === null) !== (value.reviewStatus === null) ||
    (value.approvedFingerprint !== null &&
      (typeof value.approvedFingerprint !== 'string' ||
        !rules.fingerprint.test(value.approvedFingerprint))) ||
    (value.approvedBy !== null &&
      (typeof value.approvedBy !== 'string' || !rules.objectId.test(value.approvedBy))) ||
    (value.approvedAt !== null &&
      (typeof value.approvedAt !== 'string' ||
        !Number.isFinite(Date.parse(value.approvedAt)) ||
        new Date(value.approvedAt).toISOString() !== value.approvedAt)) ||
    !validMeasurement(value.consumedFilamentGrams, rules.maximumGrams) ||
    !validMeasurement(value.verifiedWeightGrams, rules.maximumGrams) ||
    !validMeasurement(value.verifiedPrintHours, rules.maximumHours) ||
    !validText(value.measurementReference, rules.referenceLength) ||
    !validText(value.sampleReference, rules.referenceLength) ||
    !validText(value.rightsReference, rules.referenceLength) ||
    (value.reviewStatus === ManufacturingReviewStatus.Approved &&
      (value.approvedFingerprint === null ||
        value.approvedAt === null ||
        value.approvedBy === null))
  )
    return null;

  return {
    version: ProductConfigurationVersion.Current,
    modelUrl: value.modelUrl,
    modelType: value.modelType,
    gallery: [...value.gallery],
    source: value.source
      ? {
          manifestPath: value.source.manifestPath,
          manifestSha256: value.source.manifestSha256,
          provenanceUrl: value.source.provenanceUrl,
          attribution: value.source.attribution,
          previewLabel: value.source.previewLabel,
        }
      : null,
    requiresManufacturingReview: value.requiresManufacturingReview,
    reviewRevision: value.reviewRevision,
    reviewStatus: value.reviewStatus,
    approvedFingerprint: value.approvedFingerprint,
    approvedAt: value.approvedAt,
    approvedBy: value.approvedBy,
    consumedFilamentGrams: value.consumedFilamentGrams,
    verifiedWeightGrams: value.verifiedWeightGrams,
    verifiedPrintHours: value.verifiedPrintHours,
    measurementReference: value.measurementReference,
    sampleReference: value.sampleReference,
    rightsReference: value.rightsReference,
  };
}

export function normalizeAdminOrderItem(record: AdminOrderItemRecord): AdminOrderItem {
  const configuration = normalizeProductConfiguration(record.configuration ?? null);
  const configurationFingerprint = normalizeConfigurationFingerprint(
    record.configurationFingerprint ?? null,
  );
  const snapshot = normalizeAdminManufacturingSnapshot(record.manufacturingSnapshot ?? null);
  let state = AdminManufacturingSnapshotState.NotLoaded;
  if (Object.hasOwn(record, 'manufacturingSnapshot')) {
    state =
      record.manufacturingSnapshot === null
        ? configuration && configurationFingerprint
          ? AdminManufacturingSnapshotState.Unavailable
          : AdminManufacturingSnapshotState.Missing
        : snapshot
          ? AdminManufacturingSnapshotState.Available
          : AdminManufacturingSnapshotState.Unavailable;
  }
  return {
    productId: record.productId,
    ...(record.slug ? { slug: record.slug } : {}),
    name: record.name,
    image: record.image,
    quantity: record.quantity,
    unitPrice: record.unitPrice,
    discountPrice: record.discountPrice ?? null,
    lineTotal: record.lineTotal,
    configuration: configurationFingerprint ? configuration : null,
    configurationFingerprint: configuration ? configurationFingerprint : null,
    manufacturingSnapshot: snapshot,
    manufacturingSnapshotState: state,
  };
}

function samePurchasedItem(previous: AdminOrderItem, incoming: AdminOrderItem): boolean {
  return (
    previous.productId === incoming.productId &&
    previous.slug === incoming.slug &&
    previous.name === incoming.name &&
    previous.image === incoming.image &&
    previous.quantity === incoming.quantity &&
    previous.unitPrice === incoming.unitPrice &&
    previous.discountPrice === incoming.discountPrice &&
    previous.lineTotal === incoming.lineTotal &&
    previous.configurationFingerprint === incoming.configurationFingerprint &&
    JSON.stringify(previous.configuration) === JSON.stringify(incoming.configuration)
  );
}

export function preserveAdminManufacturingDetail(
  previous: AdminOperationDetail | null,
  incoming: AdminOperationDetail,
): AdminOperationDetail {
  if (!previous || previous.id !== incoming.id) return incoming;
  return {
    ...incoming,
    items: incoming.items.map((item) => {
      if (item.manufacturingSnapshotState !== AdminManufacturingSnapshotState.NotLoaded)
        return item;
      const stored = previous.items.find((candidate) => samePurchasedItem(candidate, item));
      return stored
        ? {
            ...item,
            manufacturingSnapshot: stored.manufacturingSnapshot,
            manufacturingSnapshotState: stored.manufacturingSnapshotState,
          }
        : item;
    }),
  };
}

export function adminManufacturingSnapshotRows(
  snapshot: AdminOrderManufacturingSnapshot | null,
): AdminManufacturingSnapshotRow[] {
  if (!snapshot) return [];
  const labels = ADMIN_MANUFACTURING_FIELD_LABELS;
  const text = ADMIN_MANUFACTURING_SNAPSHOT_TEXT;
  const measured = (value: number | null, unit: string) =>
    value === null
      ? text.missing
      : `${new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 3 }).format(value)} ${unit}`;
  const values = {
    modelUrl: snapshot.modelUrl || text.missing,
    modelType: snapshot.modelType || text.missing,
    requiresManufacturingReview: snapshot.requiresManufacturingReview
      ? text.required
      : text.notRequired,
    reviewRevision:
      snapshot.reviewRevision === null ? text.missing : String(snapshot.reviewRevision),
    reviewStatus: snapshot.reviewStatus
      ? ADMIN_MANUFACTURING_REVIEW_LABELS[snapshot.reviewStatus]
      : text.missing,
    approvedAt: snapshot.approvedAt || text.missing,
    approvedBy: snapshot.approvedBy || text.missing,
    approvedFingerprint: snapshot.approvedFingerprint || text.missing,
    consumedFilamentGrams: measured(snapshot.consumedFilamentGrams, text.grams),
    verifiedWeightGrams: measured(snapshot.verifiedWeightGrams, text.grams),
    verifiedPrintHours: measured(snapshot.verifiedPrintHours, text.hours),
    measurementReference: snapshot.measurementReference || text.missing,
    sampleReference: snapshot.sampleReference || text.missing,
    rightsReference: snapshot.rightsReference || text.missing,
    manifestPath: snapshot.source?.manifestPath || text.missing,
    manifestSha256: snapshot.source?.manifestSha256 || text.missing,
    provenanceUrl: snapshot.source?.provenanceUrl || text.missing,
    attribution: snapshot.source?.attribution || text.missing,
    previewLabel: snapshot.source?.previewLabel || text.missing,
  };
  return [
    ...Object.entries(values).map(([id, value]) => ({
      id,
      label: labels[id as keyof typeof values],
      value,
    })),
    ...snapshot.gallery.map((value, index) => ({
      id: `gallery-${index}`,
      label: `${labels.gallery} ${index + 1}`,
      value,
    })),
  ];
}
