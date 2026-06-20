/**
 * 웨이팅 시스템 식별 유틸리티 테스트
 */

import assert from 'node:assert/strict';
import {
  detectWaitingProvider,
  normalizeProviderUrl,
} from './waiting-providers';
import {
  buildKakaoPlaceUrl,
  parseCliOptions,
  toCsv,
} from './crawl-waiting-systems';

function testProviderUrlNormalizer(): void {
  assert.equal(
    normalizeProviderUrl('https://app.catchtable.co.kr/ct/shop/123#section'),
    'https://app.catchtable.co.kr/ct/shop/123'
  );
  assert.equal(normalizeProviderUrl('mailto:test@example.com'), undefined);
  assert.equal(normalizeProviderUrl('not-a-url'), undefined);
}

function testProviderDetection(): void {
  assert.deepEqual(
    detectWaitingProvider([
      {
        href: 'https://app.catchtable.co.kr/ct/shop/123',
        text: '예약',
      },
    ]),
    {
      provider: 'catchtable',
      providerUrl: 'https://app.catchtable.co.kr/ct/shop/123',
      confidence: 0.95,
      status: 'detected',
      reason: 'provider_url_match',
    }
  );
  const textOnlyDetection = detectWaitingProvider([
    {
      href: 'https://example.com/waiting',
      text: '테이블링 원격줄서기',
    },
  ]);
  assert.equal(textOnlyDetection.provider, 'tabling');
  assert.equal(textOnlyDetection.providerUrl, undefined);
  assert.equal(
    detectWaitingProvider([
      {
        href: 'https://friends.syrup.co.kr/shop/123',
        text: '웨이팅',
      },
    ]).provider,
    'syrup_friends'
  );
  assert.deepEqual(detectWaitingProvider([]), {
    provider: 'unknown',
    confidence: 0,
    status: 'unknown',
    reason: 'provider_not_found',
  });
}

function testCliOptions(): void {
  assert.deepEqual(parseCliOptions(['--limit', '10']), {
    dryRun: true,
    confirmLive: false,
    missingOnly: false,
    headful: false,
    help: false,
    limit: 10,
    delayMs: 1500,
    reportDir: 'reports/crawling',
  });
  assert.deepEqual(
    parseCliOptions([
      '--confirm-live',
      '--missing-only',
      '--delay-ms=2000',
      '--report-dir',
      '/tmp/reports',
    ]),
    {
      dryRun: false,
      confirmLive: true,
      missingOnly: true,
      headful: false,
      help: false,
      limit: undefined,
      delayMs: 2000,
      reportDir: '/tmp/reports',
    }
  );
}

function testBuildKakaoPlaceUrl(): void {
  assert.equal(
    buildKakaoPlaceUrl({
      id: 'shop-1',
      name: '라멘집',
      address: '서울',
      kakao_place_id: '1234',
      kakao_place_url: null,
    }),
    'https://place.map.kakao.com/1234'
  );
  assert.equal(
    buildKakaoPlaceUrl({
      id: 'shop-1',
      name: '라멘집',
      address: '서울',
      kakao_place_id: '1234',
      kakao_place_url: 'https://place.map.kakao.com/5678',
    }),
    'https://place.map.kakao.com/5678'
  );
}

function testCsvOutput(): void {
  assert.equal(
    toCsv([
      {
        shopId: 'shop-1',
        shopName: '멘야 "테스트"',
        address: '서울',
        provider: 'catchtable',
        providerUrl: 'https://app.catchtable.co.kr/ct/shop/123',
        confidence: 0.95,
        status: 'detected',
        reason: 'provider_url_match',
        checkedAt: '2026-06-20T00:00:00.000Z',
      },
    ]),
    [
      'shopId,shopName,address,provider,providerUrl,confidence,status,reason,checkedAt',
      '"shop-1","멘야 ""테스트""","서울","catchtable","https://app.catchtable.co.kr/ct/shop/123","0.95","detected","provider_url_match","2026-06-20T00:00:00.000Z"',
    ].join('\n')
  );
}

testProviderUrlNormalizer();
testProviderDetection();
testCliOptions();
testBuildKakaoPlaceUrl();
testCsvOutput();

console.log('✅ 웨이팅 시스템 식별 유틸리티 테스트 통과');
