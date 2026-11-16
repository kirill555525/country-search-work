export function createCachedSearch(loader, maxEntries = 50) {
    if (!Number.isInteger(maxEntries) || maxEntries < 1)
        throw new RangeError('Invalid cache limit');
    const cache = new Map();
    const pending = new Map();
    function start(key) {
        const controller = new AbortController();
        const flight = {
            controller,
            promise: loader(key, controller.signal),
            subscribers: new Set(),
        };
        flight.promise = flight.promise
            .then((countries) => {
            controller.signal.throwIfAborted();
            const snapshot = structuredClone(countries);
            cache.set(key, snapshot);
            if (cache.size > maxEntries) {
                const oldest = cache.keys().next().value;
                if (oldest !== undefined)
                    cache.delete(oldest);
            }
            return snapshot;
        })
            .finally(() => {
            if (pending.get(key) === flight)
                pending.delete(key);
        });
        pending.set(key, flight);
        return flight;
    }
    function subscribe(key, flight, signal) {
        return new Promise((resolve, reject) => {
            const subscriber = Symbol();
            flight.subscribers.add(subscriber);
            const detach = () => {
                signal.removeEventListener('abort', onAbort);
                flight.subscribers.delete(subscriber);
            };
            const onAbort = () => {
                detach();
                if (flight.subscribers.size === 0) {
                    if (pending.get(key) === flight)
                        pending.delete(key);
                    flight.controller.abort();
                }
                reject(signal.reason);
            };
            signal.addEventListener('abort', onAbort, { once: true });
            flight.promise.then((countries) => {
                detach();
                if (!signal.aborted)
                    resolve(structuredClone(countries));
            }, (error) => {
                detach();
                reject(error);
            });
            if (signal.aborted)
                onAbort();
        });
    }
    return async (query, signal) => {
        signal.throwIfAborted();
        const key = query.trim().toLowerCase();
        if (!key)
            return [];
        const cached = cache.get(key);
        if (cached !== undefined) {
            cache.delete(key);
            cache.set(key, cached);
            return structuredClone(cached);
        }
        return subscribe(key, pending.get(key) ?? start(key), signal);
    };
}
