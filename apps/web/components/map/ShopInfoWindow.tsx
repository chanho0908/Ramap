/**
 * 가게 정보창 컴포넌트
 */

import type { Shop } from '@ramap/shared';

interface ShopInfoWindowProps {
  shop: Shop;
  onClose: () => void;
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
  return (
    <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-4 max-w-sm z-10 animate-fade-in">
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
        <h3 className="font-bold text-lg text-gray-900 mb-2">{shop.name}</h3>
        <p className="text-sm text-gray-600 mb-1">{shop.address}</p>
        {shop.phone && (
          <p className="text-sm text-gray-600 mb-1">
            <span className="font-medium">전화:</span> {shop.phone}
          </p>
        )}
        {shop.businessHours && (
          <p className="text-sm text-gray-600 mb-1">
            <span className="font-medium">영업시간:</span> {shop.businessHours}
          </p>
        )}
        {shop.description && (
          <p className="text-sm text-gray-700 mt-2 pt-2 border-t border-gray-200">
            {shop.description}
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
