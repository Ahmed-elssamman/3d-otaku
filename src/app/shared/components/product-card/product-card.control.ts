import { ProductCategory } from '@core/enums/product-category.enum';
import { ProductBadge } from '@core/enums/product-badge.enum';

export interface CategoryPresentation {
  value: string;
  label: string;
  icon: string;
}
export interface BadgePresentation {
  value: ProductBadge;
  label: string;
}
export const CATEGORY_PRESENTATION: CategoryPresentation[] = [
  { value: ProductCategory.ALL, label: 'كل المنتجات', icon: 'pi pi-th-large' },
  { value: ProductCategory.SWORDS, label: 'سيوف وخناجر للعرض', icon: 'pi pi-bolt' },
  { value: 'Anime Swords', label: 'سيوف للعرض', icon: 'pi pi-bolt' },
  { value: ProductCategory.DAGGERS, label: 'خناجر للعرض', icon: 'pi pi-bolt' },
  { value: ProductCategory.ANIME_FIGURES, label: 'مجسمات أنمي', icon: 'pi pi-star' },
  { value: ProductCategory.COLLECTIBLES, label: 'مجسمات ومقتنيات', icon: 'pi pi-box' },
  { value: ProductCategory.DESK_MODELS, label: 'إكسسوارات المكتب', icon: 'pi pi-desktop' },
  { value: ProductCategory.COSPLAY_PROPS, label: 'إكسسوارات كوسبلاي', icon: 'pi pi-palette' },
  { value: ProductCategory.CUSTOM_ORDERS, label: 'طباعة مخصصة', icon: 'pi pi-sparkles' },
];
export const PRODUCT_BADGE_LABELS: BadgePresentation[] = [
  { value: ProductBadge.NEW, label: 'جديد' },
  { value: ProductBadge.FEATURED, label: 'من اختياراتنا' },
];
