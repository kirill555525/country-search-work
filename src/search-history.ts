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
  void storage;
  void limit;
  throw new Error('Not implemented');
}
