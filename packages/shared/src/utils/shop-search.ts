import type { Shop } from '../types';

export function normalizeShopSearchQuery(query: string): string {
  return query.trim().toLowerCase();
}

export function filterShopsByQuery(shops: Shop[], query: string): Shop[] {
  const normalizedQuery = normalizeShopSearchQuery(query);

  if (!normalizedQuery) {
    return shops;
  }

  return shops.filter((shop) => {
    const searchableText = [
      shop.name,
      shop.address,
      shop.phone,
      shop.businessHours,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return searchableText.includes(normalizedQuery);
  });
}
