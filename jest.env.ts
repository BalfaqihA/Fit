// Pre-framework setup: provide stub Firebase env so `lib/firebase.ts`'s
// `requireEnv` checks pass under Jest. We never connect to a real project in
// tests — the firebase modules are mocked in `__mocks__/firebase.ts`.
process.env.EXPO_PUBLIC_FIREBASE_API_KEY = 'test-api-key';
process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN = 'test.firebaseapp.com';
process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID = 'test-project';
process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET = 'test.appspot.com';
process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = '0000000000';
process.env.EXPO_PUBLIC_FIREBASE_APP_ID = '1:0:web:000';
