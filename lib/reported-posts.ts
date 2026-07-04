import { useEffect, useState } from 'react';

import { loadJSON, saveJSON } from '@/lib/storage';

// Posts the current user has reported are hidden from their feed locally
// (the report itself goes to Firestore for moderation; the `reports`
// collection is not client-readable, so we track the hide list on-device).
const KEY = '@fitlife:community:reportedPosts';

let ids = new Set<string>();
let loaded = false;
const listeners = new Set<(s: Set<string>) => void>();

function emit() {
  const snapshot = new Set(ids);
  for (const l of listeners) l(snapshot);
}

async function ensureLoaded(): Promise<void> {
  if (loaded) return;
  const arr = await loadJSON<string[]>(KEY, []);
  ids = new Set(arr);
  loaded = true;
  emit();
}

export async function addReportedPost(id: string): Promise<void> {
  await ensureLoaded();
  if (ids.has(id)) return;
  ids.add(id);
  await saveJSON(KEY, Array.from(ids));
  emit();
}

/** Realtime (in-process) set of locally hidden post ids. */
export function useReportedPostIds(): Set<string> {
  const [state, setState] = useState<Set<string>>(() => new Set(ids));
  useEffect(() => {
    let mounted = true;
    const listener = (s: Set<string>) => {
      if (mounted) setState(s);
    };
    listeners.add(listener);
    ensureLoaded();
    return () => {
      mounted = false;
      listeners.delete(listener);
    };
  }, []);
  return state;
}
