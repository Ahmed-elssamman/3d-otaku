import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '@core/services/seo.service';
import { NOT_FOUND_TEXT } from '../../not-found.control';
import { GlowButtonComponent } from '@shared/components/glow-button/glow-button.component';

@Component({
  selector: 'app-not-found-page',
  standalone: true,
  imports: [RouterLink, GlowButtonComponent],
  templateUrl: './not-found-page.component.html',
  styleUrl: './not-found-page.component.scss'
})
export class NotFoundPageComponent implements OnInit {
  private readonly seoService = inject(SeoService);
  readonly text = NOT_FOUND_TEXT;

  ngOnInit(): void {
    this.seoService.setTitle('404 - Page Not Found');
    this.seoService.setMetaDescription('The page you requested was not found on 3D Otaku.');
  }
}
