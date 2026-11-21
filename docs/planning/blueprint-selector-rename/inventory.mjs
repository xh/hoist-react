/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

/**
 * Inventory of the Blueprint `bp6-*` class names in hoist-react, for the selector rename. Writes
 * `class-map.md` next to this file: each class Hoist renders or styles, the `xh-*` classes written
 * beside it, and where it is styled.
 *
 * Run from the hoist-react root: `node docs/planning/blueprint-selector-rename/inventory.mjs`.
 * Re-run as the rename proceeds - a finished rename leaves the table empty.
 *
 * Proposals, strongest first: a file that renders `bp6-x` and also uses `xh-x` proposes `xh-x`. A
 * TS string that holds both `bp6-x` and exactly one `xh-y` proposes `xh-y`. Anything else needs a
 * decision, with the `xh-*` classes on the same lines as candidates.
 */
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd(),
    OUT = path.join(path.dirname(new URL(import.meta.url).pathname), 'class-map.md'),
    SKIP_DIRS = ['node_modules', '.git', 'mcp', 'docs', 'public', 'build', 'dist'],
    BASE_CSS = 'desktop/styles/BlueprintBase.css';

function walk(dir, exts, out = []) {
    for (const name of fs.readdirSync(dir)) {
        const p = path.join(dir, name),
            rel = path.relative(ROOT, p);
        if (SKIP_DIRS.includes(name)) continue;
        const st = fs.lstatSync(p);
        if (st.isSymbolicLink()) continue;
        if (st.isDirectory()) walk(p, exts, out);
        else if (exts.some(e => name.endsWith(e))) out.push(rel);
    }
    return out;
}

const add = (map, key, val) => {
    if (!map.has(key)) map.set(key, new Set());
    map.get(key).add(val);
};

//------------------------
// Rendered - string literals in TS
//------------------------
const renderedIn = new Map(), // bp6 class -> files
    pairedWith = new Map(), // bp6 class -> xh classes in the same literal
    sameName = new Map(), // bp6 class -> xh class of the same name, in a file that renders it
    sameLine = new Map(), // bp6 class -> xh classes on the same lines
    dynamic = new Map(); // template prefix -> files
// Modifiers Blueprint shares across components. Each maps to a modifier of the component it is on,
// such as `xh-button--active` or `xh-menu-item--active`, so they get no single proposal.
const GENERIC = /^bp6-(active|disabled|minimal|outlined|fill|vertical|small|large|inline|round|compact|align-(left|right)|start|end|read-only|heading|icon|text-overflow-ellipsis|intent-[a-z]+|dark)$/;
const XH_TOKEN = /(?<![\w-])xh-[a-z0-9_-]*[a-z0-9](?![\w$-])/g;
const tsFiles = walk(ROOT, ['.ts', '.tsx']).filter(f => !f.endsWith('.spec.ts'));
for (const file of tsFiles) {
    const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
    // Skip comments, then scan quoted and template literals.
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1'),
        fileXh = new Set([...code.matchAll(XH_TOKEN)].map(x => x[0]));
    for (const line of code.split('\n')) {
        if (!line.includes('bp6-')) continue;
        const lineXh = [...line.matchAll(XH_TOKEN)].map(x => x[0]);
        for (const b of line.matchAll(/(?<![\w-])bp6-[a-z0-9-]*[a-z0-9](?![\w$-])/g)) {
            lineXh.forEach(x => add(sameLine, b[0], x));
            const twin = 'xh-' + b[0].slice(4);
            if (fileXh.has(twin)) add(sameName, b[0], twin);
        }
    }
    for (const m of code.matchAll(/'([^'\n]*)'|"([^"\n]*)"|`([^`]*)`/g)) {
        const lit = m[1] ?? m[2] ?? m[3];
        if (!lit.includes('bp6-')) continue;
        for (const t of lit.matchAll(/bp6-[a-z0-9-]*\$\{/g)) add(dynamic, t[0].slice(0, -2), file);
        const bp = [...lit.matchAll(/(?<![\w-])bp6-[a-z0-9-]*[a-z0-9](?![\w$-])/g)].map(x => x[0]),
            xh = [...lit.matchAll(/(?<![\w-])xh-[a-z0-9_-]*[a-z0-9](?![\w$-])/g)].map(x => x[0]);
        for (const b of bp) {
            add(renderedIn, b, file);
            for (const x of xh) add(pairedWith, b, x);
        }
    }
}

//------------------------
// Styled - selectors in CSS and SCSS
//------------------------
const countClasses = text => {
    const ret = new Map();
    for (const m of text.matchAll(/\.(bp6-[a-z0-9-]*[a-z0-9])/g)) {
        ret.set(m[1], (ret.get(m[1]) ?? 0) + 1);
    }
    return ret;
};
// The base file is deleted once the rename is done - count nothing from it then.
const baseText = fs.existsSync(path.join(ROOT, BASE_CSS)) ? fs.readFileSync(path.join(ROOT, BASE_CSS), 'utf8') : '',
    baseCounts = countClasses(baseText),
    scssFiles = walk(ROOT, ['.scss']),
    styledIn = new Map(), // bp6 class -> scss files
    scssTotals = [];
for (const file of scssFiles) {
    const counts = countClasses(fs.readFileSync(path.join(ROOT, file), 'utf8'));
    let total = 0;
    counts.forEach((n, c) => {
        add(styledIn, c, file);
        total += n;
    });
    if (total) scssTotals.push([file, total]);
}

//------------------------
// --bp-* custom properties
//------------------------
const varUse = new Map();
for (const file of [...scssFiles, ...tsFiles]) {
    const text = fs.readFileSync(path.join(ROOT, file), 'utf8');
    for (const m of text.matchAll(/var\((--bp-[a-z0-9-]+)/g)) add(varUse, m[1], file);
}
const baseVarsDefined = new Set([...baseText.matchAll(/^\s*(--bp[a-z0-9-]*):/gm)].map(m => m[1])),
    baseVarsUsed = new Set([...baseText.matchAll(/var\((--bp[a-z0-9-]*)/g)].map(m => m[1]));

//------------------------
// Report
//------------------------
const all = new Set([...renderedIn.keys(), ...styledIn.keys(), ...baseCounts.keys()]),
    rows = [...all].sort().map(c => {
        const twin = [...(sameName.get(c) ?? [])],
            paired = [...(pairedWith.get(c) ?? [])].sort(),
            near = [...new Set([...paired, ...(sameLine.get(c) ?? [])])].sort().slice(0, 5),
            rendered = renderedIn.has(c),
            generic = GENERIC.test(c) && c !== 'bp6-dark',
            xh = generic ? [] : twin.length ? twin : paired.length === 1 ? paired : [],
            proposal = !rendered
                ? 'not rendered - drop'
                : generic
                  ? 'per component: ' + near.map(x => '`' + x + '`').join(', ')
                  : xh.length
                  ? '`' + xh[0] + '`'
                  : near.length
                    ? 'decide: ' + near.map(x => '`' + x + '`').join(', ')
                    : 'decide: no xh- class nearby';
        return {c, rendered, xh, proposal};
    }),
    fmtFiles = set => (set ? [...set].sort().map(f => f.replace(/\.(ts|tsx|scss)$/, '')) : []),
    counts = {
        total: rows.length,
        mapped: rows.filter(r => r.rendered && r.xh.length).length,
        decide: rows.filter(r => r.rendered && !r.xh.length).length,
        perComponent: rows.filter(r => r.proposal.startsWith('per component')).length,
        drop: rows.filter(r => !r.rendered).length
    };

const lines = [
    '# Blueprint class inventory',
    '',
    'Generated by `inventory.mjs` - do not edit by hand. Re-run it as the rename proceeds.',
    '',
    `${counts.total} \`bp6-*\` classes: ${counts.mapped} with a proposed \`xh-*\` name, ` +
        `${counts.decide} that need a decision (${counts.perComponent} of them generic modifiers ` +
        `mapped per component), and ${counts.drop} styled but never rendered.`,
    '',
    'Proposals are hints from where the classes are written, not decisions. Check that a proposed ' +
        '`xh-*` class sits on the same element as the `bp6-*` one - `bp6-slider`, for one, is the ' +
        'inner track, not the `xh-slider` wrapper.',
    '',
    '## Classes',
    '',
    '`Base rules` counts selectors in `BlueprintBase.css`. `Styled in` lists the other stylesheets ' +
        'that use the class. A class that is not rendered can only match app markup or Blueprint ' +
        'markup Hoist no longer makes.',
    '',
    '| Class | Proposed | Rendered in | Base rules | Styled in |',
    '|---|---|---|---|---|',
    ...rows.map(
        r =>
            `| \`${r.c}\` | ${r.proposal} | ${fmtFiles(renderedIn.get(r.c)).join('<br>')} | ` +
            `${baseCounts.get(r.c) ?? 0} | ${fmtFiles(styledIn.get(r.c)).join('<br>')} |`
    ),
    '',
    '## Classes built from templates',
    '',
    'The literal pairing above cannot see these. Map each value by hand.',
    '',
    '| Prefix | In |',
    '|---|---|',
    ...[...dynamic.keys()].sort().map(p => `| \`${p}\` | ${fmtFiles(dynamic.get(p)).join('<br>')} |`),
    '',
    '## Stylesheets with `bp6-*` selectors',
    '',
    '| File | Selectors |',
    '|---|---|',
    `| \`${BASE_CSS}\` | ${[...baseCounts.values()].reduce((a, b) => a + b, 0)} |`,
    ...scssTotals.sort((a, b) => b[1] - a[1]).map(([f, n]) => `| \`${f}\` | ${n} |`),
    '',
    '## `--bp-*` custom properties',
    '',
    `\`BlueprintBase.css\` defines ${baseVarsDefined.size} and reads ${baseVarsUsed.size}. ` +
        'Outside it:',
    '',
    '| Property | Read in |',
    '|---|---|',
    ...[...varUse.keys()].sort().map(v => `| \`${v}\` | ${fmtFiles(varUse.get(v)).join('<br>')} |`),
    ''
];
fs.writeFileSync(OUT, lines.join('\n'));
console.log(`Wrote ${path.relative(ROOT, OUT)}:`, counts);
