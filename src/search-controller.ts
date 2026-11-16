import type { Country } from './country.js';

export type CountrySearch = (query: string, signal: AbortSignal) => Promise<Country[]>;
export type SearchState =
  | { status: 'idle' | 'waiting' | 'loading' | 'empty'; query: string }
  | { status: 'success'; query: string; countries: Country[] }
  | { status: 'error'; query: string; message: string };

export interface SearchController {
  setQuery(value: string, immediate?: boolean): void;
  retry(): void;
  getState(): SearchState;
  dispose(): void;
}

export interface SearchOptions {
  onState: (state: SearchState) => void;
  search?: CountrySearch;
  delay?: number;
}

export function createSearchController(options: SearchOptions): SearchController {
  void options;
  throw new Error('Not implemented');
}
