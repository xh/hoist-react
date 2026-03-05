import {defineConfig, globalIgnores} from 'eslint/config';
import xhEslintConfig from '@xh/eslint-config';
import tsdocEslint from 'eslint-plugin-tsdoc';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default defineConfig([
    {
        plugins: {tsdoc: tsdocEslint},
        extends: [xhEslintConfig, prettier],
        rules: {
            'tsdoc/syntax': 'warn'
        }
    },
    {
        files: ['bin/hoist-mcp.mjs', 'bin/hoist-docs.mjs', 'bin/hoist-ts.mjs'],
        languageOptions: {
            globals: globals.node
        }
    },
    globalIgnores(['build/**/*', '.yarn/**/*', 'node_modules/**/*'])
]);
