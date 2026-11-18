const {defineConfig, globalIgnores} = require('eslint/config'),
    xhEslintConfig = require('@xh/eslint-config'),
    tsdocEslint = require('eslint-plugin-tsdoc'),
    prettier = require('eslint-config-prettier'),
    globals = require('globals');

module.exports = defineConfig([
    {
        plugins: {tsdoc: tsdocEslint},
        extends: [xhEslintConfig, prettier],
        rules: {
            'tsdoc/syntax': 'warn'
        }
    },

    // Mark type-only imports and exports, so a build that compiles one file at a time erases them.
    {
        files: ['**/*.ts', '**/*.tsx'],
        rules: {
            '@typescript-eslint/consistent-type-imports': [
                'error',
                {
                    prefer: 'type-imports',
                    fixStyle: 'separate-type-imports',
                    disallowTypeAnnotations: true
                }
            ],
            '@typescript-eslint/consistent-type-exports': 'error',
            '@typescript-eslint/no-import-type-side-effects': 'error'
        }
    },

    // Repo automation scripts run under Node, not in the browser.
    {
        files: ['.github/scripts/**/*.mjs', 'scripts/**/*'],
        languageOptions: {
            globals: globals.node
        }
    },
    globalIgnores([
        '.vitest/**/*',
        'build/**/*',
        'node_modules/**/*',
        'mcp/**/*',
        'bin/**/*',
        'docs/codemod/**/*',
        'docs/planning/**/*',
        'kit/golden-layout/impl/**/*',
        'public/msal-redirect-bridge.min.js'
    ])
]);
