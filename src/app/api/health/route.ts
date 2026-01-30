import { NextResponse } from 'next/server';

import prisma from '@/lib/prisma';

interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  checks: {
    database: {
      status: 'connected' | 'disconnected';
      latency?: number;
      error?: string;
    };
  };
}

export async function GET() {
  const isDev = process.env.NODE_ENV === 'development';

  const health: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {
      database: {
        status: 'disconnected',
      },
    },
  };

  // DB 연결 체크
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    health.checks.database = {
      status: 'connected',
      latency: Date.now() - dbStart,
    };
  } catch (error) {
    health.status = 'unhealthy';
    health.checks.database = {
      status: 'disconnected',
      // 개발 환경에서만 상세 에러 표시
      ...(isDev && {
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }

  const statusCode = health.status === 'healthy' ? 200 : 503;

  return NextResponse.json(health, { status: statusCode });
}
