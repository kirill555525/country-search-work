import type { Country } from './country.js';
import { HttpError } from './http-error.js';
import { mapCountryResponse } from './map-country.js';

export const REQUEST_TIMEOUT_MS = 8000;

export async function searchCountries(
  query: string,
  signal: AbortSignal,
): Promise<Country[]> {
  signal.throwIfAborted();
  const normalized = query.trim();
  if (!normalized) return [];

  const request = new AbortController();
  const cancel = () => request.abort(signal.reason);
  signal.addEventListener('abort', cancel, { once: true });
  const timer = setTimeout(() => {
    request.abort(new DOMException('Request timed out', 'TimeoutError'));
  }, REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(
      `https://countries.dev/name/${encodeURIComponent(normalized)}`,
      {
        signal: request.signal,
        headers: { Accept: 'application/json' },
      },
    );
    request.signal.throwIfAborted();
    if (response.status === 404) return [];
    if (!response.ok) throw new HttpError(response.status);
    const raw: unknown = await response.json();
    request.signal.throwIfAborted();
    if (!Array.isArray(raw)) throw new TypeError('Expected an array of countries');
    return raw.map(mapCountryResponse);
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', cancel);
  }
}
