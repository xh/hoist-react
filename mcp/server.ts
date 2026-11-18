import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {log} from './util/logger.js';
import {registerDocResources} from './resources/docs.js';
import {registerDocTools} from './tools/docs.js';
import {registerTsTools} from './tools/typescript.js';
import {beginInitialization} from './data/ts-registry.js';
import {loadRegistry} from './data/doc-registry.js';
import {buildServerInstructions} from './instructions.js';

const registry = loadRegistry();

const server = new McpServer(
    {
        name: 'hoist-react',
        version: '1.0.0'
    },
    {
        instructions: buildServerInstructions(registry)
    }
);

registerDocResources(server, registry);
registerDocTools(server, registry);
registerTsTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);

log.info('Server started, awaiting MCP client connection via stdio');

// Warm the TypeScript symbol and member indexes in the background so the
// first tool invocation doesn't pay the full initialization cost.
beginInitialization();
