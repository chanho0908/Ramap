/**
 * Instagram 크롤러 핵심 유틸리티 테스트
 */

import assert from 'node:assert/strict';
import { normalizeInstagramProfileUrl } from './kakao-detail-scraper';
import {
  buildKakaoPlaceUrl,
  parseCliOptions,
  toCsv,
} from './crawl-instagram-info';

function testInstagramUrlNormalizer(): void {
  assert.equal(
    normalizeInstagramProfileUrl('https://instagram.com/ramen_shop/?igsh=abc'),
    'https://www.instagram.com/ramen_shop/'
  );
  assert.equal(
    normalizeInstagramProfileUrl('https://m.instagram.com/ramen.shop#top'),
    'https://www.instagram.com/ramen.shop/'
  );
  assert.equal(
    normalizeInstagramProfileUrl('https://instagr.am/ramen.shop'),
    'https://www.instagram.com/ramen.shop/'
  );
  assert.equal(
    normalizeInstagramProfileUrl('http://www.instagram.com/denkkai_ramen/'),
    'https://www.instagram.com/denkkai_ramen/'
  );
  assert.equal(
    normalizeInstagramProfileUrl('https://www.instagram.com/p/ABC123/'),
    undefined
  );
  assert.equal(
    normalizeInstagramProfileUrl('https://example.com/ramen_shop'),
    undefined
  );
}

function testCliOptions(): void {
  assert.deepEqual(
    parseCliOptions([
      '--dry-run',
      '--limit',
      '10',
      '--delay-ms=2000',
      '--missing-only',
      '--report-dir',
      '/tmp/reports',
    ]),
    {
      dryRun: true,
      missingOnly: true,
      headful: false,
      help: false,
      limit: 10,
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
      instagram_url: null,
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
      instagram_url: null,
    }),
    'https://place.map.kakao.com/5678'
  );
}

function testCsvOutput(): void {
  assert.equal(
    toCsv([
      {
        id: 'shop-1',
        name: '멘야 "테스트"',
        address: '서울',
        kakaoPlaceUrl: 'https://place.map.kakao.com/1234',
        instagramUrl: 'https://www.instagram.com/ramen_shop/',
        reason: 'found_on_kakao_place',
      },
    ]),
    [
      'id,name,address,kakaoPlaceUrl,instagramUrl,reason',
      '"shop-1","멘야 ""테스트""","서울","https://place.map.kakao.com/1234","https://www.instagram.com/ramen_shop/","found_on_kakao_place"',
    ].join('\n')
  );
}

testInstagramUrlNormalizer();
testCliOptions();
testBuildKakaoPlaceUrl();
testCsvOutput();

console.log('✅ Instagram 크롤러 유틸리티 테스트 통과');
