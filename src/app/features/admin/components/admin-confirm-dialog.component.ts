import { Component } from '@angular/core';
import { ConfirmDialog } from 'primeng/confirmdialog';

@Component({
  selector: 'app-admin-confirm-dialog',
  standalone: true,
  imports: [ConfirmDialog],
  template: '<p-confirmdialog styleClass="admin-confirm-dialog" />'
})
export class AdminConfirmDialogComponent {}
