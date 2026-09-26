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
    // Repo automation scripts run under Node, not in the browser.
    {
        files: ['.github/scripts/**/*.mjs'],
        languageOptions: {
            globals: globals.node
        }
    },
    globalIgnores([
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
