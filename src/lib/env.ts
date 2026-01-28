/**
 * 환경변수 검증 유틸리티
 * 앱 시작 시 필수 환경변수가 설정되어 있는지 확인
 */

interface EnvConfig {
  // Database
  DATABASE_URL: string;

  // NextAuth
  NEXTAUTH_URL: string;
  NEXTAUTH_SECRET: string;

  // Google OAuth
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;

  // Kakao OAuth
  KAKAO_CLIENT_ID: string;
  KAKAO_CLIENT_SECRET: string;

  // Optional
  CRON_SCHEDULE?: string;
  WORKER_CONCURRENCY?: string;
  BROWSER_POOL_SIZE?: string;
}

const requiredEnvVars = [
  "DATABASE_URL",
  "NEXTAUTH_URL",
  "NEXTAUTH_SECRET",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "KAKAO_CLIENT_ID",
  "KAKAO_CLIENT_SECRET",
] as const;

const workerRequiredEnvVars = [
  "DATABASE_URL",
  "KAKAO_CLIENT_ID",
  "KAKAO_CLIENT_SECRET",
] as const;

/**
 * 웹 앱용 환경변수 검증
 */
export function validateWebEnv(): EnvConfig {
  const missing: string[] = [];

  for (const key of requiredEnvVars) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `❌ 필수 환경변수가 설정되지 않았습니다:\n` +
        missing.map((key) => `   - ${key}`).join("\n") +
        `\n\n.env 파일을 확인하세요.`,
    );
  }

  return process.env as unknown as EnvConfig;
}

/**
 * 워커용 환경변수 검증
 */
export function validateWorkerEnv(): Pick<
  EnvConfig,
  "DATABASE_URL" | "KAKAO_CLIENT_ID" | "KAKAO_CLIENT_SECRET"
> {
  const missing: string[] = [];

  for (const key of workerRequiredEnvVars) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `❌ 워커 필수 환경변수가 설정되지 않았습니다:\n` +
        missing.map((key) => `   - ${key}`).join("\n") +
        `\n\n.env 파일을 확인하세요.`,
    );
  }

  return {
    DATABASE_URL: process.env.DATABASE_URL!,
    KAKAO_CLIENT_ID: process.env.KAKAO_CLIENT_ID!,
    KAKAO_CLIENT_SECRET: process.env.KAKAO_CLIENT_SECRET!,
  };
}

/**
 * 환경변수 안전하게 가져오기 (기본값 지원)
 */
export function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`환경변수 ${key}가 설정되지 않았습니다.`);
  }
  return value;
}

/**
 * 숫자형 환경변수 가져오기
 */
export function getEnvNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (value === undefined) {
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    console.warn(
      `⚠️ ${key}의 값 "${value}"이 숫자가 아닙니다. 기본값 ${defaultValue} 사용`,
    );
    return defaultValue;
  }
  return parsed;
}
