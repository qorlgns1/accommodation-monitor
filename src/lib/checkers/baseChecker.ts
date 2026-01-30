import type { Browser, Page } from 'puppeteer';

import { getEnvNumber } from '@/lib/env';

import { setupPage } from './browser';
import { acquireBrowser, releaseBrowser } from './browserPool';
import { PRICE_PATTERN } from './constants';
import type { AccommodationToCheck, CheckResult } from './types';
import { delay, isRetryableError } from './utils';

interface PlatformPatterns {
  available: string[];
  unavailable: string[];
}

interface CheckerConfig {
  patterns: PlatformPatterns;
  buildUrl: (accommodation: AccommodationToCheck) => string;
  scrollDistance?: number;
}

export async function baseCheck(accommodation: AccommodationToCheck, config: CheckerConfig): Promise<CheckResult> {
  const MAX_RETRIES = 2;
  const NAVIGATION_TIMEOUT_MS = getEnvNumber('NAVIGATION_TIMEOUT_MS', 25000);
  const CONTENT_WAIT_MS = getEnvNumber('CONTENT_WAIT_MS', 10000);
  const PATTERN_RETRY_MS = getEnvNumber('PATTERN_RETRY_MS', 5000);
  const checkUrl = config.buildUrl(accommodation);
  let lastError: string | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    let browser: Browser | null = null;
    let page: Page | null = null;
    let shouldRetry = false;

    try {
      browser = await acquireBrowser();
      page = await browser.newPage();
      await setupPage(page);

      console.log(`    🔍 접속 중...`);

      await page.goto(checkUrl, {
        waitUntil: 'domcontentloaded',
        timeout: NAVIGATION_TIMEOUT_MS,
      });

      // 스크롤하여 콘텐츠 로드
      const scrollDistance = config.scrollDistance ?? 1000;
      await page.evaluate((distance) => window.scrollBy(0, distance), scrollDistance);

      // 예약 버튼 또는 불가 메시지가 나타날 때까지 대기
      const allPatterns = [...config.patterns.available, ...config.patterns.unavailable];
      try {
        await page.waitForFunction(
          (patterns) => {
            const text = document.body.innerText || '';
            return patterns.some((p) => text.includes(p));
          },
          { timeout: CONTENT_WAIT_MS },
          allPatterns,
        );
      } catch {
        // 타임아웃 시 그냥 진행
      }

      const evaluatePatterns = async () => {
        if (!page) throw new Error('Page is not initialized');
        return page.evaluate(
          (patterns, priceRegex) => {
            const bodyText = document.body.innerText || '';

            // 1. 예약 불가 패턴 확인
            for (const pattern of patterns.unavailable) {
              if (bodyText.includes(pattern)) {
                return {
                  matched: true,
                  available: false,
                  reason: pattern,
                  price: null,
                };
              }
            }

            // 2. 예약 가능 버튼 확인
            for (const pattern of patterns.available) {
              if (bodyText.includes(pattern)) {
                const priceMatch = bodyText.match(new RegExp(priceRegex));
                return {
                  matched: true,
                  available: true,
                  price: priceMatch ? priceMatch[0] : '가격 확인 필요',
                  reason: null,
                };
              }
            }

            return { matched: false, available: false, reason: null, price: null };
          },
          config.patterns,
          PRICE_PATTERN.source,
        );
      };

      let result = await evaluatePatterns();

      if (!result.matched && PATTERN_RETRY_MS > 0) {
        await delay(PATTERN_RETRY_MS);
        result = await evaluatePatterns();
      }

      if (!result.matched) {
        return {
          available: false,
          price: null,
          checkUrl,
          error: '패턴 미탐지',
        };
      }

      return {
        available: result.available,
        price: result.price,
        checkUrl,
        error: null,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      lastError = errorMessage;

      shouldRetry = attempt < MAX_RETRIES && isRetryableError(errorMessage);
      if (shouldRetry) {
        console.log(`    ⚠️  재시도 중... (${attempt + 1}/${MAX_RETRIES})`);
      } else {
        return {
          available: false,
          price: null,
          checkUrl,
          error: errorMessage,
        };
      }
    } finally {
      if (page) await page.close().catch(() => {});
      if (browser) await releaseBrowser(browser);
    }

    if (shouldRetry) {
      await delay(3000);
    }
  }

  return {
    available: false,
    price: null,
    checkUrl,
    error: lastError || 'Unknown error',
  };
}
