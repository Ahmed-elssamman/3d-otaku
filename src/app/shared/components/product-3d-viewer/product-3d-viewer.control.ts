export interface ViewerFeature {
  icon: string;
  label: string;
}

export interface ViewerRenderSettings {
  autoRotateSpeed: number;
  backgroundEmberCount: number;
  maxPixelRatio: number;
}

export interface ModelColorOption {
  name: string;
  hex: string;
}

export const MODEL_COLOR_OPTIONS: ModelColorOption[] = [
  { name: 'White Silk', hex: '#f8fafc' },
  { name: 'Obsidian Black', hex: '#18181b' },
  { name: 'Crimson Red', hex: '#dc2626' },
  { name: 'Imperial Gold', hex: '#d97706' },
  { name: 'Cyber Purple', hex: '#9333ea' },
  { name: 'Royal Blue', hex: '#2563eb' },
  { name: 'Emerald Green', hex: '#059669' },
  { name: 'Silver Steel', hex: '#94a3b8' },
  { name: 'Flame Orange', hex: '#ea580c' }
];

export const VIEWER_FEATURES: ViewerFeature[] = [
  { icon: 'pi pi-sync', label: '360° View' },
  { icon: 'pi pi-search-plus', label: 'Ultra Zoom' },
  { icon: 'pi pi-palette', label: 'Custom Colors' }
];

export const VIEWER_RENDER_SETTINGS: ViewerRenderSettings = {
  autoRotateSpeed: 1.35,
  backgroundEmberCount: 90,
  maxPixelRatio: 2
};

