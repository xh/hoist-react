#!/usr/bin/env node
/*
 * One-shot codemod for the hoist-react v92 Blueprint class rename.
 *
 * v92 renders Hoist's desktop components with `xh-*` class names only - the `bp6-*` names Blueprint
 * used are gone from Hoist's markup and stylesheets. This codemod rewrites app stylesheets and
 * TypeScript class strings that target the old names:
 *
 *   1. Component classes with one Hoist equivalent are renamed everywhere they appear.
 *      `.bp6-button`  →  `.xh-button`,  `'bp6-tab'`  →  `'xh-tab-list__tab'`
 *
 *   2. Blueprint's generic modifiers - `bp6-minimal`, `bp6-active`, `bp6-disabled`,
 *      `bp6-intent-*` and the like - become a modifier of the component they sit on. In a
 *      stylesheet they are renamed when the same compound selector names that component, as in
 *      `.bp6-button.bp6-minimal`  →  `.xh-button.xh-button--minimal`.
 *
 *   3. A `bp6-button` after `bp6-segmented-control` in the same selector is a SegmentedControl
 *      option, and becomes `xh-segmented-control__option`, with its modifiers.
 *
 *   4. Hoist's own classes renamed in v92 are renamed everywhere they appear, in stylesheets and
 *      class strings: `xh-segmented-control-option`  →  `xh-segmented-control__option`, and its
 *      modifiers and label.
 *
 * Everything else is reported, not rewritten, with the file and line:
 *   - a generic modifier with no component class in its compound, such as `&.bp6-minimal` nested
 *     under a component rule or `bp6-active` alone in a class string;
 *   - a class with more than one Hoist equivalent, such as `bp6-input` (an InputGroup input or a
 *     TextArea) or `bp6-overlay-backdrop` (a Dialog, Overlay or popover backdrop);
 *   - a `bp6-button` nested inside a `bp6-segmented-control` block in a stylesheet, a
 *     SegmentedControl option that a rule written on one line would have named;
 *   - a class Hoist never renders, such as `bp6-icon` or Blueprint's typography classes;
 *   - a `bp6-` class the rewrite did not reach, such as one in a string nested inside a template
 *     literal;
 *   - a Blueprint custom property, such as `var(--bp-intent-primary-rest)`. Hoist no longer
 *     defines them - use a value or an `--xh-*` variable.
 * The upgrade notes' mapping table lists the Hoist name for each reported class.
 *
 * Markdown files are never rewritten. The script lists their lines that mention a `bp6-` class.
 *
 * Usage, from an app's `client-app` directory:
 *   node node_modules/@xh/hoist/docs/codemod/v92/codemod-bp6-classes.mjs [--dry]
 *       [--exclude <path>] [path ...]
 *
 * Paths default to `./client-app/src` if present, else the current directory - pass `src` when
 * running from `client-app`. Files are walked recursively, rewriting .scss/.sass/.css/.less/.ts/
 * .tsx/.js/.jsx/.mjs and reporting on .md. Skips node_modules, build/, dist/ and .git/. `--dry`
 * reports without writing. `--exclude` skips a file or folder - repeat it for more.
 *
 * Review the diff afterwards, work through every reported line, then load the app in both light
 * and dark themes.
 */
import {promises as fs, existsSync} from 'node:fs';
import path from 'node:path';

const EXCLUDED_DIRS = new Set(['node_modules', 'build', 'dist', '.git', '.idea', '.husky']);
const STYLE_EXTS = new Set(['.scss', '.sass', '.css', '.less']);
const CODE_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs']);
const DOC_EXTS = new Set(['.md']);

const INTENTS = ['primary', 'success', 'warning', 'danger'];
const intents = block => Object.fromEntries(INTENTS.map(i => [`intent-${i}`, `${block}--intent-${i}`]));

// Component classes with one Hoist equivalent, and the generic modifiers each takes. Keys drop the
// `bp6-` prefix.
const COMPONENTS = {
    'button': ['xh-button', {
        minimal: 'xh-button--minimal', outlined: 'xh-button--outlined', active: 'xh-button--active',
        disabled: 'xh-button--disabled', ...intents('xh-button')
    }],
    'button-group': ['xh-button-group', {
        minimal: 'xh-button-group--minimal', outlined: 'xh-button-group--outlined',
        vertical: 'xh-button-group--vertical', fill: 'xh-button-group--fill'
    }],
    'button-text': ['xh-button__text'],
    'menu': ['xh-menu-list'],
    'menu-item': ['xh-menu-item', {
        active: 'xh-menu-item--active', disabled: 'xh-menu-item--disabled', ...intents('xh-menu-item')
    }],
    'menu-item-icon': ['xh-menu-item__icon'],
    'menu-item-label': ['xh-menu-item__label'],
    'menu-header': ['xh-menu-header'],
    'menu-divider': ['xh-menu-divider'],
    'submenu-icon': ['xh-menu-item__submenu-icon'],
    'context-menu-popover': ['xh-context-menu'],
    'context-menu-backdrop': ['xh-context-menu__backdrop'],
    'popover': ['xh-popover__content-wrapper', {minimal: 'xh-popover__content-wrapper--minimal'}],
    'popover-content': ['xh-popover__content'],
    'popover-arrow': ['xh-popover__arrow'],
    'popover-arrow-border': ['xh-popover__arrow-border'],
    'popover-arrow-fill': ['xh-popover__arrow-fill'],
    'popover-target': ['xh-popover__target-wrapper'],
    'popover-open': ['xh-popover__target-wrapper--open'],
    'popover-transition-container': ['xh-popover__floating'],
    'popover-dismiss': ['xh-popover-dismiss'],
    'popover-match-target-width': ['xh-popover__content-wrapper--match-target-width'],
    'popover-placement-top': ['xh-popover__content-wrapper--top'],
    'popover-placement-bottom': ['xh-popover__content-wrapper--bottom'],
    'popover-placement-left': ['xh-popover__content-wrapper--left'],
    'popover-placement-right': ['xh-popover__content-wrapper--right'],
    'tooltip': ['xh-tooltip', {compact: 'xh-tooltip--compact', ...intents('xh-tooltip')}],
    'dialog': ['xh-dialog'],
    'dialog-header': ['xh-dialog__header'],
    'dialog-close-button': ['xh-dialog__close-button'],
    'dialog-body': ['xh-dialog__body'],
    'dialog-footer': ['xh-dialog__footer'],
    'dialog-footer-actions': ['xh-dialog__footer-actions'],
    'dialog-container': ['xh-dialog__container'],
    'toast': ['xh-toast', intents('xh-toast')],
    'toast-message': ['xh-toast__message'],
    'toast-container': ['xh-toast-container'],
    'toast-container-in-portal': ['xh-toast-container--portal'],
    'toast-container-inline': ['xh-toast-container--anchored'],
    'toast-container-top': ['xh-toast-container--top'],
    'toast-container-bottom': ['xh-toast-container--bottom'],
    'toast-container-left': ['xh-toast-container--left'],
    'toast-container-right': ['xh-toast-container--right'],
    'input-group': ['xh-input-group', {
        disabled: 'xh-input-group--disabled', 'read-only': 'xh-input-group--read-only', round: 'xh-input-group--round'
    }],
    'input-action': ['xh-input-group__right-element'],
    'input-left-container': ['xh-input-group__left-element'],
    'text-area': ['xh-text-area'],
    'control': ['xh-control', {
        disabled: 'xh-control--disabled', inline: 'xh-control--inline',
        'align-left': 'xh-control--align-left', 'align-right': 'xh-control--align-right'
    }],
    'checkbox': ['xh-control--checkbox'],
    'switch': ['xh-control--switch'],
    'radio': ['xh-control--radio'],
    'control-indicator': ['xh-control__indicator'],
    'control-input': ['xh-control__input'],
    'control-group': ['xh-control-group'],
    'numeric-input': ['xh-numeric-input'],
    'radio-group': ['xh-radio-input'],
    'segmented-control': ['xh-segmented-control__options'],
    'slider': ['xh-slider__body', {
        disabled: 'xh-slider__body--disabled', vertical: 'xh-slider__body--vertical'
    }],
    'slider-unlabeled': ['xh-slider__body--unlabeled'],
    'slider-track': ['xh-slider__track'],
    'slider-progress': ['xh-slider__progress', intents('xh-slider__progress')],
    'slider-handle': ['xh-slider__handle', {
        start: 'xh-slider__handle--start', end: 'xh-slider__handle--end', active: 'xh-slider__handle--active'
    }],
    'slider-label': ['xh-slider__label'],
    'slider-axis': ['xh-slider__axis'],
    'tabs': ['xh-tab-list', {vertical: 'xh-tab-list--vertical'}],
    'tab-list': ['xh-tab-list__tabs'],
    'tab': ['xh-tab-list__tab'],
    'tab-indicator-wrapper': ['xh-tab-list__indicator-wrapper'],
    'tab-indicator': ['xh-tab-list__indicator'],
    'navbar': ['xh-appbar'],
    'navbar-group': ['xh-appbar__group', {'align-left': 'xh-appbar__group--left', 'align-right': 'xh-appbar__group--right'}],
    'navbar-divider': ['xh-appbar-separator'],
    'overflow-list': ['xh-overflow-list'],
    'overflow-list-spacer': ['xh-overflow-list__spacer'],
    'dark': ['xh-dark'],
    'focus-disabled': ['xh-focus-disabled']
};

// Classes with more than one Hoist equivalent, reported with a hint.
const AMBIGUOUS = {
    'input': '`xh-input-group__input` on an InputGroup input, `xh-text-area` on a TextArea',
    'overlay': '`xh-dialog__overlay` on a Dialog, `xh-overlay` on an Overlay',
    'overlay-content': '`xh-dialog__container` on a Dialog, `xh-overlay__content` on an Overlay',
    'overlay-backdrop': '`xh-dialog__backdrop`, `xh-overlay__backdrop` or `xh-popover__content-overlay`',
    'overlay-open': 'nothing on the overlay itself, `xh-overlay-open` on the body',
    'overlay-scroll-container': '`xh-dialog__overlay` on a Dialog, `xh-overlay--scroll-container` on an Overlay',
    'heading': '`xh-dialog__title` on a dialog title, `xh-menu-header__title` on a menu heading'
};

// Hoist's own classes renamed in v92, rewritten wherever they appear.
const HOIST_RENAMES = {
    'xh-segmented-control-option': 'xh-segmented-control__option',
    'xh-segmented-control-option--selected': 'xh-segmented-control__option--selected',
    'xh-segmented-control-option__label': 'xh-segmented-control__option-text',
    ...Object.fromEntries(INTENTS.map(i => [`xh-segmented-control-option--${i}`, `xh-segmented-control__option--intent-${i}`]))
};
const HOIST_RENAMED = new RegExp(`(?<![\\w-])(${Object.keys(HOIST_RENAMES).join('|')})(?![\\w-])`, 'g');
const renameHoistClasses = line => line.replace(HOIST_RENAMED, name => HOIST_RENAMES[name]);

// Generic modifiers - renamed only beside a component class in the same compound selector.
const MODIFIERS = new Set([
    'minimal', 'outlined', 'active', 'disabled', 'fill', 'vertical', 'inline', 'small', 'large',
    'compact', 'round', 'read-only', 'align-left', 'align-right', 'start', 'end', ...INTENTS.map(i => `intent-${i}`)
]);

//------------------------------------------------------------------
// Argument parsing and file walking
//------------------------------------------------------------------
const args = process.argv.slice(2);
const dry = args.includes('--dry');
const excludes = [];
const roots = [];
for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dry') continue;
    if (args[i] === '--exclude') excludes.push(path.resolve(args[++i]));
    else roots.push(args[i]);
}
if (!roots.length) roots.push(existsSync('client-app/src') ? 'client-app/src' : '.');

async function* walk(p) {
    const abs = path.resolve(p);
    if (excludes.some(e => abs === e || abs.startsWith(e + path.sep))) return;
    const stat = await fs.stat(abs);
    if (stat.isFile()) {
        yield abs;
        return;
    }
    for (const ent of await fs.readdir(abs, {withFileTypes: true})) {
        if (ent.isDirectory() && EXCLUDED_DIRS.has(ent.name)) continue;
        yield* walk(path.join(abs, ent.name));
    }
}

//------------------------------------------------------------------
// Rewriting
//------------------------------------------------------------------
const report = [];
const note = (file, lineNo, line, msg) =>
    report.push(`${path.relative(process.cwd(), file)}:${lineNo}  ${msg}\n      ${line.trim()}`);

// One compound selector - a run of simple selectors with no combinator between them.
const COMPOUND = /(?:&|[\w-]*)(?:[.#][\w-]+|\[[^\]]*\]|::?[\w-]+(?:\([^)]*\))?)+/g;

function rewriteCompound(compound) {
    const classes = [...compound.matchAll(/\.bp6-([\w-]+)/g)].map(m => m[1]);
    const anchor = classes.find(c => COMPONENTS[c]);
    const mods = anchor ? COMPONENTS[anchor][1] ?? {} : {};
    const unresolved = [];
    const out = compound.replace(/\.bp6-([\w-]+)/g, (whole, name) => {
        if (COMPONENTS[name]) return '.' + COMPONENTS[name][0];
        if (MODIFIERS.has(name) && mods[name]) return '.' + mods[name];
        unresolved.push(name);
        return whole;
    });
    return {out, unresolved};
}

// A SegmentedControl option was a bp6-button inside bp6-segmented-control, as a child or any
// descendant within the same selector. Its bp6-minimal marked an unselected option - Hoist marks
// the selected one instead.
const SEGMENT_OPTION = /(\.bp6-segmented-control(?![\w-])[^,{}]*?)\.bp6-button(?![\w-])((?:\.bp6-[\w-]+|:not\(\.bp6-[\w-]+\)|::?[\w-]+(?:\([^)]*\))?)*)/g;
const SEGMENTED = /\.bp6-segmented-control(?![\w-])/;
const BUTTON = /^\.bp6-button(?![\w-])/;
const OPTION = '.xh-segmented-control__option';
function rewriteSegmentOption(line) {
    return line.replace(SEGMENT_OPTION, (whole, pre, rest) =>
        `${pre}${OPTION}` +
        rest
            .replace(/:not\(\.bp6-minimal\)/g, `${OPTION}--selected`)
            .replace(/\.bp6-minimal/g, `:not(${OPTION}--selected)`)
            .replace(/\.bp6-disabled/g, `${OPTION}--disabled`)
    );
}

/**
 * Track a stylesheet's open blocks across lines, and return true if this line has a `.bp6-button`
 * inside a `.bp6-segmented-control` block, as in nested SCSS - an option, which SEGMENT_OPTION
 * cannot see from one line. `state` holds the stack of open blocks, each true if its selector
 * names the segmented control, and the text of the selector being read.
 */
function scanSegmentBlock(line, state) {
    let found = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '{') {
            state.stack.push(SEGMENTED.test(state.sel));
            state.sel = '';
        } else if (ch === '}' || ch === ';' || ch === ',') {
            if (ch === '}') state.stack.pop();
            state.sel = '';
        } else {
            if (BUTTON.test(line.slice(i)) && (state.stack.includes(true) || SEGMENTED.test(state.sel))) {
                found = true;
            }
            state.sel += ch;
        }
    }
    return found;
}

function rewriteStyleLine(line) {
    const unresolved = [];
    const out = rewriteSegmentOption(line).replace(COMPOUND, compound => {
        if (!compound.includes('.bp6-')) return compound;
        const r = rewriteCompound(compound);
        unresolved.push(...r.unresolved);
        return r.out;
    });
    return {out, unresolved};
}

function rewriteCodeLine(line) {
    const unresolved = [];
    // Class tokens inside string and template literals.
    const out = line.replace(/(['"`])((?:(?!\1).)*?)\1/g, (whole, q, body) => {
        if (!body.includes('bp6-')) return whole;
        const next = rewriteSegmentOption(body).replace(/(^|[\s.])bp6-([\w-]+)/g, (m, pre, name) => {
            if (COMPONENTS[name]) return pre + COMPONENTS[name][0];
            unresolved.push(name);
            return m;
        });
        return q + next + q;
    });
    return {out, unresolved};
}

function explain(name) {
    if (AMBIGUOUS[name]) return `\`bp6-${name}\` has more than one Hoist name: ${AMBIGUOUS[name]}`;
    if (COMPONENTS[name])
        return `\`bp6-${name}\` was not rewritten here - its Hoist name is \`${COMPONENTS[name][0]}\``;
    if (MODIFIERS.has(name) || /^intent-/.test(name))
        return `\`bp6-${name}\` is a generic modifier - use the modifier of the component it sits on`;
    return `\`bp6-${name}\` has no Hoist equivalent - Hoist never renders it`;
}

async function processFile(file) {
    const ext = path.extname(file);
    const isStyle = STYLE_EXTS.has(ext), isCode = CODE_EXTS.has(ext), isDoc = DOC_EXTS.has(ext);
    if (!isStyle && !isCode && !isDoc) return 0;
    const text = await fs.readFile(file, 'utf8');
    if (!/bp6-|--bp-|xh-segmented-control-option/.test(text)) return 0;
    const lines = text.split('\n');
    const segState = {stack: [], sel: ''};
    let changed = 0;
    lines.forEach((original, i) => {
        if (isDoc) {
            if (/bp6-/.test(original)) note(file, i + 1, original, 'mentions a `bp6-` class');
            return;
        }
        const line = renameHoistClasses(original);
        // Scan every style line, so the block stack stays in step with the file's braces.
        const nestedOption = isStyle && scanSegmentBlock(rewriteSegmentOption(line), segState);
        if (/var\(--bp6?-/.test(line)) note(file, i + 1, line, 'reads a Blueprint custom property, which Hoist no longer defines');
        let out = line;
        if (line.includes('bp6-')) {
            if (nestedOption) {
                note(file, i + 1, line, '`bp6-button` inside a `bp6-segmented-control` block is a SegmentedControl option - use `xh-segmented-control__option`, and see the upgrade notes for its modifiers');
            } else {
                const r = isStyle ? rewriteStyleLine(line) : rewriteCodeLine(line);
                out = r.out;
                // Also report any bp6- class left in place that the rewrite did not see, such as one
                // in a string nested inside a template literal.
                const left = [...out.matchAll(/(?<![\w-])bp6-([\w-]+)/g)].map(m => m[1]);
                for (const name of new Set([...r.unresolved, ...left])) note(file, i + 1, out, explain(name));
            }
        }
        if (out !== original) {
            lines[i] = out;
            changed++;
        }
    });
    if (changed && !dry) await fs.writeFile(file, lines.join('\n'));
    return changed;
}

let files = 0, lines = 0;
for (const root of roots) {
    for await (const file of walk(root)) {
        const n = await processFile(file);
        if (n) {
            files++;
            lines += n;
        }
    }
}
console.log(`${dry ? 'Would rewrite' : 'Rewrote'} ${lines} line(s) in ${files} file(s).`);
if (report.length) {
    console.log(`\n${report.length} line(s) to review by hand:\n`);
    console.log(report.join('\n'));
}
