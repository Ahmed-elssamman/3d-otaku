export interface ViewerRenderSettings {
  autoRotateSpeed: number;
  maxPixelRatio: number;
}

export interface ModelColorOption {
  name: string;
  hex: string;
  lightCheck: boolean;
}

export const MODEL_COLOR_OPTIONS: ModelColorOption[] = [
  { name: 'أبيض', hex: '#f8fafc', lightCheck: false },
  { name: 'أسود', hex: '#18181b', lightCheck: true },
  { name: 'أحمر', hex: '#dc2626', lightCheck: true },
  { name: 'ذهبي', hex: '#d97706', lightCheck: false },
  { name: 'بنفسجي', hex: '#9333ea', lightCheck: true },
  { name: 'أزرق', hex: '#2563eb', lightCheck: true },
  { name: 'أخضر', hex: '#059669', lightCheck: false },
  { name: 'رمادي', hex: '#94a3b8', lightCheck: false },
  { name: 'برتقالي', hex: '#ea580c', lightCheck: false },
];

export const VIEWER_RENDER_SETTINGS: ViewerRenderSettings = {
  autoRotateSpeed: 1,
  maxPixelRatio: 2,
};
