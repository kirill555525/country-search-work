import type { CountrySearch } from './search-controller.js';

export function createCachedSearch(
  loader: CountrySearch,
  maxEntries = 50,
): CountrySearch {
  void loader;
  void maxEntries;
  throw new Error('Not implemented');
}
