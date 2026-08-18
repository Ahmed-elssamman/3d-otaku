export interface ViewerFeature {
  icon: string;
  label: string;
}

export interface ViewerRenderSettings {
  autoRotateSpeed: number;
  backgroundEmberCount: number;
  maxPixelRatio: number;
}

export const VIEWER_FEATURES: ViewerFeature[] = [
  { icon: 'pi pi-sync', label: '360° View' },
  { icon: 'pi pi-search-plus', label: 'Ultra Zoom' },
  { icon: 'pi pi-palette', label: 'Original Material' }
];

export const VIEWER_RENDER_SETTINGS: ViewerRenderSettings = {
  autoRotateSpeed: 1.35,
  backgroundEmberCount: 90,
  maxPixelRatio: 2
};
