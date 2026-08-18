export interface HomeContentItem {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export interface HomeFaqItem {
  id: string;
  question: string;
  answer: string;
}

export const HOME_HERO_FALLBACK_IMAGE = 'assets/anime/tanjiro-hero-1280.jpg';
export const HOME_HERO_FALLBACK_SRCSET = 'assets/anime/tanjiro-hero-768.jpg 768w, assets/anime/tanjiro-hero-1280.jpg 1280w, assets/anime/tanjiro-hero-1920.jpg 1920w';
export const HOME_HERO_TITLE = 'Your favorite character, made for your world.';
export const HOME_HERO_SUBTITLE = 'Browse ready designs or send us your idea. Each made-to-order piece is produced according to the selected size, material, color, and finish.';

export const SHOP_INTENT_ITEMS: HomeContentItem[] = [
  { id: 'setup', title: 'Gaming setup and desk models', description: 'Find display pieces sized for desks, shelves, and gaming spaces.', icon: 'pi pi-desktop' },
  { id: 'gifts', title: 'Gifts for anime fans', description: 'Compare compact collectibles and display-ready designs.', icon: 'pi pi-gift' },
  { id: 'cosplay', title: 'Cosplay props', description: 'Review dimensions, material, weight, and each product safety note before ordering.', icon: 'pi pi-user' },
  { id: 'collectibles', title: 'Collectibles', description: 'Browse figures, emblems, accessories, and shelf pieces.', icon: 'pi pi-star' },
  { id: 'custom', title: 'Custom designs', description: 'Send a model link or idea for printability, rights, price, and production review.', icon: 'pi pi-sparkles' }
];

export const MADE_TO_ORDER_STEPS: HomeContentItem[] = [
  { id: 'choose', title: 'Choose the product', description: 'Review the available size, material, color, finish, and media.', icon: 'pi pi-search' },
  { id: 'confirm', title: 'Confirm the order', description: 'The store verifies availability, final price, and the applicable production estimate.', icon: 'pi pi-check-circle' },
  { id: 'produce', title: 'Production begins', description: 'Made-to-order products are manufactured after confirmation, then prepared for delivery.', icon: 'pi pi-cog' }
];

export const CUSTOM_ORDER_STEPS: HomeContentItem[] = [
  { id: 'send', title: 'Send your idea', description: 'Share a MakerWorld link, another permitted model link, or a written reference.', icon: 'pi pi-send' },
  { id: 'review', title: 'We review feasibility', description: 'The design, dimensions, material, file rights, and production requirements are checked.', icon: 'pi pi-eye' },
  { id: 'quote', title: 'Continue with a quote', description: 'If feasible, continue on WhatsApp to confirm price and production time.', icon: 'pi pi-whatsapp' }
];

export const QUALITY_POINTS: HomeContentItem[] = [
  { id: 'specs', title: 'Product-specific information', description: 'Materials, dimensions, finishes, and safety notes come from each product record.', icon: 'pi pi-list' },
  { id: 'inspect', title: 'Inspect before ordering', description: 'Use photos first and activate 3D only when a supported model is available.', icon: 'pi pi-images' },
  { id: 'review', title: 'Confirmation before production', description: 'Production and delivery are separate stages, with details confirmed for the selected product.', icon: 'pi pi-verified' }
];

export const HOME_FAQ_ITEMS: HomeFaqItem[] = [
  { id: 'made-to-order', question: 'When does production start?', answer: 'For products marked made to order, production starts after order confirmation. Check the product page for any configured estimate.' },
  { id: 'shipping', question: 'Is production time the same as delivery time?', answer: 'No. Production covers manufacturing; delivery begins after the product is ready. Delivery details are confirmed separately.' },
  { id: 'custom', question: 'Does sending a custom design confirm an order?', answer: 'No. A custom request is reviewed for printability, dimensions, rights, price, and production requirements before it can be accepted.' },
  { id: 'viewer', question: 'Do I need the 3D viewer to order?', answer: 'No. Product photos and written specifications remain available if WebGL or a model file cannot load.' }
];
