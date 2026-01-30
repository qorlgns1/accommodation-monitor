import { checkAgoda } from './agoda';
import { checkAirbnb } from './airbnb';
import type { AccommodationToCheck, CheckResult } from './types';

export type { CheckResult, AccommodationToCheck };

export async function checkAccommodation(accommodation: AccommodationToCheck): Promise<CheckResult> {
  switch (accommodation.platform) {
    case 'AIRBNB':
      return checkAirbnb(accommodation);
    case 'AGODA':
      return checkAgoda(accommodation);
    default:
      return {
        available: false,
        price: null,
        checkUrl: accommodation.url,
        error: `Unknown platform: ${accommodation.platform}`,
      };
  }
}
