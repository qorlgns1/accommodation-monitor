export const AGODA_PATTERNS = {
  unavailable: [
    '죄송합니다. 고객님이 선택한 날짜에 이 숙소의 본 사이트 잔여 객실이 없습니다',
    'Sorry, we have no rooms at this property on your dates',
    '날짜를 변경해 이 숙소 재검색하기',
    'Change your dates',
    '동일한 날짜로 다른 숙소 검색하기',
    'See available properties',
  ],
  available: [
    '지금 예약하기',
    'Book now',
    '예약 무료 취소 가능',
    'Covered by EasyCancel',
    '서두르세요, 당사 마지막 객실입니다!',
    'Hurry, our last room!',
  ],
};

export const AIRBNB_PATTERNS = {
  unavailable: [
    '날짜 변경',
    'Change dates',
    '선택하신 날짜는 이용이 불가능합니다',
    'Those dates are not available',
    '이 날짜에는 예약할 수 없습니다',
    'Not available',
  ],
  available: ['예약하기', 'Reserve', '예약 확정 전에는 요금이 청구되지 않습니다', "You won't be charged yet"],
};

// 가격 패턴 (공통)
export const PRICE_PATTERN = /₩\s*[\d,]+|\$\s*[\d,.]+|€\s*[\d,.]+|CHF\s*[\d,.]+|£\s*[\d,.]+/;

// 재시도 가능한 에러 패턴 (공통)
export const RETRYABLE_ERRORS = [
  'frame was detached',
  'Connection closed',
  'Target closed',
  'Protocol error',
  'protocolTimeout',
  'timed out',
  'Timeout',
  'timeout',
  'Navigation timeout',
  'net::ERR_',
  'ECONNREFUSED',
  'ECONNRESET',
];
