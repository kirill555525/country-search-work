import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { debounce } from '../src/debounce.js';

describe('debounce', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('waits for the full delay', () => {
    const fn = vi.fn();
    const delayed = debounce(fn, 300);
    delayed();
    vi.advanceTimersByTime(299);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledOnce();
  });

  it('resets the timer and uses the latest arguments', () => {
    const fn = vi.fn<(value: string) => void>();
    const delayed = debounce(fn, 300);
    delayed('sp');
    vi.advanceTimersByTime(200);
    delayed('spain');
    vi.advanceTimersByTime(299);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledExactlyOnceWith('spain');
  });

  it('can cancel a pending call and can be reused', () => {
    const fn = vi.fn();
    const delayed = debounce(fn, 300);
    delayed();
    delayed.cancel();
    vi.runAllTimers();
    expect(fn).not.toHaveBeenCalled();
    delayed();
    vi.runAllTimers();
    expect(fn).toHaveBeenCalledOnce();
  });

  it('preserves the caller context', () => {
    const context = { value: 0 };
    const delayed = debounce(function (this: typeof context, value: number) {
      this.value = value;
    }, 20);
    delayed.call(context, 7);
    vi.runAllTimers();
    expect(context.value).toBe(7);
  });

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])('rejects delay %s', (delay) => {
    expect(() => debounce(vi.fn(), delay)).toThrow(RangeError);
  });
});
