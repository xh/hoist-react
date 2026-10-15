#!/usr/bin/env node
/*
 * Phase 4 codemod — deletes every `makeObservable(this);` call, drops constructors that this
 * emptied down to a one-line pass-through `super(...)` (args are the constructor's own params,
 * bare or spread, ± blank lines), and trims `makeObservable` from any import that no longer
 * references it.
 *
 * Scope: hoist-react .ts/.tsx.
 *
 * Leaves JSDoc examples of `makeObservable(this)` intact — those must be updated by hand since
 * they're illustrating a pattern, not calling the function.
 */
import {promises as fs} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const SELF_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SELF_DIR, '../../..');
const EXCLUDED_DIRS = new Set(['node_modules', 'build', '.git', '.idea', '.husky']);
const EXCLUDED_PREFIXES = [];
const REMOVED_MARKER = '\u0000makeObservable-removed\u0000';

const args = process.argv.slice(2);
const DRY = args.includes('--dry');
const paths = args.filter(a => !a.startsWith('--'));
const roots = paths.length ? paths.map(p => path.resolve(p)) : [REPO_ROOT];

let filesScanned = 0,
    filesChanged = 0,
    callsRemoved = 0,
    constructorsRemoved = 0,
    importsTrimmed = 0;

for (const root of roots) {
    await walk(root);
}

console.log(
    `\nDone — scanned ${filesScanned} files, modified ${filesChanged}. ` +
        `Removed ${callsRemoved} makeObservable(this) calls, ` +
        `${constructorsRemoved} empty constructors, ` +
        `trimmed makeObservable from ${importsTrimmed} imports.` +
        (DRY ? ' (dry run)' : '')
);

async function walk(p) {
    const stat = await fs.stat(p).catch(() => null);
    if (!stat) return;
    if (stat.isDirectory()) {
        const base = path.basename(p);
        if (EXCLUDED_DIRS.has(base)) return;
        if (EXCLUDED_PREFIXES.some(pref => p === pref || p.startsWith(pref + path.sep))) return;
        const entries = await fs.readdir(p);
        await Promise.all(entries.map(e => walk(path.join(p, e))));
    } else if (stat.isFile() && /\.tsx?$/.test(p)) {
        await processFile(p);
    }
}

async function processFile(filePath) {
    // Never mutate mobx/overrides.ts (deleted in Phase 5) or our spike sandbox.
    if (filePath.endsWith('mobx/overrides.ts')) return;

    filesScanned++;
    const original = await fs.readFile(filePath, 'utf8');
    let lines = original.split('\n');
    let removedCalls = 0,
        removedConstructors = 0,
        trimmedImports = 0;

    // 1) Replace lines that are only `makeObservable(this);` (plus optional whitespace) with a
    //    marker so step 2 can tell which constructors this codemod emptied.
    const callLine = /^\s*makeObservable\(this\);?\s*$/;
    lines = lines.map(line => {
        if (!callLine.test(line)) return line;
        removedCalls++;
        return REMOVED_MARKER;
    });

    // 2) Drop constructors emptied by step 1. Match:
    //       constructor(<anything until close-paren>) {
    //           super(<args on one line>);
    //       }
    //   with marker and blank lines anywhere in the body, then keep only pass-through supers whose
    //   args are the constructor's own params (bare or spread). Anything else stays.
    const text = lines.join('\n');
    const filler = `(?:[ \\t]*(?:${REMOVED_MARKER})?[ \\t]*\\n)*`;
    const reEmptyCtor = new RegExp(
        `^([ \\t]*)constructor\\s*\\(([^)]*)\\)\\s*\\{[ \\t]*\\n${filler}[ \\t]*super\\s*\\(([^()\\n]*)\\);[ \\t]*\\n${filler}[ \\t]*\\}[ \\t]*\\n?`,
        'gm'
    );
    const trimmedCtor = text
        .replace(reEmptyCtor, (match, indent, params, superArgs) => {
            if (!match.includes(REMOVED_MARKER) || !isPassThrough(params, superArgs)) return match;
            removedConstructors++;
            return '';
        })
        .split('\n')
        .filter(l => l !== REMOVED_MARKER)
        .join('\n');
    lines = trimmedCtor.split('\n');

    // 3) Trim `makeObservable` from imports when no longer used in the file.
    const stillUsesMO =
        /\bmakeObservable\b/.test(trimmedCtor.replace(/import\s*{[^}]*}\s*from\s*['"][^'"]+['"];?/g, ''));
    if (!stillUsesMO) {
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (!/from\s*['"]@xh\/hoist\/mobx['"]/.test(line)) continue;
            if (!/\bmakeObservable\b/.test(line)) continue;
            // Remove makeObservable from the braces, preserving other named imports.
            const m = /^(.*import\s*\{)([^}]*)(\}\s*from\s*['"]@xh\/hoist\/mobx['"].*)$/.exec(line);
            if (!m) continue;
            const [, prefix, names, suffix] = m;
            const cleaned = names
                .split(',')
                .map(s => s.trim())
                .filter(s => s && s !== 'makeObservable')
                .join(', ');
            if (cleaned) {
                lines[i] = `${prefix}${cleaned ? ' ' + cleaned + ' ' : ''}${suffix}`;
            } else {
                // Entire import becomes empty — drop the whole line.
                lines[i] = null;
            }
            trimmedImports++;
        }
        lines = lines.filter(l => l !== null);
    }

    const modified = lines.join('\n');
    if (modified !== original) {
        filesChanged++;
        callsRemoved += removedCalls;
        constructorsRemoved += removedConstructors;
        importsTrimmed += trimmedImports;
        if (!DRY) await fs.writeFile(filePath, modified);
        console.log(
            `  ${path.relative(process.cwd(), filePath)} — calls=${removedCalls}, ctors=${removedConstructors}, imports=${trimmedImports}`
        );
    }
}

// True if every super arg is a bare identifier, or spread of one, naming a constructor param.
function isPassThrough(params, superArgs) {
    const names = new Set(splitTopLevel(params).map(paramName).filter(Boolean));
    return splitTopLevel(superArgs).every(a => {
        const m = /^(?:\.\.\.)?([A-Za-z_$][\w$]*)$/.exec(a);
        return m && names.has(m[1]);
    });
}

// `config: Foo`, `private x = 1`, `...args: any[]`, `y?: Bar` -> config, x, args, y
function paramName(param) {
    const m = /^(?:(?:public|private|protected|readonly|override)\s+)*(?:\.\.\.)?([A-Za-z_$][\w$]*)/.exec(
        param
    );
    return m?.[1];
}

// Split on commas not nested inside brackets, trimming and dropping empties.
function splitTopLevel(str) {
    const parts = [];
    let depth = 0,
        cur = '';
    for (const ch of str) {
        if ('([{<'.includes(ch)) depth++;
        else if (')]}>'.includes(ch)) depth--;
        if (ch === ',' && depth === 0) {
            parts.push(cur);
            cur = '';
        } else cur += ch;
    }
    parts.push(cur);
    return parts.map(s => s.trim()).filter(Boolean);
}
