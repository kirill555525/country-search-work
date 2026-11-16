import { describe, expect, it, vi } from 'vitest';
import { createCachedSearch } from '../src/cached-search.js';
import type { Country } from '../src/country.js';
import type { CountrySearch } from '../src/search-controller.js';
import { mapCountryResponse } from '../src/map-country.js';
import { finlandResponse } from './fixtures.js';

const countries = [mapCountryResponse(finlandResponse)];
const signal = () => new AbortController().signal;

describe('cache and in-flight deduplication', () => {
  it('caches equivalent trimmed case-insensitive queries and isolates returned data', async () => {
    const loader = vi.fn<CountrySearch>().mockResolvedValue(countries);
    const search = createCachedSearch(loader);
    const first = await search(' Finland ', signal());
    first[0]!.borders.push('TEST');
    const second = await search('FINLAND', signal());
    expect(second[0]?.borders).not.toContain('TEST');
    expect(loader).toHaveBeenCalledExactlyOnceWith('finland', expect.any(AbortSignal));
  });

  it('shares one in-flight request without letting one subscriber cancel another', async () => {
    let finish!: (value: Country[]) => void;
    let transport!: AbortSignal;
    const loader = vi.fn<CountrySearch>((_query, requestSignal) => {
      transport = requestSignal;
      return new Promise((resolve, reject) => {
        finish = resolve;
        requestSignal.addEventListener('abort', () => reject(requestSignal.reason), {
          once: true,
        });
      });
    });
    const search = createCachedSearch(loader);
    const first = new AbortController();
    const second = new AbortController();
    const firstResult = search('finland', first.signal);
    const rejected = expect(firstResult).rejects.toMatchObject({ name: 'AbortError' });
    const secondResult = search('finland', second.signal);
    expect(loader).toHaveBeenCalledOnce();
    first.abort();
    await rejected;
    expect(transport.aborted).toBe(false);
    finish(countries);
    expect(await secondResult).toEqual(countries);
    expect(await search('finland', signal())).toEqual(countries);
    expect(loader).toHaveBeenCalledOnce();
  });

  it('aborts transport when all subscribers leave and allows an immediate fresh request', async () => {
    const transports: AbortSignal[] = [];
    const loader = vi.fn<CountrySearch>((_query, requestSignal) => {
      transports.push(requestSignal);
      return new Promise((_resolve, reject) => {
        requestSignal.addEventListener('abort', () => reject(requestSignal.reason), {
          once: true,
        });
      });
    });
    const search = createCachedSearch(loader);
    const first = new AbortController();
    const second = new AbortController();
    const a = expect(search('finland', first.signal)).rejects.toMatchObject({
      name: 'AbortError',
    });
    const b = expect(search('finland', second.signal)).rejects.toMatchObject({
      name: 'AbortError',
    });
    first.abort();
    expect(transports[0]?.aborted).toBe(false);
    second.abort();
    expect(transports[0]?.aborted).toBe(true);
    const third = new AbortController();
    const c = expect(search('finland', third.signal)).rejects.toMatchObject({
      name: 'AbortError',
    });
    expect(loader).toHaveBeenCalledTimes(2);
    third.abort();
    await Promise.all([a, b, c]);
  });

  it('does not cache failed requests', async () => {
    const loader = vi
      .fn<CountrySearch>()
      .mockRejectedValueOnce(new TypeError('Offline'))
      .mockResolvedValue(countries);
    const search = createCachedSearch(loader);
    await expect(search('finland', signal())).rejects.toThrow('Offline');
    expect(await search('finland', signal())).toEqual(countries);
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('caches empty results and evicts the least recently used entry', async () => {
    const loader = vi.fn<CountrySearch>().mockResolvedValue([]);
    const search = createCachedSearch(loader, 2);
    await search('a', signal());
    await search('b', signal());
    await search('a', signal());
    await search('c', signal());
    await search('b', signal());
    expect(loader.mock.calls.map(([query]) => query)).toEqual(['a', 'b', 'c', 'b']);
  });

  it('respects an already canceled subscriber even on a cache hit', async () => {
    const loader = vi.fn<CountrySearch>().mockResolvedValue(countries);
    const search = createCachedSearch(loader);
    await search('finland', signal());
    const canceled = new AbortController();
    canceled.abort();
    await expect(search('finland', canceled.signal)).rejects.toMatchObject({
      name: 'AbortError',
    });
    expect(loader).toHaveBeenCalledOnce();
  });
});
