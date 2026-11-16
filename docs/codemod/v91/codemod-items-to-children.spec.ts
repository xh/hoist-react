/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {Project} from 'ts-morph';
import {describe, expect, it} from 'vitest';
import {applyEdits, collectItemsToChildren} from './codemod-items-to-children.mjs';

/**
 * The v91 codemod that renames `item` / `items` element spec keys to `children`. Each case runs
 * it over one app file in an in-memory project, with a stand-in for Hoist's `elem.ts`, and checks
 * the new text and the findings it reports.
 */
describe('codemod-items-to-children', () => {
    it('renames item and items keys in factory specs', () => {
        const {text, findings} = convert(`panel({title: 'A', items: [1, 2]});\npanel({item: 1});`);

        expect(text).toBe(`panel({title: 'A', children: [1, 2]});\npanel({children: 1});`);
        expect(findings).toEqual([]);
    });

    it('expands shorthand keys, and collapses items: children to the shorthand', () => {
        const {text} = convert(
            `const items = [1], item = 2, children = [3];\n` +
                `panel({items});\npanel({item});\npanel({items: children});`
        );

        expect(text).toBe(
            `const items = [1], item = 2, children = [3];\n` +
                `panel({children: items});\npanel({children: item});\npanel({children});`
        );
    });

    it('renames keys in nested specs, conditionals and createElement calls', () => {
        const {text} = convert(
            `declare const flag: boolean;\n` +
                `panel({items: [panel({item: 1})]});\n` +
                `panel(flag ? {item: 1} : {items: [2]});\n` +
                `createElement('div', {items: [1]});`
        );

        expect(text).toBe(
            `declare const flag: boolean;\n` +
                `panel({children: [panel({children: 1})]});\n` +
                `panel(flag ? {children: 1} : {children: [2]});\n` +
                `createElement('div', {children: [1]});`
        );
    });

    it('renames keys in literals typed as ElementSpec', () => {
        const {text} = convert(`const spec: ElementSpec<{title: string}> = {items: []};`);

        expect(text).toBe(`const spec: ElementSpec<{title: string}> = {children: []};`);
    });

    it('leaves data keys named items alone', () => {
        const code = `showMenu([{text: 'A', items: [{text: 'B'}]}]);\nconst data = {items: [1]};`,
            {text, findings} = convert(code);

        expect(text).toBe(code);
        expect(findings).toEqual([]);
    });

    it('leaves the $items escape alone', () => {
        const code = `tagList({$items: ['A']});`;

        expect(convert(code).text).toBe(code);
    });

    it('renames typed property access and destructuring, flagged for review', () => {
        const {text, findings} = convert(
            `declare const spec: ElementSpec<{title: string}>;\n` +
                `spec.items = [1];\nconst {item, ...rest} = spec;`
        );

        expect(text).toBe(
            `declare const spec: ElementSpec<{title: string}>;\n` +
                `spec.children = [1];\nconst {children: item, ...rest} = spec;`
        );
        expect(kinds(findings)).toEqual(['review', 'review']);
    });

    it('leaves specs with more than one children key unchanged, as a conflict', () => {
        const code = `panel({children: 1, items: [2]});\npanel({item: 1, items: [2]});`,
            {text, findings} = convert(code);

        expect(text).toBe(code);
        expect(kinds(findings)).toEqual(['conflict', 'conflict']);
    });

    it('reports specs built as untyped objects, where built and where passed', () => {
        const code = `const spec = {title: 'A', item: el};\npanel(spec);\npanel({...spec});`,
            {text, findings} = convert(code);

        expect(text).toBe(code);
        expect(kinds(findings)).toEqual(['manual', 'manual', 'manual']);
        expect(findings.map(it => it.line)).toEqual([1, 2, 3]);
    });

    it('reports item keys in untyped bare calls, but not in untyped method calls', () => {
        const code = `declare const factory: any, rows: any[];\nfactory({items: [1]});\nrows.push({items: [1]});`,
            {text, findings} = convert(code);

        expect(text).toBe(code);
        expect(kinds(findings)).toEqual(['manual']);
        expect(findings[0].line).toBe(2);
    });

    it('reports untyped objects that hold an element in item or items', () => {
        // E.g. app options returned from an `getAppOptions()` override with no return type.
        const code = `export const opts = [{formField: {item: el}}, {text: 'A', items: [{text: 'B'}]}];`,
            {text, findings} = convert(code);

        expect(text).toBe(code);
        expect(kinds(findings)).toEqual(['manual']);
    });

    it('renames string-literal keys and typed element access', () => {
        const {text, findings} = convert(
            `declare const spec: ElementSpec<{title: string}>;\n` +
                `panel({'items': [1]});\nspec['item'] = 1;`
        );

        expect(text).toBe(
            `declare const spec: ElementSpec<{title: string}>;\n` +
                `panel({children: [1]});\nspec['children'] = 1;`
        );
        expect(kinds(findings)).toEqual(['review']);
    });

    it('keeps the default when renaming a destructured key', () => {
        const {text} = convert(
            `declare const spec: ElementSpec<{title: string}>;\nconst {items = []} = spec;`
        );

        expect(text).toBe(
            `declare const spec: ElementSpec<{title: string}>;\nconst {children: items = []} = spec;`
        );
    });

    it('flags a later spread that could carry children', () => {
        const {text, findings} = convert(
            `declare const props: {title?: string; children?: ReactNode};\n` +
                `panel({items: [1], ...props});`
        );

        expect(text).toBe(
            `declare const props: {title?: string; children?: ReactNode};\n` +
                `panel({children: [1], ...props});`
        );
        expect(kinds(findings)).toEqual(['review']);
    });

    it('flags a later spread that could carry a legacy key', () => {
        const {text, findings} = convert(
            `declare const extra: any;\n` +
                `panel({items: [1], ...extra});\npanel({items: [1], ...{title: 'A'}});`
        );

        expect(text).toBe(
            `declare const extra: any;\n` +
                `panel({children: [1], ...extra});\npanel({children: [1], ...{title: 'A'}});`
        );
        expect(kinds(findings)).toEqual(['review']);
    });

    it('edits only files under the given paths', () => {
        const code = `panel({items: [1]});`;

        expect(convert(code, ['/elsewhere']).text).toBe(code);
    });

    it('applies text edits in any order', () => {
        const text = applyEdits('abcdef', [
            {start: 0, end: 1, text: 'A'},
            {start: 4, end: 6, text: 'EF!'}
        ]);

        expect(text).toBe('AbcdEF!');
    });
});

//------------------
// Helpers
//------------------
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
export declare const tagList: ElementFactory<{items?: string[]}>;
export declare const el: ReactElement;
export interface MenuItem {text: string; items?: MenuItem[]}
export declare function showMenu(items: MenuItem[]): void;
`;

const IMPORTS = `import {createElement, el, panel, tagList, showMenu, type ElementSpec, type ReactNode} from '../hoist/elem';\n`;

interface Finding {
    kind: string;
    line: number;
}

/**
 * Run the codemod over one app file, returning its new text and the findings. Finding lines are
 * relative to the code passed in.
 */
function convert(code: string, paths?: string[]): {text: string; findings: Finding[]} {
    const project = new Project({useInMemoryFileSystem: true, compilerOptions: {strict: false}});
    project.createSourceFile('/hoist/elem.ts', ELEM);
    const sf = project.createSourceFile('/app/view.ts', IMPORTS + code),
        result = collectItemsToChildren(project, {paths}),
        edits = result.files.find(it => it.file === sf.getFilePath())?.edits ?? [],
        text = applyEdits(sf.getFullText(), edits);
    return {
        text: text.slice(IMPORTS.length),
        findings: result.findings.map(it => ({...it, line: it.line - 1}))
    };
}

function kinds(findings: Finding[]): string[] {
    return findings.map(it => it.kind);
}
