import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {log} from './util/logger.js';
import {registerTools} from './tools/placeholder.js';
import {registerResources} from './resources/placeholder.js';

const server = new McpServer({
    name: 'hoist-react',
    version: '1.0.0'
});

registerTools(server);
registerResources(server);

const transport = new StdioServerTransport();
await server.connect(transport);

log.info('Server started, awaiting MCP client connection via stdio');
