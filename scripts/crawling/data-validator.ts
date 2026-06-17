/**
 * 데이터 검증 및 변환 로직
 *
 * Kakao API 응답을 Ramap Shop 형식으로 변환하고 검증합니다.
 */

import { KakaoPlace } from './kakao-api';
import { PlaceDetail, SocialLinks } from './kakao-detail-scraper';

export interface ValidatedShop {
  id: string; // Kakao Place ID
  name: string;
  address: string;
  lat: number;
  lng: number;
  kakaoPlaceUrl?: string;
  description?: string;
  phone?: string;
  businessHours?: string;
  instagramUrl?: string;
  kakaoRating?: number;
}

export interface ValidationResult {
  valid: ValidatedShop[];
  invalid: ValidationError[];
}

export interface ValidationError {
  placeId: string;
  placeName: string;
  reason: string;
  originalData: KakaoPlace;
}

export class DataValidator {
  /**
   * KakaoPlace 배열을 ValidatedShop으로 변환 및 검증
   *
   * @param places Kakao API에서 가져온 장소 목록
   * @param placeDetails 스크래핑한 상세 정보 (선택)
   * @returns 검증 결과
   */
  validateAndTransform(
    places: KakaoPlace[],
    placeDetails?: Map<string, PlaceDetail>
  ): ValidationResult {
    const valid: ValidatedShop[] = [];
    const invalid: ValidationError[] = [];

    console.log(`\n🔍 데이터 검증 시작: ${places.length}개 장소\n`);

    for (const place of places) {
      try {
        // 필수 필드 검증
        this.validateRequiredFields(place);

        // 좌표 검증
        this.validateCoordinates(place.x, place.y);

        // 전화번호 검증 (선택)
        if (place.phone) {
          this.validatePhone(place.phone);
        }

        // Instagram URL 검증 (선택)
        let instagramUrl: string | undefined;
        let kakaoRating: number | undefined;

        if (placeDetails) {
          const detail = placeDetails.get(place.id);

          if (detail?.socialLinks.instagram) {
            instagramUrl = this.validateInstagramUrl(
              detail.socialLinks.instagram
            );
          }

          // 평점 검증 (선택)
          if (detail?.rating !== undefined) {
            kakaoRating = this.validateRating(detail.rating);
          }
        }

        // Shop 객체 생성
        const shop: ValidatedShop = {
          id: place.id,
          name: place.place_name,
          address: place.road_address_name || place.address_name,
          lat: parseFloat(place.y),
          lng: parseFloat(place.x),
          kakaoPlaceUrl: this.normalizeKakaoPlaceUrl(place.place_url),
          phone: place.phone || undefined,
          instagramUrl,
          kakaoRating,
        };

        valid.push(shop);
      } catch (error) {
        invalid.push({
          placeId: place.id,
          placeName: place.place_name,
          reason: error instanceof Error ? error.message : String(error),
          originalData: place,
        });
      }
    }

    console.log(`✅ 검증 완료: ${valid.length}개 유효, ${invalid.length}개 실패\n`);

    if (invalid.length > 0) {
      console.log('❌ 검증 실패 항목:');
      invalid.forEach((err) => {
        console.log(`  - ${err.placeName} (${err.placeId}): ${err.reason}`);
      });
      console.log('');
    }

    return { valid, invalid };
  }

  /**
   * 필수 필드 검증
   *
   * @param place Kakao Place 객체
   * @throws 필수 필드 누락 시 에러
   */
  private validateRequiredFields(place: KakaoPlace): void {
    if (!place.id) {
      throw new Error('Place ID가 없습니다');
    }

    if (!place.place_name || place.place_name.trim() === '') {
      throw new Error('가게 이름이 없습니다');
    }

    if (!place.address_name && !place.road_address_name) {
      throw new Error('주소 정보가 없습니다');
    }

    if (!place.x || !place.y) {
      throw new Error('좌표 정보가 없습니다');
    }
  }

  /**
   * 좌표 유효성 검증
   *
   * @param x 경도 (longitude)
   * @param y 위도 (latitude)
   * @throws 좌표가 유효하지 않으면 에러
   */
  private validateCoordinates(x: string, y: string): void {
    const lng = parseFloat(x);
    const lat = parseFloat(y);

    if (isNaN(lng) || isNaN(lat)) {
      throw new Error('좌표가 숫자가 아닙니다');
    }

    // 한국 좌표 범위 검증 (대략적)
    // 위도: 33° ~ 43°
    // 경도: 124° ~ 132°
    if (lat < 33 || lat > 43) {
      throw new Error(`위도가 범위를 벗어났습니다: ${lat}`);
    }

    if (lng < 124 || lng > 132) {
      throw new Error(`경도가 범위를 벗어났습니다: ${lng}`);
    }
  }

  /**
   * 전화번호 유효성 검증
   *
   * @param phone 전화번호
   * @throws 전화번호가 유효하지 않으면 에러
   */
  private validatePhone(phone: string): void {
    // 간단한 전화번호 형식 검증 (숫자, 하이픈만 허용)
    const phoneRegex = /^[0-9-]+$/;

    if (!phoneRegex.test(phone)) {
      throw new Error(`전화번호 형식이 올바르지 않습니다: ${phone}`);
    }
  }

  private normalizeKakaoPlaceUrl(url: string): string | undefined {
    if (!url) {
      return undefined;
    }

    return url.replace(/^http:\/\/place\.map\.kakao\.com\//, 'https://place.map.kakao.com/');
  }

  /**
   * Instagram URL 유효성 검증
   *
   * @param url Instagram URL
   * @returns 검증된 URL (정규화됨)
   * @throws URL이 유효하지 않으면 에러
   */
  private validateInstagramUrl(url: string): string | undefined {
    if (!url || url.trim() === '') {
      return undefined;
    }

    try {
      const urlObj = new URL(url);

      // Instagram 도메인 검증
      if (
        urlObj.hostname !== 'www.instagram.com' &&
        urlObj.hostname !== 'instagram.com' &&
        urlObj.hostname !== 'instagr.am'
      ) {
        throw new Error(`Instagram URL이 아닙니다: ${url}`);
      }

      // 정규화된 URL 반환
      return url;
    } catch (error) {
      throw new Error(`URL 형식이 올바르지 않습니다: ${url}`);
    }
  }

  /**
   * 카카오 맵 평점 유효성 검증
   *
   * @param rating 평점 (0-5)
   * @returns 검증된 평점
   * @throws 평점이 유효하지 않으면 에러
   */
  private validateRating(rating: number): number | undefined {
    if (rating === undefined || rating === null) {
      return undefined;
    }

    if (isNaN(rating)) {
      throw new Error(`평점이 숫자가 아닙니다: ${rating}`);
    }

    if (rating < 0 || rating > 5) {
      throw new Error(`평점이 범위를 벗어났습니다 (0-5): ${rating}`);
    }

    // 소수점 1자리로 반올림
    return Math.round(rating * 10) / 10;
  }

  /**
   * 중복 제거 (Place ID 기준)
   *
   * @param shops ValidatedShop 배열
   * @returns 중복 제거된 배열
   */
  deduplicate(shops: ValidatedShop[]): ValidatedShop[] {
    const seen = new Set<string>();
    const unique: ValidatedShop[] = [];

    for (const shop of shops) {
      if (!seen.has(shop.id)) {
        seen.add(shop.id);
        unique.push(shop);
      }
    }

    const removedCount = shops.length - unique.length;
    if (removedCount > 0) {
      console.log(`🔄 중복 제거: ${removedCount}개 제거됨 (${unique.length}개 남음)\n`);
    }

    return unique;
  }
}
