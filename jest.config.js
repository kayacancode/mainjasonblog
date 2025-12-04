/** @type {import('jest').Config} */
const config = {
    testEnvironment: 'node',
    testMatch: ['**/__tests__/**/*.test.js'],
    moduleFileExtensions: ['js', 'jsx', 'json'],
    transform: {
        '^.+\\.(js|jsx)$': ['babel-jest', { presets: ['@babel/preset-env'] }]
    },
    transformIgnorePatterns: [
        '/node_modules/(?!(@supabase)/)'
    ],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1'
    },
    collectCoverageFrom: [
        'lib/**/*.js',
        'pages/api/**/*.js',
        '!**/node_modules/**'
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    verbose: true,
    testTimeout: 30000
};

module.exports = config;

