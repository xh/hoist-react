#!/usr/bin/env node
/*
 * Codemod for the hoist-react v91 move from `item` / `items` to `children` in element specs.
 *
 *   panel({title: 'Users', items: [grid(), toolbar()]})  →  panel({title: 'Users', children: [...]})
 *   box({flex: 1, item: 'Hello'})                        →  box({flex: 1, children: 'Hello'})
 *   div({items: children})                               →  div({children})
 *
 * `items:` is also a common data key (menus, column groups, options), so a text search cannot
 * tell the two apart. This codemod loads the app's TypeScript project and renames a key only when
 * the type checker resolves it to the `item` or `items` member of Hoist's `ElementSpec` type.
 * That holds for every object literal passed to an element factory or `createElement`, or typed
 * as an `ElementSpec`. Reads and writes of those members on a typed spec (`spec.items`) and
 * destructured spec keys are renamed too.
 *
 * Edits are plain text replacements, so formatting and comments are untouched. Run the app's
 * formatter afterwards to re-wrap changed lines. The codemod reports what it could not convert:
 *   - conflict - a spec with more than one of `children`, `item`, `items`. Left unchanged.
 *   - manual   - a likely spec without type information, e.g. a spec built as an untyped object
 *                and passed to a factory later. Convert it by hand.
 *   - review   - a rename outside a plain object literal, a key moved after a spread, or doc
 *                prose about the old keys.
 *
 * A legacy key beat any `children` prop from a later spread, and `children` does not. So where a
 * later spread can carry `children`, as in `panel({item: x, ...props})`, the codemod moves the
 * renamed key after it - `panel({...props, children: x})` - and reports the move for review.
 *
 * Markdown docs get a second pass, because agents copy factory calls from CLAUDE.md, AGENTS.md,
 * READMEs and similar files. Code blocks there have no imports, so the type checker cannot read
 * them, and they belong to the people who wrote them. So the docs pass changes nothing by default.
 * It reports a suggested rename for each `item` / `items` key in an object literal passed straight
 * to a known element factory within a fenced TS/JS block. A known factory is one the project
 * exports, from Hoist or the app, or one the block defines. It also reports other likely specs in
 * code blocks, and prose that names `item` / `items` as the children keys. Data keys, such as
 * `items` in menu configs, are not reported. With --fix-docs, it applies the suggested renames in
 * code blocks that are closed and parse cleanly, and still reports the rest. Files named
 * CHANGELOG.md and anything under node_modules are skipped.
 *
 * Upgrade the app to hoist-react v91 or later first. Older versions pass `children` through as a
 * plain prop, without the handling described above.
 *
 * Usage (from the app root):
 *   node client-app/node_modules/@xh/hoist/docs/codemod/v91/codemod-items-to-children.mjs \
 *       [--dry] [--fix-docs] [--no-docs] [--project tsconfig.json] [path ...]
 *
 * The tsconfig defaults to ./tsconfig.json, then ./client-app/tsconfig.json. Paths limit the
 * files edited. Source files default to the folder holding the tsconfig, and markdown files to
 * the current folder. Files outside them - including node_modules and a hoist-react checkout
 * mapped in via `paths` - are type checked, never edited.
 *
 * Options:
 *   --dry        Report source and doc changes, write nothing.
 *   --fix-docs   Apply the safe doc renames too. Without it, docs are only reported.
 *   --no-docs    Skip markdown entirely.
 *   --project    Path to the tsconfig.json to load.
 */
import {existsSync, readdirSync, readFileSync, realpathSync, statSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {Project, ts} from 'ts-morph';

/** Legacy spec keys this codemod converts. */
export const LEGACY_KEYS = ['item', 'items'];

/**
 * Collect all edits for a ts-morph project. Does not modify the project or the disk.
 *
 * @param {Project} project
 * @param {{paths?: string[]}} [opts] - `paths` limits edits to files under these absolute paths.
 * @returns {{files: {file: string, edits: Edit[]}[], renameCount: number, findings: Finding[]}}
 *
 * @typedef {{start: number, end: number, text: string}} Edit
 * @typedef {{kind: 'review'|'manual'|'conflict', file: string, line: number, column: number, message: string}} Finding
 */
export function collectItemsToChildren(project, opts = {}) {
    const checker = project.getTypeChecker().compilerObject,
        result = {files: [], renameCount: 0, findings: []};

    for (const sourceFile of selectSourceFiles(project, opts.paths)) {
        const edits = processFile(sourceFile, checker, result);
        if (edits.length) {
            result.files.push({file: sourceFile.getFilePath(), edits});
            result.renameCount += countRenames(edits);
        }
    }

    return result;
}

/** Apply edits to a text, returning the new text. Edits must not overlap. */
export function applyEdits(text, edits) {
    const sorted = [...edits].sort((a, b) => b.start - a.start);
    let ret = text;
    for (const {start, end, text: replacement} of sorted) {
        ret = ret.slice(0, start) + replacement + ret.slice(end);
    }
    return ret;
}

/**
 * Collect the names of all element factories the project exports, from Hoist and the app. Used to
 * recognize factory calls in markdown code blocks, which cannot be type checked.
 *
 * @param {Project} project
 * @returns {Set<string>}
 */
export function collectFactoryNames(project) {
    const program = project.getProgram().compilerObject,
        checker = program.getTypeChecker(),
        ret = new Set();

    for (const sf of program.getSourceFiles()) {
        if (program.isSourceFileDefaultLibrary(sf)) continue;
        const moduleSymbol = checker.getSymbolAtLocation(sf);
        if (!moduleSymbol) continue;
        for (const exported of checker.getExportsOfModule(moduleSymbol)) {
            if (ret.has(exported.name)) continue;
            const symbol =
                exported.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported;
            if (!(symbol.flags & ts.SymbolFlags.Variable)) continue;
            if (checker.getTypeOfSymbol(symbol).aliasSymbol?.name === 'ElementFactory') {
                ret.add(exported.name);
            }
        }
    }
    return ret;
}

/**
 * Check one markdown document for `item` / `items` in element factory examples.
 *
 * Docs are written by people, so by default this changes nothing. It returns a `suggest` finding
 * for each key it would rename, plus `manual`, `conflict` and `review` findings for what it cannot
 * judge. With `fix: true`, it applies the suggested renames, but only in fenced code blocks that
 * are closed and parse without errors. Suggestions in other blocks stay findings.
 *
 * @param {string} text - markdown source.
 * @param {Set<string>} factoryNames - see {@link collectFactoryNames}.
 * @param {{fix?: boolean}} [opts]
 * @returns {{text: string, renameCount: number, findings: {kind: string, line: number, column: number, message: string}[]}}
 */
export function convertMarkdown(text, factoryNames, opts = {}) {
    const lines = text.split('\n'),
        findings = [];
    let renameCount = 0;

    for (let i = 0; i < lines.length; i++) {
        const open = lines[i].match(/^\s*(`{3,}|~{3,})\s*([\w-]*)/);
        if (!open) {
            if (PROSE_RE.test(lines[i])) {
                findings.push({
                    kind: 'review',
                    line: i + 1,
                    column: 1,
                    message: 'Prose names `item` / `items` as the children keys - update it to `children`.'
                });
            }
            continue;
        }

        const [, fence, lang] = open;
        let end = i + 1;
        while (end < lines.length && !lines[end].trim().startsWith(fence)) end++;

        if (CODE_LANGS.includes(lang.toLowerCase())) {
            const firstLine = i + 1,
                isClosed = end < lines.length,
                code = lines.slice(firstLine, end).join('\n'),
                result = convertCodeBlock(code, factoryNames),
                canFix = opts.fix && isClosed && result.parsedCleanly;

            result.findings.forEach(f => findings.push({...f, line: f.line + firstLine}));
            if (canFix && result.edits.length) {
                lines.splice(firstLine, end - firstLine, ...applyEdits(code, result.edits).split('\n'));
                renameCount += result.edits.length;
            } else {
                const why = !opts.fix
                    ? ''
                    : !isClosed
                      ? ' Not applied: the code block has no closing fence.'
                      : ' Not applied: the code block does not parse cleanly.';
                result.edits.forEach(e =>
                    findings.push({
                        kind: 'suggest',
                        line: e.line + firstLine,
                        column: e.column,
                        message: `In \`${e.callee}(...)\`, rename \`${e.from}\` to \`${e.text}\`.${why}`
                    })
                );
            }
        }
        i = end;
    }

    return {text: lines.join('\n'), renameCount, findings};
}

//------------------------
// Implementation
//------------------------
const CODE_LANGS = ['', 'ts', 'typescript', 'tsx', 'js', 'javascript', 'jsx', 'mjs', 'cjs'],
    PROSE_RE = /`item`\s*\/\s*`items`|`item\/items`|\bitems in,? children out\b/i,
    FACTORY_CREATOR_RE = /^(hoistCmp(\.(factory|withFactory))?|elementFactory)\b/;

function convertCodeBlock(code, factoryNames) {
    const sf = ts.createSourceFile('block.tsx', code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX),
        local = new Set(),
        edits = [],
        findings = [];

    const report = (kind, node, message) => {
        const {line, character} = sf.getLineAndCharacterOfPosition(node.getStart(sf));
        findings.push({kind, line: line + 1, column: character + 1, message});
    };

    // Factories the block defines, e.g. `const myPanel = hoistCmp.factory(...)`.
    const findLocal = node => {
        if (
            ts.isVariableDeclaration(node) &&
            node.initializer &&
            ts.isCallExpression(node.initializer) &&
            FACTORY_CREATOR_RE.test(node.initializer.expression.getText(sf))
        ) {
            if (ts.isIdentifier(node.name)) local.add(node.name.text);
            if (ts.isArrayBindingPattern(node.name)) {
                node.name.elements.forEach(el => {
                    if (ts.isBindingElement(el) && ts.isIdentifier(el.name)) local.add(el.name.text);
                });
            }
        }
        ts.forEachChild(node, findLocal);
    };
    findLocal(sf);

    const isFactoryCall = node =>
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        (factoryNames.has(node.expression.text) || local.has(node.expression.text));

    const holdsElement = init =>
        isFactoryCall(init) || (ts.isArrayLiteralExpression(init) && init.elements.some(isFactoryCall));

    const visit = node => {
        // Specs nested in other config, e.g. an app option's `formField: {item: switchInput()}`.
        if (
            ts.isObjectLiteralExpression(node) &&
            !(ts.isCallExpression(node.parent) && ts.isIdentifier(node.parent.expression))
        ) {
            const prop = node.properties.find(
                p => ts.isPropertyAssignment(p) && isLegacyKey(propName(p)) && holdsElement(p.initializer)
            );
            if (prop) {
                report(
                    'manual',
                    prop,
                    `Object holds an element in \`${propName(prop)}\` - convert by hand if this is an element spec.`
                );
            }
        }
        if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
            const name = node.expression.text,
                isFactory = factoryNames.has(name) || local.has(name);
            for (const arg of node.arguments) {
                if (!ts.isObjectLiteralExpression(arg)) continue;
                const legacy = arg.properties.filter(
                    p =>
                        (ts.isPropertyAssignment(p) || ts.isShorthandPropertyAssignment(p)) &&
                        isLegacyKey(propName(p))
                );
                if (!legacy.length) continue;
                if (!isFactory) {
                    report(
                        'manual',
                        legacy[0],
                        `\`${name}\` is not a known element factory - convert \`${propName(legacy[0])}\` by hand if this is an element spec.`
                    );
                    continue;
                }
                if (legacy.length > 1 || arg.properties.some(p => propName(p) === 'children')) {
                    report(
                        'conflict',
                        legacy[0],
                        'Spec has more than one of `children`, `item`, `items` - merge them by hand.'
                    );
                    continue;
                }
                const [prop] = legacy;
                if (ts.isShorthandPropertyAssignment(prop)) {
                    edits.push(nodeEdit(sf, prop.name, `children: ${prop.name.text}`, name));
                } else if (ts.isIdentifier(prop.initializer) && prop.initializer.text === 'children') {
                    edits.push(nodeEdit(sf, prop, 'children', name));
                } else {
                    edits.push(nodeEdit(sf, prop.name, 'children', name));
                }
            }
        }
        ts.forEachChild(node, visit);
    };
    visit(sf);

    return {edits, findings, parsedCleanly: !sf.parseDiagnostics?.length};
}

/** An edit that also records where it is and what it replaces, for suggestions. */
function nodeEdit(sf, node, text, callee) {
    const start = node.getStart(sf),
        {line, character} = sf.getLineAndCharacterOfPosition(start);
    return {start, end: node.getEnd(), text, from: node.getText(sf), callee, line: line + 1, column: character + 1};
}
function selectSourceFiles(project, paths) {
    const prefixes = paths?.map(toPosix);
    return project.getSourceFiles().filter(sf => {
        const filePath = sf.getFilePath();
        if (sf.isDeclarationFile() || filePath.includes('/node_modules/')) return false;
        return (
            !prefixes?.length ||
            prefixes.some(p => filePath === p || filePath.startsWith(p + '/'))
        );
    });
}

function processFile(sf, checker, result) {
    const file = sf.compilerNode,
        filePath = sf.getFilePath(),
        edits = [];

    const report = (kind, node, message) => {
        const {line, character} = file.getLineAndCharacterOfPosition(node.getStart(file));
        result.findings.push({
            kind,
            file: filePath,
            line: line + 1,
            column: character + 1,
            message
        });
    };

    const replace = (node, text) => ({start: node.getStart(file), end: node.getEnd(), text});

    // Keys to move after a spread. Resolved once all edits are known, see resolveMove().
    const moves = [];
    const moveAfter = (prop, isFirst, next, carrier) => {
        const text = file.text,
            isShorthand = ts.isShorthandPropertyAssignment(prop),
            valueNode = isShorthand ? prop.name : prop.initializer,
            onOwnLine = text.slice(prop.getFullStart(), prop.getStart(file)).includes('\n');

        // Delete the key and the comma after it. Keep the next property's leading trivia, except
        // a lone space that would follow the opening brace, as in `{ ...props}`.
        let end = next.getFullStart();
        if (isFirst && /^[ \t]*$/.test(text.slice(end, next.getStart(file)))) {
            end = next.getStart(file);
        }

        const lineStart = text.lastIndexOf('\n', carrier.getStart(file)) + 1,
            indent = text.slice(lineStart, carrier.getStart(file)).match(/^\s*/)[0];
        return {
            start: prop.getFullStart(),
            end,
            insertAt: carrier.getEnd(),
            separator: onOwnLine ? `,\n${indent}` : ', ',
            valueStart: valueNode.getStart(file),
            valueEnd: valueNode.getEnd(),
            // `items: children` becomes the shorthand `children`.
            toShorthand: !isShorthand && ts.isIdentifier(valueNode) && valueNode.text === 'children'
        };
    };

    // Fold the edits inside a moved value into its new text, so no two edits overlap.
    const resolveMove = m => {
        const inside = edits.filter(e => e.start >= m.valueStart && e.end <= m.valueEnd),
            value = applyEdits(
                file.text.slice(m.valueStart, m.valueEnd),
                inside.map(e => ({...e, start: e.start - m.valueStart, end: e.end - m.valueStart}))
            );
        for (const e of inside) edits.splice(edits.indexOf(e), 1);
        edits.push(
            {start: m.start, end: m.end, text: '', move: true},
            {
                start: m.insertAt,
                end: m.insertAt,
                text: m.separator + (m.toShorthand ? 'children' : `children: ${value}`),
                count: countRenames(inside) + 1
            }
        );
    };

    const isSpecType = type =>
        !!type &&
        !(type.flags & ts.TypeFlags.Any) &&
        LEGACY_KEYS.some(key => isElementSpecMember(propertyOf(type, key)));

    // Object literals - the common case, e.g. `panel({title, items: [...]})`.
    const processObjectLiteral = obj => {
        const legacyProps = obj.properties.filter(
            p =>
                (ts.isPropertyAssignment(p) || ts.isShorthandPropertyAssignment(p)) &&
                isLegacyKey(propName(p))
        );
        if (!legacyProps.length) return;

        const contextualType = checker.getContextualType(obj);
        if (!contextualType || contextualType.flags & ts.TypeFlags.Any) {
            const [first] = legacyProps,
                key = propName(first);
            if (isBareCallArgument(obj)) {
                report(
                    'manual',
                    first,
                    `Untyped call - convert \`${key}\` by hand if this is an element spec.`
                );
            } else if (legacyProps.some(p => isElementLike(checker.getTypeAtLocation(p.name)))) {
                report(
                    'manual',
                    first,
                    `Untyped object with an element in \`${key}\` - convert by hand if this is an element spec.`
                );
            }
            return;
        }

        const specProps = legacyProps.filter(p =>
            isElementSpecMember(propertyOf(contextualType, propName(p)))
        );
        if (!specProps.length) return;

        const hasChildren = obj.properties.some(p => propName(p) === 'children');
        if (hasChildren || specProps.length > 1) {
            report(
                'conflict',
                specProps[0],
                'Spec has more than one of `children`, `item`, `items` - merge them by hand.'
            );
            return;
        }

        const [prop] = specProps,
            idx = obj.properties.indexOf(prop),
            carrier = obj.properties.findLast(
                (p, i) =>
                    i > idx &&
                    ts.isSpreadAssignment(p) &&
                    mayCarryChildren(checker.getTypeAtLocation(p.expression))
            );
        if (carrier) {
            // The legacy key beat a `children` prop from a later spread, and `children` does not.
            // Move the renamed key after that spread to keep the old behavior.
            moves.push(moveAfter(prop, idx === 0, obj.properties[idx + 1], carrier));
            report(
                'review',
                prop,
                `Moved \`${propName(prop)}\` after a spread that can carry \`children\`, renamed to \`children\`, so it still wins. Move it back if the spread's \`children\` should win.`
            );
            return;
        }

        if (ts.isShorthandPropertyAssignment(prop)) {
            edits.push(replace(prop.name, `children: ${prop.name.text}`));
        } else if (ts.isIdentifier(prop.initializer) && prop.initializer.text === 'children') {
            // `items: children` becomes the shorthand `children`.
            edits.push(replace(prop, 'children'));
        } else {
            edits.push(replace(prop.name, 'children'));
        }
    };

    // Typed reads and writes, e.g. `cfg.items = parseMenuItems(...)`.
    const processPropertyAccess = node => {
        if (!isElementSpecMember(checker.getSymbolAtLocation(node.name))) return;
        edits.push(replace(node.name, 'children'));
        report('review', node.name, `Renamed \`.${node.name.text}\` to \`.children\`.`);
    };

    // Typed reads and writes by string key, e.g. `spec['items']`.
    const processElementAccess = node => {
        const arg = node.argumentExpression;
        if (!isElementSpecMember(propertyOf(checker.getTypeAtLocation(node.expression), arg.text))) {
            return;
        }
        edits.push({start: arg.getStart(file) + 1, end: arg.getEnd() - 1, text: 'children'});
        report('review', arg, `Renamed \`['${arg.text}']\` to \`['children']\`.`);
    };

    // Destructured specs, e.g. `const {items, ...rest} = spec`.
    const processBindingPattern = pattern => {
        const sourceType = checker.getTypeAtLocation(pattern),
            keyOf = el => {
                const keyNode = el.propertyName ?? el.name;
                return ts.isIdentifier(keyNode) ? keyNode : null;
            },
            specElements = pattern.elements.filter(el => {
                const keyNode = keyOf(el);
                return (
                    !el.dotDotDotToken &&
                    keyNode &&
                    isLegacyKey(keyNode.text) &&
                    isElementSpecMember(propertyOf(sourceType, keyNode.text))
                );
            });
        if (!specElements.length) return;

        const hasChildren = pattern.elements.some(el => keyOf(el)?.text === 'children');
        if (hasChildren || specElements.length > 1) {
            report(
                'conflict',
                specElements[0],
                'Destructures more than one of `children`, `item`, `items` - merge them by hand.'
            );
            return;
        }

        for (const el of specElements) {
            const keyNode = keyOf(el);
            edits.push(
                el.propertyName
                    ? replace(el.propertyName, 'children')
                    : replace(el.name, `children: ${keyNode.text}`)
            );
            report('review', keyNode, `Renamed destructured \`${keyNode.text}\` to \`children\`.`);
        }
    };

    // Specs built elsewhere, e.g. `const spec = {items}; panel(spec)` or `panel({...spec})`.
    const processCallArgs = call => {
        for (const arg of call.arguments) {
            const sources = [];
            if (ts.isObjectLiteralExpression(arg)) {
                arg.properties.forEach(p => {
                    if (ts.isSpreadAssignment(p)) sources.push(p.expression);
                });
                if (!sources.length) continue;
            } else {
                sources.push(arg);
            }
            if (!isSpecType(checker.getContextualType(arg))) continue;

            for (const src of sources) {
                const srcType = checker.getTypeAtLocation(src);
                for (const key of LEGACY_KEYS) {
                    const prop = propertyOf(srcType, key);
                    if (!prop || isElementSpecMember(prop)) continue;
                    report(
                        'manual',
                        src,
                        `Spec passed to a factory has \`${key}\` from an untyped object - rename it to \`children\` where it is built.`
                    );
                }
            }
        }
    };

    const visit = node => {
        if (ts.isObjectLiteralExpression(node)) {
            processObjectLiteral(node);
        } else if (ts.isPropertyAccessExpression(node) && isLegacyKey(node.name.text)) {
            processPropertyAccess(node);
        } else if (
            ts.isElementAccessExpression(node) &&
            ts.isStringLiteral(node.argumentExpression) &&
            isLegacyKey(node.argumentExpression.text)
        ) {
            processElementAccess(node);
        } else if (ts.isObjectBindingPattern(node)) {
            processBindingPattern(node);
        } else if (ts.isCallExpression(node)) {
            processCallArgs(node);
        }
        ts.forEachChild(node, visit);
    };

    visit(file);
    // Inner moves first, so an outer move carries their result.
    moves.sort((a, b) => a.valueEnd - a.valueStart - (b.valueEnd - b.valueStart)).forEach(resolveMove);
    return dedupe(edits);
}

/** Count the renames in a list of edits. A moved key's edit includes the renames inside it. */
function countRenames(edits) {
    return edits.reduce((n, e) => n + (e.move ? 0 : (e.count ?? 1)), 0);
}

/** True if the type is a React element, or an array of them. */
function isElementLike(type) {
    const types = type.isUnion() ? type.types : [type];
    return types.some(t => {
        const elementType = t.getNumberIndexType() ?? t;
        return ['type', 'props', 'key'].every(name => !!elementType.getProperty(name));
    });
}

/**
 * True if a spread of this type could carry `children`, `item` or `items`. Before the rename, the
 * key's value went to `React.createElement` as rest arguments and beat any `children` prop. After
 * it, a later spread that sets `children` wins.
 */
function mayCarryChildren(type) {
    if (type.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) return true;
    return ['children', ...LEGACY_KEYS].some(key => !!propertyOf(type, key));
}

/** Look up a property on a type, checking each member of a union. */
function propertyOf(type, name) {
    const types = type.isUnion() ? type.types : [type];
    for (const t of types) {
        const prop = t.getProperty(name);
        if (prop) return prop;
    }
    return undefined;
}

/** True if the symbol is the `item` or `items` member declared by Hoist's `ElementSpec` type. */
function isElementSpecMember(symbol) {
    if (!symbol || !isLegacyKey(symbol.name)) return false;
    return (symbol.declarations ?? []).some(decl => {
        for (let n = decl.parent; n; n = n.parent) {
            if (ts.isTypeAliasDeclaration(n)) return n.name.text === 'ElementSpec';
        }
        return false;
    });
}

/**
 * True if the node is an argument to a call of a bare identifier, e.g. `panel({...})`. Factories
 * are called this way, while untyped method calls like `rows.push({...})` hold data.
 */
function isBareCallArgument(node) {
    let n = node.parent;
    while (n && (ts.isParenthesizedExpression(n) || ts.isConditionalExpression(n))) n = n.parent;
    return !!n && ts.isCallExpression(n) && ts.isIdentifier(n.expression);
}

function propName(p) {
    const {name} = p;
    if (name && (ts.isIdentifier(name) || ts.isStringLiteral(name))) return name.text;
    return undefined;
}

function isLegacyKey(name) {
    return !!name && LEGACY_KEYS.includes(name);
}

function dedupe(edits) {
    const seen = new Set();
    return edits.filter(e => {
        if (seen.has(e.start)) return false;
        seen.add(e.start);
        return true;
    });
}

function toPosix(p) {
    return p.replace(/\\/g, '/').replace(/\/$/, '');
}

//------------------------
// CLI
//------------------------
function main(args) {
    const cwd = process.cwd(),
        paths = [];
    let dry = false,
        docs = true,
        fixDocs = false,
        explicitTsConfig = null;
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === '--dry') {
            dry = true;
        } else if (arg === '--no-docs') {
            docs = false;
        } else if (arg === '--fix-docs') {
            fixDocs = true;
        } else if (arg === '--project') {
            explicitTsConfig = args[++i];
            if (!explicitTsConfig || explicitTsConfig.startsWith('--')) fail('--project needs a path.');
        } else if (arg.startsWith('--')) {
            fail(`Unknown option: ${arg}`);
        } else if (!existsSync(path.resolve(cwd, arg))) {
            fail(`Path not found: ${arg}`);
        } else {
            paths.push(arg);
        }
    }

    const tsConfigFilePath = resolveTsConfig(cwd, explicitTsConfig);
    console.log(`Loading ${path.relative(cwd, tsConfigFilePath)}...`);

    const project = new Project({tsConfigFilePath}),
        scope = paths.length ? paths.map(p => path.resolve(cwd, p)) : [path.dirname(tsConfigFilePath)],
        result = collectItemsToChildren(project, {paths: scope});

    const changedFiles = result.files.map(it => it.file);
    let {renameCount} = result;

    if (!dry) {
        const fs = project.getFileSystem();
        for (const {file, edits} of result.files) {
            fs.writeFileSync(file, applyEdits(fs.readFileSync(file), edits));
        }
    }

    if (docs) {
        const factoryNames = collectFactoryNames(project),
            docRoots = paths.length ? paths.map(p => path.resolve(cwd, p)) : [cwd];
        for (const file of docRoots.flatMap(findMarkdownFiles)) {
            const md = convertMarkdown(readFileSync(file, 'utf8'), factoryNames, {
                fix: fixDocs && !dry
            });
            md.findings.forEach(f => result.findings.push({...f, file}));
            if (!md.renameCount) continue;
            renameCount += md.renameCount;
            changedFiles.push(file);
            if (!dry) writeFileSync(file, md.text);
        }
    }

    console.log(
        `${dry ? 'Would rename' : 'Renamed'} ${renameCount} key(s) in ${changedFiles.length} file(s).`
    );
    if (dry) {
        for (const file of changedFiles) console.log(`  ${path.relative(cwd, file)}`);
    }

    const groups = [
        [
            'suggest',
            fixDocs
                ? 'Docs - suggested renames the codemod did not apply, check by hand'
                : 'Docs - suggested renames, not applied. Edit by hand, or rerun with --fix-docs'
        ],
        ['conflict', 'Conflicts - left unchanged, merge by hand'],
        ['manual', 'Not converted - check and convert by hand'],
        ['review', 'Worth a review']
    ];
    for (const [kind, title] of groups) {
        const findings = result.findings.filter(f => f.kind === kind);
        if (!findings.length) continue;
        console.log(`\n${title} (${findings.length}):`);
        for (const f of findings) {
            console.log(`  ${path.relative(cwd, f.file)}:${f.line}:${f.column} - ${f.message}`);
        }
    }

    if (renameCount && !dry) {
        console.log('\nRun your formatter (e.g. prettier) over the changed files.');
    }
}

/** Markdown files at or under a path, skipping CHANGELOG.md, node_modules and build output. */
function findMarkdownFiles(root) {
    const stat = statSync(root);
    if (stat.isFile()) return isDocFile(root) ? [root] : [];

    return readdirSync(root, {withFileTypes: true}).flatMap(entry => {
        const full = path.join(root, entry.name);
        if (entry.isDirectory()) {
            const skip =
                SKIPPED_DIRS.includes(entry.name) ||
                (entry.name.startsWith('.') && !['.claude', '.github'].includes(entry.name));
            return skip ? [] : findMarkdownFiles(full);
        }
        return entry.isFile() && isDocFile(full) ? [full] : [];
    });
}

const SKIPPED_DIRS = ['node_modules', 'build', 'dist'];

function isDocFile(file) {
    const name = path.basename(file);
    return name.toLowerCase().endsWith('.md') && name.toUpperCase() !== 'CHANGELOG.MD';
}

function resolveTsConfig(cwd, explicit) {
    const candidates = explicit ? [explicit] : ['tsconfig.json', 'client-app/tsconfig.json'];
    for (const candidate of candidates) {
        const p = path.resolve(cwd, candidate);
        if (existsSync(p)) return p;
    }
    fail(
        explicit
            ? `tsconfig not found: ${explicit}`
            : 'No tsconfig.json found in . or ./client-app - pass one with --project.'
    );
}

function fail(msg) {
    console.error(msg);
    process.exit(1);
}

// Run when invoked as a script, not when imported by the spec. Compare real paths: under pnpm,
// node_modules/@xh/hoist is a symlink, and Node resolves import.meta.url through it but not argv[1].
if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
    main(process.argv.slice(2));
}
