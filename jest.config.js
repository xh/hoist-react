module.exports = {
    // Node environment for unit testing pure utilities/models (no DOM needed)
    // Use `@jest-environment jsdom` docblock in individual test files for component tests
    testEnvironment: 'node',

    // Transform all JS/TS via babel-jest (uses babel.config.js above)
    transform: {
        '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest'
    },

    // Resolve @xh/hoist/* → project root (mirrors tsconfig paths + webpack alias)
    moduleNameMapper: {
        '^@xh/hoist/(.*)$': '<rootDir>/$1',
        // Stub out CSS/SCSS imports (they are side-effects only, not testable)
        '\\.(css|scss|sass)$': '<rootDir>/__mocks__/styleMock.js',
        // Stub out image/static asset imports
        '\\.(png|jpg|jpeg|gif|svg|bmp)$': '<rootDir>/__mocks__/fileMock.js'
    },

    // Look for tests in __tests__/ directories
    testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],

    // Don't transform node_modules (all hoist deps ship CJS-compatible builds)
    transformIgnorePatterns: ['/node_modules/'],

    // Coverage configuration
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    collectCoverageFrom: [
        '**/*.{ts,tsx}',
        '!**/__tests__/**',
        '!**/__mocks__/**',
        '!**/node_modules/**',
        '!bin/**',
        '!mcp/**',
        '!build/**',
        '!static/**',
        '!scripts/**',
        '!docs/**',
        '!public/**',
        '!**/*.d.ts'
    ]
};
