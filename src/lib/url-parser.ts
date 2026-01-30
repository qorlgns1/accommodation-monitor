export interface ParsedAccommodationUrl {
  platform: 'AIRBNB' | 'AGODA' | null;
  baseUrl: string;
  checkIn: string | null;
  checkOut: string | null;
  adults: number | null;
  name: string | null;
}

/**
 * 숙소 URL을 파싱하여 정보 추출
 */
export function parseAccommodationUrl(url: string): ParsedAccommodationUrl {
  const result: ParsedAccommodationUrl = {
    platform: null,
    baseUrl: url,
    checkIn: null,
    checkOut: null,
    adults: null,
    name: null,
  };

  try {
    const urlObj = new URL(url);
    const params = urlObj.searchParams;

    // 플랫폼 감지
    if (urlObj.hostname.includes('airbnb')) {
      return parseAirbnbUrl(urlObj, params);
    } else if (urlObj.hostname.includes('agoda')) {
      return parseAgodaUrl(urlObj, params);
    }
  } catch {
    // URL 파싱 실패 시 기본값 반환
  }

  return result;
}

/**
 * Airbnb URL 파싱
 */
function parseAirbnbUrl(urlObj: URL, params: URLSearchParams): ParsedAccommodationUrl {
  // 기본 URL 추출 (쿼리 파라미터 제거)
  const pathMatch = urlObj.pathname.match(/\/rooms\/(\d+)/);
  const roomId = pathMatch ? pathMatch[1] : null;
  const baseUrl = roomId ? `${urlObj.origin}/rooms/${roomId}` : `${urlObj.origin}${urlObj.pathname}`;

  // 숙소명 추출 시도 (Airbnb는 URL에 이름이 없어서 null)
  const name = null;

  // 날짜 파싱
  const checkIn = params.get('check_in');
  const checkOut = params.get('check_out');

  // 인원 파싱
  const adults = params.get('adults');

  return {
    platform: 'AIRBNB',
    baseUrl,
    checkIn: checkIn && isValidDate(checkIn) ? checkIn : null,
    checkOut: checkOut && isValidDate(checkOut) ? checkOut : null,
    adults: adults ? parseInt(adults, 10) : null,
    name,
  };
}

/**
 * Agoda URL 파싱
 */
function parseAgodaUrl(urlObj: URL, params: URLSearchParams): ParsedAccommodationUrl {
  // 기본 URL 추출 (쿼리 파라미터 제거)
  const baseUrl = `${urlObj.origin}${urlObj.pathname}`;

  // 숙소명 추출 (URL 경로에서)
  // /ko-kr/ebenezer-hotel/hotel/jeju-island-kr.html → ebenezer-hotel
  const pathMatch = urlObj.pathname.match(/\/([^/]+)\/hotel\//);
  const name = pathMatch ? formatHotelName(pathMatch[1]) : null;

  // 날짜 파싱
  const checkIn = params.get('checkIn');
  const los = params.get('los'); // Length of Stay (숙박 일수)

  let checkOut: string | null = null;
  if (checkIn && isValidDate(checkIn) && los) {
    const nights = parseInt(los, 10);
    if (!isNaN(nights) && nights > 0) {
      checkOut = calculateCheckOut(checkIn, nights);
    }
  }

  // 인원 파싱
  const adults = params.get('adults');

  return {
    platform: 'AGODA',
    baseUrl,
    checkIn: checkIn && isValidDate(checkIn) ? checkIn : null,
    checkOut,
    adults: adults ? parseInt(adults, 10) : null,
    name,
  };
}

/**
 * 날짜 유효성 검사 (YYYY-MM-DD 형식)
 */
function isValidDate(dateStr: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;

  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

/**
 * 체크인 날짜 + 숙박일수로 체크아웃 날짜 계산
 */
function calculateCheckOut(checkIn: string, nights: number): string {
  const date = new Date(checkIn);
  date.setDate(date.getDate() + nights);
  return date.toISOString().split('T')[0];
}

/**
 * 호텔명 포맷팅 (kebab-case → 일반 텍스트)
 * ebenezer-hotel → Ebenezer Hotel
 */
function formatHotelName(slug: string): string {
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
