/**
 * 가게 정보창 컴포넌트
 */

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { fetchShopWaitingSystem, getMenuCategoryLabel } from '@ramap/shared';
import type { Shop, ShopWaitingSystem, WaitingProvider } from '@ramap/shared';

interface ShopInfoWindowProps {
  shop: Shop;
  isBookmarked: boolean;
  isHidden: boolean;
  isPersonalizationSubmitting: boolean;
  onClose: () => void;
  onToggleBookmark: (shop: Shop) => void;
  onToggleHidden: (shop: Shop) => void;
}

interface WaitingProviderDisplay {
  label: string;
  iconSrc: string;
}

const WAITING_PROVIDER_DISPLAY: Partial<
  Record<WaitingProvider, WaitingProviderDisplay>
> = {
  catchtable: {
    label: '캐치테이블',
    iconSrc: '/waiting-providers/catchtable.png',
  },
  tabling: {
    label: '테이블링',
    iconSrc: '/waiting-providers/tabling.png',
  },
  syrup_friends: {
    label: '시럽 프렌즈',
    iconSrc: '/waiting-providers/syrup-friends.png',
  },
};

function getWaitingProviderLink(
  waitingSystem: ShopWaitingSystem | null
): (WaitingProviderDisplay & { providerUrl: string }) | null {
  if (!waitingSystem?.providerUrl) {
    return null;
  }

  const providerDisplay = WAITING_PROVIDER_DISPLAY[waitingSystem.provider];
  if (!providerDisplay) {
    return null;
  }

  return {
    ...providerDisplay,
    providerUrl: waitingSystem.providerUrl,
  };
}

function BookmarkIcon({ isActive }: { isActive: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill={isActive ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    >
      <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2Z" />
    </svg>
  );
}

function HiddenIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    >
      <path d="M10.7 5.1A10.4 10.4 0 0 1 12 5c5 0 8.6 4.4 10 7a17 17 0 0 1-2.1 3.1" />
      <path d="M6.6 6.7A16.8 16.8 0 0 0 2 12c1.4 2.6 5 7 10 7a9.8 9.8 0 0 0 5.4-1.7" />
      <path d="M2 2l20 20" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </svg>
  );
}

/**
 * 지도 위에 표시되는 가게 정보창
 *
 * @example
 * ```tsx
 * {selectedShop && (
 *   <ShopInfoWindow
 *     shop={selectedShop}
 *     onClose={() => setSelectedShop(null)}
 *   />
 * )}
 * ```
 */
export function ShopInfoWindow({
  shop,
  isBookmarked,
  isHidden,
  isPersonalizationSubmitting,
  onClose,
  onToggleBookmark,
  onToggleHidden,
}: ShopInfoWindowProps) {
  const menuCategories = shop.menuCategoryIds.map((categoryId) => ({
    id: categoryId,
    label: getMenuCategoryLabel(categoryId),
  }));
  const [waitingSystem, setWaitingSystem] = useState<ShopWaitingSystem | null>(
    null
  );

  useEffect(() => {
    let isMounted = true;

    setWaitingSystem(null);

    async function loadWaitingSystem() {
      const data = await fetchShopWaitingSystem(shop.id);

      if (isMounted) {
        setWaitingSystem(data);
      }
    }

    loadWaitingSystem();

    return () => {
      isMounted = false;
    };
  }, [shop.id]);

  const waitingProviderLink = getWaitingProviderLink(waitingSystem);

  return (
    <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-white rounded-xl shadow-2xl p-5 w-11/12 max-w-md z-30 animate-fade-in border border-gray-100">
      {/* 닫기 버튼 */}
      <button
        onClick={onClose}
        className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 transition-colors"
        aria-label="정보창 닫기"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="absolute right-9 top-2 flex gap-2">
        <button
          type="button"
          onClick={() => onToggleBookmark(shop)}
          disabled={isPersonalizationSubmitting}
          className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
            isBookmarked
              ? 'bg-yellow-100 text-yellow-800 ring-1 ring-yellow-200 hover:bg-yellow-200'
              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
          }`}
          aria-label={isBookmarked ? '북마크 해제' : '북마크 추가'}
          title={isBookmarked ? '북마크 해제' : '북마크 추가'}
        >
          <BookmarkIcon isActive={isBookmarked} />
        </button>
        <button
          type="button"
          onClick={() => onToggleHidden(shop)}
          disabled={isPersonalizationSubmitting}
          className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
            isHidden
              ? 'bg-red-100 text-red-800 ring-1 ring-red-200 hover:bg-red-200'
              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
          }`}
          aria-label={isHidden ? '숨김 해제' : '매장 숨기기'}
          title={isHidden ? '숨김 해제' : '매장 숨기기'}
        >
          <HiddenIcon />
        </button>
      </div>

      {/* 가게 정보 */}
      <div>
        {/* 헤더 */}
        <div className="mb-3 flex items-start justify-between pr-24">
          <div className="flex-1">
            <h3 className="font-bold text-xl text-gray-900 mb-1 flex items-center gap-2">
              🍜 {shop.name}
            </h3>
            {shop.kakaoRating && shop.kakaoRating > 0 && (
              <div className="inline-flex items-center gap-1 bg-yellow-50 px-3 py-1 rounded-full border border-yellow-200">
                <span className="text-yellow-600 font-semibold text-sm">
                  ⭐ {shop.kakaoRating.toFixed(1)}
                </span>
                <span className="text-xs text-yellow-700">카카오 평점</span>
              </div>
            )}
          </div>
        </div>

        {menuCategories.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {menuCategories.map((category) => (
              <span
                key={category.id}
                className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-100"
              >
                {category.label}
              </span>
            ))}
          </div>
        )}

        {/* 기본 정보 */}
        <div className="space-y-2 mb-3">
          <p className="text-sm text-gray-700 flex items-start gap-2">
            <span className="text-gray-400">📍</span>
            <span className="flex-1">{shop.address}</span>
          </p>
          {shop.phone && (
            <p className="text-sm text-gray-700 flex items-center gap-2">
              <span className="text-gray-400">📞</span>
              <a
                href={`tel:${shop.phone}`}
                className="text-blue-600 hover:text-blue-800 hover:underline"
              >
                {shop.phone}
              </a>
            </p>
          )}
          {shop.businessHours && (
            <p className="text-sm text-gray-700 flex items-start gap-2">
              <span className="text-gray-400">🕒</span>
              <span className="flex-1">{shop.businessHours}</span>
            </p>
          )}
        </div>

        <div className="mt-3 space-y-2">
          {shop.instagramUrl && (
            <p className="text-sm flex items-center gap-2">
              <Image
                src="/instagram-icon.png"
                alt=""
                width={16}
                height={16}
                className="h-4 w-4"
              />
              <a
                href={shop.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-600 hover:text-purple-800 hover:underline font-medium"
              >
                Instagram
              </a>
            </p>
          )}

          {shop.kakaoPlaceUrl && (
            <p className="text-sm">
              <a
                href={shop.kakaoPlaceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:underline font-medium"
              >
                <Image
                  src="/kakao-map-icon.png"
                  alt=""
                  width={16}
                  height={16}
                  className="h-4 w-4 rounded-sm"
                />
                카카오맵에서 보기
              </a>
            </p>
          )}

          {waitingProviderLink && (
            <p className="text-sm flex items-center gap-2">
              <span className="text-gray-400">대기</span>
              <a
                href={waitingProviderLink.providerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 bg-white shadow-sm transition-colors hover:border-red-300 hover:bg-red-50"
                aria-label={`${waitingProviderLink.label} 웨이팅 페이지 열기`}
                title={`${waitingProviderLink.label} 웨이팅`}
              >
                <Image
                  src={waitingProviderLink.iconSrc}
                  alt=""
                  width={24}
                  height={24}
                  className="h-6 w-6 object-contain"
                />
              </a>
            </p>
          )}
        </div>
      </div>

      {/* 상세 페이지 링크 (Phase 2-2에서 구현) */}
      {/* <a
        href={`/shops/${shop.id}`}
        className="block mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium"
      >
        상세 정보 보기 →
      </a> */}
    </div>
  );
}
