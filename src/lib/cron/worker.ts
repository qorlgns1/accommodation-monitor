import cron from "node-cron";
import puppeteer, { Browser, Page } from "puppeteer";
import prisma from "@/lib/prisma";
import { notifyAvailable } from "@/lib/kakao/message";
import type { AvailabilityStatus, Platform } from "@prisma/client";

// ============================================
// 환경 설정
// ============================================
const CRON_SCHEDULE = process.env.CRON_SCHEDULE || "*/10 * * * *";
const CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY || "3", 10);

// ============================================
// 타입 정의
// ============================================
interface AccommodationToCheck {
  id: string;
  url: string;
  checkIn: Date;
  checkOut: Date;
  adults: number;
  platform: Platform;
}

interface CheckResult {
  available: boolean;
  price: string | null;
  checkUrl: string;
  error: string | null;
}

interface AccommodationWithUser {
  id: string;
  name: string;
  url: string;
  checkIn: Date;
  checkOut: Date;
  adults: number;
  platform: Platform;
  lastStatus: AvailabilityStatus | null;
  user: {
    id: string;
    kakaoAccessToken: string | null;
  };
}

// ============================================
// 동시성 제어
// ============================================
function createLimiter(concurrency: number) {
  let running = 0;
  const queue: (() => void)[] = [];

  const runNext = () => {
    if (queue.length > 0 && running < concurrency) {
      running++;
      const next = queue.shift()!;
      next();
    }
  };

  return async <T>(fn: () => Promise<T>): Promise<T> => {
    return new Promise((resolve, reject) => {
      const run = async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          running--;
          runNext();
        }
      };

      queue.push(run);
      runNext();
    });
  };
}

// ============================================
// 유틸리티 함수
// ============================================
function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function calculateNights(checkIn: Date, checkOut: Date): number {
  const diffTime = Math.abs(checkOut.getTime() - checkIn.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ============================================
// 브라우저 생성 (안정성 강화)
// ============================================
async function createBrowser(): Promise<Browser> {
  return puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--disable-gpu",
      "--window-size=1920,1080",
      // 봇 감지 우회 옵션
      "--disable-blink-features=AutomationControlled",
      "--disable-infobars",
      "--disable-background-timer-throttling",
      "--disable-backgrounding-occluded-windows",
      "--disable-renderer-backgrounding",
    ],
    // 타임아웃 늘리기
    timeout: 60000,
  });
}

// ============================================
// 페이지 설정 (봇 감지 우회)
// ============================================
async function setupPage(page: Page): Promise<void> {
  // User Agent 설정
  await page.setUserAgent(
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  );

  // Viewport 설정
  await page.setViewport({ width: 1920, height: 1080 });

  // 언어 헤더
  await page.setExtraHTTPHeaders({
    "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  });

  // WebDriver 속성 숨기기
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, "webdriver", {
      get: () => undefined,
    });

    // Chrome 속성 추가
    (window as any).chrome = {
      runtime: {},
    };

    // Permissions 속성 수정
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (parameters: any) =>
      parameters.name === "notifications"
        ? Promise.resolve({
            state: Notification.permission,
          } as PermissionStatus)
        : originalQuery(parameters);

    // Plugins 속성 수정
    Object.defineProperty(navigator, "plugins", {
      get: () => [1, 2, 3, 4, 5],
    });

    // Languages 속성 수정
    Object.defineProperty(navigator, "languages", {
      get: () => ["ko-KR", "ko", "en-US", "en"],
    });
  });
}

// ============================================
// Airbnb 체커 (재시도 로직 포함)
// ============================================
async function checkAirbnb(
  accommodation: AccommodationToCheck,
  retryCount = 0,
): Promise<CheckResult> {
  const { url, checkIn, checkOut, adults } = accommodation;
  const checkUrl = `${url}?check_in=${formatDate(checkIn)}&check_out=${formatDate(checkOut)}&adults=${adults}`;

  const MAX_RETRIES = 2;
  let browser: Browser | null = null;

  try {
    browser = await createBrowser();
    const page = await browser.newPage();

    await setupPage(page);

    // 타임아웃 설정
    page.setDefaultTimeout(60000);
    page.setDefaultNavigationTimeout(60000);

    console.log(`    🔍 Airbnb 접속 중...`);

    // domcontentloaded로 변경 (더 안정적)
    await page.goto(checkUrl, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    // 페이지 로드 대기
    await delay(5000);

    // 추가 콘텐츠 로드 대기
    try {
      await page.waitForSelector("body", { timeout: 10000 });
    } catch {
      // 무시
    }

    // 페이지 내용 확인
    const result = await page.evaluate(() => {
      const bodyText = document.body.innerText || "";

      // 예약 불가 패턴
      const unavailablePatterns = [
        "날짜 변경",
        "Change dates",
        "선택하신 날짜는 이용이 불가능합니다",
        "Those dates are not available",
        "이 날짜에는 예약할 수 없습니다",
        "Not available",
      ];

      for (const pattern of unavailablePatterns) {
        if (bodyText.includes(pattern)) {
          return { available: false, reason: pattern, price: null };
        }
      }

      // 가격 확인
      const priceMatch = bodyText.match(/₩\s*([\d,]+)/);
      const hasPrice =
        priceMatch && parseInt(priceMatch[1].replace(/,/g, ""), 10) > 0;

      if (hasPrice) {
        const availablePatterns = [
          "예약하기",
          "Reserve",
          "예약 확정 전에는 요금이 청구되지 않습니다",
          "You won't be charged yet",
          "총 요금",
          "Total",
        ];

        for (const pattern of availablePatterns) {
          if (bodyText.includes(pattern)) {
            return {
              available: true,
              price: priceMatch![0],
              reason: null,
            };
          }
        }
      }

      return { available: false, reason: "가격 정보 없음", price: null };
    });

    return {
      available: result.available,
      price: result.price,
      checkUrl,
      error: null,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    // 재시도 가능한 에러인 경우
    if (
      retryCount < MAX_RETRIES &&
      (errorMessage.includes("frame was detached") ||
        errorMessage.includes("Connection closed") ||
        errorMessage.includes("Target closed") ||
        errorMessage.includes("Protocol error"))
    ) {
      console.log(`    ⚠️  재시도 중... (${retryCount + 1}/${MAX_RETRIES})`);

      if (browser) {
        await browser.close().catch(() => {});
      }

      // 재시도 전 대기
      await delay(3000);

      return checkAirbnb(accommodation, retryCount + 1);
    }

    return {
      available: false,
      price: null,
      checkUrl,
      error: errorMessage,
    };
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}

// ============================================
// Agoda 체커 (재시도 로직 포함)
// ============================================
async function checkAgoda(
  accommodation: AccommodationToCheck,
  retryCount = 0,
): Promise<CheckResult> {
  const { url, checkIn, checkOut, adults } = accommodation;
  const baseUrl = url.split("?")[0];
  const nights = calculateNights(checkIn, checkOut);
  const checkUrl = `${baseUrl}?checkIn=${formatDate(checkIn)}&los=${nights}&adults=${adults}&rooms=1&cid=1890020`;

  const MAX_RETRIES = 2;
  let browser: Browser | null = null;

  try {
    browser = await createBrowser();
    const page = await browser.newPage();

    await setupPage(page);

    page.setDefaultTimeout(60000);
    page.setDefaultNavigationTimeout(60000);

    console.log(`    🔍 Agoda 접속 중...`);

    await page.goto(checkUrl, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    await delay(7000);

    const result = await page.evaluate(() => {
      const bodyText = document.body.innerText || "";

      const unavailablePatterns = [
        "죄송합니다. 고객님이 선택한 날짜에 이 숙소의 본 사이트 잔여 객실이 없습니다",
        "Sorry, we have no rooms at this property on your dates",
        "날짜를 변경해 이 숙소 재검색하기",
        "Change your dates",
        "동일한 날짜로 다른 숙소 검색하기",
        "See available properties",
      ];

      for (const pattern of unavailablePatterns) {
        if (bodyText.includes(pattern)) {
          return { available: false, reason: pattern, price: null };
        }
      }

      const availablePatterns = ["지금 예약하기", "Book now", "객실 선택"];
      const priceMatch = bodyText.match(/₩\s*[\d,]+|KRW\s*[\d,]+/);

      for (const pattern of availablePatterns) {
        if (bodyText.includes(pattern)) {
          return {
            available: true,
            price: priceMatch ? priceMatch[0] : null,
            reason: null,
          };
        }
      }

      return { available: false, reason: "상태 확인 불가", price: null };
    });

    return {
      available: result.available,
      price: result.price,
      checkUrl,
      error: null,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    if (
      retryCount < MAX_RETRIES &&
      (errorMessage.includes("frame was detached") ||
        errorMessage.includes("Connection closed") ||
        errorMessage.includes("Target closed") ||
        errorMessage.includes("Protocol error"))
    ) {
      console.log(`    ⚠️  재시도 중... (${retryCount + 1}/${MAX_RETRIES})`);

      if (browser) {
        await browser.close().catch(() => {});
      }

      await delay(3000);

      return checkAgoda(accommodation, retryCount + 1);
    }

    return {
      available: false,
      price: null,
      checkUrl,
      error: errorMessage,
    };
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}

// ============================================
// 체커 라우터
// ============================================
async function checkAccommodation(
  accommodation: AccommodationToCheck,
): Promise<CheckResult> {
  switch (accommodation.platform) {
    case "AIRBNB":
      return checkAirbnb(accommodation);
    case "AGODA":
      return checkAgoda(accommodation);
    default:
      return {
        available: false,
        price: null,
        checkUrl: accommodation.url,
        error: `Unknown platform: ${accommodation.platform}`,
      };
  }
}

// ============================================
// 단일 숙소 처리
// ============================================
async function processAccommodation(
  accommodation: AccommodationWithUser,
): Promise<void> {
  const startTime = Date.now();

  try {
    console.log(`\n📍 [${accommodation.name}] 체크 시작`);

    const result = await checkAccommodation({
      id: accommodation.id,
      url: accommodation.url,
      checkIn: accommodation.checkIn,
      checkOut: accommodation.checkOut,
      adults: accommodation.adults,
      platform: accommodation.platform,
    });

    let status: AvailabilityStatus;
    if (result.error) {
      status = "ERROR";
      console.log(`  ❌ 에러: ${result.error}`);
    } else if (result.available) {
      status = "AVAILABLE";
      console.log(`  ✅ 예약 가능! ${result.price || ""}`);
    } else {
      status = "UNAVAILABLE";
      console.log(`  ⛔ 예약 불가`);
    }

    // 로그 저장
    await prisma.checkLog.create({
      data: {
        accommodationId: accommodation.id,
        userId: accommodation.user.id,
        status,
        price: result.price,
        errorMessage: result.error,
        notificationSent: false,
      },
    });

    // 상태 변경 시 알림
    const shouldNotify =
      status === "AVAILABLE" &&
      accommodation.lastStatus !== "AVAILABLE" &&
      accommodation.user.kakaoAccessToken;

    if (shouldNotify) {
      console.log(`  📱 카카오톡 알림 전송 중...`);

      const sent = await notifyAvailable(
        accommodation.user.id,
        accommodation.name,
        accommodation.checkIn,
        accommodation.checkOut,
        result.price,
        result.checkUrl,
      );

      if (sent) {
        await prisma.checkLog.updateMany({
          where: {
            accommodationId: accommodation.id,
            notificationSent: false,
          },
          data: {
            notificationSent: true,
          },
        });
      }
    }

    // 숙소 상태 업데이트
    await prisma.accommodation.update({
      where: { id: accommodation.id },
      data: {
        lastCheck: new Date(),
        lastStatus: status,
        lastPrice: result.price,
      },
    });

    const elapsed = Date.now() - startTime;
    console.log(`  ⏱️  완료 (${elapsed}ms)`);
  } catch (error) {
    console.error(`  💥 처리 실패:`, error);
  }
}

// ============================================
// 메인 체크 함수
// ============================================
let isRunning = false;

async function checkAllAccommodations(): Promise<void> {
  if (isRunning) {
    console.log("⚠️  이전 작업이 아직 실행 중입니다. 스킵합니다.");
    return;
  }

  isRunning = true;
  const startTime = Date.now();

  console.log("\n========================================");
  console.log(`🕐 모니터링 시작: ${new Date().toLocaleString("ko-KR")}`);
  console.log(`⚙️  동시 처리: ${CONCURRENCY}개`);
  console.log("========================================");

  try {
    const accommodations = await prisma.accommodation.findMany({
      where: {
        isActive: true,
        checkIn: {
          gte: new Date(),
        },
      },
      include: {
        user: {
          select: {
            id: true,
            kakaoAccessToken: true,
          },
        },
      },
    });

    console.log(`📋 체크할 숙소: ${accommodations.length}개`);

    if (accommodations.length === 0) {
      console.log("체크할 숙소가 없습니다.\n");
      isRunning = false;
      return;
    }

    const limit = createLimiter(CONCURRENCY);

    await Promise.all(
      accommodations.map((accommodation) =>
        limit(() => processAccommodation(accommodation)),
      ),
    );

    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.log(`\n✅ 모니터링 완료 (총 ${elapsed}초 소요)\n`);
  } catch (error) {
    console.error("모니터링 중 오류 발생:", error);
  } finally {
    isRunning = false;
  }
}

// ============================================
// 크론 작업 시작
// ============================================
console.log(`🚀 숙소 모니터링 워커 시작`);
console.log(`📅 스케줄: ${CRON_SCHEDULE}`);
console.log(`⚙️  동시 처리 수: ${CONCURRENCY}`);
console.log(`⏰ 다음 실행 대기 중...\n`);

// 시작 시 10초 후 실행 (초기화 시간 확보)
setTimeout(() => {
  checkAllAccommodations();
}, 10000);

// 크론 스케줄 등록
cron.schedule(CRON_SCHEDULE, checkAllAccommodations);

// ============================================
// 프로세스 종료 핸들링
// ============================================
async function gracefulShutdown(signal: string): Promise<void> {
  console.log(`\n🛑 ${signal} 수신. 워커 종료 중...`);
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
