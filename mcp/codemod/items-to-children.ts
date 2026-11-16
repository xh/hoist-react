/**
 * Codemod that renames the legacy `item` / `items` element spec keys to the standard React
 * `children` key.
 *
 * `items:` is also a common data key (menus, column groups, options), so a text search cannot
 * tell the two apart. This pass uses the TypeScript type checker instead. It renames a key only
 * when the checker resolves it to the `item` or `items` member of Hoist's `ElementSpec` type -
 * the case for every object literal passed to an element factory or `createElement`, or typed
 * as an `ElementSpec`. Reads and writes of those members on a typed spec (`spec.items`) and
 * destructured spec keys are renamed too.
 *
 * The pass collects edits first and applies them as plain text replacements afterwards, so
 * formatting and comments are untouched. It reports what it could not convert safely:
 *  - specs built elsewhere as untyped objects and then passed to a factory
 *  - object literals that look like specs but whose call has no type information
 *  - literals that would end up with two children keys
 */
import {type Project, type SourceFile, ts} from 'ts-morph';

/** Legacy spec keys this codemod converts. */
export const LEGACY_KEYS: readonly string[] = ['item', 'items'];

/** A text replacement within one source file. */
export interface Edit {
    start: number;
    end: number;
    text: string;
}

/**
 * A location the codemod reports.
 *  - `review` - a rename outside an object literal (property access or destructuring). Correct
 *    by type, but worth a look.
 *  - `manual` - a likely spec the codemod could not convert. Convert it by hand.
 *  - `conflict` - a spec that already has another children key. Left unchanged.
 */
export interface Finding {
    kind: 'review' | 'manual' | 'conflict';
    file: string;
    line: number;
    column: number;
    message: string;
}

export interface FileEdits {
    file: string;
    edits: Edit[];
}

export interface CodemodResult {
    files: FileEdits[];
    renameCount: number;
    findings: Finding[];
}

export interface CodemodOptions {
    /**
     * Limit edits to source files under these absolute paths - typically the project folder.
     * Files outside them, e.g. a hoist-react checkout mapped in via `paths`, are still type
     * checked but never edited.
     */
    paths?: string[];
}

/**
 * Collect all edits for the project's source files. Does not modify the project or the disk -
 * see {@link applyEdits} and {@link writeEdits}.
 */
export function collectItemsToChildren(project: Project, opts: CodemodOptions = {}): CodemodResult {
    const checker = project.getTypeChecker().compilerObject,
        result: CodemodResult = {files: [], renameCount: 0, findings: []};

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
export function applyEdits(text: string, edits: Edit[]): string {
    const sorted = [...edits].sort((a, b) => b.start - a.start);
    let ret = text;
    for (const {start, end, text: replacement} of sorted) {
        ret = ret.slice(0, start) + replacement + ret.slice(end);
    }
    return ret;
}

/** Apply a result's edits to the files on disk. */
export function writeEdits(project: Project, result: CodemodResult): void {
    const fs = project.getFileSystem();
    for (const {file, edits} of result.files) {
        const text = fs.readFileSync(file);
        fs.writeFileSync(file, applyEdits(text, edits));
    }
}

//------------------------
// Implementation
//------------------------
function selectSourceFiles(project: Project, paths: string[] | undefined): SourceFile[] {
    const prefixes = paths?.map(toPosix);
    return project.getSourceFiles().filter(sf => {
        const path = sf.getFilePath();
        if (sf.isDeclarationFile() || path.includes('/node_modules/')) return false;
        return !prefixes?.length || prefixes.some(p => path === p || path.startsWith(p + '/'));
    });
}

function processFile(sf: SourceFile, checker: ts.TypeChecker, result: CodemodResult): Edit[] {
    const file = sf.compilerNode,
        filePath = sf.getFilePath(),
        edits: Edit[] = [];

    const report = (kind: Finding['kind'], node: ts.Node, message: string) => {
        const {line, character} = file.getLineAndCharacterOfPosition(node.getStart(file));
        result.findings.push({
            kind,
            file: filePath,
            line: line + 1,
            column: character + 1,
            message
        });
    };

    const visit = (node: ts.Node) => {
        if (ts.isObjectLiteralExpression(node)) {
            processObjectLiteral(node);
        } else if (ts.isPropertyAccessExpression(node) && isLegacyKey(node.name.text)) {
            processPropertyAccess(node);
        } else if (ts.isObjectBindingPattern(node)) {
            processBindingPattern(node);
        } else if (ts.isCallExpression(node)) {
            processCallArgs(node);
        }
        ts.forEachChild(node, visit);
    };

    // Object literals - the common case, e.g. `panel({title, items: [...]})`.
    const processObjectLiteral = (obj: ts.ObjectLiteralExpression) => {
        const legacyProps = obj.properties.filter(
            p =>
                (ts.isPropertyAssignment(p) || ts.isShorthandPropertyAssignment(p)) &&
                isLegacyKey(propName(p))
        ) as Array<ts.PropertyAssignment | ts.ShorthandPropertyAssignment>;
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
            isElementSpecMember(contextualProperty(contextualType, propName(p)!))
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
            idx = obj.properties.indexOf(prop);
        const laterSpreads = obj.properties.filter(
            (p, i): p is ts.SpreadAssignment => i > idx && ts.isSpreadAssignment(p)
        );
        if (laterSpreads.some(p => mayHaveLegacyKey(checker.getTypeAtLocation(p.expression)))) {
            report(
                'review',
                prop,
                `Spread follows \`${propName(prop)}\` - a legacy \`item\` or \`items\` in the spread no longer overrides it, as \`children\` takes precedence.`
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
    const processPropertyAccess = (node: ts.PropertyAccessExpression) => {
        if (!isElementSpecMember(checker.getSymbolAtLocation(node.name))) return;
        edits.push(replace(node.name, 'children'));
        report('review', node.name, `Renamed \`.${node.name.text}\` to \`.children\`.`);
    };

    // Destructured specs, e.g. `const {items, ...rest} = spec`.
    const processBindingPattern = (pattern: ts.ObjectBindingPattern) => {
        const sourceType = checker.getTypeAtLocation(pattern),
            keyOf = (el: ts.BindingElement) => {
                const keyNode = el.propertyName ?? el.name;
                return ts.isIdentifier(keyNode) ? keyNode : null;
            },
            specElements = pattern.elements.filter(el => {
                const keyNode = keyOf(el);
                return (
                    !el.dotDotDotToken &&
                    keyNode &&
                    isLegacyKey(keyNode.text) &&
                    isElementSpecMember(contextualProperty(sourceType, keyNode.text))
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
            const keyNode = keyOf(el)!;
            edits.push(
                el.propertyName
                    ? replace(el.propertyName, 'children')
                    : replace(el.name, `children: ${keyNode.text}`)
            );
            report('review', keyNode, `Renamed destructured \`${keyNode.text}\` to \`children\`.`);
        }
    };

    // Specs built elsewhere, e.g. `const spec = {items}; panel(spec)` or `panel({...spec})`.
    const processCallArgs = (call: ts.CallExpression) => {
        for (const arg of call.arguments) {
            const sources: ts.Expression[] = [];
            if (ts.isObjectLiteralExpression(arg)) {
                arg.properties.forEach(p => {
                    if (ts.isSpreadAssignment(p)) sources.push(p.expression);
                });
                if (!sources.length) continue;
                if (!isSpecType(checker.getContextualType(arg))) continue;
            } else {
                if (!isSpecType(checker.getContextualType(arg))) continue;
                sources.push(arg);
            }

            for (const src of sources) {
                const srcType = checker.getTypeAtLocation(src);
                for (const key of LEGACY_KEYS) {
                    const prop = contextualProperty(srcType, key);
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

    const isSpecType = (type: ts.Type | undefined): boolean =>
        !!type &&
        !(type.flags & ts.TypeFlags.Any) &&
        LEGACY_KEYS.some(key => isElementSpecMember(contextualProperty(type, key)));

    const replace = (node: ts.Node, text: string): Edit => ({
        start: node.getStart(file),
        end: node.getEnd(),
        text
    });

    visit(file);
    return dedupe(edits);
}

/** True if the type is a React element, or an array of them. */
function isElementLike(type: ts.Type): boolean {
    const types = type.isUnion() ? type.types : [type];
    return types.some(t => {
        const elementType = t.getNumberIndexType() ?? t;
        return ['type', 'props', 'key'].every(name => !!elementType.getProperty(name));
    });
}

/** True if a spread of this type could carry a legacy `item` or `items` key. */
function mayHaveLegacyKey(type: ts.Type): boolean {
    if (type.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) return true;
    return LEGACY_KEYS.some(key => !!contextualProperty(type, key));
}

/** Look up a property on a type, checking each member of a union. */
function contextualProperty(type: ts.Type, name: string): ts.Symbol | undefined {
    const types = type.isUnion() ? type.types : [type];
    for (const t of types) {
        const prop = t.getProperty(name);
        if (prop) return prop;
    }
    return undefined;
}

/** True if the symbol is the `item` or `items` member declared by Hoist's `ElementSpec` type. */
function isElementSpecMember(symbol: ts.Symbol | undefined): boolean {
    if (!symbol || !isLegacyKey(symbol.name)) return false;
    return (symbol.declarations ?? []).some(decl => {
        for (let n: ts.Node | undefined = decl.parent; n; n = n.parent) {
            if (ts.isTypeAliasDeclaration(n)) return n.name.text === 'ElementSpec';
        }
        return false;
    });
}

/**
 * True if the node is an argument to a call of a bare identifier, e.g. `panel({...})`. Factories
 * are called this way, while untyped method calls like `rows.push({...})` hold data.
 */
function isBareCallArgument(node: ts.Node): boolean {
    let n = node.parent;
    while (n && (ts.isParenthesizedExpression(n) || ts.isConditionalExpression(n))) n = n.parent;
    return !!n && ts.isCallExpression(n) && ts.isIdentifier(n.expression);
}

function propName(p: ts.ObjectLiteralElementLike): string | undefined {
    const {name} = p;
    if (!name) return undefined;
    if (ts.isIdentifier(name) || ts.isStringLiteral(name)) return name.text;
    return undefined;
}

function isLegacyKey(name: string | undefined): boolean {
    return !!name && LEGACY_KEYS.includes(name);
}

function dedupe(edits: Edit[]): Edit[] {
    const seen = new Set<number>();
    return edits.filter(e => {
        if (seen.has(e.start)) return false;
        seen.add(e.start);
        return true;
    });
}

function toPosix(p: string): string {
    return p.replace(/\\/g, '/').replace(/\/$/, '');
}
