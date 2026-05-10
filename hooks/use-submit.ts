import { useCallback, useRef, useState } from 'react';

/**
 * Guards an async submit handler from double-firing when the user taps a
 * button twice in quick succession. Two layers:
 *   1. A synchronous `useRef` flag flipped before any awaited work, so a
 *      second tap inside the same JS tick (before React has re-rendered with
 *      `pending=true`) is rejected.
 *   2. A `pending` state flag for disabling the button visually.
 *
 * Use as:
 *   const { run, pending } = useSubmit();
 *   <Button disabled={pending} onPress={() => run(onSave)} />
 *
 * If the wrapped function returns a value, the value is returned from `run`;
 * if a second concurrent call is rejected, `run` resolves to `undefined`.
 */
export function useSubmit() {
  const inFlight = useRef(false);
  const [pending, setPending] = useState(false);

  const run = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
      if (inFlight.current) return undefined;
      inFlight.current = true;
      setPending(true);
      try {
        return await fn();
      } finally {
        inFlight.current = false;
        setPending(false);
      }
    },
    [],
  );

  return { run, pending };
}
