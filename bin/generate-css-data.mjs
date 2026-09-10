#!/usr/bin/env node

/**
 * Generates a VS Code css-data.json file from hoist-react's SCSS variable definitions.
 *
 * For each `--xh-*` CSS custom property declaration found in `styles/vars.scss` (and any
 * other SCSS files that define `--xh-*` vars), this script extracts:
 *
 *  1. An explicit description from `///` doc comments immediately above the declaration.
 *  2. An auto-generated description from the variable name and value when no doc comment exists.
 *
 * Descriptions are written for LLM consumers first, IDE hover second. They convey:
 *  - What the variable controls
 *  - Whether it's a direct override point or a computed derivation
 *  - Type context (color, unitless number, length) where inferable
 *  - Relationships to parent variables for derived values
 *
 * Doc comment convention (SassDoc-style triple-slash):
 *
 *     /// Primary background color for the application chrome.
 *     --xh-bg: white;
 *
 *     /// Focus indicator outline for interactive components.
 *     /// Set to `0` to disable completely.
 *     --xh-focus-outline: ...;
 *
 * Usage:
 *     node bin/generate-css-data.mjs              # writes css-data.json to project root
 *     node bin/generate-css-data.mjs --check       # exits non-zero if output would change
 *     node bin/generate-css-data.mjs --stdout       # prints to stdout instead of writing file
 *
 * See styles/README.md for the full doc comment convention and IDE setup instructions.
 * See docs/build-and-publish.md for how this integrates with the pre-commit hook and npm publish.
 */

import {readFileSync, readdirSync, writeFileSync, existsSync} from 'fs';
import {join, dirname, relative} from 'path';
import {fileURLToPath} from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUTPUT_PATH = join(ROOT, 'css-data.json');

//------------------------------------------------------------------
// Main
//------------------------------------------------------------------
function main() {
    const args = process.argv.slice(2),
        check = args.includes('--check'),
        stdout = args.includes('--stdout');

    const scssFiles = findScssFiles();
    const entries = [];

    for (const file of scssFiles) {
        entries.push(...parseFile(file));
    }

    // Deduplicate by name — first definition wins (vars.scss comes first).
    const seen = new Set();
    const unique = entries.filter(e => {
        if (seen.has(e.name)) return false;
        seen.add(e.name);
        return true;
    });

    // Build a Set of all known var names for relationship detection.
    const output = {
        version: 1.1,
        properties: unique.map(e => ({
            name: e.name,
            description: e.docComment || generateDescription(e)
        }))
    };

    const json = JSON.stringify(output, null, 2) + '\n';

    if (stdout) {
        process.stdout.write(json);
        return;
    }

    if (check) {
        const existing = existsSync(OUTPUT_PATH) ? readFileSync(OUTPUT_PATH, 'utf-8') : '';
        if (existing !== json) {
            console.error('css-data.json is out of date. Run `node bin/generate-css-data.mjs` to update.');
            process.exit(1);
        }
        console.log('css-data.json is up to date.');
        return;
    }

    writeFileSync(OUTPUT_PATH, json);
    console.log(`Wrote ${unique.length} CSS custom properties to ${relative(ROOT, OUTPUT_PATH)}`);
}


//------------------------------------------------------------------
// File discovery
//------------------------------------------------------------------
function findScssFiles() {
    const primary = join(ROOT, 'styles/vars.scss');
    const others = findFilesWithXhVarDefinitions().filter(f => f !== primary);
    return [primary, ...others];
}

function findFilesWithXhVarDefinitions() {
    const result = [];
    const scssFiles = globRecursive(ROOT);
    for (const file of scssFiles) {
        if (file.includes('node_modules')) continue;
        const content = readFileSync(file, 'utf-8');
        if (/^\s+--xh-[a-z][a-z0-9-]*\s*:/m.test(content)) {
            result.push(file);
        }
    }
    return result;
}

function globRecursive(dir) {
    const results = [];
    function walk(d) {
        for (const entry of readdirSync(d, {withFileTypes: true})) {
            const full = join(d, entry.name);
            if (entry.isDirectory()) {
                if (entry.name === 'node_modules' || entry.name === '.git') continue;
                walk(full);
            } else if (entry.name.endsWith('.scss')) {
                results.push(full);
            }
        }
    }
    walk(dir);
    return results;
}


//------------------------------------------------------------------
// SCSS parsing
//------------------------------------------------------------------
function parseFile(filePath) {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const entries = [];
    const relPath = relative(ROOT, filePath);

    let nestingDepth = 0;
    let inOverrideBlock = false;
    let overrideStack = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        const opens = (trimmed.match(/{/g) || []).length;
        const closes = (trimmed.match(/}/g) || []).length;

        // Skip dark-theme override blocks — redefinitions, not new vars.
        // Mobile blocks are NOT skipped: they introduce mobile-only vars.
        if (/&\.xh-dark/.test(trimmed) && opens > 0) {
            overrideStack.push(nestingDepth);
            inOverrideBlock = true;
        }

        nestingDepth += opens - closes;

        if (overrideStack.length > 0 && nestingDepth <= overrideStack[overrideStack.length - 1]) {
            overrideStack.pop();
            inOverrideBlock = overrideStack.length > 0;
        }

        // Skip three-line section headers (`//---\n// Name\n//---`).
        if (/^\/\/\s*-{2,}\s*$/.test(trimmed)) {
            const nextLine = lines[i + 1]?.trim();
            const closingLine = lines[i + 2]?.trim();
            const nameMatch = nextLine?.match(/^\/\/\s*(.+?)\s*$/);
            if (nameMatch && !/^-+$/.test(nameMatch[1]) && /^\/\/\s*-{2,}\s*$/.test(closingLine)) {
                i += 2;
            }
            continue;
        }

        if (inOverrideBlock) continue;

        const varMatch = trimmed.match(/^(--xh-[a-z][a-z0-9-]*)\s*:/);
        if (!varMatch) continue;

        const name = varMatch[1];
        const value = trimmed.replace(/^--xh-[a-z][a-z0-9-]*\s*:\s*/, '').replace(/;?\s*$/, '');
        const docComment = extractDocComment(lines, i);

        entries.push({name, value, docComment, file: relPath});
    }

    return entries;
}

/**
 * Extract `///` doc comment lines immediately above the given line index.
 */
function extractDocComment(lines, lineIndex) {
    const commentLines = [];
    let j = lineIndex - 1;

    while (j >= 0) {
        const trimmed = lines[j].trim();
        const match = trimmed.match(/^\/\/\/\s?(.*)/);
        if (match) {
            commentLines.unshift(match[1]);
            j--;
        } else {
            break;
        }
    }

    return commentLines.length > 0 ? commentLines.join(' ').trim() : null;
}


//------------------------------------------------------------------
// Description auto-generation
//------------------------------------------------------------------

/**
 * Generate a description for a CSS custom property entry. Descriptions are optimized for
 * LLM consumption: concise, relationship-aware, and type-hinted.
 */
function generateDescription(entry) {
    const raw = entry.name.replace(/^--xh-/, '');

    // 1. Check for a computed/derived relationship from the value.
    const derived = tryDerivedDescription(entry);
    if (derived) return derived;

    // 2. Handle well-known structural patterns (intents, palette colors, etc.).
    const special = trySpecialPattern(raw);
    if (special) return special;

    // 3. Fall back to name-based description generation.
    return buildNameBasedDescription(raw);
}


/**
 * Detect computed/derived vars from their values. These reference a parent var via `calc()`
 * or `var()` and should describe the relationship rather than repeat the component+property.
 */
function tryDerivedDescription(entry) {
    const {name, value} = entry;
    const raw = name.replace(/^--xh-/, '');

    // Pattern: `calc(var(--xh-foo) * 1px)` → pixel derivation
    const pxCalc = value.match(/^calc\(var\((--xh-[a-z][a-z0-9-]*)\)\s*\*\s*1px\)$/);
    if (pxCalc) {
        return `Pixel value of \`${pxCalc[1]}\`. Derived — override \`${pxCalc[1]}\` instead.`;
    }

    // Pattern: `calc(var(--xh-foo) * N)` → scaled derivation
    const scaledCalc = value.match(/^calc\(var\((--xh-[a-z][a-z0-9-]*)\)\s*\*\s*([\d.]+)\)$/);
    if (scaledCalc) {
        const [, parent, factor] = scaledCalc;
        return `${factor}x scale of \`${parent}\`. Derived — override \`${parent}\` instead.`;
    }

    // Pattern: `calc(var(--xh-foo) * var(--xh-bar))` → product of two vars
    const productCalc = value.match(/^calc\(var\((--xh-[a-z][a-z0-9-]*)\)\s*\*\s*var\((--xh-[a-z][a-z0-9-]*)\)\)$/);
    if (productCalc) {
        return `Product of \`${productCalc[1]}\` and \`${productCalc[2]}\`. Derived.`;
    }

    // Pattern: simple `var(--xh-foo)` alias
    const simpleAlias = value.match(/^var\((--xh-[a-z][a-z0-9-]*)\)$/);
    if (simpleAlias) {
        const parent = simpleAlias[1];
        const desc = buildNameBasedDescription(raw);
        return `${desc} Defaults to \`${parent}\`.`;
    }

    return null;
}


/**
 * Handle variable names with well-known structure that the generic name parser
 * doesn't handle well — intent HSL components, core palette colors, etc.
 */
function trySpecialPattern(raw) {
    // Intent HSL components: --xh-intent-{name}-{h|s|l1-l5}
    const intentHsl = raw.match(/^intent-(neutral|primary|success|warning|danger)-(h|s|l[1-5])$/);
    if (intentHsl) {
        const [, intent, comp] = intentHsl;
        const compName = comp === 'h' ? 'hue' : comp === 's' ? 'saturation' : `lightness level ${comp[1]}`;
        return `HSL ${compName} for the ${intent} intent. Override to shift all derived ${intent} colors.`;
    }

    // Intent alpha: --xh-intent-a1, --xh-intent-a2
    const intentAlpha = raw.match(/^intent-a([12])$/);
    if (intentAlpha) {
        return `Alpha (opacity) value for intent transparency variants (trans${intentAlpha[1]}).`;
    }

    // Intent computed colors: --xh-intent-{name}[-variant]
    const intentColor = raw.match(/^intent-(neutral|primary|success|warning|danger)(?:-(darkest|darker|lighter|lightest|trans1|trans2|text-color))?$/);
    if (intentColor) {
        const [, intent, variant] = intentColor;
        if (!variant) return `Base color for the ${intent} intent. Composed from HSL components.`;
        const variantDesc = {
            'darkest': 'Darkest shade',
            'darker': 'Darker shade',
            'lighter': 'Lighter shade',
            'lightest': 'Lightest shade',
            'trans1': 'Semi-transparent (lower opacity)',
            'trans2': 'Semi-transparent (higher opacity)',
            'text-color': 'Text-optimized color (lighter in dark theme for legibility)'
        };
        return `${variantDesc[variant]} of the ${intent} intent. Composed from HSL components.`;
    }

    // Core palette colors: --xh-{color}[-variant]
    const PALETTE_COLORS = [
        'blue-gray', 'blue', 'black', 'white', 'green', 'red', 'orange', 'purple', 'yellow', 'gray'
    ];
    for (const color of PALETTE_COLORS) {
        if (raw === color) return `Core palette color: ${color}.`;
        if (raw.startsWith(color + '-')) {
            const variant = humanize(raw.slice(color.length + 1));
            return `Core palette color: ${variant} ${color}.`;
        }
    }

    // Positive/negative/neutral value colors
    if (raw === 'pos-val-color') return 'Color for positive numeric values.';
    if (raw === 'neg-val-color') return 'Color for negative numeric values.';
    if (raw === 'neutral-val-color') return 'Color for neutral/zero numeric values.';

    return null;
}


/** Known component prefixes and their display names. */
const COMPONENT_NAMES = {
    'appbar': 'AppBar',
    'backdrop': 'Backdrop',
    'badge': 'Badge',
    'border': 'Border',
    'button': 'Button',
    'card': 'Card',
    'chart': 'Chart',
    'dash-canvas': 'DashCanvas',
    'focus': 'Focus',
    'font': 'Font',
    'form-field': 'FormField',
    'grid': 'Grid',
    'input': 'Input',
    'loading-indicator': 'LoadingIndicator',
    'mask': 'Mask',
    'menu': 'Menu',
    'pad': 'Padding',
    'panel': 'Panel',
    'popover': 'Popover',
    'popup': 'Popup',
    'resizable': 'Resizable',
    'scrollbar': 'Scrollbar',
    'slider': 'Slider',
    'tab': 'Tab',
    'tbar': 'Toolbar',
    'text': 'Text',
    'title': 'Title',
    'viewport': 'Viewport',
    'zone-grid': 'ZoneGrid'
};

/** Known property suffixes and how to render them in descriptions. */
const PROPERTY_TERMS = {
    'bg': 'background',
    'bg-alt': 'alt background',
    'bg-hover': 'hover background',
    'bg-odd': 'odd-row background',
    'border-color': 'border color',
    'border-radius': 'border radius',
    'border-width': 'border width',
    'box-shadow': 'box shadow',
    'font-family': 'font family',
    'font-feature-settings': 'font feature settings',
    'font-size': 'font size',
    'font-style': 'font style',
    'font-weight': 'font weight',
    'line-height': 'line height',
    'lr-pad': 'left/right padding',
    'min-height': 'minimum height',
    'min-size': 'minimum size',
    'min-width': 'minimum width',
    'text-color': 'text color',
    'text-transform': 'text transform'
};


/**
 * Build a description from the variable name structure.
 * Identifies component prefix, expands known property terms, humanizes the rest.
 */
function buildNameBasedDescription(raw) {
    let component = '';
    let remainder = raw;

    // Sort component keys by length (longest first) for greedy matching.
    const sortedKeys = Object.keys(COMPONENT_NAMES).sort((a, b) => b.length - a.length);
    for (const key of sortedKeys) {
        if (raw === key) {
            component = COMPONENT_NAMES[key];
            remainder = '';
            break;
        }
        if (raw.startsWith(key + '-')) {
            component = COMPONENT_NAMES[key];
            remainder = raw.slice(key.length + 1);
            break;
        }
    }

    // Expand known property terms in the remainder.
    let description = remainder;
    const sortedTerms = Object.keys(PROPERTY_TERMS).sort((a, b) => b.length - a.length);
    for (const term of sortedTerms) {
        if (description === term) {
            description = PROPERTY_TERMS[term];
            break;
        }
        if (description.endsWith('-' + term)) {
            const prefix = description.slice(0, -(term.length + 1));
            description = humanize(prefix) + ' ' + PROPERTY_TERMS[term];
            break;
        }
    }

    // If no property term matched, just humanize the whole remainder.
    if (description === remainder) {
        description = humanize(description);
    }

    const parts = [];
    if (component) parts.push(component);
    if (description) parts.push(description);

    let result = parts.join(' ') || humanize(raw);

    // Capitalize first letter and ensure period.
    result = result.charAt(0).toUpperCase() + result.slice(1);
    if (!result.endsWith('.')) result += '.';

    return result;
}

/** Convert hyphenated-name to "hyphenated name". */
function humanize(str) {
    return str.replace(/-/g, ' ');
}


//------------------------------------------------------------------
// Entry point
//------------------------------------------------------------------
main();
