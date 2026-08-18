import { Component } from '@angular/core';
import { ConfirmDialog } from 'primeng/confirmdialog';

@Component({
  selector: 'app-admin-confirm-dialog',
  standalone: true,
  imports: [ConfirmDialog],
  templateUrl: './admin-confirm-dialog.component.html',
  styleUrl: './admin-confirm-dialog.component.scss'
})
export class AdminConfirmDialogComponent {}
