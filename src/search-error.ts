export type SearchFailure =
  | { kind: 'aborted' | 'empty' }
  | { kind: 'timeout' | 'http' | 'network' | 'unknown'; message: string };

export function classifySearchError(error: unknown): SearchFailure {
  void error;
  throw new Error('Not implemented');
}
