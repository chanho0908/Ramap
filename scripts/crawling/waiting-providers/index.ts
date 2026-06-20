import puppeteer, { Browser, Page } from 'puppeteer';
import type { WaitingProvider } from '../../../packages/shared/src/types';

export interface WaitingProviderLink {
  href: string;
  text: string;
}

export interface WaitingProviderDetection {
  provider: WaitingProvider;
  providerUrl?: string;
  confidence: number;
  status: 'detected' | 'unknown';
  reason: string;
}

export type WaitingProviderScrapeResult = WaitingProviderDetection;

const PROVIDER_PATTERNS: Array<{
  provider: Exclude<WaitingProvider, 'unknown'>;
  urlPatterns: RegExp[];
  textPatterns: RegExp[];
}> = [
  {
    provider: 'catchtable',
    urlPatterns: [/catchtable/i],
    textPatterns: [/catch\s*table/i, /캐치\s*테이블/],
  },
  {
    provider: 'tabling',
    urlPatterns: [/tabling/i],
    textPatterns: [/tabling/i, /테이블링/],
  },
  {
    provider: 'syrup_friends',
    urlPatterns: [/syrup.*friends/i, /friends.*syrup/i, /syrupfriends/i],
    textPatterns: [/syrup\s*friends/i, /시럽\s*프렌즈/, /시럽프렌즈/],
  },
];

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function normalizeProviderUrl(url: string): string | undefined {
  try {
    const parsed = new URL(url);

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return undefined;
    }

    parsed.hash = '';
    return parsed.toString();
  } catch (error) {
    return undefined;
  }
}

export function detectWaitingProvider(
  links: WaitingProviderLink[]
): WaitingProviderDetection {
  for (const link of links) {
    const normalizedUrl = normalizeProviderUrl(link.href);
    const searchableUrl = normalizedUrl || link.href;

    for (const pattern of PROVIDER_PATTERNS) {
      if (
        pattern.urlPatterns.some((urlPattern) => urlPattern.test(searchableUrl))
      ) {
        return {
          provider: pattern.provider,
          providerUrl: normalizedUrl,
          confidence: 0.95,
          status: 'detected',
          reason: 'provider_url_match',
        };
      }
    }
  }

  for (const link of links) {
    for (const pattern of PROVIDER_PATTERNS) {
      if (
        pattern.textPatterns.some((textPattern) => textPattern.test(link.text))
      ) {
        return {
          provider: pattern.provider,
          providerUrl: undefined,
          confidence: 0.75,
          status: 'detected',
          reason: 'provider_link_text_match',
        };
      }
    }
  }

  return {
    provider: 'unknown',
    confidence: 0,
    status: 'unknown',
    reason: 'provider_not_found',
  };
}

export class KakaoWaitingProviderAdapter {
  private browser: Browser | null = null;
  private headless: boolean;
  private requestDelayMs: number;

  constructor(requestDelayMs: number = 1500, headless: boolean = true) {
    this.requestDelayMs = requestDelayMs;
    this.headless = headless;
  }

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

  async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      console.log('\n🔚 브라우저 종료됨');
    }
  }

  async identify(placeUrl: string): Promise<WaitingProviderScrapeResult> {
    await this.initBrowser();

    const page = await this.browser!.newPage();

    try {
      await page.setUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );
      await page.goto(placeUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });
      await delay(1000);

      const links = await this.extractLinks(page);
      const detection = detectWaitingProvider(links);

      await delay(this.requestDelayMs);

      return detection;
    } finally {
      await page.close();
    }
  }

  private async extractLinks(page: Page): Promise<WaitingProviderLink[]> {
    return page.$$eval('a', (anchors) =>
      anchors
        .map((anchor) => ({
          href: anchor.href,
          text: [
            anchor.textContent,
            anchor.getAttribute('title'),
            anchor.getAttribute('aria-label'),
          ]
            .filter((value): value is string => Boolean(value))
            .join(' ')
            .trim(),
        }))
        .filter((link) => link.href)
    );
  }
}
