/**
 * 크롤링 설정
 *
 * 검색 키워드, 대상 지역, API 설정 등을 정의합니다.
 */

/**
 * 검색 키워드 목록
 * 다양한 라멘 관련 키워드를 사용하여 누락을 방지합니다.
 */
export const SEARCH_KEYWORDS = [
  '라멘',
  '라면',
  'ラーメン',
  'ramen',
  '라멘야',
  '일본라멘',
] as const;

/**
 * 주요 도시 목록 (전국 17개 시도)
 * 초기에는 서울, 부산, 대구 등 주요 도시 중심으로 검색
 */
export const MAJOR_CITIES = [
  { name: '서울', keywords: ['서울 라멘', '강남 라멘', '홍대 라멘'] },
  { name: '부산', keywords: ['부산 라멘', '해운대 라멘'] },
  { name: '대구', keywords: ['대구 라멘'] },
  { name: '인천', keywords: ['인천 라멘'] },
  { name: '광주', keywords: ['광주 라멘'] },
  { name: '대전', keywords: ['대전 라멘'] },
  { name: '울산', keywords: ['울산 라멘'] },
  { name: '세종', keywords: ['세종 라멘'] },
] as const;

/**
 * 전국 검색용 키워드 조합 생성
 */
export function generateSearchKeywords(): string[] {
  const keywords: string[] = [];

  // 1. 기본 키워드 (전국 검색)
  keywords.push(...SEARCH_KEYWORDS);

  // 2. 도시별 키워드
  MAJOR_CITIES.forEach(city => {
    keywords.push(...city.keywords);
  });

  return keywords;
}

/**
 * 크롤링 설정
 */
export interface CrawlConfig {
  // API 설정
  kakaoApiKey: string;
  requestDelayMs: number; // API 요청 간 지연 (ms)

  // 검색 설정
  maxPagesPerKeyword: number; // 키워드당 최대 페이지 수 (1-45)
  strictMode: boolean; // 엄격한 필터링 모드 (라멘 관련 키워드 필터)

  // DB 설정
  supabaseUrl: string;
  supabaseKey: string;
  batchSize: number; // 배치 삽입 크기
  upsertMode: boolean; // 중복 시 업데이트 여부
}

/**
 * 환경 변수에서 크롤링 설정 로드
 */
export function loadCrawlConfig(): CrawlConfig {
  const kakaoApiKey = process.env.KAKAO_REST_API_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!kakaoApiKey) {
    throw new Error(
      'KAKAO_REST_API_KEY 환경 변수가 설정되지 않았습니다.\n' +
        '.env.local 파일에 KAKAO_REST_API_KEY=your-key 를 추가하세요.'
    );
  }

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Supabase 환경 변수가 설정되지 않았습니다.\n' +
        '.env.local 파일에 NEXT_PUBLIC_SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY를 추가하세요.'
    );
  }

  return {
    kakaoApiKey,
    requestDelayMs: parseInt(process.env.KAKAO_REQUEST_DELAY_MS || '500'),
    maxPagesPerKeyword: parseInt(process.env.MAX_PAGES_PER_KEYWORD || '3'),
    strictMode: process.env.STRICT_MODE === 'true',
    supabaseUrl,
    supabaseKey,
    batchSize: parseInt(process.env.BATCH_SIZE || '50'),
    upsertMode: process.env.UPSERT_MODE === 'true',
  };
}

/**
 * 설정 출력 (디버깅용)
 */
export function printConfig(config: CrawlConfig): void {
  console.log('⚙️  크롤링 설정:');
  console.log(`   - Kakao API Key: ${config.kakaoApiKey.substring(0, 10)}...`);
  console.log(`   - 요청 지연: ${config.requestDelayMs}ms`);
  console.log(`   - 키워드당 최대 페이지: ${config.maxPagesPerKeyword}`);
  console.log(`   - 엄격 모드: ${config.strictMode ? '활성화' : '비활성화'}`);
  console.log(`   - Supabase URL: ${config.supabaseUrl}`);
  console.log(`   - 배치 크기: ${config.batchSize}`);
  console.log(`   - Upsert 모드: ${config.upsertMode ? '활성화' : '비활성화'}\n`);
}
