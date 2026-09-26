/**
 * The `hoist-ts` command definition -- TypeScript symbol search and inspection.
 *
 * Wraps the same search engine and shared formatters used by the MCP server, producing
 * identical output via shell commands instead of MCP tool calls. `ts.ts` is the entry point;
 * `createTsCommand` takes an io object so the parity spec can run commands in-process.
 */
import {Command} from 'commander';

import {DEFAULT_SEARCH_LIMIT, MAX_SEARCH_LIMIT, searchSymbols} from '../data/symbol-search.js';
import type {SymbolKind} from '../data/ts-registry.js';
import {
    describeMembers,
    describeSymbol,
    formatSymbolSearch,
    FULL_DETAIL_MAX_TOKENS,
    searchNextHint,
    toSearchSymbolsOutput,
    type SearchDetail
} from '../formatters/typescript.js';

const SYMBOL_KINDS = ['class', 'interface', 'type', 'function', 'const', 'enum'] as const,
    MEMBER_KINDS = ['property', 'method', 'accessor'] as const,
    MEMBER_DETAILS = ['full', 'summary'] as const,
    INCLUDES = ['own', 'inherited', 'all'] as const,
    DETAILS = ['concise', 'full'] as const;

/** Where a command writes and how it exits - `process` for the real CLI, buffers in specs. */
export interface CliIo {
    stdout: (text: string) => void;
    stderr: (text: string) => void;
    exit: (code: number) => never;
}

export const processIo: CliIo = {
    stdout: text => void process.stdout.write(text),
    stderr: text => void process.stderr.write(text),
    exit: code => process.exit(code)
};

/**
 * Build the `hoist-ts` command. The entry point (`ts.ts`) parses it against `process.argv`;
 * the parity spec runs it in-process with buffered io, so every check does not pay a cold
 * `tsx` start.
 */
export function createTsCommand(io: CliIo = processIo): Command {
    const fail = (message: string): never => {
        io.stderr(message + '\n');
        return io.exit(1);
    };

    function validateChoice<T extends string>(
        label: string,
        value: string | undefined,
        choices: readonly T[]
    ): T | undefined {
        if (value == null) return undefined;
        if (!choices.includes(value as T)) {
            fail(`Invalid ${label}: "${value}". Valid values: ${choices.join(', ')}`);
        }
        return value as T;
    }

    function validateLimit(value: string, min: number, max: number): number {
        const n = parseInt(value, 10);
        if (isNaN(n) || n < min || n > max) {
            fail(`Invalid limit: "${value}". Must be a number between ${min} and ${max}.`);
        }
        return n;
    }

    // Route commander's own output and exits through io as well, so a spec captures usage
    // errors and --help instead of the process ending. Set before subcommands are created, as
    // they copy these settings from the parent.
    const program = new Command()
        .name('hoist-ts')
        .description('Search and inspect hoist-react TypeScript symbols, types, and class members.')
        .version('2.0.0')
        .configureOutput({writeOut: io.stdout, writeErr: io.stderr})
        .exitOverride(err => io.exit(err.exitCode));

    program.addHelpText(
        'after',
        `
Examples:
  hoist-ts search GridModel                     Ranked search: symbols and members, one line each
  hoist-ts search headerName                    Find which class or config owns a property
  hoist-ts search "StoreRecord raw"             Owner + member name
  hoist-ts search Store --kind class            Only classes
  hoist-ts search loading --detail full         Complete JSDoc for every hit
  hoist-ts search chooser --include-internal    Search impl/ and admin/ code too
  hoist-ts symbol GridModel                     Import line, signature, docs, member summary
  hoist-ts symbol FieldType --kind const        One of two same-named declarations
  hoist-ts symbol View --file data/cube/View.ts Disambiguate by file path
  hoist-ts members GridModel --filter col       Members whose name contains "col"
  hoist-ts members PanelModel --include own --kind method
  hoist-ts members ButtonProps --filter click   Finds onClick among external (Blueprint) members`
    );

    //----------------------------------------------------------------------
    // Subcommand: search
    //----------------------------------------------------------------------
    program
        .command('search')
        .description(
            'Ranked search over symbols (classes, interfaces, types, functions, component factories) and the members of exported classes and *Config / *Spec interfaces. One line per hit with kind, name, public import path, and first JSDoc sentence. One strong keyword works best; camelCase names match their parts.'
        )
        .argument(
            '<query>',
            'One strong keyword, ideally an API name (e.g. "GridModel", "headerName"), or a few terms'
        )
        .option('-k, --kind <kind>', `Restrict symbols to one kind: ${SYMBOL_KINDS.join(', ')}`)
        .option(
            '-l, --limit <n>',
            `Maximum symbol results and maximum member results (1-${MAX_SEARCH_LIMIT})`,
            String(DEFAULT_SEARCH_LIMIT)
        )
        .option(
            '-d, --detail <level>',
            'concise (default) or full (complete JSDoc per hit)',
            'concise'
        )
        .option(
            '--include-internal',
            'Include impl/, admin/, inspector/, dynamics/ code and non-exported symbols'
        )
        .option(
            '--exported <bool>',
            'Exported symbols only (true|false). Default: true, or false with --include-internal'
        )
        .option(
            '--json',
            'Output machine-readable JSON matching the MCP outputSchema instead of formatted text.'
        )
        .action(
            async (
                query: string,
                opts: {
                    kind?: string;
                    limit: string;
                    detail: string;
                    includeInternal?: boolean;
                    exported?: string;
                    json?: boolean;
                }
            ) => {
                const kind = validateChoice('kind', opts.kind, SYMBOL_KINDS) as
                        SymbolKind | undefined,
                    detail = validateChoice('detail', opts.detail, DETAILS) as SearchDetail,
                    exported = validateChoice('exported', opts.exported, [
                        'true',
                        'false'
                    ] as const),
                    limit = validateLimit(opts.limit, 1, MAX_SEARCH_LIMIT);

                const results = await searchSymbols(query, {
                    kind,
                    limit,
                    includeInternal: opts.includeInternal,
                    exported: exported == null ? undefined : exported === 'true'
                });

                if (opts.json) {
                    io.stdout(
                        JSON.stringify(toSearchSymbolsOutput(results, detail), null, 2) + '\n'
                    );
                    return;
                }

                io.stdout(
                    `${formatSymbolSearch(results, detail)}\n\n${searchNextHint('cli', results)}\n`
                );
            }
        );

    //----------------------------------------------------------------------
    // Subcommand: symbol
    //----------------------------------------------------------------------
    program
        .command('symbol')
        .description(
            'Describe a symbol by exact name: public import line, signature, JSDoc, inheritance, decorators, source location, and for classes and interfaces a compact member summary.'
        )
        .argument('<name>', 'Exact symbol name (e.g. "GridModel", "ColumnSpec")')
        .option(
            '-f, --file <path>',
            'Repo-relative source file path to disambiguate duplicate names'
        )
        .option(
            '-k, --kind <kind>',
            `Select one declaration when a name is both a const and a type: ${SYMBOL_KINDS.join(', ')}`
        )
        .option(
            '--json',
            'Output machine-readable JSON matching the MCP outputSchema instead of formatted text.'
        )
        .action(async (name: string, opts: {file?: string; kind?: string; json?: boolean}) => {
            const kind = validateChoice('kind', opts.kind, SYMBOL_KINDS) as SymbolKind | undefined,
                result = await describeSymbol({name, filePath: opts.file, kind}, 'cli');
            if (!result.ok) return fail(result.text);
            if (opts.json) {
                io.stdout(JSON.stringify(result.structured, null, 2) + '\n');
                return;
            }
            const text = result.hint ? `${result.text}\n\n${result.hint}` : result.text;
            io.stdout(text + '\n');
        });

    //----------------------------------------------------------------------
    // Subcommand: members
    //----------------------------------------------------------------------
    program
        .command('members')
        .description(
            'List the members of a class or interface with types, decorators, defaults, and JSDoc - own, inherited (grouped by declaring type), and inherited from types outside hoist-react. Narrow with --filter, --include, and --kind.'
        )
        .argument('<name>', 'Class or interface name (e.g. "GridModel", "ButtonProps")')
        .option(
            '-f, --file <path>',
            'Repo-relative source file path to disambiguate duplicate names'
        )
        .option('--filter <text>', 'Case-insensitive substring to match against member names')
        .option('-i, --include <which>', `Which members: ${INCLUDES.join(', ')}`, 'all')
        .option('-k, --kind <kind>', `Restrict to one member kind: ${MEMBER_KINDS.join(', ')}`)
        .option(
            '-d, --detail <level>',
            `full (complete JSDoc) or summary (one line per member). Default: full; only an unfiltered listing over ${FULL_DETAIL_MAX_TOKENS} tokens falls back to summary`
        )
        .option(
            '--json',
            'Output machine-readable JSON matching the MCP outputSchema instead of formatted text.'
        )
        .action(
            async (
                name: string,
                opts: {
                    file?: string;
                    filter?: string;
                    include: string;
                    kind?: string;
                    detail?: string;
                    json?: boolean;
                }
            ) => {
                const include = validateChoice('include', opts.include, INCLUDES),
                    memberKind = validateChoice('kind', opts.kind, MEMBER_KINDS),
                    detail = validateChoice('detail', opts.detail, MEMBER_DETAILS),
                    result = await describeMembers(
                        {
                            name,
                            filePath: opts.file,
                            filter: opts.filter,
                            include,
                            memberKind,
                            detail
                        },
                        'cli'
                    );
                if (!result.ok) return fail(result.text);
                if (opts.json) {
                    io.stdout(JSON.stringify(result.structured, null, 2) + '\n');
                    return;
                }
                io.stdout(`${result.text}\n\n${result.hint}\n`);
            }
        );

    return program;
}
