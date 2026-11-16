export type Debounced<Args extends unknown[], This> = {
  (this: This, ...args: Args): void;
  cancel(): void;
};

export function debounce<Args extends unknown[], This = unknown>(
  fn: (this: This, ...args: Args) => void,
  delay: number,
): Debounced<Args, This> {
  void fn;
  void delay;
  throw new Error('Not implemented');
}
