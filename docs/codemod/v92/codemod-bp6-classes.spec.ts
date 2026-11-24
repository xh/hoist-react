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

const CODEMOD = join(__dirname, 'codemod-bp6-classes.mjs');

/**
 * The v92 Blueprint class codemod. It runs as a script, so each case writes files to a temp
 * folder, runs the codemod over it, and checks the rewritten files and the printed report.
 */
describe('codemod-bp6-classes', () => {
    let dir: string;

    afterEach(() => rmSync(dir, {recursive: true, force: true}));

    function run(files: Record<string, string>, ...args: string[]) {
        dir = mkdtempSync(join(tmpdir(), 'codemod-bp6-classes-'));
        for (const [name, text] of Object.entries(files)) {
            mkdirSync(join(dir, dirname(name)), {recursive: true});
            writeFileSync(join(dir, name), text);
        }
        const output = execFileSync('node', [CODEMOD, ...args, 'src'], {cwd: dir, encoding: 'utf8'});
        return {output, read: (name: string) => readFileSync(join(dir, name), 'utf8')};
    }

    it('renames component classes and the modifiers beside them in a stylesheet', () => {
        const {read} = run({
            'src/app.scss':
                '.x .bp6-button.bp6-minimal:hover { color: red; }\n' +
                '.bp6-dark .bp6-menu > .bp6-menu-item.bp6-intent-danger { color: red; }\n' +
                '.bp6-tabs.bp6-vertical .bp6-tab[aria-selected=true] { color: red; }\n'
        });
        expect(read('src/app.scss')).toBe(
            '.x .xh-button.xh-button--minimal:hover { color: red; }\n' +
                '.xh-dark .xh-menu-list > .xh-menu-item.xh-menu-item--intent-danger { color: red; }\n' +
                '.xh-tab-list.xh-tab-list--vertical .xh-tab-list__tab[aria-selected=true] { color: red; }\n'
        );
    });

    it('keeps the weight of a paired selector by repeating the class', () => {
        const {read} = run({'src/app.scss': '.xh-button.bp6-button { color: red; }\n'});
        expect(read('src/app.scss')).toBe('.xh-button.xh-button { color: red; }\n');
    });

    it('turns a segmented control option into xh-segmented-control__option', () => {
        const {read} = run({
            'src/app.scss':
                '.bp6-segmented-control > .bp6-button.bp6-minimal { color: red; }\n' +
                '.bp6-segmented-control > .bp6-button:not(.bp6-minimal) { color: red; }\n'
        });
        expect(read('src/app.scss')).toBe(
            '.xh-segmented-control__options > .xh-segmented-control__option:not(.xh-segmented-control__option--selected) { color: red; }\n' +
                '.xh-segmented-control__options > .xh-segmented-control__option.xh-segmented-control__option--selected { color: red; }\n'
        );
    });

    it('renames component classes in TypeScript class strings', () => {
        const {read} = run({
            'src/Panel.ts': "const a = 'bp6-button my-class';\nconst b = `bp6-tab ${extra}`;\n"
        });
        expect(read('src/Panel.ts')).toBe(
            "const a = 'xh-button my-class';\nconst b = `xh-tab-list__tab ${extra}`;\n"
        );
    });

    it('reports what it cannot rename, and leaves it as written', () => {
        const files = {
            'src/app.scss':
                '.y { &.bp6-active { color: red; } }\n' +
                '.bp6-input { color: var(--bp-palette-white); }\n' +
                '.bp6-code { color: red; }\n'
        };
        const {output, read} = run(files);
        expect(read('src/app.scss')).toBe(files['src/app.scss']);
        expect(output).toContain('`bp6-active` is a generic modifier');
        expect(output).toContain('`bp6-input` has more than one Hoist name');
        expect(output).toContain('`bp6-code` has no Hoist equivalent');
        expect(output).toContain('reads a Blueprint custom property');
    });

    it('reports markdown mentions without rewriting them', () => {
        const files = {'src/README.md': 'Style `.bp6-button` here.\n'};
        const {output, read} = run(files);
        expect(read('src/README.md')).toBe(files['src/README.md']);
        expect(output).toContain('README.md:1');
    });

    it('writes nothing in a dry run', () => {
        const files = {'src/app.scss': '.bp6-button { color: red; }\n'};
        const {output, read} = run(files, '--dry');
        expect(read('src/app.scss')).toBe(files['src/app.scss']);
        expect(output).toContain('Would rewrite 1 line(s) in 1 file(s).');
    });
});
