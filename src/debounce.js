export function debounce(fn, delay) {
    if (!Number.isFinite(delay) || delay < 0) {
        throw new RangeError('Delay must be a finite non-negative number');
    }
    let timer;
    const cancel = () => {
        clearTimeout(timer);
        timer = undefined;
    };
    function delayed(...args) {
        cancel();
        timer = setTimeout(() => {
            timer = undefined;
            fn.apply(this, args);
        }, delay);
    }
    return Object.assign(delayed, { cancel });
}
