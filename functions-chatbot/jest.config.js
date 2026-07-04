// Chatbot-local jest. The repo-root jest config ignores /functions-chatbot/,
// and the deploy `tsc` only compiles src/** — so tests live in test/ and are
// transpiled to CommonJS just for the runner (the project tsconfig is Node16,
// which jest can't execute directly).
/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: {
          module: 'commonjs',
          moduleResolution: 'node',
          target: 'es2022',
          esModuleInterop: true,
          resolveJsonModule: true,
          strict: false,
          noUnusedLocals: false,
          skipLibCheck: true,
        },
      },
    ],
  },
};
