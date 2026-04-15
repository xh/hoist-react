#!/usr/bin/env node
/*
 * One-shot codemod for the hoist-react v85 TC39 decorator migration (xh/hoist-react#4321).
 *
 * Inserts the `accessor` keyword on every @observable / @observable.ref / @observable.shallow /
 * @observable.deep / @bindable / @bindable.ref field declaration. Handles both stylistic forms
 * used in the codebase:
 *
 *   Form A — decorator and field on same line:
 *     @observable foo = 0;            →   @observable accessor foo = 0;
 *     @observable.ref private foo;    →   @observable.ref private accessor foo;
 *     @bindable readonly = false;     →   @bindable accessor readonly = false;   (readonly = field name)
 *
 *   Form B — decorator alone on its own line, field on the next non-blank line:
 *     @observable                     →   @observable
 *     foo: T = ...;                       accessor foo: T = ...;
 *
 * Usage:
 *   node docs/planning/tc39-decorators/codemod-add-accessor.mjs [--dry] [path ...]
 *
 * Paths default to the hoist-react repo root. Files are walked recursively, scanning .ts/.tsx.
 * Skips node_modules, build/, .git/, and the spike sandbox (its own local tsconfig).
 *
 * After running, `tsc --build` is the authoritative check — any missed site surfaces as a
 * decorator-signature mismatch error.
 */
import {promises as fs} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const SELF_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SELF_DIR, '../../..');

const EXCLUDED_DIRS = new Set(['node_modules', 'build', '.git', '.idea', '.husky']);
const EXCLUDED_PREFIXES = [path.join(REPO_ROOT, 'docs/planning/tc39-decorators/spike')];

const ACCESS_MODIFIERS = '(?:public|private|protected|static|override)';
const DECORATOR = '@(?:observable(?:\\.\\w+)?|bindable(?:\\.\\w+)?)';
// Anything that can sit BETWEEN the observable/bindable decorator and the field name:
//   other decorators (e.g. `@persist`) and/or TS access modifiers, stacked same-line or wrapped.
const INTERVENING = `(?:(?:@[\\w.]+(?:\\([^)]*\\))?|${ACCESS_MODIFIERS})\\s+)*`;

// Form A: decorator + rest of line with optional intervening decorators/modifiers + field name
// + field terminator/separator.
// Capture groups:
//   1 = indent, 2 = decorator, 3 = intervening decorators/modifiers (possibly empty),
//   4 = field name, 5 = what follows ('?' | '!' | ':' | '=' | ';' | end-of-line)
const RE_FORM_A = new RegExp(
    String.raw`^(\s*)(${DECORATOR})\s+(${INTERVENING})(\w+)(\s*(?:[?!:;=]|$))`,
    'gm'
);

// Form B: decorator alone on its own line. The line is trimmed-equal to the decorator.
const RE_FORM_B_DECORATOR_LINE = new RegExp(String.raw`^\s*${DECORATOR}\s*$`);

// For the field line that follows a form-B decorator: optional modifiers + field name + terminator.
// Does NOT include the decorator itself.
const RE_FORM_B_FIELD_LINE = new RegExp(
    String.raw`^(\s*)(${INTERVENING})(\w+)(\s*(?:[?!:;=]|$))`
);

// Comment / blank line — skipped when locating the field line for Form B.
const RE_BLANK_OR_COMMENT = /^\s*(?:\/\/.*|\/\*.*|\*.*|)\s*$/;

const args = process.argv.slice(2);
const DRY = args.includes('--dry');
const paths = args.filter(a => !a.startsWith('--'));
const roots = paths.length ? paths.map(p => path.resolve(p)) : [REPO_ROOT];

let filesScanned = 0,
    filesChanged = 0,
    formACount = 0,
    formBCount = 0;

for (const root of roots) {
    await walk(root);
}

console.log(
    `\nDone — scanned ${filesScanned} files, modified ${filesChanged}. ` +
        `Inserted accessor: form A=${formACount}, form B=${formBCount}.` +
        (DRY ? ' (dry run — no files written)' : '')
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
    filesScanned++;
    const original = await fs.readFile(filePath, 'utf8');
    let content = original;
    let localFormA = 0,
        localFormB = 0;

    // Form A: inline decorator + field on same line.
    content = content.replace(
        RE_FORM_A,
        (_match, indent, decorator, modifiers, fieldName, tail) => {
            localFormA++;
            const mods = modifiers ? modifiers : '';
            return `${indent}${decorator} ${mods}accessor ${fieldName}${tail}`;
        }
    );

    // Form B: decorator alone, then field on next non-blank/non-comment line.
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
        if (!RE_FORM_B_DECORATOR_LINE.test(lines[i])) continue;
        // Find next meaningful line.
        let j = i + 1;
        while (j < lines.length && RE_BLANK_OR_COMMENT.test(lines[j])) j++;
        if (j >= lines.length) continue;
        const field = lines[j];
        // Skip if already migrated (accessor keyword present).
        if (/\baccessor\b/.test(field)) continue;
        const m = RE_FORM_B_FIELD_LINE.exec(field);
        if (!m) continue;
        const [, indent, modifiers, fieldName, tail] = m;
        const mods = modifiers ? modifiers : '';
        lines[j] = `${indent}${mods}accessor ${fieldName}${tail}` + field.slice(m[0].length);
        localFormB++;
    }
    content = lines.join('\n');

    if (content !== original) {
        filesChanged++;
        formACount += localFormA;
        formBCount += localFormB;
        if (!DRY) await fs.writeFile(filePath, content);
        console.log(`  ${path.relative(REPO_ROOT, filePath)} — form A=${localFormA}, form B=${localFormB}`);
    }
}
