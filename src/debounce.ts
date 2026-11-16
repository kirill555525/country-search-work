export type Debounced<Args extends unknown[], This> = {
  (this: This, ...args: Args): void;
  cancel(): void;
};

export function debounce<Args extends unknown[], This = unknown>(
  fn: (this: This, ...args: Args) => void,
  delay: number,
): Debounced<Args, This> {
  if (!Number.isFinite(delay) || delay < 0) {
    throw new RangeError('Delay must be a finite non-negative number');
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  const cancel = () => {
    clearTimeout(timer);
    timer = undefined;
  };

  function delayed(this: This, ...args: Args): void {
    cancel();
    timer = setTimeout(() => {
      timer = undefined;
      fn.apply(this, args);
    }, delay);
  }

  return Object.assign(delayed, { cancel });
}
