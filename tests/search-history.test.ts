import { describe, expect, it, vi } from 'vitest';
import { createSearchHistory, HISTORY_KEY } from '../src/search-history.js';
import type { StoragePort } from '../src/search-history.js';

function memoryStorage(): StoragePort {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
}

describe('search history', () => {
  it('stores newest first, removes duplicates and respects its limit', () => {
    const history = createSearchHistory(memoryStorage(), 2);
    history.add(' Spain ');
    history.add('Finland');
    history.add('spain');
    expect(history.list()).toEqual(['spain', 'Finland']);
    history.add('Japan');
    expect(history.list()).toEqual(['Japan', 'spain']);
    history.add('   ');
    expect(history.list()).toEqual(['Japan', 'spain']);
  });

  it('restores stored history and can clear it', () => {
    const storage = memoryStorage();
    createSearchHistory(storage).add('Finland');
    const restored = createSearchHistory(storage);
    expect(restored.list()).toEqual(['Finland']);
    restored.clear();
    expect(createSearchHistory(storage).list()).toEqual([]);
  });

  it('ignores corrupt JSON and cleans untrusted stored values', () => {
    const storage = memoryStorage();
    storage.setItem(HISTORY_KEY, '{broken');
    expect(createSearchHistory(storage).list()).toEqual([]);
    storage.setItem(
      HISTORY_KEY,
      JSON.stringify([null, 42, '', ' Finland ', 'finland', 'Spain']),
    );
    expect(createSearchHistory(storage).list()).toEqual(['Finland', 'Spain']);
  });

  it('continues in memory when localStorage is unavailable', () => {
    const storage = {
      getItem: vi.fn(() => {
        throw new Error('SecurityError');
      }),
      setItem: vi.fn(() => {
        throw new Error('QuotaExceededError');
      }),
    };
    const history = createSearchHistory(storage);
    expect(history.add('Finland')).toEqual(['Finland']);
    expect(() => history.clear()).not.toThrow();
    expect(createSearchHistory().add('Japan')).toEqual(['Japan']);
  });
});
