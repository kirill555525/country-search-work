import { describe, expect, it, vi } from 'vitest';
import { HttpError } from '../src/http-error.js';
import { classifySearchError } from '../src/search-error.js';
import { searchCountries } from '../src/search-countries.js';

describe('classifySearchError', () => {
  it('hides cancellation by the caller', () => {
    expect(classifySearchError(new DOMException('Canceled', 'AbortError'))).toEqual({
      kind: 'aborted',
    });
  });

  it('shows timeouts as a real, retryable error', () => {
    expect(
      classifySearchError(new DOMException('Timed out', 'TimeoutError')),
    ).toMatchObject({ kind: 'timeout', message: expect.stringContaining('время') });
  });

  it('preserves an HTTP status in the user message', () => {
    expect(classifySearchError(new HttpError(503))).toMatchObject({
      kind: 'http',
      message: expect.stringContaining('503'),
    });
  });

  it('maps a not-found HttpError to empty as a defensive fallback', () => {
    expect(classifySearchError(new HttpError(404))).toEqual({ kind: 'empty' });
  });

  it('returns [] for a real 404 response, without entering the error branch', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('Not found', { status: 404 })),
    );
    expect(await searchCountries('missing', new AbortController().signal)).toEqual([]);
  });

  it('recognizes network errors', () => {
    expect(classifySearchError(new TypeError('Failed to fetch'))).toMatchObject({
      kind: 'network',
      message: expect.any(String),
    });
  });

  it('does not expose arbitrary server or JavaScript messages', () => {
    const failure = classifySearchError(new Error('sensitive internals'));
    expect(failure).toMatchObject({ kind: 'unknown', message: expect.any(String) });
    expect(JSON.stringify(failure)).not.toContain('sensitive internals');
  });
});
