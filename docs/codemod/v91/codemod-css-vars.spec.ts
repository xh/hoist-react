/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {execFileSync} from 'node:child_process';
import {mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';
import {afterEach, describe, expect, it} from 'vitest';

const CODEMOD = join(__dirname, 'codemod-css-vars.mjs');

/**
 * The v91 CSS variable codemod. It runs as a script, so each case writes stylesheets to a temp
 * folder, runs the codemod over it, and checks the rewritten files and the printed report.
 */
describe('codemod-css-vars', () => {
    let dir: string;

    afterEach(() => rmSync(dir, {recursive: true, force: true}));

    function run(files: Record<string, string>, ...args: string[]) {
        dir = mkdtempSync(join(tmpdir(), 'codemod-css-vars-'));
        for (const [name, text] of Object.entries(files)) {
            mkdirSync(join(dir, dirname(name)), {recursive: true});
            writeFileSync(join(dir, name), text);
        }
        const output = execFileSync('node', [CODEMOD, ...args, 'src'], {cwd: dir, encoding: 'utf8'});
        return {output, read: (name: string) => readFileSync(join(dir, name), 'utf8')};
    }

    it('migrates hooks, renames, units and unit arithmetic', () => {
        const {read} = run({
            'src/app.scss':
                'body.xh-app {\n  --grid-bg: #fafafa;\n  --xh-pad: 8;\n}\n' +
                '.x { margin: calc(var(--xh-pad) * 1px); }\n'
        });

        expect(read('src/app.scss')).toBe(
            'body.xh-app {\n  --xh-grid-bg: #fafafa;\n  --xh-spacing: 8px;\n}\n' +
                '.x { margin: var(--xh-spacing); }\n'
        );
    });

    it('drops a -px companion that reduces to its base', () => {
        const {read} = run({
            'src/app.scss': '.x {\n  --xh-pad-px: var(--xh-pad);\n  padding: var(--xh-pad-px);\n}\n'
        });

        expect(read('src/app.scss')).toBe('.x {\n  padding: var(--xh-spacing);\n}\n');
    });

    it('leaves a declaration that would read itself as written, with a warning', () => {
        const decl = '--xh-grid-header-lr-pad-px: calc(var(--xh-grid-header-lr-pad) * 1px - 1px);',
            {read, output} = run({'src/app.scss': `.my-grid {\n  ${decl}\n}\n`});

        expect(read('src/app.scss')).toBe(`.my-grid {\n  ${decl}\n}\n`);
        expect(output).toMatch(
            /app\.scss:2 {2}left --xh-grid-header-lr-pad-px as written .* --xh-grid-header-padding-inline/
        );
    });

    it('reports hook names declared and read only within the same files as possibly local', () => {
        const {output} = run({
            'src/vendor/theme.css':
                ':root {\n  --white: #fff;\n}\n.card { background: var(--white); }\n',
            'src/app.scss': 'body.xh-app {\n  --grid-bg: #fafafa;\n}\n'
        });
        const local = output.split('Possibly local variables')[1];

        expect(local).toContain('--white  (src/vendor/theme.css)');
        expect(local).not.toContain('--grid-bg');
    });

    it.each([
        ['--skip-hook', ['--skip-hook', 'white']],
        ['--exclude', ['--exclude', 'src/vendor']]
    ])('leaves a local variable alone with %s', (_, args) => {
        const theme = ':root {\n  --white: #fff;\n}\n.card { background: var(--white); }\n',
            {read} = run({'src/vendor/theme.css': theme}, ...args);

        expect(read('src/vendor/theme.css')).toBe(theme);
    });
});
