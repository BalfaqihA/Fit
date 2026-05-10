// Lightweight in-memory Firestore stub used by unit tests. Records every
// write so tests can assert on intent (which docs were touched, with what
// payload) without spinning up a real backend or even the firebase SDK.
//
// Tests opt in by mocking `@/lib/firebase` and `firebase/firestore`:
//
//   jest.mock('@/lib/firebase', () => ({ db: {} }));
//   jest.mock('firebase/firestore', () =>
//     require('../__mocks__/firestore-mock').firestoreMock(),
//   );
//
// Then exercise the unit under test and inspect `recordedWrites` /
// `recordedTransactions` directly.

export type DocPath = string;

type Setter = { type: 'set'; path: DocPath; data: unknown; merge?: boolean };
type Updater = { type: 'update'; path: DocPath; data: unknown };
type Deleter = { type: 'delete'; path: DocPath };
export type Write = Setter | Updater | Deleter;

export type RecordedTransaction = {
  reads: DocPath[];
  writes: Write[];
};

export function firestoreMock() {
  const docs: Record<DocPath, Record<string, unknown> | null> = {};
  const writes: Write[] = [];
  const transactions: RecordedTransaction[] = [];

  const pathOf = (ref: { __path: DocPath }) => ref.__path;

  function makeDocRef(path: DocPath) {
    return { __path: path, id: path.split('/').pop() ?? path };
  }

  return {
    __state: { docs, writes, transactions },
    // Helpers for tests:
    __seedDoc(path: DocPath, data: Record<string, unknown>) {
      docs[path] = data;
    },
    __reset() {
      for (const k of Object.keys(docs)) delete docs[k];
      writes.length = 0;
      transactions.length = 0;
    },
    // firebase/firestore surface (only the bits the lib/* code uses):
    doc: (...parts: unknown[]) => {
      // doc(db, 'a', 'b', 'c', ...) → 'a/b/c/...'
      // doc(collectionRef, 'id') → `${collection.__path}/id`
      const first = parts[0];
      if (first && typeof first === 'object' && '__path' in (first as object)) {
        const colPath = (first as { __path: string }).__path;
        const id = String(parts[1] ?? '');
        return makeDocRef(`${colPath}/${id}`);
      }
      const path = (parts.slice(1) as string[]).join('/');
      return makeDocRef(path);
    },
    collection: (_db: unknown, ...segs: string[]) => ({
      __path: segs.join('/'),
    }),
    serverTimestamp: () => ({ __sentinel: 'serverTimestamp' }),
    increment: (n: number) => ({ __sentinel: 'increment', value: n }),
    setDoc: async (
      ref: { __path: DocPath },
      data: unknown,
      opts?: { merge?: boolean },
    ) => {
      writes.push({
        type: 'set',
        path: pathOf(ref),
        data,
        merge: opts?.merge,
      });
      docs[pathOf(ref)] = data as Record<string, unknown>;
    },
    deleteDoc: async (ref: { __path: DocPath }) => {
      writes.push({ type: 'delete', path: pathOf(ref) });
      docs[pathOf(ref)] = null;
    },
    getDoc: async (ref: { __path: DocPath }) => {
      const data = docs[pathOf(ref)];
      return {
        exists: () => data != null,
        data: () => data ?? undefined,
        id: pathOf(ref).split('/').pop() ?? '',
      };
    },
    runTransaction: async <T,>(
      _db: unknown,
      fn: (tx: {
        get: (ref: { __path: DocPath }) => Promise<{
          exists: () => boolean;
          data: () => Record<string, unknown> | undefined;
        }>;
        set: (
          ref: { __path: DocPath },
          data: unknown,
          opts?: { merge?: boolean },
        ) => void;
        update: (ref: { __path: DocPath }, data: unknown) => void;
        delete: (ref: { __path: DocPath }) => void;
      }) => Promise<T>,
    ) => {
      const txRecord: RecordedTransaction = { reads: [], writes: [] };
      const tx = {
        get: async (ref: { __path: DocPath }) => {
          txRecord.reads.push(pathOf(ref));
          const data = docs[pathOf(ref)];
          return {
            exists: () => data != null,
            data: () => (data ?? undefined) as Record<string, unknown> | undefined,
          };
        },
        set: (
          ref: { __path: DocPath },
          data: unknown,
          opts?: { merge?: boolean },
        ) => {
          const w: Setter = {
            type: 'set',
            path: pathOf(ref),
            data,
            merge: opts?.merge,
          };
          txRecord.writes.push(w);
          writes.push(w);
          docs[pathOf(ref)] = data as Record<string, unknown>;
        },
        update: (ref: { __path: DocPath }, data: unknown) => {
          const w: Updater = { type: 'update', path: pathOf(ref), data };
          txRecord.writes.push(w);
          writes.push(w);
          docs[pathOf(ref)] = {
            ...(docs[pathOf(ref)] ?? {}),
            ...(data as Record<string, unknown>),
          };
        },
        delete: (ref: { __path: DocPath }) => {
          const w: Deleter = { type: 'delete', path: pathOf(ref) };
          txRecord.writes.push(w);
          writes.push(w);
          docs[pathOf(ref)] = null;
        },
      };
      const result = await fn(tx);
      transactions.push(txRecord);
      return result;
    },
    writeBatch: () => {
      const buffered: Write[] = [];
      return {
        set: (
          ref: { __path: DocPath },
          data: unknown,
          opts?: { merge?: boolean },
        ) => {
          buffered.push({
            type: 'set',
            path: pathOf(ref),
            data,
            merge: opts?.merge,
          });
        },
        update: (ref: { __path: DocPath }, data: unknown) => {
          buffered.push({ type: 'update', path: pathOf(ref), data });
        },
        delete: (ref: { __path: DocPath }) => {
          buffered.push({ type: 'delete', path: pathOf(ref) });
        },
        commit: async () => {
          for (const w of buffered) {
            writes.push(w);
            if (w.type === 'set') {
              docs[w.path] = w.data as Record<string, unknown>;
            } else if (w.type === 'update') {
              docs[w.path] = {
                ...(docs[w.path] ?? {}),
                ...(w.data as Record<string, unknown>),
              };
            } else {
              docs[w.path] = null;
            }
          }
        },
      };
    },
    addDoc: async (
      col: { __path: DocPath },
      data: Record<string, unknown>,
    ) => {
      const id = `auto-${writes.length}`;
      const path = `${col.__path}/${id}`;
      writes.push({ type: 'set', path, data });
      docs[path] = data;
      return makeDocRef(path);
    },
    Timestamp: { now: () => ({ toMillis: () => Date.now() }) },
  };
}
