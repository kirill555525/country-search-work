import { createCachedSearch } from './cached-search.js';
import { createSearchController } from './search-controller.js';
import { searchCountries } from './search-countries.js';
import { createSearchHistory } from './search-history.js';
import { createSearchView } from './view.js';
let storage;
try {
    storage = window.localStorage;
}
catch {
    /* History will work in memory. */
}
const history = createSearchHistory(storage);
const view = createSearchView({
    onQuery: (query, immediate) => controller.setQuery(query, immediate),
    onRetry: () => controller.retry(),
    onClearHistory: () => {
        history.clear();
        view.renderHistory(history.list());
    },
});
const controller = createSearchController({
    search: createCachedSearch(searchCountries),
    onState: (state) => {
        view.render(state);
        if (state.status === 'success' || state.status === 'empty')
            view.renderHistory(history.add(state.query));
    },
});
view.renderHistory(history.list());
