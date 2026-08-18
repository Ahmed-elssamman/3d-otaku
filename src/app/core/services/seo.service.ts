import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { AdminSettingsService } from '../../features/admin/services/admin-settings.service';
import { Product } from '../models/product.model';

@Injectable({
  providedIn: 'root'
})
export class SeoService {
  private readonly titleService = inject(Title);
  private readonly metaService = inject(Meta);
  private readonly adminSettingsService = inject(AdminSettingsService);
  private document = inject(DOCUMENT);

  setTitle(pageTitle: string): void {
    const settings = this.adminSettingsService.getSettings();
    const fullTitle = pageTitle ? `${pageTitle} | ${settings.brandName}` : `${settings.brandName} - ${settings.slogan}`;
    this.titleService.setTitle(fullTitle);
    this.metaService.updateTag({ property: 'og:title', content: fullTitle });
    this.setCanonicalUrl(this.document.location.href.split('?')[0].split('#')[0]);
    this.document.getElementById('product-structured-data')?.remove();
    this.document.getElementById('breadcrumb-structured-data')?.remove();
  }

  setMetaDescription(description: string): void {
    this.metaService.updateTag({ name: 'description', content: description });
    this.metaService.updateTag({ property: 'og:description', content: description });
  }

  setProductMetadata(product: Product, currency: string): void {
    const settings = this.adminSettingsService.getSettings();
    const title = product.metaTitle?.trim() || product.name;
    const description = product.metaDescription?.trim() || product.shortDescription || product.description;
    const pageUrl = `${this.document.location.origin}/products/${encodeURIComponent(product.slug)}`;
    const image = product.socialImage?.trim() || product.image?.trim() || product.posterImage?.trim() || '';
    const discount = product.discountPrice;
    const price = typeof discount === 'number' && discount >= 0 && discount < product.price ? discount : product.price;

    this.setTitle(title);
    this.setMetaDescription(description);
    this.metaService.updateTag({ property: 'og:title', content: `${title} | ${settings.brandName}` });
    this.metaService.updateTag({ property: 'og:type', content: 'product' });
    this.metaService.updateTag({ property: 'og:url', content: pageUrl });
    if (image) {
      this.metaService.updateTag({ property: 'og:image', content: image });
    } else {
      this.metaService.removeTag("property='og:image'");
    }
    this.setCanonicalUrl(pageUrl);

    const productSchema = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      description,
      ...(image ? { image: [image] } : {}),
      ...(currency ? { offers: { '@type': 'Offer', url: pageUrl, price, priceCurrency: currency } } : {})
    };
    const breadcrumbSchema = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Products', item: `${this.document.location.origin}/products` },
        { '@type': 'ListItem', position: 2, name: product.name, item: pageUrl }
      ]
    };
    this.setStructuredData('product-structured-data', productSchema);
    this.setStructuredData('breadcrumb-structured-data', breadcrumbSchema);
  }

  private setCanonicalUrl(url: string): void {
    let link = this.document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.document.createElement('link');
      link.rel = 'canonical';
      this.document.head.appendChild(link);
    }
    link.href = url;
  }

  private setStructuredData(id: string, data: object): void {
    this.document.getElementById(id)?.remove();
    const script = this.document.createElement('script');
    script.id = id;
    script.type = 'application/ld+json';
    script.text = JSON.stringify(data);
    this.document.head.appendChild(script);
  }
}
