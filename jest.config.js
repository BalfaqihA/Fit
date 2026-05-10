/**
 * @type {import('jest').Config}
 */
module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/jest.env.ts'],
  setupFilesAfterEach: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testPathIgnorePatterns: [
    '/node_modules/',
    '/functions/',
    '/functions-chatbot/',
    '/fitness_data_project/',
    '/.expo/',
  ],
  transformIgnorePatterns: [
    // Expo + RN packages and Firebase ship ESM; jest-expo's default list covers
    // most of them, but firebase v12 needs to be transformed too.
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|firebase|@firebase/.*))',
  ],
  collectCoverageFrom: [
    'lib/**/*.{ts,tsx}',
    'hooks/**/*.{ts,tsx}',
    'contexts/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
};
