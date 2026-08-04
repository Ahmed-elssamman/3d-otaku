import { CategoryItem } from '@core/models/category.model';
import { ProductCategory } from '@core/enums/product-category.enum';

export interface ValueProp {
  title: string;
  description: string;
  icon: string;
  badge: string;
}

export const CATEGORIES_DATA: CategoryItem[] = [
  {
    id: 'cat-1',
    name: ProductCategory.SWORDS,
    description: '1:1 replica anime swords, katanas, and display blades for true fans.',
    icon: 'pi pi-compass',
    itemCount: 14,
    featuredImageUrl: 'assets/images/categories/swords.webp'
  },
  {
    id: 'cat-2',
    name: ProductCategory.DAGGERS,
    description: 'Intricate demon blades, kunai sets, and tactical anime daggers.',
    icon: 'pi pi-shield',
    itemCount: 9,
    featuredImageUrl: 'assets/images/categories/daggers.webp'
  },
  {
    id: 'cat-3',
    name: ProductCategory.COSPLAY_PROPS,
    description: 'Wearable masks, emblems, and lightweight convention cosplay accessories.',
    icon: 'pi pi-user',
    itemCount: 12,
    featuredImageUrl: 'assets/images/categories/cosplay.webp'
  },
  {
    id: 'cat-4',
    name: ProductCategory.DESK_MODELS,
    description: 'Articulated desk dragons, figurines, and setup centerpiece models.',
    icon: 'pi pi-desktop',
    itemCount: 18,
    featuredImageUrl: 'assets/images/categories/desk.webp'
  },
  {
    id: 'cat-5',
    name: ProductCategory.COLLECTIBLES,
    description: 'Wall mount emblems, badges, and anime display stands.',
    icon: 'pi pi-star',
    itemCount: 11,
    featuredImageUrl: 'assets/images/categories/collectibles.webp'
  },
  {
    id: 'cat-6',
    name: ProductCategory.CUSTOM_ORDERS,
    description: 'Print your own custom 3D model with customized dimensions and finishes.',
    icon: 'pi pi-sparkles',
    itemCount: 99,
    featuredImageUrl: 'assets/images/categories/custom.webp'
  }
];

export const VALUE_PROPS: ValueProp[] = [
  {
    title: 'Custom Anime Designs',
    description: 'Original and fan-inspired 3D models created specifically for high-definition display.',
    icon: 'pi pi-palette',
    badge: 'Artistry'
  },
  {
    title: 'High-Quality PLA Prints',
    description: 'Printed using high-density eco-friendly PLA and PLA+ for structural strength and sleek detail.',
    icon: 'pi pi-box',
    badge: 'Durability'
  },
  {
    title: 'Cosplay-Ready Props',
    description: '100% decorative, lightweight, non-sharp display items safe for anime conventions.',
    icon: 'pi pi-shield',
    badge: 'Convention Safe'
  },
  {
    title: 'One-Color Matte Finish',
    description: 'Clean monochrome matte aesthetic ready for display or custom hand-painting.',
    icon: 'pi pi-sparkles',
    badge: 'Premium Style'
  },
  {
    title: 'Custom Print Requests',
    description: 'Upload your reference image or STL file requirements for bespoke 3D production.',
    icon: 'pi pi-cog',
    badge: 'On Demand'
  },
  {
    title: 'Fast WhatsApp Support',
    description: 'Direct communication via WhatsApp for instant status updates and custom quotes.',
    icon: 'pi pi-whatsapp',
    badge: 'Direct Chat'
  }
];
