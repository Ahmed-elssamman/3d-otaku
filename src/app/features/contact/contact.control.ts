export interface SelectOption {
  label: string;
  value: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export const DESIGN_SOURCE_OPTIONS: SelectOption[] = [
  { label: 'MakerWorld URL', value: 'makerworld-url' },
  { label: 'Other model URL', value: 'other-model-url' },
  { label: 'Reference image link', value: 'reference-image' },
  { label: 'Written idea', value: 'written-idea' }
];

export const PRODUCT_TYPE_OPTIONS: SelectOption[] = [
  { label: 'Display model or figure', value: 'display-model' },
  { label: 'Desk or gaming setup piece', value: 'desk-model' },
  { label: 'Cosplay prop', value: 'cosplay-prop' },
  { label: 'Gift or collectible', value: 'collectible' },
  { label: 'Other use', value: 'other' }
];

export const MATERIAL_OPTIONS: SelectOption[] = [
  { label: 'Not sure — please advise', value: '' },
  { label: 'PLA', value: 'PLA' },
  { label: 'PLA+', value: 'PLA+' },
  { label: 'PETG', value: 'PETG' },
  { label: 'Resin', value: 'Resin' },
  { label: 'Other', value: 'Other' }
];

export const CUSTOM_FAQ_ITEMS: FaqItem[] = [
  { id: 'commitment', question: 'Does sending a request commit me to purchase?', answer: 'No. The request must first be reviewed for feasibility, rights, price, and production requirements.' },
  { id: 'makerworld', question: 'Can I send a MakerWorld model?', answer: 'You can send the model page as a discovery reference. Each model has its own license, and some licenses do not allow commercial printing.' },
  { id: 'files', question: 'Can I upload an STL here?', answer: 'This storefront does not currently expose a secure private-file upload endpoint for custom requests. Use a permitted model URL or continue with the store after review.' },
  { id: 'timing', question: 'When will I receive price and production time?', answer: 'Those details are provided after the store reviews the design and confirms it can be manufactured.' }
];
