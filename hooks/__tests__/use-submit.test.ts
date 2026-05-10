import { act, renderHook } from '@testing-library/react-hooks';

import { useSubmit } from '../use-submit';

describe('useSubmit', () => {
  it('rejects a synchronous double-tap', async () => {
    const fn = jest.fn().mockImplementation(
      () => new Promise<string>((resolve) => setTimeout(() => resolve('ok'), 20)),
    );
    const { result } = renderHook(() => useSubmit());

    let firstResult: string | undefined;
    let secondResult: string | undefined;

    await act(async () => {
      // Two synchronous taps in the same tick. Only the first should call fn.
      const p1 = result.current.run<string>(fn).then((v) => (firstResult = v));
      const p2 = result.current.run<string>(fn).then((v) => (secondResult = v));
      await Promise.all([p1, p2]);
    });

    expect(fn).toHaveBeenCalledTimes(1);
    expect(firstResult).toBe('ok');
    expect(secondResult).toBeUndefined();
  });

  it('clears pending after the work resolves', async () => {
    const { result } = renderHook(() => useSubmit());
    expect(result.current.pending).toBe(false);
    await act(async () => {
      await result.current.run(async () => {
        // no-op
      });
    });
    expect(result.current.pending).toBe(false);
  });

  it('clears pending even if the work throws', async () => {
    const { result } = renderHook(() => useSubmit());
    await act(async () => {
      await expect(
        result.current.run(async () => {
          throw new Error('boom');
        }),
      ).rejects.toThrow('boom');
    });
    expect(result.current.pending).toBe(false);
  });
});
