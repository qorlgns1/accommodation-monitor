import { baseCheck } from './baseChecker';
import { AIRBNB_PATTERNS } from './constants';
import type { AccommodationToCheck, CheckResult } from './types';
import { formatDate } from './utils';

export async function checkAirbnb(accommodation: AccommodationToCheck): Promise<CheckResult> {
  return baseCheck(accommodation, {
    patterns: AIRBNB_PATTERNS,
    scrollDistance: 500,
    buildUrl: ({ url, checkIn, checkOut, adults }) =>
      `${url}?check_in=${formatDate(checkIn)}&check_out=${formatDate(checkOut)}&adults=${adults}`,
  });
}
