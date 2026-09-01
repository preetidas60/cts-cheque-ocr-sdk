import { useCallback, useEffect, useRef, useState } from "react";

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  /** Re-runs the loader. Safe to call from a click handler. */
  reload: () => void;
}

/**
 * Load-on-mount with reload and a stale-response guard.
 *
 * The guard is the part that matters here. Click through three batches quickly
 * and three requests are in flight; without the sequence check, whichever the
 * network happens to finish LAST wins and the screen shows the wrong batch.
 * Only the newest request is allowed to write state.
 *
 * `deps` behaves like a useEffect dependency list — pass the ids the loader
 * closes over.
 */
export function useAsync<T>(loader: () => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const sequence = useRef(0);

  useEffect(() => {
    const mine = ++sequence.current;
    setLoading(true);
    setError(null);

    loader()
      .then((result) => {
        if (mine !== sequence.current) return; // superseded by a newer request
        setData(result);
      })
      .catch((err: unknown) => {
        if (mine !== sequence.current) return;
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (mine === sequence.current) setLoading(false);
      });
    // `loader` is intentionally not a dep — callers pass an inline arrow,
    // which is a new function every render and would loop forever.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = useCallback(() => setTick((n) => n + 1), []);

  return { data, loading, error, reload };
}
