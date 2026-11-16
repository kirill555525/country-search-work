import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpError } from '../src/http-error.js';
import { REQUEST_TIMEOUT_MS, searchCountries } from '../src/search-countries.js';
import { finlandResponse } from './fixtures.js';

describe('searchCountries', () => {
  const fetchMock = vi.fn<typeof fetch>();
  beforeEach(() => {
    vi.useFakeTimers();
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.useRealTimers());

  function respondWhenAborted(): void {
    fetchMock.mockImplementation(
      (_url, options) =>
        new Promise((_resolve, reject) => {
          const signal = options?.signal;
          if (!signal) throw new Error('The request must include a signal');
          const rejectAbort = () => reject(signal.reason);
          if (signal.aborted) rejectAbort();
          else signal.addEventListener('abort', rejectAbort, { once: true });
        }),
    );
  }

  it('encodes the trimmed query and maps an array response', async () => {
    fetchMock.mockResolvedValue(Response.json([finlandResponse]));
    const result = await searchCountries(
      '  united states/  ',
      new AbortController().signal,
    );
    expect(fetchMock).toHaveBeenCalledWith(
      'https://countries.dev/name/united%20states%2F',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(result[0]?.name).toBe('Finland');
    expect(result[0]?.languages).toEqual(['Finnish', 'Swedish']);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not fetch an empty query', async () => {
    expect(await searchCountries('   ', new AbortController().signal)).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('treats a text/plain 404 as an empty result without parsing JSON', async () => {
    fetchMock.mockResolvedValue(new Response('Country not found', { status: 404 }));
    expect(await searchCountries('missing', new AbortController().signal)).toEqual([]);
  });

  it.each([400, 429, 500, 503])('throws HttpError for HTTP %s', async (status) => {
    fetchMock.mockResolvedValue(new Response('Failed', { status }));
    const promise = searchCountries('spain', new AbortController().signal);
    await expect(promise).rejects.toBeInstanceOf(HttpError);
    await expect(promise).rejects.toMatchObject({ status });
  });

  it('preserves network failures', async () => {
    const error = new TypeError('Failed to fetch');
    fetchMock.mockRejectedValue(error);
    await expect(searchCountries('spain', new AbortController().signal)).rejects.toBe(
      error,
    );
    expect(vi.getTimerCount()).toBe(0);
  });

  it('rejects malformed successful payloads', async () => {
    fetchMock.mockResolvedValue(Response.json({ message: 'Not an array' }));
    await expect(
      searchCountries('spain', new AbortController().signal),
    ).rejects.toBeInstanceOf(TypeError);
  });

  it('really aborts fetch when the caller cancels', async () => {
    respondWhenAborted();
    const controller = new AbortController();
    const assertion = expect(
      searchCountries('sp', controller.signal),
    ).rejects.toMatchObject({ name: 'AbortError' });
    controller.abort();
    await assertion;
    expect(fetchMock.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not start fetch with an already aborted signal', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(searchCountries('spain', controller.signal)).rejects.toMatchObject({
      name: 'AbortError',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('aborts a stalled request with TimeoutError, not AbortError', async () => {
    respondWhenAborted();
    const caller = new AbortController();
    const assertion = expect(
      searchCountries('spain', caller.signal),
    ).rejects.toMatchObject({ name: 'TimeoutError' });
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS);
    await assertion;
    expect(caller.signal.aborted).toBe(false);
    expect(fetchMock.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });
});
