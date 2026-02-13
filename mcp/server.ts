import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {log} from './util/logger.js';
import {registerDocResources} from './resources/docs.js';
import {registerDocTools} from './tools/docs.js';

const server = new McpServer({
    name: 'hoist-react',
    version: '1.0.0'
});

registerDocResources(server);
registerDocTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);

log.info('Server started, awaiting MCP client connection via stdio');
