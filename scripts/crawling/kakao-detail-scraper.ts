/**
 * Kakao Map 상세 페이지 스크래퍼 (Puppeteer 버전)
 *
 * place_url에서 Instagram 등 소셜 미디어 링크와 평점을 추출합니다.
 * JavaScript 렌더링 후 DOM을 파싱하여 정확한 데이터를 수집합니다.
 */

import puppeteer, { Browser, Page } from 'puppeteer';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface SocialLinks {
  instagram?: string;
  facebook?: string;
  blog?: string;
}

export interface PlaceDetail {
  placeId: string;
  socialLinks: SocialLinks;
  rating?: number;
}

export function normalizeInstagramProfileUrl(url: string): string | undefined {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase().replace(/^m\./, 'www.');

    if (hostname === 'instagr.am') {
      urlObj.hostname = 'www.instagram.com';
    } else if (
      hostname === 'instagram.com' ||
      hostname === 'www.instagram.com'
    ) {
      urlObj.hostname = 'www.instagram.com';
    } else {
      return undefined;
    }

    const pathSegments = urlObj.pathname
      .split('/')
      .map((segment) => segment.trim())
      .filter(Boolean);

    if (pathSegments.length !== 1) {
      return undefined;
    }

    const username = pathSegments[0];
    const reservedPaths = new Set([
      'accounts',
      'explore',
      'p',
      'reel',
      'reels',
      'stories',
      'tv',
    ]);

    const instagramUsernamePattern =
      /^[A-Za-z0-9](?:[A-Za-z0-9._]{0,28}[A-Za-z0-9])?$/;

    if (
      reservedPaths.has(username.toLowerCase()) ||
      !instagramUsernamePattern.test(username) ||
      username.includes('..')
    ) {
      return undefined;
    }

    urlObj.protocol = 'https:';
    urlObj.pathname = `/${username}/`;
    urlObj.search = '';
    urlObj.hash = '';

    return urlObj.toString();
  } catch (error) {
    return undefined;
  }
}

export class KakaoDetailScraper {
  private requestDelay: number;
  private browser: Browser | null = null;
  private headless: boolean;

  constructor(requestDelayMs: number = 1000, headless: boolean = true) {
    this.requestDelay = requestDelayMs;
    this.headless = headless;
  }

  /**
   * 브라우저 초기화
   */
  private async initBrowser(): Promise<void> {
    if (!this.browser) {
      console.log('🌐 Puppeteer 브라우저 시작 중...');
      this.browser = await puppeteer.launch({
        headless: this.headless,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
      });
      console.log('✅ 브라우저 준비 완료\n');
    }
  }

  /**
   * 브라우저 종료
   */
  async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      console.log('\n🔚 브라우저 종료됨');
    }
  }

  /**
   * Kakao Place URL에서 소셜 미디어 링크와 평점 추출
   *
   * @param placeUrl Kakao Map place URL (예: https://place.map.kakao.com/123456)
   * @returns 추출된 상세 정보
   */
  async scrapePlaceDetails(placeUrl: string): Promise<PlaceDetail> {
    try {
      // Place ID 추출
      const placeId = this.extractPlaceId(placeUrl);
      if (!placeId) {
        throw new Error(`Invalid Kakao place URL: ${placeUrl}`);
      }

      console.log(`📍 스크래핑 중: ${placeUrl}`);

      // 브라우저 초기화 (첫 실행 시에만)
      await this.initBrowser();

      // 새 페이지 열기
      const page = await this.browser!.newPage();

      try {
        // User-Agent 설정
        await page.setUserAgent(
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        );

        // 페이지 로드 (JavaScript 실행 대기)
        await page.goto(placeUrl, {
          waitUntil: 'networkidle2', // 네트워크가 조용해질 때까지 대기
          timeout: 30000,
        });

        // 추가 대기 (동적 콘텐츠 로드를 위해)
        await delay(2000);

        // 평점 추출
        const rating = await this.extractRating(page);

        // 소셜 링크 추출
        const socialLinks = await this.extractSocialLinks(page);

        // Rate limiting
        await delay(this.requestDelay);

        return {
          placeId,
          socialLinks,
          rating,
        };
      } finally {
        // 페이지 닫기
        await page.close();
      }
    } catch (error: any) {
      console.error(`❌ 스크래핑 실패 (${placeUrl}):`, error.message);

      // 실패해도 빈 결과 반환 (크롤링 계속 진행)
      return {
        placeId: this.extractPlaceId(placeUrl) || 'unknown',
        socialLinks: {},
      };
    }
  }

  /**
   * 여러 place URL에서 소셜 링크 일괄 추출
   *
   * @param placeUrls Kakao Map place URL 배열
   * @returns 추출된 상세 정보 배열
   */
  async scrapeBatch(placeUrls: string[]): Promise<PlaceDetail[]> {
    const results: PlaceDetail[] = [];

    console.log(`\n🚀 일괄 스크래핑 시작: ${placeUrls.length}개 장소\n`);

    for (let i = 0; i < placeUrls.length; i++) {
      const url = placeUrls[i];
      console.log(`[${i + 1}/${placeUrls.length}] 처리 중...`);

      const detail = await this.scrapePlaceDetails(url);
      results.push(detail);
    }

    console.log(`\n✅ 일괄 스크래핑 완료: ${results.length}개 처리됨\n`);

    // 브라우저 종료
    await this.closeBrowser();

    return results;
  }

  /**
   * URL에서 Place ID 추출
   *
   * @param placeUrl Kakao Map place URL
   * @returns Place ID 또는 null
   */
  private extractPlaceId(placeUrl: string): string | null {
    // https://place.map.kakao.com/123456 형식에서 ID 추출
    const match = placeUrl.match(/place\.map\.kakao\.com\/(\d+)/);
    return match ? match[1] : null;
  }

  /**
   * 페이지에서 카카오 맵 평점 추출
   *
   * @param page Puppeteer 페이지 객체
   * @returns 평점 (0-5) 또는 undefined
   */
  private async extractRating(page: Page): Promise<number | undefined> {
    try {
      // 다양한 셀렉터로 평점 찾기
      const selectors = [
        'em.num_rate',
        '.grade_star em',
        '.location_evaluation em',
        '[class*="rating"] em',
        '[class*="grade"] em',
        '[class*="score"] em',
      ];

      for (const selector of selectors) {
        try {
          const ratingText = await page.$eval(
            selector,
            (el) => el.textContent?.trim() || ''
          );

          if (ratingText) {
            // 숫자만 추출 (예: "4.5" 또는 "4.5점")
            const match = ratingText.match(/(\d+\.?\d*)/);

            if (match) {
              const rating = parseFloat(match[1]);

              // 유효한 범위 (0-5) 확인
              if (!isNaN(rating) && rating >= 0 && rating <= 5) {
                console.log(`  ⭐ 평점: ${rating}`);
                return rating;
              }
            }
          }
        } catch (e) {
          // 해당 셀렉터로 찾지 못하면 다음 시도
          continue;
        }
      }

      console.log(`  ℹ️  평점 정보 없음`);
      return undefined;
    } catch (error) {
      console.log(`  ℹ️  평점 추출 실패`);
      return undefined;
    }
  }

  /**
   * 페이지에서 소셜 미디어 링크 추출
   *
   * @param page Puppeteer 페이지 객체
   * @returns 소셜 미디어 링크 객체
   */
  private async extractSocialLinks(page: Page): Promise<SocialLinks> {
    try {
      const socialLinks: SocialLinks = {};

      // 모든 링크 가져오기
      const links = await page.$$eval('a', (anchors) =>
        anchors.map((a) => a.href).filter((href) => href)
      );

      for (const href of links) {
        // Instagram 링크 감지
        if (href.includes('instagram.com') || href.includes('instagr.am')) {
          const instagramUrl = normalizeInstagramProfileUrl(href);

          if (!socialLinks.instagram && instagramUrl) {
            socialLinks.instagram = instagramUrl;
          }
        }

        // Facebook 링크 감지
        if (href.includes('facebook.com') || href.includes('fb.com')) {
          if (!socialLinks.facebook) {
            socialLinks.facebook = href;
          }
        }

        // 블로그 링크 감지 (Naver, Tistory 등)
        if (href.includes('blog.naver.com') || href.includes('tistory.com')) {
          if (!socialLinks.blog) {
            socialLinks.blog = href;
          }
        }
      }

      // 로깅
      if (socialLinks.instagram) {
        console.log(`  ✅ Instagram: ${socialLinks.instagram}`);
      } else {
        console.log(`  ℹ️  Instagram 링크 없음`);
      }

      return socialLinks;
    } catch (error) {
      console.log(`  ℹ️  소셜 링크 추출 실패`);
      return {};
    }
  }
}
