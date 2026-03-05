/**
 * CLI entry point for hoist-docs -- documentation search, listing, and reading.
 *
 * Wraps the same doc-registry logic used by the MCP server, producing identical
 * output via shell commands instead of MCP tool calls.
 */
import {Command} from 'commander';

import {buildRegistry, searchDocs, loadDocContent, type DocCategory} from '../data/doc-registry.js';
import {formatSearchResults, formatDocList} from '../formatters/docs.js';
import {resolveRepoRoot} from '../util/paths.js';

const VALID_CATEGORIES = ['package', 'concept', 'devops', 'conventions', 'all'] as const;

function validateCategory(value: string): string {
    if (!VALID_CATEGORIES.includes(value as (typeof VALID_CATEGORIES)[number])) {
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

const registry = buildRegistry(resolveRepoRoot());

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
  hoist-docs read cmp/grid                       Read the Grid component README
  hoist-docs conventions                         Print coding conventions (AGENTS.md)
  hoist-docs index                               Print the documentation index`
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
        'Filter by category: package, concept, devops, conventions, all',
        'all'
    )
    .option('-l, --limit <n>', 'Maximum number of results (1-20)', '10')
    .action((query: string, opts: {category: string; limit: string}) => {
        validateCategory(opts.category);
        validateLimit(opts.limit, 1, 20);

        const results = searchDocs(registry, query, {
            category: opts.category as DocCategory | 'all',
            limit: parseInt(opts.limit, 10)
        });

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
        'Filter by category: package, concept, devops, conventions, all',
        'all'
    )
    .action((opts: {category: string}) => {
        validateCategory(opts.category);
        let text = formatDocList(registry, opts.category);
        text += 'Read any document using: hoist-docs read <id>';
        process.stdout.write(text + '\n');
    });

//----------------------------------------------------------------------
// Subcommand: read
//----------------------------------------------------------------------
program
    .command('read')
    .description('Read a specific document by ID (e.g. "cmp/grid", "core", "lifecycle-app").')
    .argument('<docId>', 'Document ID from search or list output')
    .action((docId: string) => {
        const entry = registry.find(e => e.id === docId);
        if (!entry) {
            const ids = registry.map(e => e.id).join(', ');
            console.error(`Unknown document ID: "${docId}". Available IDs: ${ids}`);
            process.exit(1);
        }
        process.stdout.write(loadDocContent(entry) + '\n');
    });

//----------------------------------------------------------------------
// Subcommand: conventions
//----------------------------------------------------------------------
program
    .command('conventions')
    .description('Print coding conventions (AGENTS.md) -- shortcut for "read conventions".')
    .action(() => {
        const entry = registry.find(e => e.id === 'conventions');
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
    .description('Print documentation index (docs/README.md) -- shortcut for "read index".')
    .action(() => {
        const entry = registry.find(e => e.id === 'index');
        if (!entry) {
            console.error('Index document not found in registry.');
            process.exit(1);
        }
        process.stdout.write(loadDocContent(entry) + '\n');
    });

program.parse();
