#!/usr/bin/env node
/*
 * One-shot codemod for the hoist-react v88 MobX 7 upgrade.
 *
 * MobX 7 replaced its dotted annotation and comparer namespaces with named exports, and Hoist
 * follows suit for `@bindable.ref`. Rewrites every occurrence and fixes up the matching import
 * from '@xh/hoist/mobx'. Imports from 'mobx' directly are redirected to '@xh/hoist/mobx' first
 * (app code should always import MobX through Hoist) and merged into an existing Hoist import.
 * A name Hoist does not re-export is left in place with a warning - `tsc` will flag it.
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
 * Import cleanup is textual: only the first import from each module is considered, and a base
 * name such as `observable` is dropped from the import only
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
const RE_IMPORT = /^import (?:type )?\{([^}]*)\} from '(@xh\/hoist\/mobx)';/m;
const RE_MOBX_IMPORT = /^import (?:type )?\{([^}]*)\} from 'mobx';\n?/m;
// Everything @xh/hoist/mobx re-exports - names outside this list stay on their 'mobx' import.
const HOIST_EXPORTS = new Set([
    'action', 'actionBound', 'autorun', 'bindable', 'bindableRef', 'compareDefault',
    'compareIdentity', 'compareShallow', 'compareStructural', 'computed', 'computedStruct',
    'extendObservable', 'isComputedProp', 'isObservableProp', 'observable', 'observableDeep',
    'observableRef', 'observableShallow', 'observableStruct', 'observer', 'reaction', 'runInAction',
    'toJS', 'untracked', 'when', 'IAutorunOptions', 'IEqualsComparer', 'IReactionDisposer',
    'IReactionOptions'
]);

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
    content = redirectMobxImport(content, filePath);
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
        names.sort((a, b) => a.localeCompare(b, 'en', {sensitivity: 'base'}));
        content =
            content.slice(0, m.index) +
            `import {${names.join(', ')}} from '${m[2]}';` +
            content.slice(m.index + m[0].length);
    } else if (Object.values(RENAMES).some(to => new RegExp(`\\b${to}\\b`).test(content))) {
        console.log(`  WARN no mobx import found to update: ${path.relative(REPO_ROOT, filePath)}`);
    }

    filesChanged++;
    renameCount += localCount;
    if (!DRY) await fs.writeFile(filePath, content);
    console.log(`  ${path.relative(REPO_ROOT, filePath)} — ${localCount} renamed`);
}

/** Move names imported from 'mobx' onto '@xh/hoist/mobx', merging into an existing Hoist import. */
function redirectMobxImport(content, filePath) {
    if (path.dirname(filePath) === path.join(REPO_ROOT, 'mobx')) return content;
    const mm = RE_MOBX_IMPORT.exec(content);
    if (!mm) return content;

    const rest = content.slice(0, mm.index) + content.slice(mm.index + mm[0].length),
        isUsed = name => new RegExp(`\\b${name}\\b`).test(rest),
        names = mm[1]
            .split(',')
            .map(n => n.trim())
            .filter(n => n && !(OLD_ROOTS.includes(n) && !isUsed(n))),
        moved = names.filter(n => HOIST_EXPORTS.has(n.replace(/^type /, ''))),
        kept = names.filter(n => !moved.includes(n));
    // Renamed targets need a home too, in case this file has no Hoist import yet.
    for (const to of Object.values(RENAMES)) {
        if (isUsed(to) && !moved.includes(to)) moved.push(to);
    }
    if (kept.length) {
        console.log(
            `  WARN not re-exported by @xh/hoist/mobx, left on 'mobx': ${kept.join(', ')} ` +
                `(${path.relative(REPO_ROOT, filePath)})`
        );
    }
    if (!moved.length) {
        // Nothing to redirect: keep the line as-is, or drop it if every name was pruned.
        return names.length
            ? content
            : content.slice(0, mm.index) + content.slice(mm.index + mm[0].length);
    }

    const keptLine = kept.length ? `import {${kept.join(', ')}} from 'mobx';\n` : '';
    content = content.slice(0, mm.index) + keptLine + content.slice(mm.index + mm[0].length);

    const hm = RE_IMPORT.exec(content);
    if (hm) {
        const merged = [...hm[1].split(',').map(n => n.trim()).filter(Boolean)];
        for (const n of moved) if (!merged.includes(n)) merged.push(n);
        return (
            content.slice(0, hm.index) +
            `import {${merged.join(', ')}} from '@xh/hoist/mobx';` +
            content.slice(hm.index + hm[0].length)
        );
    }
    // No Hoist import yet - put one where the 'mobx' import was.
    const at = mm.index + keptLine.length;
    return content.slice(0, at) + `import {${moved.join(', ')}} from '@xh/hoist/mobx';\n` + content.slice(at);
}
