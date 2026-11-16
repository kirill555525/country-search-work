export const HISTORY_KEY = 'country-search.history.v1';
export function createSearchHistory(storage, limit = 6) {
    if (!Number.isInteger(limit) || limit < 1)
        throw new RangeError('Invalid history limit');
    let entries = [];
    function normalize(values) {
        if (!Array.isArray(values))
            return [];
        const seen = new Set();
        const result = [];
        for (const value of values) {
            if (typeof value !== 'string' || !value.trim())
                continue;
            const query = value.trim();
            const key = query.toLowerCase();
            if (seen.has(key))
                continue;
            seen.add(key);
            result.push(query);
            if (result.length === limit)
                break;
        }
        return result;
    }
    try {
        const raw = JSON.parse(storage?.getItem(HISTORY_KEY) ?? '[]');
        entries = normalize(raw);
    }
    catch {
        entries = [];
    }
    function persist() {
        try {
            storage?.setItem(HISTORY_KEY, JSON.stringify(entries));
        }
        catch {
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
