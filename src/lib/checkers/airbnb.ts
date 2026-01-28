import { baseCheck } from "./baseChecker";
import { formatDate } from "./utils";
import { AIRBNB_PATTERNS } from "./constants";
import type { CheckResult, AccommodationToCheck } from "./types";

export async function checkAirbnb(
  accommodation: AccommodationToCheck,
): Promise<CheckResult> {
  return baseCheck(accommodation, {
    patterns: AIRBNB_PATTERNS,
    scrollDistance: 500,
    buildUrl: ({ url, checkIn, checkOut, adults }) =>
      `${url}?check_in=${formatDate(checkIn)}&check_out=${formatDate(checkOut)}&adults=${adults}`,
  });
}
