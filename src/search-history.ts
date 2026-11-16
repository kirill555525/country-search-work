export const HISTORY_KEY = 'country-search.history.v1';

export interface StoragePort {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface SearchHistory {
  list(): string[];
  add(query: string): string[];
  clear(): void;
}

export function createSearchHistory(storage?: StoragePort, limit = 6): SearchHistory {
  if (!Number.isInteger(limit) || limit < 1)
    throw new RangeError('Invalid history limit');
  let entries: string[] = [];

  function normalize(values: unknown): string[] {
    if (!Array.isArray(values)) return [];
    const seen = new Set<string>();
    const result: string[] = [];
    for (const value of values) {
      if (typeof value !== 'string' || !value.trim()) continue;
      const query = value.trim();
      const key = query.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(query);
      if (result.length === limit) break;
    }
    return result;
  }

  try {
    const raw: unknown = JSON.parse(storage?.getItem(HISTORY_KEY) ?? '[]');
    entries = normalize(raw);
  } catch {
    entries = [];
  }

  function persist(): void {
    try {
      storage?.setItem(HISTORY_KEY, JSON.stringify(entries));
    } catch {
      /* The in-memory history remains available when storage is blocked. */
    }
  }

  return {
    list: () => [...entries],
    add: (query) => {
      entries = normalize([query, ...entries]);
      persist();
      return [...entries];
    },
    clear: () => {
      entries = [];
      persist();
    },
  };
}
