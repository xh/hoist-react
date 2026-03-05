/**
 * CLI entry point for hoist-ts -- TypeScript symbol search and inspection.
 *
 * Wraps the same ts-registry logic used by the MCP server, producing identical
 * output via shell commands instead of MCP tool calls.
 */
import {Command} from 'commander';

import {searchSymbols, searchMembers, getSymbolDetail, getMembers} from '../data/ts-registry.js';
import {formatSymbolSearch, formatSymbolDetail, formatMembers} from '../formatters/typescript.js';

const VALID_KINDS = ['class', 'interface', 'type', 'function', 'const', 'enum'] as const;

function validateKind(value: string | undefined): void {
    if (value && !VALID_KINDS.includes(value as (typeof VALID_KINDS)[number])) {
        console.error(`Invalid kind: "${value}". Valid kinds: ${VALID_KINDS.join(', ')}`);
        process.exit(1);
    }
}

function validateLimit(value: string, min: number, max: number): void {
    const n = parseInt(value, 10);
    if (isNaN(n) || n < min || n > max) {
        console.error(`Invalid limit: "${value}". Must be a number between ${min} and ${max}.`);
        process.exit(1);
    }
}

const program = new Command()
    .name('hoist-ts')
    .description('Search and inspect hoist-react TypeScript symbols, types, and class members.')
    .version('1.0.0');

program.addHelpText(
    'after',
    `
Examples:
  hoist-ts search GridModel                     Search for symbols named GridModel
  hoist-ts search Store --kind class             Search only classes
  hoist-ts search lastLoadCompleted              Search symbols and class members
  hoist-ts symbol GridModel                      Get full details for GridModel
  hoist-ts members GridModel                     List all GridModel properties and methods
  hoist-ts members Store                         List all Store members`
);

//----------------------------------------------------------------------
// Subcommand: search
//----------------------------------------------------------------------
program
    .command('search')
    .description(
        'Search for TypeScript symbols and class members by name. Searches both top-level symbols (classes, interfaces, types, functions) and public members of key framework classes.'
    )
    .argument('<query>', 'Symbol or member name to search for')
    .option(
        '-k, --kind <kind>',
        'Filter symbols by kind: class, interface, type, function, const, enum'
    )
    .option('-l, --limit <n>', 'Maximum results (1-50)', '20')
    .action(async (query: string, opts: {kind?: string; limit: string}) => {
        validateKind(opts.kind);
        validateLimit(opts.limit, 1, 50);
        const symbolLimit = parseInt(opts.limit, 10);
        const symbolResults = await searchSymbols(query, {
            kind: opts.kind as
                | 'class'
                | 'interface'
                | 'type'
                | 'function'
                | 'const'
                | 'enum'
                | undefined,
            exported: true,
            limit: symbolLimit
        });

        const memberLimit = symbolResults.length === 0 ? symbolLimit : 15;
        const memberResults = await searchMembers(query, {limit: memberLimit});

        let text = formatSymbolSearch(symbolResults, memberResults, query);
        if (symbolResults.length > 0 || memberResults.length > 0) {
            text += '\n\nTip: Use `hoist-ts members <ClassName>` to see all members of a class.';
        }
        process.stdout.write(text + '\n');
    });

//----------------------------------------------------------------------
// Subcommand: symbol
//----------------------------------------------------------------------
program
    .command('symbol')
    .description(
        'Get detailed type information for a specific symbol: signature, JSDoc, inheritance, decorators, and source location.'
    )
    .argument('<name>', 'Exact symbol name (e.g. "GridModel", "Store")')
    .option('-f, --file <path>', 'Source file path to disambiguate duplicate names')
    .action(async (name: string, opts: {file?: string}) => {
        const detail = await getSymbolDetail(name, opts.file);
        if (!detail) {
            console.error(formatSymbolDetail(detail, name));
            process.exit(1);
        }

        let text = formatSymbolDetail(detail, name);
        if (detail.kind === 'class' || detail.kind === 'interface') {
            text +=
                '\n\nTip: Use `hoist-ts members ' + name + '` to see all properties and methods.';
        }
        process.stdout.write(text + '\n');
    });

//----------------------------------------------------------------------
// Subcommand: members
//----------------------------------------------------------------------
program
    .command('members')
    .description(
        'List all properties and methods of a class or interface with types, decorators, and JSDoc.'
    )
    .argument('<name>', 'Class or interface name (e.g. "GridModel", "HoistModel")')
    .option('-f, --file <path>', 'Source file path to disambiguate duplicate names')
    .action(async (name: string, opts: {file?: string}) => {
        const result = await getMembers(name, opts.file);
        if (!result) {
            console.error(formatMembers(result, name));
            process.exit(1);
        }
        process.stdout.write(formatMembers(result, name) + '\n');
    });

program.parseAsync();
