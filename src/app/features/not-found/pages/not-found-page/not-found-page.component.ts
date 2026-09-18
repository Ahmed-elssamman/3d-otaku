import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { SeoService } from '@core/services/seo.service';
import { NOT_FOUND_TEXT } from '../../not-found.control';

@Component({
  selector: 'app-not-found-page',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './not-found-page.component.html',
  styleUrl: './not-found-page.component.scss',
})
export class NotFoundPageComponent implements OnInit {
  private router = inject(Router);
  private seoService = inject(SeoService);
  text = NOT_FOUND_TEXT;
  searchControl = new FormControl('', { nonNullable: true });

  ngOnInit(): void {
    this.seoService.setTitle('الصفحة غير موجودة');
    this.seoService.setMetaDescription(
      'لم نجد الصفحة المطلوبة. عد إلى متجر 3D Otaku أو ابحث عن المنتجات المطبوعة ثلاثية الأبعاد.',
    );
    this.seoService.setResponseStatus(404);
  }

  onSearchSubmit(event: Event): void {
    event.preventDefault();
    const search = this.searchControl.value.trim();
    if (search) void this.router.navigate(['/products'], { queryParams: { search } });
  }
}
