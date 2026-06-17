/**
 * HTML 디버깅 스크립트
 *
 * 실제 카카오 맵 페이지의 HTML을 다운로드해서 구조를 확인합니다.
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';

async function debugHtml() {
  const testUrl = 'http://place.map.kakao.com/1916682638'; // 오레노라멘 합정본점

  console.log('🔍 카카오 맵 HTML 구조 분석\n');
  console.log(`URL: ${testUrl}\n`);

  try {
    const response = await axios.get(testUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'ko-KR,ko;q=0.9',
      },
      timeout: 15000,
    });

    const html = response.data;
    const $ = cheerio.load(html);

    // HTML 파일로 저장
    fs.writeFileSync('debug-kakao-map.html', html);
    console.log('✅ HTML 파일 저장: debug-kakao-map.html\n');

    // 주요 요소 확인
    console.log('📊 주요 요소 검색:\n');

    // 평점 관련
    console.log('1. 평점 관련 요소:');
    const ratingSelectors = [
      'em.num_rate',
      '.grade_star',
      '.rating',
      '[class*="rating"]',
      '[class*="grade"]',
      '[class*="score"]',
      'em',
      'span',
    ];

    for (const selector of ratingSelectors) {
      const elements = $(selector);
      if (elements.length > 0) {
        console.log(`   ${selector}: ${elements.length}개 발견`);
        elements.slice(0, 3).each((i, el) => {
          const text = $(el).text().trim();
          const className = $(el).attr('class');
          if (text) {
            console.log(
              `      [${i}] text="${text}" class="${className || 'none'}"`
            );
          }
        });
      }
    }

    console.log('\n2. 링크 요소 (a 태그):');
    let instagramCount = 0;
    $('a').each((i, el) => {
      const href = $(el).attr('href');
      if (href && href.includes('instagram')) {
        instagramCount++;
        console.log(`   [${instagramCount}] ${href}`);
      }
    });

    if (instagramCount === 0) {
      console.log('   Instagram 링크 없음');
    }

    console.log('\n3. 페이지 메타 정보:');
    console.log(`   Title: ${$('title').text()}`);
    console.log(`   전체 텍스트 길이: ${$.text().length} 자`);

    console.log('\n✅ 분석 완료! debug-kakao-map.html 파일을 확인하세요.');
  } catch (error: any) {
    console.error('❌ 오류:', error.message);
  }
}

debugHtml();
