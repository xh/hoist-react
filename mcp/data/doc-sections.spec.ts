/**
 * Test harness for doc sections and targeted reads. Run with:
 *   npx tsx mcp/data/doc-sections.spec.ts
 *
 * Self-contained, exit-coded driver (the repo has no general test framework). Covers section
 * parsing, section-name resolution, and the shared `readDoc` implementation behind
 * `hoist-read-doc` and `hoist-docs read`, against the live registry and docs.
 */
import {buildRegistry, loadDocContent, type DocEntry} from './doc-registry.js';
import {parseDocSections, resolveSection, type DocSection} from './doc-sections.js';
import {LARGE_DOC_TOKENS, readDoc} from '../formatters/docs.js';
import {resolveRepoRoot} from '../util/paths.js';

process.env.HOIST_MCP_QUIET = '1';

const {entries: registry} = buildRegistry(resolveRepoRoot());

let passed = 0,
    failed = 0;

function check(name: string, ok: boolean, detail?: string) {
    if (ok) {
        passed++;
        console.log(`  PASS  ${name}`);
    } else {
        failed++;
        console.log(`  FAIL  ${name}${detail ? `\n          ${detail}` : ''}`);
    }
}

function entry(id: string): DocEntry {
    const e = registry.find(it => it.id === id);
    if (!e) throw new Error(`Missing registry entry ${id}`);
    return e;
}

function sectionsOf(id: string): DocSection[] {
    const e = entry(id);
    return parseDocSections(e, loadDocContent(e));
}

//------------------------------------------------------------------
// Parsing
//------------------------------------------------------------------
console.log('Parsing:');
{
    const sections = sectionsOf('docs/persistence.md'),
        intro = sections[0],
        grid = sections.find(s => s.ref === 'Built-in Model Support > GridModel'),
        builtIn = sections.find(s => s.ref === 'Built-in Model Support');

    check('intro section is level 1 at line 1', intro.level === 1 && intro.startLine === 1);
    check(
        'intro ends before the first ## heading',
        intro.endLine === 14,
        `endLine=${intro.endLine}`
    );
    check('### path includes its ## parent', grid != null && grid.path.length === 2);
    check(
        'breadcrumb starts with the doc title',
        grid?.breadcrumb === 'Persistence > Built-in Model Support > GridModel'
    );
    check(
        '### extent keeps its #### subsections (GridModel L212-274)',
        grid?.startLine === 212 && grid.extentEndLine === 274,
        `L${grid?.startLine}-${grid?.extentEndLine}`
    );
    check(
        '## extent spans its ### children',
        builtIn != null && builtIn.endLine < builtIn.extentEndLine && builtIn.extentEndLine === 362,
        `endLine=${builtIn?.endLine} extentEndLine=${builtIn?.extentEndLine}`
    );
    check(
        'GridModel section is ~750 tokens',
        grid != null && grid.tokens > 600 && grid.tokens < 900,
        `tokens=${grid?.tokens}`
    );
    check(
        'markdown stripped from headings',
        sections.some(s => s.heading === 'Approach 3: Model Constructor Config (persistWith)')
    );

    const mcp = sectionsOf('mcp/README.md');
    check(
        'headings inside code fences are ignored',
        !mcp.some(s => s.heading === 'Signature'),
        mcp
            .filter(s => s.heading === 'Signature')
            .map(s => `L${s.startLine}`)
            .join(', ')
    );

    const total = registry.reduce((n, e) => n + parseDocSections(e, loadDocContent(e)).length, 0);
    check('every registered doc parses', total > 1000, `sections=${total}`);
}

//------------------------------------------------------------------
// Resolution
//------------------------------------------------------------------
console.log('Resolution:');
{
    const persistence = entry('docs/persistence.md'),
        pSections = sectionsOf('docs/persistence.md'),
        resolve = (input: string) => resolveSection(persistence, pSections, input),
        foundRef = (input: string) => {
            const r = resolve(input);
            return r.kind === 'found' ? r.section.ref : `<${r.kind}>`;
        };

    const gridRef = 'Built-in Model Support > GridModel';
    check('full path', foundRef(gridRef) === gridRef);
    check('breadcrumb with doc title', foundRef(`Persistence > ${gridRef}`) === gridRef);
    check('bare heading', foundRef('GridModel') === gridRef);
    check('case-insensitive', foundRef('built-in model support > gridmodel') === gridRef);
    check(
        'markdown hashes tolerated',
        foundRef('## Built-in Model Support') === 'Built-in Model Support'
    );
    check(
        'unique prefix',
        foundRef('Approach 3') ===
            'Using Persistence > Approach 3: Model Constructor Config (persistWith)'
    );
    check(
        'doc title addresses the intro',
        resolve('Persistence').kind === 'found' && foundRef('Persistence') === 'Persistence'
    );

    const ambiguous = resolve('persistWith');
    check(
        'ambiguous substring lists candidates',
        ambiguous.kind === 'ambiguous' && ambiguous.candidates.length >= 2,
        ambiguous.kind
    );

    const unknown = resolve('Grid Columns Nonexistent');
    check(
        'unknown returns suggestions',
        unknown.kind === 'unknown' && unknown.suggestions.some(s => s.ref === gridRef),
        unknown.kind === 'unknown' ? unknown.suggestions.map(s => s.ref).join(' | ') : unknown.kind
    );

    const dash = entry('desktop/cmp/dash/README.md'),
        dSections = sectionsOf('desktop/cmp/dash/README.md'),
        dup = resolveSection(dash, dSections, 'Basic Usage'),
        qualified = resolveSection(dash, dSections, 'DashCanvas > Basic Usage');
    check('repeated heading is ambiguous', dup.kind === 'ambiguous');
    check(
        'parent path disambiguates a repeated heading',
        qualified.kind === 'found' && qualified.section.startLine === 230
    );
}

//------------------------------------------------------------------
// readDoc (shared by hoist-read-doc and hoist-docs read)
//------------------------------------------------------------------
console.log('readDoc:');
{
    const full = readDoc(registry, {id: 'docs/persistence.md'}, 'mcp');
    check(
        'full read returns unchanged content',
        full.ok && full.text === loadDocContent(entry('docs/persistence.md'))
    );
    check(
        'large full read carries a size note',
        full.ok && full.structured.tokens > LARGE_DOC_TOKENS && !!full.sizeNote?.includes('outline')
    );

    const small = readDoc(registry, {id: 'docs/compilation-notes.md'}, 'mcp');
    check('small full read has no size note', small.ok && small.sizeNote == null);

    const section = readDoc(
        registry,
        {id: 'persistence', section: 'Built-in Model Support > GridModel'},
        'mcp'
    );
    check(
        'section read returns only that section',
        section.ok &&
            section.structured.content!.startsWith('### GridModel') &&
            !section.structured.content!.includes('### FormModel') &&
            section.structured.section?.endLine === 274
    );
    check(
        'section read reports matchedAs for a shortened id',
        section.ok && section.structured.matchedAs === 'persistence'
    );
    check(
        'section read is ~9x smaller than the full doc',
        section.ok && full.ok && section.structured.tokens * 8 < full.structured.tokens,
        section.ok && full.ok ? `${section.structured.tokens} vs ${full.structured.tokens}` : ''
    );

    const outline = readDoc(registry, {id: 'docs/persistence.md', outline: true}, 'mcp');
    check(
        'outline lists every section without content',
        outline.ok &&
            outline.structured.content == null &&
            outline.structured.outline?.length === sectionsOf('docs/persistence.md').length
    );

    const subOutline = readDoc(
        registry,
        {id: 'docs/persistence.md', section: 'Built-in Model Support', outline: true},
        'mcp'
    );
    check(
        'outline with section is limited to its subtree',
        subOutline.ok &&
            subOutline.structured.outline?.length === 7 &&
            subOutline.structured.outline[0].section === 'Built-in Model Support',
        subOutline.ok ? `${subOutline.structured.outline?.length} entries` : subOutline.text
    );

    const miss = readDoc(
        registry,
        {id: 'docs/persistence.md', section: 'Nonexistent Thing'},
        'mcp'
    );
    check(
        'unknown section fails with the outline',
        !miss.ok &&
            miss.text.includes('No section') &&
            miss.text.includes('- Built-in Model Support')
    );

    const unknownDoc = readDoc(registry, {id: 'not-a-doc'}, 'mcp');
    check(
        'unknown doc id fails',
        !unknownDoc.ok && unknownDoc.text.startsWith('Unknown document ID')
    );
}

console.log(`\nTotal: ${passed} passed, ${failed} failed.`);
process.exit(failed === 0 ? 0 : 1);
