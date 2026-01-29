import { baseCheck } from "./baseChecker";
import { formatDate, calculateNights } from "./utils";
import { AGODA_PATTERNS } from "./constants";
import type { CheckResult, AccommodationToCheck } from "./types";

export async function checkAgoda(
  accommodation: AccommodationToCheck,
): Promise<CheckResult> {
  return baseCheck(accommodation, {
    patterns: AGODA_PATTERNS,
    scrollDistance: 2000,
    buildUrl: ({ url, checkIn, checkOut, adults }) => {
      const baseUrl = url.split("?")[0];
      const nights = calculateNights(checkIn, checkOut);
      return `${baseUrl}?checkIn=${formatDate(checkIn)}&los=${nights}&adults=${adults}&rooms=1&cid=1890020`;
    },
  });
}
