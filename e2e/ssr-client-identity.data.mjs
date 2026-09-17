export const IDENTITY_QA = {
  publicOrigin: 'https://ssr-identity.example.test',
  clientA: '198.51.100.17',
  clientB: '203.0.113.28',
  forgedClient: '192.0.2.99',
  secondForgedClient: '198.51.100.250',
  forgedPrefix: '/forged-prefix',
  credentialCanary: 'isolated-ssr-identity-credential-canary',
  trustedLoopback: '127.0.0.1/32',
  unrelatedProxies: '192.0.2.0/24',
  privatePaths: ['/cart', '/track', '/orders', '/login', '/register', '/admin/orders'],
};

export const MALFORMED_IDENTITY_HEADERS = [
  { label: 'missing header', values: [] },
  { label: 'repeated headers', values: ['198.51.100.17', '203.0.113.28'] },
  { label: 'combined chain', values: ['198.51.100.17, 203.0.113.28'] },
  { label: 'invalid literal', values: ['not-an-ip'] },
  { label: 'address with port', values: ['198.51.100.17:1234'] },
  { label: 'zone identifier', values: ['fe80::1%eth0'] },
];

const productDefaults = {
  category: 'اختبار محلي',
  shortDescription: 'بيانات اصطناعية لاختبار العرض فقط.',
  description: 'بيانات اصطناعية لاختبار العرض فقط.',
  price: 100,
  discountPrice: null,
  currency: 'EGP',
  image: '',
  gallery: [],
  tags: [],
  material: 'PLA',
  finish: '',
  color: '',
  size: '',
  weight: '',
  printTime: '',
  isMadeToOrder: false,
  isFeatured: false,
  isActive: true,
  safetyNote: '',
  configurationFingerprint: null,
  createdAt: '2026-09-17T00:00:00.000Z',
  updatedAt: '2026-09-17T00:00:00.000Z',
};

export const IDENTITY_PRODUCTS = [
  {
    ...productDefaults,
    id: 'identity-product-a',
    slug: 'identity-product-a',
    name: 'قطعة اختبار الهوية الأولى',
  },
  {
    ...productDefaults,
    id: 'identity-product-b',
    slug: 'identity-product-b',
    name: 'قطعة اختبار الهوية الثانية',
  },
];

export const IDENTITY_SETTINGS = {
  brandName: 'متجر اختبار الهوية',
  slogan: '',
  whatsappNumber: '',
  whatsappDefaultMessage: '',
  email: '',
  phone: '',
  address: '',
  facebookUrl: '',
  instagramUrl: '',
  tiktokUrl: '',
  youtubeUrl: '',
  heroTitle: '',
  heroSubtitle: '',
  heroImageUrl: '',
  defaultCurrency: 'EGP',
  deliveryNote: '',
  safetyNote: '',
  maintenanceMode: false,
  deliveryFee: null,
  deliveryDays: '',
};
