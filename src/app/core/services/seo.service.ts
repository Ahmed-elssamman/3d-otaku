import { DOCUMENT } from '@angular/common';
import { Injectable, RESPONSE_INIT, inject } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { AdminSettingsService } from '../../features/admin/services/admin-settings.service';
import { Product } from '../models/product.model';
import { SITE_ORIGIN } from '../api/site-origin.token';

@Injectable({
  providedIn: 'root',
})
export class SeoService {
  private titleService = inject(Title);
  private metaService = inject(Meta);
  private adminSettingsService = inject(AdminSettingsService);
  private document = inject(DOCUMENT);
  private siteOrigin = inject(SITE_ORIGIN);
  private response = inject(RESPONSE_INIT, { optional: true });

  setResponseStatus(status: number): void {
    if (this.response) this.response.status = status;
    this.metaService.updateTag({
      name: 'robots',
      content: status >= 400 ? 'noindex, follow' : 'index, follow',
    });
  }

  setTitle(pageTitle: string): void {
    const pageUrl = new URL(this.document.location.pathname, this.siteOrigin).href;
    const settings = this.adminSettingsService.getSettings();
    const fullTitle = pageTitle
      ? `${pageTitle} | ${settings.brandName}`
      : `${settings.brandName} - ${settings.slogan}`;
    this.titleService.setTitle(fullTitle);
    this.metaService.updateTag({ property: 'og:title', content: fullTitle });
    this.metaService.updateTag({ property: 'og:type', content: 'website' });
    this.metaService.updateTag({
      property: 'og:url',
      content: pageUrl,
    });
    this.metaService.updateTag({ name: 'robots', content: 'index, follow' });
    this.metaService.removeTag("property='og:image'");
    this.setCanonicalUrl(pageUrl);
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
    const description =
      product.metaDescription?.trim() || product.shortDescription || product.description;
    const pageUrl = `${this.siteOrigin}/products/${encodeURIComponent(product.slug)}`;
    const imagePath =
      product.socialImage?.trim() || product.image?.trim() || product.posterImage?.trim() || '';
    const image = imagePath ? new URL(imagePath, this.siteOrigin).href : '';
    const discount = product.discountPrice;
    const price =
      typeof discount === 'number' && discount >= 0 && discount < product.price
        ? discount
        : product.price;

    this.setTitle(title);
    this.setMetaDescription(description);
    this.metaService.updateTag({
      property: 'og:title',
      content: `${title} | ${settings.brandName}`,
    });
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
      ...(currency
        ? { offers: { '@type': 'Offer', url: pageUrl, price, priceCurrency: currency } }
        : {}),
    };
    const breadcrumbSchema = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'المنتجات',
          item: `${this.siteOrigin}/products`,
        },
        { '@type': 'ListItem', position: 2, name: product.name, item: pageUrl },
      ],
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
    script.text = JSON.stringify(data).replace(/</g, '\\u003c');
    this.document.head.appendChild(script);
  }
}
