import type { Country } from './country.js';

export const REQUEST_TIMEOUT_MS = 8000;

export async function searchCountries(
  query: string,
  signal: AbortSignal,
): Promise<Country[]> {
  void query;
  void signal;
  throw new Error('Not implemented');
}
