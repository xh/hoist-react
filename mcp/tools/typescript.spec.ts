/**
 * MCP / CLI parity check for the TypeScript tools. Run with:
 *   npx tsx mcp/tools/typescript.spec.ts
 *
 * Self-contained, exit-coded driver (the repo has no general test framework). Registers the
 * TypeScript tools on an in-process MCP server, calls them through a real MCP client over an
 * in-memory transport, and compares each result with the `hoist-ts` CLI run for the same
 * arguments:
 *   - `--json` output must equal the tool's `structuredContent`
 *   - text output must equal the tool's text content, apart from the trailing next-step hint
 *     that differs by surface
 *   - errors are `isError` on MCP and a non-zero exit with the same message on the CLI
 */
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';

import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js';
import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';

import {registerTsTools} from './typescript.js';
import {createTsCommand} from '../cli/ts-command.js';
import type {SymbolKind} from '../data/ts-registry.js';
import {symbolNextHint} from '../formatters/typescript.js';
import {resolveRepoRoot} from '../util/paths.js';

process.env.HOIST_MCP_QUIET = '1';

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

/** Thrown by the in-process CLI's exit hook, carrying the exit code. */
class CliExit extends Error {
    constructor(public code: number) {
        super(`exit ${code}`);
    }
}

/** Run the CLI in-process with buffered io, returning its status and trimmed stdout and stderr. */
async function runCli(
    ...args: string[]
): Promise<{status: number; stdout: string; stderr: string}> {
    let stdout = '',
        stderr = '';
    const command = createTsCommand({
        stdout: text => void (stdout += text),
        stderr: text => void (stderr += text),
        exit: code => {
            throw new CliExit(code);
        }
    });
    let status = 0;
    try {
        await command.parseAsync(['node', 'hoist-ts', ...args]);
    } catch (e) {
        if (!(e instanceof CliExit)) throw e;
        status = e.code;
    }
    return {status, stdout: stdout.trimEnd(), stderr: stderr.trimEnd()};
}

async function cli(...args: string[]): Promise<string> {
    const res = await runCli(...args);
    if (res.status !== 0) throw new Error(`hoist-ts ${args.join(' ')} failed: ${res.stderr}`);
    return res.stdout;
}

const server = new McpServer({name: 'hoist-react-spec', version: '0.0.0'});
registerTsTools(server);
const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair(),
    client = new Client({name: 'spec', version: '0.0.0'});
await server.connect(serverTransport);
await client.connect(clientTransport);

async function tool(name: string, args: Record<string, unknown>) {
    const res = await client.callTool({name, arguments: args}),
        content = res.content as Array<{type: string; text: string}>;
    return {text: content[0].text, structured: res.structuredContent, isError: res.isError};
}

const sameJson = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b),
    /** Text before the trailing hint paragraph, which is the only surface-specific part. */
    body = (text: string) => text.slice(0, text.lastIndexOf('\n\n'));

//------------------------------------------------------------------
// Search
//------------------------------------------------------------------
console.log('hoist-search-symbols vs hoist-ts search:');
for (const query of ['headerName', 'PanelModel persistWith collapsed', 'toolbar onClick button']) {
    const mcp = await tool('hoist-search-symbols', {query}),
        json = JSON.parse(await cli('search', query, '--json')),
        text = await cli('search', query);

    check(`"${query}" --json equals structuredContent`, sameJson(json, mcp.structured));
    check(`"${query}" text matches apart from the hint`, body(mcp.text) === body(text));
}
{
    const args = {query: 'loading', detail: 'full', limit: 3, kind: 'class'},
        mcp = await tool('hoist-search-symbols', args),
        json = JSON.parse(
            await cli(
                'search',
                'loading',
                '--detail',
                'full',
                '--limit',
                '3',
                '--kind',
                'class',
                '--json'
            )
        );
    check('detail/limit/kind: --json equals structuredContent', sameJson(json, mcp.structured));
    check(
        'detail full includes jsDoc in structured output',
        (mcp.structured as {symbols: Array<{jsDoc?: string}>}).symbols.every(s => s.jsDoc != null)
    );

    const internal = await tool('hoist-search-symbols', {
            query: 'chooserNameColumn',
            includeInternal: true
        }),
        internalJson = JSON.parse(
            await cli('search', 'chooserNameColumn', '--include-internal', '--json')
        );
    check(
        'includeInternal: --json equals structuredContent',
        sameJson(internalJson, internal.structured)
    );

    const none = await tool('hoist-search-symbols', {query: 'the and of'}),
        noneCli = await cli('search', 'the and of');
    check('no-result text matches apart from the hint', body(none.text) === body(noneCli));
}

//------------------------------------------------------------------
// Symbol
//------------------------------------------------------------------
console.log('hoist-get-symbol vs hoist-ts symbol:');
for (const [name, extra, cliExtra] of [
    ['ColumnSpec', {}, []],
    ['GridModel', {}, []],
    ['FieldType', {}, []],
    ['FieldType', {kind: 'const'}, ['--kind', 'const']],
    ['panel', {}, []],
    ['XH', {}, []],
    ['View', {filePath: 'data/cube/View.ts'}, ['--file', 'data/cube/View.ts']],
    ['catchDefault', {}, []]
] as Array<[string, Record<string, unknown>, string[]]>) {
    const label = `${name}${cliExtra.length ? ' ' + cliExtra.join(' ') : ''}`,
        mcp = await tool('hoist-get-symbol', {name, ...extra}),
        structured = mcp.structured as {
            symbol: {name: string; kind: SymbolKind; instanceOf?: string};
            companions: Array<{name: string; kind: SymbolKind}>;
        },
        hint = symbolNextHint('mcp', structured.symbol, structured.companions);
    check(
        `${label} --json equals structuredContent`,
        sameJson(JSON.parse(await cli('symbol', name, ...cliExtra, '--json')), mcp.structured)
    );
    // A symbol without a hint (e.g. a function) has no trailing paragraph to strip.
    const strip = (text: string) => (hint ? body(text) : text);
    check(
        `${label} text matches apart from the hint`,
        strip(mcp.text) === strip(await cli('symbol', name, ...cliExtra))
    );
}
{
    const miss = await tool('hoist-get-symbol', {name: 'NoSuchSymbolXyz'}),
        missCli = await runCli('symbol', 'NoSuchSymbolXyz');
    check(
        'unknown symbol is an error on both surfaces',
        miss.isError === true && missCli.status === 1
    );
    check(
        'unknown symbol message matches apart from the hint',
        miss.text.split('. ')[0] === missCli.stderr.split('. ')[0]
    );
}

//------------------------------------------------------------------
// Members
//------------------------------------------------------------------
console.log('hoist-get-members vs hoist-ts members:');
for (const [name, extra, cliExtra] of [
    ['GridModel', {filter: 'col'}, ['--filter', 'col']],
    ['GridModel', {filter: 'columns'}, ['--filter', 'columns']],
    ['ButtonProps', {}, []],
    ['ButtonProps', {filter: 'click'}, ['--filter', 'click']],
    [
        'PanelModel',
        {include: 'own', memberKind: 'method'},
        ['--include', 'own', '--kind', 'method']
    ],
    [
        'DashContainerModel',
        {include: 'inherited', detail: 'summary'},
        ['--include', 'inherited', '--detail', 'summary']
    ],
    ['Column', {filter: 'headerName'}, ['--filter', 'headerName']]
] as Array<[string, Record<string, unknown>, string[]]>) {
    const label = `${name}${cliExtra.length ? ' ' + cliExtra.join(' ') : ''}`,
        mcp = await tool('hoist-get-members', {name, ...extra});
    check(
        `${label} --json equals structuredContent`,
        sameJson(JSON.parse(await cli('members', name, ...cliExtra, '--json')), mcp.structured)
    );
    check(
        `${label} text matches apart from the hint`,
        body(mcp.text) === body(await cli('members', name, ...cliExtra))
    );
}
{
    const wrongKind = await tool('hoist-get-members', {name: 'FieldType'}),
        wrongKindCli = await runCli('members', 'FieldType');
    check(
        'const/type target is an error on both surfaces',
        wrongKind.isError === true && wrongKindCli.status === 1
    );
    check(
        'const/type error names the kinds and the right tool',
        wrongKind.text.includes('type and const') &&
            wrongKind.text.includes('hoist-get-symbol') &&
            wrongKindCli.stderr.includes('hoist-ts symbol')
    );
}

//------------------------------------------------------------------
// Entry point smoke check: the real bin, spawned once.
//------------------------------------------------------------------
console.log('bin/hoist-ts.mjs:');
{
    const res = spawnSync(
            process.execPath,
            [
                resolve(resolveRepoRoot(), 'bin', 'hoist-ts.mjs'),
                'search',
                'GridModel',
                '--limit',
                '1',
                '--json'
            ],
            {encoding: 'utf8'}
        ),
        inProcess = await cli('search', 'GridModel', '--limit', '1', '--json');
    check(
        'spawned CLI matches the in-process command',
        res.status === 0 && res.stdout.trimEnd() === inProcess,
        res.stderr.trimEnd()
    );
}

await client.close();
console.log(`\nTotal: ${passed} passed, ${failed} failed.`);
process.exit(failed === 0 ? 0 : 1);
