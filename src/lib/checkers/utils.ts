import { RETRYABLE_ERRORS } from './constants';

export function isRetryableError(errorMessage: string): boolean {
  if (errorMessage.includes('Navigation timeout')) {
    return false;
  }
  return RETRYABLE_ERRORS.some((pattern) => errorMessage.includes(pattern));
}

export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function calculateNights(checkIn: Date, checkOut: Date): number {
  const diffTime = Math.abs(checkOut.getTime() - checkIn.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
