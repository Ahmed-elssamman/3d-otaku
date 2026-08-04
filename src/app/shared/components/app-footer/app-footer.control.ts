export interface FooterLinkGroup {
  title: string;
  links: { label: string; url: string; external?: boolean }[];
}

export const FOOTER_LINK_GROUPS: FooterLinkGroup[] = [
  {
    title: 'Explore Categories',
    links: [
      { label: 'Anime Swords', url: '/products?category=Anime%20Swords' },
      { label: 'Daggers & Tanto', url: '/products?category=Daggers' },
      { label: 'Cosplay Props', url: '/products?category=Cosplay%20Props' },
      { label: 'Desk Models', url: '/products?category=Desk%20Models' },
      { label: 'Collectibles', url: '/products?category=Collectibles' }
    ]
  },
  {
    title: 'Company',
    links: [
      { label: 'About 3D Otaku', url: '/about' },
      { label: 'Custom 3D Printing', url: '/contact' },
      { label: 'Safety Guidelines', url: '/about' },
      { label: 'Contact Us', url: '/contact' }
    ]
  }
];
