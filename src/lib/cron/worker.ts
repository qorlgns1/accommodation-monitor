// src/lib/cron/worker.ts

import cron from "node-cron";
import prisma from "@/lib/prisma";
import { checkAllAccommodations } from "./processor";
import { CRON_CONFIG } from "./config";

// ============================================
// 시작 로그
// ============================================
console.log(`🚀 숙소 모니터링 워커 시작`);
console.log(`📅 스케줄: ${CRON_CONFIG.schedule}`);
console.log(`⚙️  동시 처리 수: ${CRON_CONFIG.concurrency}`);
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
cron.schedule(CRON_CONFIG.schedule, checkAllAccommodations);

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
