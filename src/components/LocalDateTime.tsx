'use client';

import { useEffect, useState } from 'react';

interface LocalDateTimeProps {
  date: Date | string;
  className?: string;
}

/**
 * 클라이언트의 로컬 타임존으로 날짜/시간을 표시하는 컴포넌트
 * SSR 시에는 ISO 문자열을, 클라이언트에서는 로컬 시간을 표시
 */
export function LocalDateTime({ date, className }: LocalDateTimeProps) {
  const [formatted, setFormatted] = useState<string>('');

  useEffect(() => {
    const d = new Date(date);
    setFormatted(
      d.toLocaleString(undefined, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
    );
  }, [date]);

  // SSR 시 hydration mismatch 방지를 위해 빈 문자열 또는 ISO 형식 표시
  if (!formatted) {
    return <span className={className}>--</span>;
  }

  return <span className={className}>{formatted}</span>;
}

/**
 * 날짜만 표시 (체크인/체크아웃용) - 타임존 변환 없이 날짜만 추출
 */
export function LocalDate({ date, className }: LocalDateTimeProps) {
  // 체크인/체크아웃은 날짜만 의미하므로 UTC 기준으로 추출
  const d = new Date(date);
  const formatted = d.toISOString().split('T')[0];

  return <span className={className}>{formatted}</span>;
}
