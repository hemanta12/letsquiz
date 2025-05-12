module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
    '^.+\\.[tj]sx?$': 'babel-jest',
    'node_modules/axios': 'babel-jest',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^axios$': require.resolve('axios'),
  },
  transformIgnorePatterns: ['/node_modules/(?!(axios)/)'],
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
};
