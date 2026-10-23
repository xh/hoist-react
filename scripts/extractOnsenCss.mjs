/*
 * Extract the Onsen UI CSS rules that Hoist's mobile components use into Hoist-owned stylesheets.
 *
 * Reads `onsenui/css/onsenui.css` and `onsenui/css/onsen-css-components.css` from node_modules and
 * writes filtered copies. A rule survives when at least one of its selectors can match an element
 * that a Hoist mobile component renders through Onsen: every class and custom-element tag in the
 * selector names an Onsen component Hoist uses (`KEPT_FAMILIES`, `KEPT_TAGS`) or a plain state
 * class Onsen toggles on those elements (`STATE_CLASSES`), or it names no class or Onsen tag at all
 * (Onsen's global reset of `html`, `body`, headings and inputs). Selectors naming any other Onsen
 * component (`.fab`, `.range`, `ons-splitter-side`, ...) are removed from the rule, and a rule with
 * no selector left is dropped, as are `:root` variables, `@keyframes` and `@media` blocks that no
 * kept rule references.
 *
 *   node scripts/extractOnsenCss.mjs            # rewrite mobile/styles/onsen/*.scss
 *   node scripts/extractOnsenCss.mjs --check    # exit 1 if the checked-in files differ (CI)
 *   node scripts/extractOnsenCss.mjs --report   # also print every dropped selector, by component
 */
import {createRequire} from 'node:module';
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const require = createRequire(import.meta.url),
    postcss = require('postcss'),
    prettier = require('prettier');

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'),
    onsenCss = join(root, 'node_modules/onsenui/css'),
    onsenVersion = require(join(root, 'node_modules/onsenui/package.json')).version,
    outDir = join(root, 'mobile/styles/onsen'),
    report = process.argv.includes('--report'),
    check = process.argv.includes('--check');

let upToDate = true;

// Onsen components Hoist renders, by the class family Onsen stamps on them. A class belongs to a
// family by its BEM block: `tabbar--top__content` and `tabbar__button` are both `tabbar`.
const KEPT_FAMILIES = new Set([
    // Onsen elements wrapped in kit/onsen and rendered by mobile components.
    'button',
    'checkbox',
    'switch',
    'text-input',
    'search-input',
    'list-item',
    'list',
    'page',
    'page-with-bottom-toolbar',
    'dialog',
    'dialog-container',
    'dialog-mask',
    'toast',
    'tabbar',
    // Internals those elements render: the tabbar's swiper and the ripple a button may add.
    'ons-tabbar',
    'ons-swiper',
    'ons-swiper-target',
    'ons-swiper-blocker',
    'ons-swiper-tabbar',
    'ons-ios-scroll-fix',
    'ripple'
]);

// Custom-element tags for the same components.
const KEPT_TAGS = new Set([
    'ons-button',
    'ons-checkbox',
    'ons-switch',
    'ons-input',
    'ons-search-input',
    'ons-list-item',
    'ons-list',
    'ons-page',
    'ons-dialog',
    'ons-toast',
    'ons-tab',
    'ons-tabbar',
    'ons-gesture-detector',
    'ons-ripple'
]);

// Plain (non-BEM) classes Onsen toggles on kept elements. Only kept in combination with a kept
// family or tag - a selector made of these alone is dropped.
const STATE_CLASSES = new Set([
    'active',
    'swiping',
    'content-swiping',
    'overflow-visible',
    'left',
    'center',
    'right',
    'top'
]);

const dropped = new Map(); // family or tag -> Set of dropped selectors

function familyOf(cls) {
    return cls.split('__')[0].split('--')[0];
}

/** Tokens a selector depends on: ['.class', 'tag'] pairs for each class and ons-* tag it names. */
function tokensOf(selector) {
    const classes = [...selector.matchAll(/\.([A-Za-z0-9_-]+)/g)].map(m => m[1]),
        tags = [...selector.matchAll(/(?:^|[\s>+~(,])(ons-[a-z-]+)/g)].map(m => m[1]);
    return {classes, tags};
}

function selectorIsKept(selector) {
    const {classes, tags} = tokensOf(selector);
    // No class or Onsen tag at all: a global reset rule such as `body` or `input:focus`. Keep -
    // Hoist's mobile layout has always rendered on top of it.
    if (!classes.length && !tags.length) return true;
    const blockers = [
        ...classes.filter(c => !KEPT_FAMILIES.has(familyOf(c)) && !STATE_CLASSES.has(c)),
        ...tags.filter(t => !KEPT_TAGS.has(t))
    ];
    if (blockers.length) {
        blockers.forEach(b => {
            const key = tags.includes(b) ? b : familyOf(b);
            if (!dropped.has(key)) dropped.set(key, new Set());
            dropped.get(key).add(selector);
        });
        return false;
    }
    // Only state classes and no kept family or tag - e.g. `.active` alone.
    return classes.some(c => KEPT_FAMILIES.has(familyOf(c))) || tags.length > 0;
}

function splitSelectors(selector) {
    // Onsen's selector lists never nest commas inside :not() etc., so a plain split is safe.
    return selector
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
}

/** Filter the rules in a container in place. Returns true when something survived. */
function filterContainer(container) {
    let kept = false;
    container.each(node => {
        if (node.type === 'rule') {
            if (node.selector.startsWith(':root')) {
                kept = true; // pruned later, once var references are known
                return;
            }
            const selectors = splitSelectors(node.selector).filter(selectorIsKept);
            if (selectors.length) {
                node.selector = selectors.join(',\n');
                kept = true;
            } else {
                node.remove();
            }
        } else if (node.type === 'atrule') {
            if (node.name === 'import') {
                node.remove(); // Onsen's icon fonts - Hoist renders its own SVG icons.
            } else if (/keyframes$/.test(node.name)) {
                kept = true; // pruned later, once animation references are known
            } else if (node.nodes) {
                if (filterContainer(node)) kept = true;
                else node.remove();
            } else {
                node.remove();
            }
        } else {
            kept = true;
        }
    });
    return kept;
}

function collectVarRefs(value, into) {
    for (const m of value.matchAll(/var\(\s*(--[A-Za-z0-9_-]+)/g)) into.add(m[1]);
}

function pruneRootVarsAndKeyframes(css) {
    // 1) Variables referenced by kept declarations, following references between variables.
    const rootRules = [],
        rootDecls = new Map(),
        usedVars = new Set(),
        usedAnimations = new Set();
    css.walkRules(rule => {
        if (rule.selector.startsWith(':root')) {
            rootRules.push(rule);
            rule.walkDecls(d => rootDecls.set(d.prop, d.value));
        } else {
            rule.walkDecls(d => {
                collectVarRefs(d.value, usedVars);
                if (/animation(-name)?$/.test(d.prop)) {
                    d.value.split(',').forEach(v => usedAnimations.add(v.trim().split(/\s+/)[0]));
                }
            });
        }
    });
    let size;
    do {
        size = usedVars.size;
        [...usedVars].forEach(v => rootDecls.has(v) && collectVarRefs(rootDecls.get(v), usedVars));
    } while (usedVars.size !== size);

    // (A callback that returns false stops a postcss walk, so these never return a value.)
    rootRules.forEach(rule => {
        rule.walkDecls(d => {
            if (!usedVars.has(d.prop)) d.remove();
        });
        if (!rule.nodes.length) rule.remove();
    });

    // 2) Keyframes referenced by a kept animation.
    css.walkAtRules(/keyframes$/, at => {
        if (!usedAnimations.has(at.params)) at.remove();
    });
}

function header(source, description) {
    return `/*
 * Styles for Hoist's mobile components, extracted from Onsen UI ${onsenVersion}
 * (onsenui/css/${source}). ${description}
 *
 * Regenerate with \`node scripts/extractOnsenCss.mjs\` - do not edit by hand while Onsen remains a
 * dependency. Only the rules for the Onsen components Hoist renders are included.
 *
 * Copyright 2013-2017 ASIAL CORPORATION. Licensed under the Apache License, Version 2.0 - see
 * https://www.apache.org/licenses/LICENSE-2.0 and the LICENSE file in the onsenui package.
 */
/* stylelint-disable */
`;
}

async function extract(source, outName, description) {
    const input = readFileSync(join(onsenCss, source), 'utf8'),
        css = postcss.parse(input),
        before = countRules(css);
    css.walkComments(c => c.remove());
    filterContainer(css);
    pruneRootVarsAndKeyframes(css);
    const after = countRules(css),
        output = await prettier.format(header(source, description) + css.toString(), {
            parser: 'scss',
            tabWidth: 2,
            printWidth: 100,
            singleQuote: true
        });
    const outPath = join(outDir, outName);
    if (check) {
        if (readFileSync(outPath, 'utf8') !== output) {
            upToDate = false;
            console.error(`${outName} is out of date - run: node scripts/extractOnsenCss.mjs`);
        }
        return;
    }
    mkdirSync(outDir, {recursive: true});
    writeFileSync(outPath, output);
    console.log(
        `${source} -> ${outName}: kept ${after.rules}/${before.rules} rules, ` +
            `${after.decls}/${before.decls} declarations, ` +
            `${Math.round(output.length / 1024)}/${Math.round(input.length / 1024)} KB`
    );
}

function countRules(css) {
    let rules = 0,
        decls = 0;
    css.walkRules(() => rules++);
    css.walkDecls(() => decls++);
    return {rules, decls};
}

await extract(
    'onsenui.css',
    'core.scss',
    'Layout and behavior rules for the custom elements themselves.'
);
await extract(
    'onsen-css-components.css',
    'components.scss',
    'Visual styles for the elements and the BEM classes they render.'
);

if (check) process.exit(upToDate ? 0 : 1);

if (report) {
    console.log('\nDropped selectors, by the Onsen component that excluded them:');
    [...dropped.keys()].sort().forEach(key => {
        console.log(`\n## ${key} (${dropped.get(key).size})`);
        [...dropped.get(key)].sort().forEach(s => console.log('  ' + s.replace(/\s+/g, ' ')));
    });
}
