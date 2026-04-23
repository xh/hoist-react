import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {log} from './util/logger.js';
import {registerDocResources} from './resources/docs.js';
import {registerDocTools} from './tools/docs.js';
import {registerTsTools} from './tools/typescript.js';
import {beginInitialization} from './data/ts-registry.js';

const server = new McpServer(
    {
        name: 'hoist-react',
        version: '1.0.0'
    },
    {
        instructions:
            'Authoritative reference for the @xh/hoist React framework, used when writing or modifying any code that consumes Hoist APIs, components, models, services, or patterns (also applicable to hoist-react library development itself). Do not guess at Hoist APIs, prop names, or framework conventions - consult these tools first. Start with hoist-search-docs or hoist-search-symbols to discover exact doc IDs and symbol names, then drill in with hoist-get-symbol, hoist-get-members, or the hoist://docs/{id} resource. Use hoist-list-docs to browse the doc catalog.'
    }
);

registerDocResources(server);
registerDocTools(server);
registerTsTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);

log.info('Server started, awaiting MCP client connection via stdio');

// Warm the TypeScript symbol and member indexes in the background so the
// first tool invocation doesn't pay the full initialization cost.
beginInitialization();
