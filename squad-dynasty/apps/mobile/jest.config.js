// Testes de lógica (stores/selectors) em Node — a UI é verificada por
// typecheck + expo export; ver DECISIONS.md.
/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/__tests__/**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.jest.json' }],
  },
  moduleNameMapper: {
    '^@react-native-async-storage/async-storage$':
      '@react-native-async-storage/async-storage/jest/async-storage-mock',
    '^expo-haptics$': '<rootDir>/__mocks__/expo-haptics.js',
    '^expo-audio$': '<rootDir>/__mocks__/expo-audio.js',
    '\\.(wav|png|svg)$': '<rootDir>/__mocks__/asset-mock.js',
  },
};
