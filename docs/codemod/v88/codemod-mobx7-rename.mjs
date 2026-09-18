#!/usr/bin/env node
/*
 * One-shot codemod for the hoist-react v88 MobX 7 upgrade.
 *
 * MobX 7 replaced its dotted annotation and comparer namespaces with named exports, and Hoist
 * follows suit for `@bindable.ref`. Rewrites every occurrence and fixes up the matching import
 * from 'mobx' or '@xh/hoist/mobx':
 *
 *   @observable.ref      →  @observableRef          comparer.structural  →  compareStructural
 *   @observable.shallow  →  @observableShallow      comparer.shallow     →  compareShallow
 *   @observable.deep     →  @observableDeep         comparer.identity    →  compareIdentity
 *   @observable.struct   →  @observableStruct       comparer.default     →  compareDefault
 *   @computed.struct     →  @computedStruct         action.bound         →  actionBound
 *   @bindable.ref        →  @bindableRef            flow.bound           →  flowBound
 *
 * Usage:
 *   node docs/codemod/v88/codemod-mobx7-rename.mjs [--dry] [path ...]
 *
 * Paths default to the hoist-react repo root. Files are walked recursively, scanning .ts/.tsx.
 * Skips node_modules, build/, and .git/. Run it before or after codemod-add-accessor.mjs - that
 * codemod accepts both the dotted and the renamed forms.
 *
 * Import cleanup is textual: a base name such as `observable` is dropped from the import only
 * when the file no longer mentions it anywhere, so a JSDoc reference can leave it behind.
 * `eslint` (no-unused-vars) and `tsc` are the authoritative checks after running.
 */
import {promises as fs} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const SELF_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SELF_DIR, '../../..');

const EXCLUDED_DIRS = new Set(['node_modules', 'build', '.git', '.idea', '.husky']);

const RENAMES = {
    'observable.ref': 'observableRef',
    'observable.shallow': 'observableShallow',
    'observable.deep': 'observableDeep',
    'observable.struct': 'observableStruct',
    'computed.struct': 'computedStruct',
    'action.bound': 'actionBound',
    'flow.bound': 'flowBound',
    'comparer.identity': 'compareIdentity',
    'comparer.default': 'compareDefault',
    'comparer.structural': 'compareStructural',
    'comparer.shallow': 'compareShallow',
    'bindable.ref': 'bindableRef'
};
const OLD_ROOTS = ['observable', 'computed', 'action', 'flow', 'comparer', 'bindable'];
const RE_IMPORT = /^import \{([^}]*)\} from '(mobx|@xh\/hoist\/mobx)';/m;

const args = process.argv.slice(2);
const DRY = args.includes('--dry');
const paths = args.filter(a => !a.startsWith('--'));
const roots = paths.length ? paths.map(p => path.resolve(p)) : [REPO_ROOT];

let filesScanned = 0,
    filesChanged = 0,
    renameCount = 0;

for (const root of roots) {
    await walk(root);
}

console.log(
    `\nDone — scanned ${filesScanned} files, modified ${filesChanged}, ` +
        `renamed ${renameCount} occurrences.` +
        (DRY ? ' (dry run — no files written)' : '')
);

async function walk(p) {
    const stat = await fs.stat(p).catch(() => null);
    if (!stat) return;
    if (stat.isDirectory()) {
        if (EXCLUDED_DIRS.has(path.basename(p))) return;
        const entries = await fs.readdir(p);
        await Promise.all(entries.map(e => walk(path.join(p, e))));
    } else if (stat.isFile() && /\.tsx?$/.test(p)) {
        await processFile(p);
    }
}

async function processFile(filePath) {
    filesScanned++;
    const original = await fs.readFile(filePath, 'utf8');
    let content = original,
        localCount = 0;

    for (const [from, to] of Object.entries(RENAMES)) {
        const re = new RegExp(`\\b${from.replace('.', '\\.')}\\b`, 'g');
        content = content.replace(re, () => {
            localCount++;
            return to;
        });
    }
    if (content === original) return;

    const m = RE_IMPORT.exec(content);
    if (m) {
        const rest = content.slice(0, m.index) + content.slice(m.index + m[0].length),
            isUsed = name => new RegExp(`\\b${name}\\b`).test(rest),
            names = m[1]
                .split(',')
                .map(n => n.trim())
                .filter(n => n && !(OLD_ROOTS.includes(n) && !isUsed(n)));
        for (const to of Object.values(RENAMES)) {
            if (isUsed(to) && !names.includes(to)) names.push(to);
        }
        content =
            content.slice(0, m.index) +
            `import {${names.join(', ')}} from '${m[2]}';` +
            content.slice(m.index + m[0].length);
    } else {
        console.log(`  WARN no mobx import found to update: ${path.relative(REPO_ROOT, filePath)}`);
    }

    filesChanged++;
    renameCount += localCount;
    if (!DRY) await fs.writeFile(filePath, content);
    console.log(`  ${path.relative(REPO_ROOT, filePath)} — ${localCount} renamed`);
}
