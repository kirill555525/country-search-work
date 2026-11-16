import type { Country } from './country.js';
import { debounce } from './debounce.js';
import { classifySearchError } from './search-error.js';
import { searchCountries } from './search-countries.js';

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
  const search = options.search ?? searchCountries;
  let state: SearchState = { status: 'idle', query: '' };
  let query = '';
  let active: AbortController | undefined;
  let disposed = false;

  function publish(next: SearchState): void {
    if (disposed) return;
    state = next;
    options.onState(state);
  }

  async function run(): Promise<void> {
    if (disposed || !query) return;
    const request = new AbortController();
    const requestedQuery = query;
    active = request;
    publish({ status: 'loading', query: requestedQuery });
    try {
      const countries = await search(requestedQuery, request.signal);
      if (request.signal.aborted || disposed) return;
      publish(
        countries.length
          ? { status: 'success', query: requestedQuery, countries }
          : { status: 'empty', query: requestedQuery },
      );
    } catch (error: unknown) {
      if (request.signal.aborted || disposed) return;
      const failure = classifySearchError(error);
      if (failure.kind === 'aborted') return;
      if (failure.kind === 'empty') publish({ status: 'empty', query: requestedQuery });
      else if ('message' in failure) {
        publish({ status: 'error', query: requestedQuery, message: failure.message });
      }
    } finally {
      if (active === request) active = undefined;
    }
  }

  const scheduled = debounce(() => {
    void run();
  }, options.delay ?? 300);

  function cancel(): void {
    scheduled.cancel();
    active?.abort();
    active = undefined;
  }

  function setQuery(value: string, immediate = false): void {
    if (disposed) return;
    cancel();
    query = value.trim();
    if (!query) publish({ status: 'idle', query });
    else if (immediate) void run();
    else {
      publish({ status: 'waiting', query });
      scheduled();
    }
  }

  publish(state);
  return {
    setQuery,
    retry: () => setQuery(query, true),
    getState: () => state,
    dispose: () => {
      disposed = true;
      cancel();
    },
  };
}
