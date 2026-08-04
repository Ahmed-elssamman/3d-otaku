export interface FaqItem {
  question: string;
  answer: string;
}

export const PRODUCT_TYPE_OPTIONS: string[] = [
  'Custom Katana / Anime Sword',
  'Demon Dagger / Tanto',
  'Wearable Mask / Helm',
  'Articulated Desk Dragon / Figure',
  'Collectible Emblem / Wall Mount',
  'Other Custom 3D STL Print'
];

export const COLOR_FINISH_OPTIONS: string[] = [
  'Matte Black PLA+',
  'Pure White PLA+',
  'Dark Purple PLA+',
  'Crimson Red PLA+',
  'Silk Gold / Silver PLA',
  'Unpainted Raw Print'
];

export const CUSTOM_FAQ_ITEMS: FaqItem[] = [
  {
    question: 'How long does a custom 3D prop order take?',
    answer: 'Most custom orders take 2 to 5 business days for CAD modeling/slicing and high-density 3D printing.'
  },
  {
    question: 'Can I provide my own STL file for printing?',
    answer: 'Yes! If you already have an STL or OBJ file from Thingiverse or Cults3D, paste the link or send it over WhatsApp.'
  },
  {
    question: 'Are the swords and blades safe for conventions?',
    answer: 'Absolutely. All our props are 100% non-sharp plastic 3D prints made from eco PLA plastic designed for cosplay and display.'
  },
  {
    question: 'How do I pay for a custom 3D request?',
    answer: 'Once we review your dimensions and reference image on WhatsApp, we send a direct invoice link for approval.'
  }
];
