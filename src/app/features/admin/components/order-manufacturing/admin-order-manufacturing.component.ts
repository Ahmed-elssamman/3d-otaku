import { Component, computed, input } from '@angular/core';
import {
  ADMIN_MANUFACTURING_SNAPSHOT_MESSAGES,
  ADMIN_MANUFACTURING_SNAPSHOT_TEXT,
} from '../../data/admin-manufacturing-snapshot.data';
import { AdminManufacturingSnapshotState } from '../../enums/admin-manufacturing-snapshot.enum';
import { AdminOrderManufacturingSnapshot } from '../../models/admin-order-manufacturing.model';
import { adminManufacturingSnapshotRows } from '../../utils/admin-order-manufacturing.util';

@Component({
  selector: 'app-admin-order-manufacturing',
  standalone: true,
  imports: [],
  templateUrl: './admin-order-manufacturing.component.html',
  styleUrl: './admin-order-manufacturing.component.scss',
})
export class AdminOrderManufacturingComponent {
  snapshot = input.required<AdminOrderManufacturingSnapshot | null>();
  state = input.required<AdminManufacturingSnapshotState>();
  text = ADMIN_MANUFACTURING_SNAPSHOT_TEXT;
  message = computed(() => ADMIN_MANUFACTURING_SNAPSHOT_MESSAGES[this.state()]);
  rows = computed(() => adminManufacturingSnapshotRows(this.snapshot()));
}
