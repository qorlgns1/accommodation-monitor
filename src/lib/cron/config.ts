import { getEnvNumber, validateWorkerEnv } from '@/lib/env';

// 워커 시작 시 환경변수 검증
validateWorkerEnv();

const schedule = process.env.CRON_SCHEDULE || '*/30 * * * *';
const configuredConcurrency = getEnvNumber('WORKER_CONCURRENCY', 3);
const browserPoolSize = getEnvNumber('BROWSER_POOL_SIZE', 2);

export const CRON_CONFIG = {
  schedule,
  concurrency: Math.min(configuredConcurrency, browserPoolSize),
  browserPoolSize,
  startupDelay: 10000, // 10초
} as const;

// 설정 로깅
export function logConfig(): void {
  console.log('📋 워커 설정:');
  console.log(`   - 스케줄: ${CRON_CONFIG.schedule}`);
  const concurrencyLabel =
    configuredConcurrency > browserPoolSize
      ? `${CRON_CONFIG.concurrency}개 (풀 크기 ${browserPoolSize}로 제한됨)`
      : `${CRON_CONFIG.concurrency}개`;
  console.log(`   - 동시 처리: ${concurrencyLabel}`);
  console.log(`   - 브라우저 풀: ${CRON_CONFIG.browserPoolSize}개`);
  console.log(`   - 시작 딜레이: ${CRON_CONFIG.startupDelay}ms`);
}
