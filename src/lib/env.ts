/**
 * 환경변수 검증 유틸리티
 * 앱 시작 시 필수 환경변수가 설정되어 있는지 확인
 */

const WEB_REQUIRED_ENV_VARS = [
  "DATABASE_URL",
  "NEXTAUTH_URL",
  "NEXTAUTH_SECRET",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "KAKAO_CLIENT_ID",
  "KAKAO_CLIENT_SECRET",
] as const;

const WORKER_REQUIRED_ENV_VARS = [
  "DATABASE_URL",
  "KAKAO_CLIENT_ID",
  "KAKAO_CLIENT_SECRET",
] as const;

/**
 * 웹 앱용 환경변수 검증
 */
export function validateWebEnv(): void {
  validateEnvVars(WEB_REQUIRED_ENV_VARS, "웹 앱");
}

/**
 * 워커용 환경변수 검증
 */
export function validateWorkerEnv(): void {
  validateEnvVars(WORKER_REQUIRED_ENV_VARS, "워커");
}

/**
 * 공통 검증 로직
 */
function validateEnvVars(keys: readonly string[], context: string): void {
  const missing = keys.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `❌ ${context} 필수 환경변수가 설정되지 않았습니다:\n` +
        missing.map((key) => `   - ${key}`).join("\n") +
        `\n\n.env 파일을 확인하세요.`,
    );
  }
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
