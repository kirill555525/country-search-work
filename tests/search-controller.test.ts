import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSearchController } from '../src/search-controller.js';
import type { CountrySearch, SearchState } from '../src/search-controller.js';
import { mapCountryResponse } from '../src/map-country.js';
import { finlandResponse } from './fixtures.js';

describe('search controller without DOM', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  function setup(search = vi.fn<CountrySearch>().mockResolvedValue([])) {
    const states: SearchState[] = [];
    const controller = createSearchController({
      search,
      onState: (state) => states.push(state),
    });
    return { search, states, controller };
  }

  it('keeps empty input idle and does not request anything', async () => {
    const { search, controller } = setup();
    controller.setQuery('  ');
    await vi.runAllTimersAsync();
    expect(search).not.toHaveBeenCalled();
    expect(controller.getState()).toEqual({ status: 'idle', query: '' });
  });

  it('debounces rapid typing and exposes waiting, loading and success', async () => {
    const country = mapCountryResponse(finlandResponse);
    const { search, states, controller } = setup(
      vi.fn<CountrySearch>().mockResolvedValue([country]),
    );
    controller.setQuery('fi');
    await vi.advanceTimersByTimeAsync(200);
    controller.setQuery('finland');
    await vi.advanceTimersByTimeAsync(299);
    expect(search).not.toHaveBeenCalled();
    expect(controller.getState().status).toBe('waiting');
    await vi.advanceTimersByTimeAsync(1);
    expect(search).toHaveBeenCalledExactlyOnceWith('finland', expect.any(AbortSignal));
    expect(states.some((state) => state.status === 'loading')).toBe(true);
    expect(controller.getState()).toMatchObject({
      status: 'success',
      countries: [country],
    });
  });

  it('aborts on input immediately, before the next debounce expires', async () => {
    const signals: AbortSignal[] = [];
    const search = vi.fn<CountrySearch>((_query, signal) => {
      signals.push(signal);
      return new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(signal.reason), { once: true });
      });
    });
    const { controller, states } = setup(search);
    controller.setQuery('sp');
    await vi.advanceTimersByTimeAsync(300);
    controller.setQuery('spain');
    expect(signals[0]?.aborted).toBe(true);
    expect(search).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(0);
    expect(states.some((state) => state.status === 'error')).toBe(false);
    controller.dispose();
  });

  it('cancels scheduled work when input is cleared', async () => {
    const { search, controller } = setup();
    controller.setQuery('spain');
    controller.setQuery('');
    await vi.runAllTimersAsync();
    expect(search).not.toHaveBeenCalled();
    expect(controller.getState().status).toBe('idle');
  });

  it('shows empty results as empty, not error', async () => {
    const { controller } = setup();
    controller.setQuery('nothing');
    await vi.advanceTimersByTimeAsync(300);
    expect(controller.getState()).toEqual({ status: 'empty', query: 'nothing' });
  });

  it('shows timeout errors and retries the latest input immediately', async () => {
    const search = vi
      .fn<CountrySearch>()
      .mockRejectedValueOnce(new DOMException('Slow', 'TimeoutError'))
      .mockResolvedValue([]);
    const { controller } = setup(search);
    controller.setQuery('old');
    await vi.advanceTimersByTimeAsync(300);
    expect(controller.getState().status).toBe('error');
    controller.setQuery('latest');
    controller.retry();
    expect(search).toHaveBeenLastCalledWith('latest', expect.any(AbortSignal));
    await vi.runAllTimersAsync();
    expect(search).toHaveBeenCalledTimes(2);
    expect(controller.getState()).toEqual({ status: 'empty', query: 'latest' });
  });

  it('supports an immediate history search', async () => {
    const { search, controller } = setup();
    controller.setQuery('finland', true);
    expect(search).toHaveBeenCalledOnce();
    await vi.runAllTimersAsync();
    expect(search).toHaveBeenCalledOnce();
  });

  it('stops updates and timers after disposal', async () => {
    const { search, states, controller } = setup();
    controller.setQuery('spain');
    controller.dispose();
    const count = states.length;
    controller.setQuery('finland', true);
    controller.retry();
    await vi.runAllTimersAsync();
    expect(search).not.toHaveBeenCalled();
    expect(states).toHaveLength(count);
  });
});
