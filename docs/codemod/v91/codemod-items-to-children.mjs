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
 *   - review   - a rename outside a plain object literal, or a later spread that could carry
 *                `children` and so override the renamed key. Correct by type, but worth a look.
 *
 * Upgrade the app to hoist-react v91 or later first. Older versions pass `children` through as a
 * plain prop, without the handling described above.
 *
 * Usage (from the app root):
 *   node client-app/node_modules/@xh/hoist/docs/codemod/v91/codemod-items-to-children.mjs \
 *       [--dry] [--project tsconfig.json] [path ...]
 *
 * The tsconfig defaults to ./tsconfig.json, then ./client-app/tsconfig.json. Paths limit the
 * files edited and default to the folder holding the tsconfig. Files outside them - including
 * node_modules and a hoist-react checkout mapped in via `paths` - are type checked, never edited.
 */
import {existsSync} from 'node:fs';
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
            result.renameCount += edits.length;
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

//------------------------
// Implementation
//------------------------
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
            laterSpreads = obj.properties.filter((p, i) => i > idx && ts.isSpreadAssignment(p));
        if (laterSpreads.some(p => mayCarryChildren(checker.getTypeAtLocation(p.expression)))) {
            report(
                'review',
                prop,
                `A spread after \`${propName(prop)}\` can carry \`children\`, which now overrides it. Move \`children\` after the spread if it should win.`
            );
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
    return dedupe(edits);
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
        explicitTsConfig = null;
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === '--dry') {
            dry = true;
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

    if (!dry) {
        const fs = project.getFileSystem();
        for (const {file, edits} of result.files) {
            fs.writeFileSync(file, applyEdits(fs.readFileSync(file), edits));
        }
    }

    console.log(
        `${dry ? 'Would rename' : 'Renamed'} ${result.renameCount} key(s) in ${result.files.length} file(s).`
    );
    if (dry) {
        for (const {file} of result.files) console.log(`  ${path.relative(cwd, file)}`);
    }

    const groups = [
        ['conflict', 'Conflicts - left unchanged, merge by hand'],
        ['manual', 'Not converted - check and convert by hand'],
        ['review', 'Renamed - worth a review']
    ];
    for (const [kind, title] of groups) {
        const findings = result.findings.filter(f => f.kind === kind);
        if (!findings.length) continue;
        console.log(`\n${title} (${findings.length}):`);
        for (const f of findings) {
            console.log(`  ${path.relative(cwd, f.file)}:${f.line}:${f.column} - ${f.message}`);
        }
    }

    if (result.renameCount && !dry) {
        console.log('\nRun your formatter (e.g. prettier) over the changed files.');
    }
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

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    main(process.argv.slice(2));
}
