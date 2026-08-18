export interface HeroStat {
  value: string;
  label: string;
  icon: string;
}

export const HERO_STATS: HeroStat[] = [
  { value: 'Per product', label: 'Material and finish', icon: 'pi pi-check-circle' },
  { value: '3D Preview', label: 'Interactive Model Viewer', icon: 'pi pi-box' },
  { value: 'Cosplay Prop', label: 'Safe & Non-Sharp', icon: 'pi pi-shield' },
  { value: 'Custom Prints', label: 'WhatsApp Direct Quotes', icon: 'pi pi-whatsapp' }
];
