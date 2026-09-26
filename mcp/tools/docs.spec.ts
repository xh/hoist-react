/**
 * MCP / CLI parity check for the documentation tools. Run with:
 *   npx tsx mcp/tools/docs.spec.ts
 *
 * Self-contained, exit-coded driver (the repo has no general test framework). Registers the doc
 * tools on an in-process MCP server, calls them through a real MCP client over an in-memory
 * transport, and compares each result with the `hoist-docs` CLI run for the same arguments:
 *   - `--json` output must equal the tool's `structuredContent`
 *   - text output must equal the tool's text content, apart from the one-line read-more hint
 *     that differs by surface
 */
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';

import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js';
import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';

import {registerDocTools} from './docs.js';
import {searchReadHint} from '../formatters/docs.js';
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

const cliPath = resolve(resolveRepoRoot(), 'bin', 'hoist-docs.mjs');

/** Run the CLI, returning stdout and stderr with trailing whitespace trimmed. */
function runCli(...args: string[]): {stdout: string; stderr: string} {
    const res = spawnSync(process.execPath, [cliPath, ...args], {encoding: 'utf8'});
    if (res.status !== 0) throw new Error(`hoist-docs ${args.join(' ')} failed: ${res.stderr}`);
    return {stdout: res.stdout.trimEnd(), stderr: res.stderr.trimEnd()};
}

const cli = (...args: string[]) => runCli(...args).stdout;

const server = new McpServer({name: 'hoist-react-spec', version: '0.0.0'});
registerDocTools(server);
const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair(),
    client = new Client({name: 'spec', version: '0.0.0'});
await server.connect(serverTransport);
await client.connect(clientTransport);

async function tool(name: string, args: Record<string, unknown>) {
    const res = await client.callTool({name, arguments: args}),
        content = res.content as Array<{type: string; text: string}>;
    return {text: content[0].text, structured: res.structuredContent, isError: res.isError};
}

const withoutHint = (text: string, hint: string) => text.replace(`\n\n${hint}`, '');

//------------------------------------------------------------------
// Search
//------------------------------------------------------------------
console.log('hoist-search-docs vs hoist-docs search:');
for (const query of ['persistWith', 'mask panel during async call']) {
    const mcp = await tool('hoist-search-docs', {query}),
        json = JSON.parse(cli('search', query, '--json')),
        text = cli('search', query);

    check(
        `"${query}" --json equals structuredContent`,
        JSON.stringify(json) === JSON.stringify(mcp.structured)
    );
    check(
        `"${query}" text matches apart from the read hint`,
        withoutHint(mcp.text, searchReadHint('mcp')) === withoutHint(text, searchReadHint('cli'))
    );
}

//------------------------------------------------------------------
// Read
//------------------------------------------------------------------
console.log('hoist-read-doc vs hoist-docs read:');
{
    const id = 'docs/persistence.md',
        section = 'Built-in Model Support > GridModel';

    const mcpSection = await tool('hoist-read-doc', {id, section});
    check(
        'section --json equals structuredContent',
        JSON.stringify(JSON.parse(cli('read', id, '--section', section, '--json'))) ===
            JSON.stringify(mcpSection.structured)
    );
    check('section text matches', mcpSection.text === cli('read', id, '--section', section));

    const mcpOutline = await tool('hoist-read-doc', {id, outline: true}),
        cliOutline = cli('read', id, '--outline');
    check(
        'outline --json equals structuredContent',
        JSON.stringify(JSON.parse(cli('read', id, '--outline', '--json'))) ===
            JSON.stringify(mcpOutline.structured)
    );
    // Outline footers name each surface's own argument syntax.
    const body = (t: string) => t.split('\n').slice(0, -1).join('\n');
    check('outline text matches apart from the footer', body(mcpOutline.text) === body(cliOutline));

    // Full reads: MCP prepends the size note; the CLI sends it to stderr.
    const mcpFull = await tool('hoist-read-doc', {id}),
        cliFull = runCli('read', id);
    check(
        'full read: MCP text is size note + doc, CLI stdout is the doc',
        mcpFull.text.startsWith('This doc is ~') && mcpFull.text.trimEnd().endsWith(cliFull.stdout)
    );
    check(
        'full read: CLI writes the size note to stderr',
        cliFull.stderr.startsWith('This doc is ~')
    );

    const miss = await tool('hoist-read-doc', {id, section: 'Nonexistent Thing'});
    check('unknown section is an error', miss.isError === true && miss.text.includes('Sections:'));
}

await client.close();
console.log(`\nTotal: ${passed} passed, ${failed} failed.`);
process.exit(failed === 0 ? 0 : 1);
