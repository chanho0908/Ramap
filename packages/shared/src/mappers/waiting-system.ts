import type { ShopWaitingSystem, ShopWaitingSystemRow } from '../types';

function optional<T>(value: T | null): T | undefined {
  return value ?? undefined;
}

export function mapShopWaitingSystemRowToShopWaitingSystem(
  row: ShopWaitingSystemRow
): ShopWaitingSystem {
  return {
    id: row.id,
    shopId: row.shop_id,
    provider: row.provider,
    providerUrl: optional(row.provider_url),
  };
}
