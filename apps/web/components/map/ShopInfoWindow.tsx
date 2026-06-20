/**
 * 가게 정보창 컴포넌트
 */

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { fetchShopWaitingSystem, getMenuCategoryLabel } from '@ramap/shared';
import type { Shop, ShopWaitingSystem, WaitingProvider } from '@ramap/shared';

interface ShopInfoWindowProps {
  shop: Shop;
  onClose: () => void;
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
export function ShopInfoWindow({ shop, onClose }: ShopInfoWindowProps) {
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

      {/* 가게 정보 */}
      <div className="pr-6">
        {/* 헤더 */}
        <div className="flex items-start justify-between mb-3">
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

        {/* 카카오맵 링크 */}
        {shop.kakaoPlaceUrl && (
          <p className="text-sm mt-3 pt-3 border-t border-gray-200">
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
