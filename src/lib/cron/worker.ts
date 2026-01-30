// src/lib/cron/worker.ts
import cron from 'node-cron';

import { closeBrowserPool } from '@/lib/checkers/browserPool';
import prisma from '@/lib/prisma';

import { CRON_CONFIG, logConfig } from './config';
import { checkAllAccommodations, isProcessing } from './processor';

const SHUTDOWN_TIMEOUT = 60000; // 최대 60초 대기

// ============================================
// 시작 로그
// ============================================
console.log(`\n🚀 숙소 모니터링 워커 시작`);
logConfig();
console.log(`⏰ 다음 실행 대기 중...\n`);

// ============================================
// 초기 실행
// ============================================
setTimeout(() => {
  checkAllAccommodations();
}, CRON_CONFIG.startupDelay);

// ============================================
// 크론 스케줄 등록
// ============================================
const scheduledTask = cron.schedule(CRON_CONFIG.schedule, checkAllAccommodations);

// ============================================
// 프로세스 종료 핸들링
// ============================================
let isShuttingDown = false;

async function gracefulShutdown(): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`\n🛑 종료 신호 수신. 워커 종료 중...`);

  // 새로운 작업 스케줄링 중지
  scheduledTask.stop();
  console.log('   - 크론 스케줄 중지됨');

  // 진행 중인 작업 완료 대기
  if (isProcessing()) {
    console.log('   - 진행 중인 작업 완료 대기 중...');

    const startWait = Date.now();
    while (isProcessing() && Date.now() - startWait < SHUTDOWN_TIMEOUT) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    if (isProcessing()) {
      console.log('   ⚠️ 타임아웃: 작업 완료를 기다리지 못하고 종료합니다.');
    } else {
      console.log('   - 모든 작업 완료됨');
    }
  }

  await closeBrowserPool();
  console.log('   - 브라우저 풀 종료됨');

  await prisma.$disconnect();
  console.log('   - DB 연결 해제됨');
  console.log('👋 워커 종료 완료\n');

  process.exit(0);
}

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
