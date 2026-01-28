import { Browser } from "puppeteer";
import { createBrowser, setupPage } from "./browser";
import { PRICE_PATTERN } from "./constants";
import { isRetryableError, delay } from "./utils";
import type { CheckResult, AccommodationToCheck } from "./types";

interface PlatformPatterns {
  available: string[];
  unavailable: string[];
}

interface CheckerConfig {
  patterns: PlatformPatterns;
  buildUrl: (accommodation: AccommodationToCheck) => string;
  scrollDistance?: number;
}

export async function baseCheck(
  accommodation: AccommodationToCheck,
  config: CheckerConfig,
  retryCount = 0,
): Promise<CheckResult> {
  const MAX_RETRIES = 2;
  const checkUrl = config.buildUrl(accommodation);
  let browser: Browser | null = null;

  try {
    browser = await createBrowser();
    const page = await browser.newPage();
    await setupPage(page);

    console.log(`    🔍 접속 중...`);

    await page.goto(checkUrl, {
      waitUntil: "networkidle2",
      timeout: 60000,
    });

    // 스크롤하여 콘텐츠 로드
    const scrollDistance = config.scrollDistance ?? 1000;
    await page.evaluate(
      (distance) => window.scrollBy(0, distance),
      scrollDistance,
    );

    // 예약 버튼 또는 불가 메시지가 나타날 때까지 대기
    const allPatterns = [
      ...config.patterns.available,
      ...config.patterns.unavailable,
    ];
    try {
      await page.waitForFunction(
        (patterns) => {
          const text = document.body.innerText || "";
          return patterns.some((p) => text.includes(p));
        },
        { timeout: 10000 },
        allPatterns,
      );
    } catch {
      // 타임아웃 시 그냥 진행
    }

    const result = await page.evaluate(
      (patterns, priceRegex) => {
        const bodyText = document.body.innerText || "";

        // 1. 예약 불가 패턴 확인
        for (const pattern of patterns.unavailable) {
          if (bodyText.includes(pattern)) {
            return { available: false, reason: pattern, price: null };
          }
        }

        // 2. 예약 가능 버튼 확인
        for (const pattern of patterns.available) {
          if (bodyText.includes(pattern)) {
            const priceMatch = bodyText.match(new RegExp(priceRegex));
            return {
              available: true,
              price: priceMatch ? priceMatch[0] : "가격 확인 필요",
              reason: null,
            };
          }
        }

        return { available: false, reason: "상태 확인 불가", price: null };
      },
      config.patterns,
      PRICE_PATTERN.source,
    );

    return {
      available: result.available,
      price: result.price,
      checkUrl,
      error: null,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    if (retryCount < MAX_RETRIES && isRetryableError(errorMessage)) {
      console.log(`    ⚠️  재시도 중... (${retryCount + 1}/${MAX_RETRIES})`);
      if (browser) await browser.close().catch(() => {});
      await delay(3000);
      return baseCheck(accommodation, config, retryCount + 1);
    }

    return {
      available: false,
      price: null,
      checkUrl,
      error: errorMessage,
    };
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}
