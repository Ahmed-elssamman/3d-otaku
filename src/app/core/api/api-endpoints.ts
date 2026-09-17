export const API_ENDPOINTS = {
  auth: {
    register: '/auth/register',
    login: '/auth/login',
    me: '/auth/me',
    refreshToken: '/auth/refresh-token',
    logout: '/auth/logout',
  },
  products: {
    list: '/products',
    featured: '/products/featured',
    categories: '/products/categories',
    details: (slug: string) => `/products/${slug}`,
  },
  cart: {
    get: '/cart',
    add: '/cart/items',
    update: (itemId: string) => `/cart/items/${itemId}`,
    remove: (itemId: string) => `/cart/items/${itemId}`,
    clear: '/cart/clear',
  },
  orders: {
    quote: '/orders/quote',
    create: '/orders',
    list: '/orders',
    details: (id: string) => `/orders/${id}`,
    track: (orderNumber: string) => `/orders/track/${orderNumber}`,
    adminList: '/admin/orders',
    adminUpdateStatus: (id: string) => `/admin/orders/${id}/status`,
  },
  admin: {
    products: {
      list: '/admin/products',
      categories: '/admin/products/categories',
      details: (id: string) => `/admin/products/${id}`,
      create: '/admin/products',
      update: (id: string) => `/admin/products/${id}`,
      delete: (id: string) => `/admin/products/${id}`,
      status: (id: string) => `/admin/products/${id}/status`,
      featured: (id: string) => `/admin/products/${id}/featured`,
      duplicate: (id: string) => `/admin/products/${id}/duplicate`,
    },
    dashboard: {
      stats: '/admin/dashboard/stats',
      recentProducts: '/admin/dashboard/recent-products',
    },
    settings: {
      get: '/admin/settings',
      update: '/admin/settings',
      reset: '/admin/settings/reset',
    },
  },
  settings: {
    public: '/settings/public',
  },
  customOrders: {
    create: '/custom-orders',
    adminList: '/admin/custom-orders',
    updateStatus: (id: string) => `/admin/custom-orders/${id}/status`,
  },
  uploads: {
    image: '/admin/uploads/image',
    model: '/admin/uploads/model',
  },
  contactMessages: {
    create: '/contact-messages',
    adminList: '/admin/contact-messages',
    markRead: (id: string) => `/admin/contact-messages/${id}/read`,
  },
} as const;
