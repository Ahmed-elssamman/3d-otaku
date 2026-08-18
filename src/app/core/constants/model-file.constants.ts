import { ProductModelType } from '../enums/product-model-type.enum';

export interface SupportedModelFormat {
  extension: string;
  label: string;
  type: ProductModelType;
}

export const SUPPORTED_MODEL_FORMATS: SupportedModelFormat[] = [
  { extension: '.glb', label: 'GLB', type: ProductModelType.GLB },
  { extension: '.gltf', label: 'GLTF', type: ProductModelType.GLTF },
  { extension: '.stl', label: 'STL', type: ProductModelType.STL },
  { extension: '.obj', label: 'OBJ', type: ProductModelType.OBJ },
  { extension: '.ply', label: 'PLY', type: ProductModelType.PLY }
];

export const MODEL_FILE_ACCEPT = SUPPORTED_MODEL_FORMATS
  .map(format => format.extension)
  .join(',');

export const SUPPORTED_MODEL_FORMATS_LABEL = SUPPORTED_MODEL_FORMATS
  .map(format => format.label)
  .join(' · ');

export const MAX_MODEL_UPLOAD_SIZE_BYTES = 100 * 1024 * 1024;
export const MAX_MODEL_UPLOAD_SIZE_LABEL = '100 MB';

export function getModelTypeFromPath(path: string): ProductModelType | null {
  const cleanPath = path.toLowerCase().split('?')[0].split('#')[0];
  const match = SUPPORTED_MODEL_FORMATS.find(format => cleanPath.endsWith(format.extension));
  return match?.type ?? null;
}
