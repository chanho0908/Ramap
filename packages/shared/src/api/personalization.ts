import { supabase } from './supabase';
import type {
  UserHiddenShopRow,
  UserShopBookmarkRow,
  UserShopPersonalization,
} from '../types';

interface SupabaseErrorLike {
  code?: string;
  message?: string;
}

function isMissingPersonalizationTableError(
  error: SupabaseErrorLike | null
): boolean {
  if (!error) {
    return false;
  }

  return (
    error.code === 'PGRST205' ||
    error.message?.includes('Could not find the table') === true
  );
}

export async function fetchUserShopPersonalization(
  userId: string
): Promise<UserShopPersonalization> {
  const [bookmarksResult, hiddenShopsResult] = await Promise.all([
    supabase
      .from('user_shop_bookmarks')
      .select('shop_id')
      .eq('user_id', userId),
    supabase.from('user_hidden_shops').select('shop_id').eq('user_id', userId),
  ]);

  const isMissingBookmarkTable = isMissingPersonalizationTableError(
    bookmarksResult.error
  );
  const isMissingHiddenTable = isMissingPersonalizationTableError(
    hiddenShopsResult.error
  );

  if (bookmarksResult.error && !isMissingBookmarkTable) {
    throw new Error(
      `북마크한 Shop 목록을 가져올 수 없습니다: ${bookmarksResult.error.message}`
    );
  }

  if (hiddenShopsResult.error && !isMissingHiddenTable) {
    throw new Error(
      `숨긴 Shop 목록을 가져올 수 없습니다: ${hiddenShopsResult.error.message}`
    );
  }

  return {
    bookmarkedShopIds: isMissingBookmarkTable
      ? []
      : ((bookmarksResult.data ?? []) as UserShopBookmarkRow[]).map(
          (row) => row.shop_id
        ),
    hiddenShopIds: isMissingHiddenTable
      ? []
      : ((hiddenShopsResult.data ?? []) as UserHiddenShopRow[]).map(
          (row) => row.shop_id
        ),
  };
}

export async function addShopBookmark(shopId: string): Promise<void> {
  const { error } = await supabase.from('user_shop_bookmarks').upsert(
    {
      shop_id: shopId,
    },
    { onConflict: 'user_id,shop_id', ignoreDuplicates: true }
  );

  if (error) {
    throw new Error(`Shop 북마크를 저장할 수 없습니다: ${error.message}`);
  }
}

export async function removeShopBookmark(shopId: string): Promise<void> {
  const { error } = await supabase
    .from('user_shop_bookmarks')
    .delete()
    .eq('shop_id', shopId);

  if (error) {
    throw new Error(`Shop 북마크를 해제할 수 없습니다: ${error.message}`);
  }
}

export async function hideShop(shopId: string): Promise<void> {
  const { error } = await supabase.from('user_hidden_shops').upsert(
    {
      shop_id: shopId,
    },
    { onConflict: 'user_id,shop_id', ignoreDuplicates: true }
  );

  if (error) {
    throw new Error(`Shop을 숨길 수 없습니다: ${error.message}`);
  }
}

export async function unhideShop(shopId: string): Promise<void> {
  const { error } = await supabase
    .from('user_hidden_shops')
    .delete()
    .eq('shop_id', shopId);

  if (error) {
    throw new Error(`숨긴 Shop을 복원할 수 없습니다: ${error.message}`);
  }
}
