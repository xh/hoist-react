/**
 * CLI entry point for hoist-docs -- documentation search, listing, and reading.
 *
 * Wraps the same doc-registry logic used by the MCP server, producing identical
 * output via shell commands instead of MCP tool calls.
 */
import {Command} from 'commander';

import {buildRegistry, loadDocContent} from '../data/doc-registry.js';
import {DEFAULT_SEARCH_LIMIT, MAX_SEARCH_LIMIT, searchDocs} from '../data/doc-search.js';
import {
    formatSearchResults,
    formatDocList,
    readDoc,
    searchReadHint,
    toSearchDocsOutput,
    toListDocsOutput
} from '../formatters/docs.js';
import {resolveRepoRoot, resolveHoistVersion} from '../util/paths.js';

const {entries: registry, mcpCategories} = buildRegistry(resolveRepoRoot());
const VALID_CATEGORIES = [...mcpCategories.map(c => c.id), 'all'];

function validateCategory(value: string): string {
    if (!VALID_CATEGORIES.includes(value)) {
        console.error(
            `Invalid category: "${value}". Valid categories: ${VALID_CATEGORIES.join(', ')}`
        );
        process.exit(1);
    }
    return value;
}

function validateLimit(value: string, min: number, max: number): string {
    const n = parseInt(value, 10);
    if (isNaN(n) || n < min || n > max) {
        console.error(`Invalid limit: "${value}". Must be a number between ${min} and ${max}.`);
        process.exit(1);
    }
    return value;
}

const program = new Command()
    .name('hoist-docs')
    .description('Search, list, and read hoist-react documentation.')
    .version('1.0.0');

program.addHelpText(
    'after',
    `
Examples:
  hoist-docs search "grid sorting"               Search docs for grid sorting
  hoist-docs search "authentication" -c concept  Search only concept docs
  hoist-docs list                                List all available documents
  hoist-docs list -c package                     List only package docs
  hoist-docs read cmp/grid/README.md             Read the Grid component README (canonical id)
  hoist-docs read grid                           Same doc via a tolerated shortening
  hoist-docs read grid --outline                 List the Grid README's sections
  hoist-docs read persistence --section "Built-in Model Support > GridModel"
                                                 Read one section
  hoist-docs read v85                            Read the v85 upgrade notes
  hoist-docs conventions                         Print coding conventions
  hoist-docs index                               Print the documentation index
  hoist-docs ping                                Confirm the CLI is wired up`
);

//----------------------------------------------------------------------
// Subcommand: search
//----------------------------------------------------------------------
program
    .command('search')
    .description(
        'Search hoist-react documentation and return the best-matching sections, ranked, with excerpts. Read a result with "hoist-docs read <id> --section <section>".'
    )
    .argument(
        '<query>',
        'Two to four keywords, ideally API or concept names (e.g. "grid column renderer")'
    )
    .option(
        '-c, --category <category>',
        'Filter by category: ' + VALID_CATEGORIES.join(', '),
        'all'
    )
    .option(
        '-l, --limit <n>',
        `Maximum number of sections (1-${MAX_SEARCH_LIMIT})`,
        String(DEFAULT_SEARCH_LIMIT)
    )
    .option(
        '--json',
        'Output machine-readable JSON matching the MCP outputSchema instead of formatted text.'
    )
    .action((query: string, opts: {category: string; limit: string; json?: boolean}) => {
        validateCategory(opts.category);
        validateLimit(opts.limit, 1, MAX_SEARCH_LIMIT);

        const results = searchDocs(registry, query, {
            category: opts.category,
            limit: parseInt(opts.limit, 10)
        });

        if (opts.json) {
            const structured = toSearchDocsOutput(query, results);
            process.stdout.write(JSON.stringify(structured, null, 2) + '\n');
            return;
        }

        let text = formatSearchResults(results, query);
        if (results.length > 0) text += `\n\n${searchReadHint('cli')}`;
        process.stdout.write(text + '\n');
    });

//----------------------------------------------------------------------
// Subcommand: list
//----------------------------------------------------------------------
program
    .command('list')
    .description('List all available documentation with descriptions.')
    .option(
        '-c, --category <category>',
        'Filter by category: ' + VALID_CATEGORIES.join(', '),
        'all'
    )
    .option(
        '--json',
        'Output machine-readable JSON matching the MCP outputSchema instead of formatted text.'
    )
    .action((opts: {category: string; json?: boolean}) => {
        validateCategory(opts.category);

        if (opts.json) {
            const structured = toListDocsOutput(registry, mcpCategories, opts.category);
            process.stdout.write(JSON.stringify(structured, null, 2) + '\n');
            return;
        }

        let text = formatDocList(registry, mcpCategories, opts.category);
        text += 'Read any document using: hoist-docs read <id>';
        process.stdout.write(text + '\n');
    });

//----------------------------------------------------------------------
// Subcommand: read
//----------------------------------------------------------------------
program
    .command('read')
    .description(
        'Read a document by ID - in full, one section (--section), or its outline (--outline). Accepts the canonical repo-relative path (e.g. "cmp/grid/README.md") and tolerates common shortenings: "core" → "core/README.md", "grid" → "cmp/grid/README.md", "authentication" → "docs/authentication.md", "v85" → upgrade notes for v85. When a shortening matches, the resolved canonical id is printed to stderr, as is a size note on full reads of large docs.'
    )
    .argument('<docId>', 'Document ID -- canonical path or a tolerated shortening')
    .option(
        '-s, --section <section>',
        'Read one section by heading or path, e.g. "Mask" or "Built-in Model Support > GridModel"'
    )
    .option('-o, --outline', "List the doc's sections with line ranges and token counts")
    .option(
        '--json',
        'Output machine-readable JSON matching the MCP outputSchema instead of formatted text.'
    )
    .action((docId: string, opts: {section?: string; outline?: boolean; json?: boolean}) => {
        const result = readDoc(
            registry,
            {id: docId, section: opts.section, outline: opts.outline},
            'cli'
        );
        if (!result.ok) {
            console.error(result.text);
            process.exit(1);
        }

        if (opts.json) {
            process.stdout.write(JSON.stringify(result.structured, null, 2) + '\n');
            return;
        }

        // Notes go to stderr, so the canonical id and size hint are visible without
        // corrupting the doc content on stdout.
        const {matchedAs, id} = result.structured;
        if (matchedAs != null) console.error(`Resolved "${matchedAs}" → ${id}`);
        if (result.sizeNote) console.error(result.sizeNote);

        process.stdout.write(result.text + '\n');
    });

//----------------------------------------------------------------------
// Subcommand: conventions
//----------------------------------------------------------------------
program
    .command('conventions')
    .description('Print coding conventions -- shortcut for "read docs/coding-conventions.md".')
    .action(() => {
        const entry = registry.find(e => e.id === 'docs/coding-conventions.md');
        if (!entry) {
            console.error('Conventions document not found in registry.');
            process.exit(1);
        }
        process.stdout.write(loadDocContent(entry) + '\n');
    });

//----------------------------------------------------------------------
// Subcommand: index
//----------------------------------------------------------------------
program
    .command('index')
    .description('Print documentation index -- shortcut for "read docs/README.md".')
    .action(() => {
        const entry = registry.find(e => e.id === 'docs/README.md');
        if (!entry) {
            console.error('Index document not found in registry.');
            process.exit(1);
        }
        process.stdout.write(loadDocContent(entry) + '\n');
    });

//----------------------------------------------------------------------
// Subcommand: ping
//----------------------------------------------------------------------
program
    .command('ping')
    .description('Verify the hoist-docs CLI is running and the doc registry loads.')
    .action(() => {
        // Registry is loaded at module init above; reaching here confirms it.
        process.stdout.write(
            `hoist-docs CLI is running (@xh/hoist v${resolveHoistVersion()}, ${registry.length} docs indexed).\n`
        );
    });

program.parse();
