import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppHeaderComponent } from '@shared/components/app-header/app-header.component';
import { AppFooterComponent } from '@shared/components/app-footer/app-footer.component';
import { AdminSettingsService } from '../../../features/admin/services/admin-settings.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, AppHeaderComponent, AppFooterComponent],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss'
})
export class MainLayoutComponent implements OnInit {
  private settingsService = inject(AdminSettingsService);

  ngOnInit(): void {
    this.settingsService.getPublicSettings().subscribe();
  }
}
