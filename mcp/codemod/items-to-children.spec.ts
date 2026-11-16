/**
 * Checks for the `items-to-children` codemod. Run with:
 *   node --import tsx --test mcp/codemod/items-to-children.spec.ts
 *
 * Builds an in-memory project with a stand-in for Hoist's `elem.ts` and checks the edits and
 * findings the codemod produces for each case.
 */
import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {Project} from 'ts-morph';

import {applyEdits, collectItemsToChildren, type Finding} from './items-to-children.js';

const ELEM = `
export interface ReactElement {type: any; props: any; key: string}
export type ReactNode = ReactElement | string | number | boolean | null | undefined | Iterable<ReactNode>;
export type ElementSpec<P> = Omit<P, 'children' | 'items' | 'item' | 'omit'> & {
    children?: ReactNode;
    items?: ReactNode;
    item?: ReactNode;
    omit?: boolean;
    $items?: 'items' extends keyof P ? P['items'] : never;
};
export type ElementFactory<P = any> = ((arg: ElementSpec<P>) => any) &
    ((...args: ReactNode[]) => any);
export declare function createElement<P>(component: any, spec: ElementSpec<P>): any;
export declare const panel: ElementFactory<{title?: string}>;
export declare const el: ReactElement;
export declare const tagList: ElementFactory<{items?: string[]}>;
export interface MenuItem {text: string; items?: MenuItem[]}
export declare function showMenu(items: MenuItem[]): void;
`;

/** Run the codemod over one app file, returning its new text and the findings. */
function convert(code: string, paths?: string[]): {text: string; findings: Finding[]} {
    const project = new Project({
        useInMemoryFileSystem: true,
        compilerOptions: {strict: false}
    });
    project.createSourceFile('/hoist/elem.ts', ELEM);
    const sf = project.createSourceFile(
        '/app/view.ts',
        `import {createElement, el, panel, tagList, showMenu, type ElementSpec} from '../hoist/elem';\n${code}`
    );
    const result = collectItemsToChildren(project, {paths}),
        edits = result.files.find(f => f.file === sf.getFilePath())?.edits ?? [],
        text = applyEdits(sf.getFullText(), edits);
    return {text: text.slice(text.indexOf('\n') + 1), findings: result.findings};
}

const kinds = (findings: Finding[]) => findings.map(f => f.kind);

describe('items-to-children', () => {
    it('renames item and items keys in factory specs', () => {
        const {text, findings} = convert(
            `panel({title: 'A', items: [1, 2]});\npanel({item: 1});\n`
        );
        assert.equal(text, `panel({title: 'A', children: [1, 2]});\npanel({children: 1});\n`);
        assert.deepEqual(findings, []);
    });

    it('expands shorthand keys, and collapses items: children to shorthand', () => {
        const {text} = convert(
            `const items = [1], item = 2, children = [3];\npanel({items});\npanel({item});\npanel({items: children});\n`
        );
        assert.equal(
            text,
            `const items = [1], item = 2, children = [3];\npanel({children: items});\npanel({children: item});\npanel({children});\n`
        );
    });

    it('renames keys in nested specs, conditionals and createElement calls', () => {
        const {text} = convert(
            `declare const flag: boolean;\npanel({items: [panel({item: 1})]});\npanel(flag ? {item: 1} : {items: [2]});\ncreateElement('div', {items: [1]});\n`
        );
        assert.equal(
            text,
            `declare const flag: boolean;\npanel({children: [panel({children: 1})]});\npanel(flag ? {children: 1} : {children: [2]});\ncreateElement('div', {children: [1]});\n`
        );
    });

    it('renames keys in literals typed as ElementSpec', () => {
        const {text} = convert(
            `const spec: ElementSpec<{title: string}> = {title: 'A', items: []};\n`
        );
        assert.equal(
            text,
            `const spec: ElementSpec<{title: string}> = {title: 'A', children: []};\n`
        );
    });

    it('leaves data keys named items alone', () => {
        const code = `showMenu([{text: 'A', items: [{text: 'B'}]}]);\nconst data = {items: [1]};\n`;
        const {text, findings} = convert(code);
        assert.equal(text, code);
        assert.deepEqual(findings, []);
    });

    it('leaves the $items escape alone', () => {
        const code = `tagList({$items: ['A']});\n`;
        assert.equal(convert(code).text, code);
    });

    it('renames typed property access and destructuring, flagged for review', () => {
        const {text, findings} = convert(
            `declare const spec: ElementSpec<{title: string}>;\nspec.items = [1];\nconst {item, ...rest} = spec;\n`
        );
        assert.equal(
            text,
            `declare const spec: ElementSpec<{title: string}>;\nspec.children = [1];\nconst {children: item, ...rest} = spec;\n`
        );
        assert.deepEqual(kinds(findings), ['review', 'review']);
    });

    it('leaves specs with more than one children key unchanged, as a conflict', () => {
        const code = `panel({children: 1, items: [2]});\npanel({item: 1, items: [2]});\n`;
        const {text, findings} = convert(code);
        assert.equal(text, code);
        assert.deepEqual(kinds(findings), ['conflict', 'conflict']);
    });

    it('reports specs built as untyped objects and passed to a factory', () => {
        const code = `const spec = {title: 'A', item: el};\npanel(spec);\npanel({...spec});\n`;
        const {text, findings} = convert(code);
        assert.equal(text, code);
        assert.deepEqual(kinds(findings), ['manual', 'manual']);
    });

    it('reports item keys in untyped bare calls, but not in untyped method calls', () => {
        const code = `declare const factory: any, rows: any[];\nfactory({items: [1]});\nrows.push({items: [1]});\n`;
        const {text, findings} = convert(code);
        assert.equal(text, code);
        assert.deepEqual(kinds(findings), ['manual']);
        assert.equal(findings[0].line, 3);
    });

    it('flags a later spread that could carry a legacy key', () => {
        const {text, findings} = convert(
            `declare const extra: any;\npanel({items: [1], ...extra});\npanel({items: [1], ...{title: 'A'}});\n`
        );
        assert.equal(
            text,
            `declare const extra: any;\npanel({children: [1], ...extra});\npanel({children: [1], ...{title: 'A'}});\n`
        );
        assert.deepEqual(kinds(findings), ['review']);
    });

    it('limits edits to the given paths', () => {
        const {text} = convert(`panel({items: [1]});\n`, ['/elsewhere']);
        assert.equal(text, `panel({items: [1]});\n`);
    });
});

describe('applyEdits', () => {
    it('applies edits in any order', () => {
        const text = applyEdits('abcdef', [
            {start: 0, end: 1, text: 'A'},
            {start: 4, end: 6, text: 'EF!'}
        ]);
        assert.equal(text, 'AbcdEF!');
    });
});
