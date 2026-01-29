import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 날짜만 포맷팅 (체크인/체크아웃용)
 * 타임존 변환 없이 YYYY-MM-DD 형식으로 반환
 */
export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toISOString().split("T")[0];
}

/**
 * @deprecated 서버에서 사용하지 마세요. 클라이언트 컴포넌트에서 <LocalDateTime /> 사용 권장
 *
 * 서버에서 이 함수를 사용하면 서버 타임존(보통 UTC)이 적용됩니다.
 * 사용자의 로컬 타임존으로 표시하려면 <LocalDateTime date={date} /> 컴포넌트를 사용하세요.
 */
export function formatDateTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
