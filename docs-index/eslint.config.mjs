import {defineConfig, globalIgnores} from 'eslint/config';
import xhEslintConfig from '@xh/eslint-config';
import tsdocEslint from 'eslint-plugin-tsdoc';
import prettier from 'eslint-config-prettier';

export default defineConfig([
    {
        plugins: {tsdoc: tsdocEslint},
        extends: [xhEslintConfig, prettier],
        rules: {
            'tsdoc/syntax': 'warn'
        }
    },
    globalIgnores(['build/**/*', 'node_modules/**/*'])
]);
