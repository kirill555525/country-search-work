import { debounce } from './debounce.js';
import { classifySearchError } from './search-error.js';
import { searchCountries } from './search-countries.js';
export function createSearchController(options) {
    const search = options.search ?? searchCountries;
    let state = { status: 'idle', query: '' };
    let query = '';
    let active;
    let disposed = false;
    function publish(next) {
        if (disposed)
            return;
        state = next;
        options.onState(state);
    }
    async function run() {
        if (disposed || !query)
            return;
        const request = new AbortController();
        const requestedQuery = query;
        active = request;
        publish({ status: 'loading', query: requestedQuery });
        try {
            const countries = await search(requestedQuery, request.signal);
            if (request.signal.aborted || disposed)
                return;
            publish(countries.length
                ? { status: 'success', query: requestedQuery, countries }
                : { status: 'empty', query: requestedQuery });
        }
        catch (error) {
            if (request.signal.aborted || disposed)
                return;
            const failure = classifySearchError(error);
            if (failure.kind === 'aborted')
                return;
            if (failure.kind === 'empty')
                publish({ status: 'empty', query: requestedQuery });
            else if ('message' in failure) {
                publish({ status: 'error', query: requestedQuery, message: failure.message });
            }
        }
        finally {
            if (active === request)
                active = undefined;
        }
    }
    const scheduled = debounce(() => {
        void run();
    }, options.delay ?? 300);
    function cancel() {
        scheduled.cancel();
        active?.abort();
        active = undefined;
    }
    function setQuery(value, immediate = false) {
        if (disposed)
            return;
        cancel();
        query = value.trim();
        if (!query)
            publish({ status: 'idle', query });
        else if (immediate)
            void run();
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
