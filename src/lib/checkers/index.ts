import { checkAirbnb } from "./airbnb";
import { checkAgoda } from "./agoda";
import type { CheckResult, AccommodationToCheck } from "./types";

export type { CheckResult, AccommodationToCheck };

export async function checkAccommodation(
  accommodation: AccommodationToCheck
): Promise<CheckResult> {
  switch (accommodation.platform) {
    case "AIRBNB":
      return checkAirbnb(accommodation);
    case "AGODA":
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
