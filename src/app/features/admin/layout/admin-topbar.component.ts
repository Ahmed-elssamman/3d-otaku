import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-admin-topbar',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './admin-topbar.component.html',
  styleUrl: './admin-topbar.component.scss'
})
export class AdminTopbarComponent {
  pageTitle = input.required<string>();
  adminName = input.required<string>();
  toggleSidebar = output<void>();
}
