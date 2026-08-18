# Storefront production contract gaps

The Angular storefront now consumes the deployed API without fabricating missing data. The following backend capabilities remain required for the complete production experience.

## Product schema

Add these optional, backward-compatible fields to public and admin product responses and to admin create/update validation:

```ts
isMadeToOrder?: boolean;
productionTimeMin?: number;
productionTimeMax?: number;
productionTimeUnit?: 'hours' | 'business-days';
imageAlt?: string;
socialImage?: string;
currency?: string;
reviewCount?: number;
```

Validation requirements:

- `productionTimeMin` and `productionTimeMax` are positive when `isMadeToOrder` is true.
- `productionTimeMax` is greater than or equal to `productionTimeMin`.
- `discountPrice` is non-negative and lower than `price`.
- Slugs are canonical, unique, and return a conflict response that the admin form can display.
- `rating` must not be exposed as a customer-review rating unless it comes from a genuine review aggregate with `reviewCount`.
- Active/deleted filtering is enforced server-side for public endpoints and the sitemap.

A migration should add nullable fields with no synthetic defaults. Existing products must remain valid and must not be marked made-to-order automatically.

## Store settings

`GET /settings/public` should expose configured values for:

- `defaultCurrency`
- `whatsappNumber`
- `deliveryFee` when a fixed fee genuinely applies
- `deliveryDays` or an equivalent configured delivery estimate
- `deliveryNote`
- social URLs only when they are real

Empty values are supported by the frontend and cause the related claim or link to be hidden.

## Orders

The order API remains authoritative for price, discount, delivery fee, currency, and final total. It should:

- accept product IDs and quantities, re-fetch active products, and reject stale or inactive items;
- calculate money using integer minor units or decimal arithmetic;
- return `subtotal`, `deliveryFee`, `discount`, `total`, `currency`, `paymentMethod`, and pagination `meta`;
- support an idempotency key for order creation;
- optionally return real `statusHistory` items with status, timestamp, and public note;
- never trust frontend totals as authoritative values.

## Custom requests

The existing endpoint can store the legacy request fields. Structured support is still needed for `designSource`, `quantity`, `preferredMaterial`, `rightsConfirmed`, private file references, and a customer-facing request number.

A secure file endpoint must validate extension, MIME signature, file size, and malware/content policy server-side; keep files private; and return an opaque reference rather than a public storage key. Until that exists, the storefront intentionally accepts HTTPS references only and does not claim to upload STL files.

## SEO and localization

The client now emits truthful product and breadcrumb structured data. Complete indexing still requires an Angular SSR/prerender deployment strategy, a backend-generated active-product sitemap, canonical host configuration, and correct 404 HTTP status handling. The repository currently has no translation-file/runtime localization architecture; full Arabic content localization remains a separate platform requirement even though new layouts use logical direction utilities and order statuses include English/Arabic labels.
