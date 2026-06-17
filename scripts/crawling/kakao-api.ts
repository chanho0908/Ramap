/**
 * Kakao Places API 클라이언트
 *
 * Kakao Local API를 사용하여 키워드 기반 장소 검색을 수행합니다.
 * API 문서: https://developers.kakao.com/docs/latest/ko/local/dev-guide
 */

import axios, { AxiosInstance } from 'axios';

const KAKAO_API_BASE_URL = 'https://dapi.kakao.com';
const KAKAO_SEARCH_ENDPOINT = '/v2/local/search/keyword.json';

// Rate limiting을 위한 지연 함수
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export interface KakaoPlace {
  id: string;
  place_name: string;
  category_name: string;
  category_group_code: string;
  category_group_name: string;
  phone: string;
  address_name: string;
  road_address_name: string;
  x: string; // 경도 (longitude)
  y: string; // 위도 (latitude)
  place_url: string;
  distance: string;
}

export interface KakaoSearchResponse {
  meta: {
    total_count: number;
    pageable_count: number;
    is_end: boolean;
    same_name: {
      region: string[];
      keyword: string;
      selected_region: string;
    };
  };
  documents: KakaoPlace[];
}

export interface SearchOptions {
  query: string;
  x?: string; // 중심 좌표의 경도 (optional)
  y?: string; // 중심 좌표의 위도 (optional)
  radius?: number; // 중심 좌표로부터의 거리 필터 (meter, 0-20000)
  page?: number; // 페이지 번호 (1-45)
  size?: number; // 한 페이지에 보여질 문서 개수 (1-15, 기본값: 15)
}

export class KakaoApiClient {
  private client: AxiosInstance;
  private requestDelay: number;

  constructor(apiKey: string, requestDelayMs: number = 500) {
    if (!apiKey) {
      throw new Error('Kakao API key is required');
    }

    this.client = axios.create({
      baseURL: KAKAO_API_BASE_URL,
      headers: {
        Authorization: `KakaoAK ${apiKey}`,
      },
      timeout: 10000,
    });

    this.requestDelay = requestDelayMs;
  }

  /**
   * 키워드로 장소 검색
   *
   * @param options 검색 옵션
   * @returns Kakao Places API 응답
   */
  async searchPlaces(options: SearchOptions): Promise<KakaoSearchResponse> {
    try {
      const response = await this.client.get<KakaoSearchResponse>(
        KAKAO_SEARCH_ENDPOINT,
        {
          params: {
            query: options.query,
            x: options.x,
            y: options.y,
            radius: options.radius,
            page: options.page || 1,
            size: options.size || 15,
          },
        }
      );

      // Rate limiting: API 호출 후 지연
      await delay(this.requestDelay);

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Kakao API Error:', {
          status: error.response?.status,
          message: error.response?.data,
          query: options.query,
        });
        throw new Error(
          `Kakao API request failed: ${error.response?.status} - ${error.message}`
        );
      }
      throw error;
    }
  }

  /**
   * 특정 키워드로 모든 페이지 검색 (최대 45페이지)
   *
   * @param query 검색 키워드
   * @param maxPages 최대 페이지 수 (기본값: 3, 최대: 45)
   * @returns 모든 페이지의 장소 목록
   */
  async searchAllPages(
    query: string,
    maxPages: number = 3
  ): Promise<KakaoPlace[]> {
    const allPlaces: KakaoPlace[] = [];
    let currentPage = 1;
    let isEnd = false;

    console.log(`🔍 키워드 "${query}" 검색 시작...`);

    while (!isEnd && currentPage <= maxPages) {
      const response = await this.searchPlaces({
        query,
        page: currentPage,
        size: 15,
      });

      allPlaces.push(...response.documents);
      isEnd = response.meta.is_end;

      console.log(
        `  페이지 ${currentPage}: ${response.documents.length}개 발견 (총 ${allPlaces.length}개)`
      );

      if (!isEnd) {
        currentPage++;
      }
    }

    console.log(`✅ 키워드 "${query}" 검색 완료: 총 ${allPlaces.length}개\n`);

    return allPlaces;
  }

  /**
   * 여러 키워드로 검색 (중복 제거)
   *
   * @param keywords 검색할 키워드 배열
   * @param maxPagesPerKeyword 키워드당 최대 페이지 수
   * @returns 중복 제거된 장소 목록
   */
  async searchMultipleKeywords(
    keywords: string[],
    maxPagesPerKeyword: number = 3
  ): Promise<KakaoPlace[]> {
    const allPlaces: KakaoPlace[] = [];
    const seenIds = new Set<string>();

    for (const keyword of keywords) {
      const places = await this.searchAllPages(keyword, maxPagesPerKeyword);

      // ID 기반 중복 제거
      for (const place of places) {
        if (!seenIds.has(place.id)) {
          seenIds.add(place.id);
          allPlaces.push(place);
        }
      }
    }

    console.log(`📊 중복 제거 후 총 ${allPlaces.length}개의 장소 수집됨\n`);

    return allPlaces;
  }
}
