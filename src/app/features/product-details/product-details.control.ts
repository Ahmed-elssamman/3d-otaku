export enum ProductDisplayMode {
  IMAGE = 'image',
  MODEL = 'model'
}

export interface ProductDisplaySpec {
  id: string;
  label: string;
  value: string;
}
