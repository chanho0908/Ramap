/**
 * 데이터 검증 및 변환 로직
 *
 * Kakao Places API 응답을 Supabase Shop 스키마로 변환하고 검증합니다.
 */

import type { KakaoPlace } from './kakao-api';

export interface ValidatedShop {
  name: string;
  address: string;
  lat: number;
  lng: number;
  phone?: string;
  description?: string;
  business_hours?: string;
}

export interface ValidationResult {
  valid: ValidatedShop[];
  invalid: Array<{
    place: KakaoPlace;
    reason: string;
  }>;
  duplicates: number;
}

// 한국 영역 좌표 범위
const KOREA_BOUNDS = {
  minLat: 33.0,
  maxLat: 43.0,
  minLng: 124.0,
  maxLng: 132.0,
} as const;

/**
 * 좌표가 한국 영역 내에 있는지 검증
 */
function isValidKoreaCoordinates(lat: number, lng: number): boolean {
  return (
    lat >= KOREA_BOUNDS.minLat &&
    lat <= KOREA_BOUNDS.maxLat &&
    lng >= KOREA_BOUNDS.minLng &&
    lng <= KOREA_BOUNDS.maxLng
  );
}

/**
 * 라멘집 관련 키워드를 포함하는지 검증
 * 카테고리나 이름에서 라멘 관련 키워드 체크
 */
function isRamenRelated(place: KakaoPlace): boolean {
  const ramenKeywords = [
    '라멘',
    '라면',
    'ラーメン',
    'ramen',
    '라멘야',
    '라멘집',
    '라멘가게',
  ];

  const searchText =
    `${place.place_name} ${place.category_name}`.toLowerCase();

  return ramenKeywords.some(keyword =>
    searchText.includes(keyword.toLowerCase())
  );
}

/**
 * 중복 생성을 위한 유니크 키 생성 (이름 + 주소 해시)
 */
function generateShopKey(name: string, address: string): string {
  return `${name.trim().toLowerCase()}|${address.trim().toLowerCase()}`;
}

/**
 * Kakao Place를 ValidatedShop으로 변환
 */
function transformKakaoPlaceToShop(place: KakaoPlace): ValidatedShop {
  const lat = parseFloat(place.y);
  const lng = parseFloat(place.x);

  // description: Kakao Map 링크 포함
  const description = place.place_url
    ? `카카오맵: ${place.place_url}`
    : undefined;

  return {
    name: place.place_name,
    address: place.road_address_name || place.address_name,
    lat,
    lng,
    phone: place.phone || undefined,
    description,
    business_hours: undefined, // Kakao API에서 제공하지 않음
  };
}

/**
 * Kakao Places 배열을 검증하고 변환
 *
 * @param places Kakao API에서 받은 장소 목록
 * @param strictMode true일 경우 라멘 관련 키워드 필터링 적용 (기본값: false)
 * @returns 검증 결과
 */
export function validateAndTransformPlaces(
  places: KakaoPlace[],
  strictMode: boolean = false
): ValidationResult {
  const valid: ValidatedShop[] = [];
  const invalid: Array<{ place: KakaoPlace; reason: string }> = [];
  const seenKeys = new Set<string>();
  let duplicateCount = 0;

  console.log(`\n🔍 ${places.length}개의 장소 검증 시작...`);
  if (strictMode) {
    console.log('  ⚠️  엄격 모드: 라멘 관련 키워드 필터링 활성화');
  }

  for (const place of places) {
    // 1. 좌표 파싱 검증
    const lat = parseFloat(place.y);
    const lng = parseFloat(place.x);

    if (isNaN(lat) || isNaN(lng)) {
      invalid.push({
        place,
        reason: '좌표 파싱 실패',
      });
      continue;
    }

    // 2. 한국 영역 검증
    if (!isValidKoreaCoordinates(lat, lng)) {
      invalid.push({
        place,
        reason: `좌표가 한국 영역 밖 (lat: ${lat}, lng: ${lng})`,
      });
      continue;
    }

    // 3. 필수 필드 검증
    if (!place.place_name || !place.address_name) {
      invalid.push({
        place,
        reason: '필수 필드 누락 (이름 또는 주소)',
      });
      continue;
    }

    // 4. 라멘 관련 키워드 검증 (strictMode일 경우만)
    if (strictMode && !isRamenRelated(place)) {
      invalid.push({
        place,
        reason: '라멘 관련 키워드 미포함',
      });
      continue;
    }

    // 5. 중복 체크 (이름 + 주소 기반)
    const shopKey = generateShopKey(place.place_name, place.address_name);
    if (seenKeys.has(shopKey)) {
      duplicateCount++;
      continue;
    }
    seenKeys.add(shopKey);

    // 6. 변환 및 추가
    const validatedShop = transformKakaoPlaceToShop(place);
    valid.push(validatedShop);
  }

  console.log(`✅ 검증 완료:`);
  console.log(`   - 유효: ${valid.length}개`);
  console.log(`   - 무효: ${invalid.length}개`);
  console.log(`   - 중복: ${duplicateCount}개`);

  if (invalid.length > 0) {
    console.log(`\n⚠️  무효한 데이터 상세:`);
    const reasonCounts = invalid.reduce(
      (acc, item) => {
        acc[item.reason] = (acc[item.reason] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    Object.entries(reasonCounts).forEach(([reason, count]) => {
      console.log(`   - ${reason}: ${count}개`);
    });
  }

  return {
    valid,
    invalid,
    duplicates: duplicateCount,
  };
}

/**
 * 검증 결과 요약 출력
 */
export function printValidationSummary(result: ValidationResult): void {
  console.log(`\n📊 검증 요약:`);
  console.log(`   총 처리: ${result.valid.length + result.invalid.length + result.duplicates}개`);
  console.log(`   ✅ 유효: ${result.valid.length}개`);
  console.log(`   ❌ 무효: ${result.invalid.length}개`);
  console.log(`   🔄 중복: ${result.duplicates}개`);
  console.log(`   📈 성공률: ${((result.valid.length / (result.valid.length + result.invalid.length)) * 100).toFixed(1)}%\n`);
}
