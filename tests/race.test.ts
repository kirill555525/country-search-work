import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSearchController } from '../src/search-controller.js';
import type { SearchState } from '../src/search-controller.js';
import { finlandResponse, spainResponse } from './fixtures.js';

describe('real cancellation during an inverted response order', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('aborts the earlier fetch and keeps only the latest country', async () => {
    const attemptedResponses: string[] = [];
    const rejected: Array<{ query: string; name: string }> = [];
    const signals: AbortSignal[] = [];
    const states: SearchState[] = [];

    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>((url, options) => {
        const query = decodeURIComponent(String(url).split('/').at(-1) ?? '');
        const signal = options?.signal;
        if (!signal) throw new Error('fetch must receive AbortSignal');
        signals.push(signal);
        return new Promise<Response>((resolve, reject) => {
          const onAbort = () => {
            rejected.push({ query, name: (signal.reason as DOMException).name });
            reject(signal.reason);
          };
          if (signal.aborted) onAbort();
          else signal.addEventListener('abort', onAbort, { once: true });

          setTimeout(
            () => {
              signal.removeEventListener('abort', onAbort);
              attemptedResponses.push(query);
              resolve(Response.json([query === 'sp' ? finlandResponse : spainResponse]));
            },
            query === 'sp' ? 300 : 20,
          );
        });
      }),
    );

    const controller = createSearchController({
      delay: 30,
      onState: (state) => states.push(state),
    });
    controller.setQuery('sp');
    await vi.advanceTimersByTimeAsync(30);
    await vi.advanceTimersByTimeAsync(30);
    controller.setQuery('spain');
    expect(signals[0]?.aborted).toBe(true);
    expect(rejected).toEqual([{ query: 'sp', name: 'AbortError' }]);

    await vi.advanceTimersByTimeAsync(50);
    expect(controller.getState()).toMatchObject({
      status: 'success',
      query: 'spain',
      countries: [{ name: 'Spain' }],
    });
    await vi.advanceTimersByTimeAsync(300);
    expect(attemptedResponses).toEqual(['spain', 'sp']);
    expect(controller.getState()).toMatchObject({
      status: 'success',
      query: 'spain',
      countries: [{ name: 'Spain' }],
    });
    expect(states.filter((state) => state.status === 'success')).toHaveLength(1);
    expect(states.some((state) => state.status === 'error')).toBe(false);
    controller.dispose();
  });

  it('aborts an active fetch on clear and keeps the screen idle', async () => {
    let requestSignal: AbortSignal | null | undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>((_url, options) => {
        requestSignal = options?.signal;
        return new Promise((_resolve, reject) => {
          requestSignal?.addEventListener('abort', () => reject(requestSignal?.reason), {
            once: true,
          });
        });
      }),
    );
    const controller = createSearchController({ onState: vi.fn() });
    controller.setQuery('spain', true);
    controller.setQuery('');
    expect(requestSignal?.aborted).toBe(true);
    await vi.runAllTimersAsync();
    expect(controller.getState()).toEqual({ status: 'idle', query: '' });
    controller.dispose();
  });
});
