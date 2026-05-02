// Crash reporting + structured logging boundary.
//
// Today this just forwards to console. To wire up Sentry:
//   1) `npm install @sentry/react-native`
//   2) In `app/_layout.tsx` near app boot:
//        import * as Sentry from '@sentry/react-native';
//        Sentry.init({ dsn: process.env.EXPO_PUBLIC_SENTRY_DSN, enableNative: true });
//        export default Sentry.wrap(RootLayout);
//   3) In this file, replace the console calls below with
//        Sentry.captureException(err, { extra: context, tags });
//
// All call sites in the codebase already go through this wrapper, so swapping
// the implementation requires no other edits.

type Context = Record<string, unknown> | undefined;
type Tags = Record<string, string> | undefined;

export function captureException(
  err: unknown,
  options?: { context?: Context; tags?: Tags },
): void {
  const tagPairs = options?.tags
    ? ` ${Object.entries(options.tags)
        .map(([k, v]) => `${k}=${v}`)
        .join(' ')}`
    : '';
  // eslint-disable-next-line no-console
  console.error(`[observability]${tagPairs}`, err, options?.context ?? '');
}

export function captureMessage(
  message: string,
  options?: { context?: Context; tags?: Tags },
): void {
  const tagPairs = options?.tags
    ? ` ${Object.entries(options.tags)
        .map(([k, v]) => `${k}=${v}`)
        .join(' ')}`
    : '';
  // eslint-disable-next-line no-console
  console.warn(`[observability]${tagPairs}`, message, options?.context ?? '');
}
