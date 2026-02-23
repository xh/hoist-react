const {defineConfig, globalIgnores} = require('eslint/config'),
    xhEslintConfig = require('@xh/eslint-config'),
    tsdocEslint = require('eslint-plugin-tsdoc'),
    prettier = require('eslint-config-prettier');

module.exports = defineConfig([
    {
        plugins: {tsdoc: tsdocEslint},
        extends: [xhEslintConfig, prettier],
        rules: {
            'tsdoc/syntax': 'warn'
        }
    },
    {
        files: ['__tests__/**'],
        languageOptions: {
            globals: {
                describe: 'readonly',
                it: 'readonly',
                expect: 'readonly',
                beforeEach: 'readonly',
                afterEach: 'readonly',
                beforeAll: 'readonly',
                afterAll: 'readonly',
                test: 'readonly',
                jest: 'readonly'
            }
        }
    },
    globalIgnores(['build/**/*', '.yarn/**/*', 'node_modules/**/*', 'mcp/**/*', 'bin/**/*'])
]);
