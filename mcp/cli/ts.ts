/**
 * CLI entry point for hoist-ts -- TypeScript symbol search and inspection.
 *
 * Wraps the same ts-registry logic used by the MCP server, producing identical
 * output via shell commands instead of MCP tool calls.
 */
import {Command} from 'commander';

import {
    searchSymbols,
    searchMembers,
    getSymbolDetail,
    getMembers,
    getCompanionSymbols,
    findAlternateEntries
} from '../data/ts-registry.js';
import {
    formatSymbolSearch,
    formatSymbolDetail,
    formatMembers,
    toSearchSymbolsOutput,
    toGetSymbolOutput,
    toGetMembersOutput
} from '../formatters/typescript.js';

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
  hoist-ts search "panel modal"                  Multi-word search (matches name + JSDoc)
  hoist-ts search "StoreRecord raw"              Search class + member name
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
        'Search for TypeScript symbols and class members by name, JSDoc content, and own member names. Multi-word queries match all terms against the combined text — e.g. "StoreRecord raw" finds StoreRecord via its raw property. Also searches public members of every exported class and every exported `*Config` interface by owner name, member name, and member JSDoc.'
    )
    .argument(
        '<query>',
        'Search query — symbol name, keyword, class + member name (e.g. "StoreRecord raw"), or multiple terms (e.g. "panel modal")'
    )
    .option(
        '-k, --kind <kind>',
        'Filter symbols by kind: class, interface, type, function, const, enum'
    )
    .option('-l, --limit <n>', 'Maximum results (1-50)', '20')
    .option(
        '--json',
        'Output machine-readable JSON matching the MCP outputSchema instead of formatted text.'
    )
    .action(async (query: string, opts: {kind?: string; limit: string; json?: boolean}) => {
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

        if (opts.json) {
            const structured = toSearchSymbolsOutput(query, symbolResults, memberResults);
            process.stdout.write(JSON.stringify(structured, null, 2) + '\n');
            return;
        }

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
    .option(
        '--json',
        'Output machine-readable JSON matching the MCP outputSchema instead of formatted text.'
    )
    .action(async (name: string, opts: {file?: string; json?: boolean}) => {
        const detail = await getSymbolDetail(name, opts.file);

        if (opts.json) {
            const companions = detail ? await getCompanionSymbols(detail) : [];
            const alternates =
                detail && !opts.file ? findAlternateEntries(name, detail.filePath) : [];
            const structured = toGetSymbolOutput(name, detail, companions, alternates);
            process.stdout.write(JSON.stringify(structured, null, 2) + '\n');
            if (!detail) process.exit(1);
            return;
        }

        if (!detail) {
            console.error(formatSymbolDetail(detail, name));
            process.exit(1);
        }

        const companions = await getCompanionSymbols(detail);
        let text = formatSymbolDetail(detail, name, companions);
        if (detail.kind === 'class' || detail.kind === 'interface') {
            text +=
                '\n\nTip: Use `hoist-ts members ' + name + '` to see all properties and methods.';
        }

        if (!opts.file) {
            const alternates = findAlternateEntries(name, detail.filePath);
            if (alternates.length > 0) {
                const altList = alternates
                    .map(
                        a =>
                            `  - [${a.kind}] ${a.sourcePackage} (${a.filePath.replace(/.*\/hoist-react\//, '')})`
                    )
                    .join('\n');
                text += `\n\nNote: ${alternates.length + 1} symbols named "${name}" exist. Use --file to disambiguate:\n${altList}`;
            }
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
    .option(
        '--json',
        'Output machine-readable JSON matching the MCP outputSchema instead of formatted text.'
    )
    .action(async (name: string, opts: {file?: string; json?: boolean}) => {
        const result = await getMembers(name, opts.file);

        if (opts.json) {
            const alternates =
                result && !opts.file ? findAlternateEntries(name, result.symbol.filePath) : [];
            const structured = toGetMembersOutput(name, result, alternates);
            process.stdout.write(JSON.stringify(structured, null, 2) + '\n');
            if (!result) process.exit(1);
            return;
        }

        if (!result) {
            console.error(formatMembers(result, name));
            process.exit(1);
        }

        let text = formatMembers(result, name);

        if (!opts.file) {
            const alternates = findAlternateEntries(name, result.symbol.filePath);
            if (alternates.length > 0) {
                const altList = alternates
                    .map(
                        a =>
                            `  - [${a.kind}] ${a.sourcePackage} (${a.filePath.replace(/.*\/hoist-react\//, '')})`
                    )
                    .join('\n');
                text += `\n\nNote: ${alternates.length + 1} symbols named "${name}" exist. Use --file to disambiguate:\n${altList}`;
            }
        }

        process.stdout.write(text + '\n');
    });

program.parseAsync();
