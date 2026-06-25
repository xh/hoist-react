/**
 * CLI entry point for hoist-docs -- documentation search, listing, and reading.
 *
 * Wraps the same doc-registry logic used by the MCP server, producing identical
 * output via shell commands instead of MCP tool calls.
 */
import {Command} from 'commander';

import {buildRegistry, searchDocs, loadDocContent} from '../data/doc-registry.js';
import {resolveDocId} from '../data/doc-id-resolver.js';
import {
    formatSearchResults,
    formatDocList,
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
  hoist-docs search "grid sorting"              Search docs for grid sorting
  hoist-docs search "authentication" -c concept  Search only concept docs
  hoist-docs list                                List all available documents
  hoist-docs list -c package                     List only package docs
  hoist-docs read cmp/grid/README.md             Read the Grid component README (canonical id)
  hoist-docs read grid                           Same doc via a tolerated shortening
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
    .description('Search across all hoist-react documentation by keyword.')
    .argument('<query>', 'Search keywords (e.g. "grid column sorting")')
    .option(
        '-c, --category <category>',
        'Filter by category: ' + VALID_CATEGORIES.join(', '),
        'all'
    )
    .option('-l, --limit <n>', 'Maximum number of results (1-20)', '10')
    .option(
        '--json',
        'Output machine-readable JSON matching the MCP outputSchema instead of formatted text.'
    )
    .action((query: string, opts: {category: string; limit: string; json?: boolean}) => {
        validateCategory(opts.category);
        validateLimit(opts.limit, 1, 20);

        const results = searchDocs(registry, query, {
            mcpCategory: opts.category,
            limit: parseInt(opts.limit, 10)
        });

        if (opts.json) {
            const structured = toSearchDocsOutput(query, results);
            process.stdout.write(JSON.stringify(structured, null, 2) + '\n');
            return;
        }

        let text = formatSearchResults(results, query);
        if (results.length > 0) {
            text += '\nTip: Read any document using: hoist-docs read <id>';
        }
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
        'Read a specific document by ID. Accepts the canonical repo-relative path (e.g. "cmp/grid/README.md") and tolerates common shortenings: "core" → "core/README.md", "grid" → "cmp/grid/README.md", "authentication" → "docs/authentication.md", "v85" → upgrade notes for v85. When a shortening matches, the resolved canonical id is printed to stderr.'
    )
    .argument('<docId>', 'Document ID -- canonical path or a tolerated shortening')
    .action((docId: string) => {
        const result = resolveDocId(registry, docId);
        if (result.kind === 'unknown') {
            const tail =
                result.suggestions.length > 0
                    ? `Did you mean one of: ${result.suggestions.join(', ')}?`
                    : 'Run "hoist-docs list" to see all valid IDs.';
            console.error(`Unknown document ID: "${docId}". ${tail}`);
            process.exit(1);
        }

        // Notify on stderr when the input was a shortening, so the canonical id
        // is visible without corrupting the doc content on stdout.
        if (result.kind === 'normalized') {
            console.error(`Resolved "${docId}" → ${result.entry.id}`);
        }

        process.stdout.write(loadDocContent(result.entry) + '\n');
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
