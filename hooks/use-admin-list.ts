import { useCallback, useEffect, useState } from 'react';

// Cursor-paginated list state shared by every admin list screen (users,
// reports, feedback, knowledge, audit). `load(cursor)` returns one page;
// pass `deps` so changing a filter re-runs from the first page.
export function useAdminList<T>(
  load: (cursor: string | null) => Promise<{
    items: T[];
    nextCursor: string | null;
  }>,
  deps: unknown[],
) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const reload = useCallback(async () => {
    setError(null);
    try {
      const res = await load(null);
      setItems(res.items);
      setNextCursor(res.nextCursor);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, deps);

  const more = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await load(nextCursor);
      setItems((prev) => [...prev, ...res.items]);
      setNextCursor(res.nextCursor);
    } catch {
      /* keep what we already have */
    } finally {
      setLoadingMore(false);
    }
  }, [nextCursor, loadingMore, load]);

  useEffect(() => {
    setLoading(true);
    void reload();
  }, [reload]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    void reload();
  }, [reload]);

  return {
    items,
    loading,
    refreshing,
    loadingMore,
    error,
    nextCursor,
    reload,
    more,
    refresh,
    setItems,
  };
}
