import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';

/** Register placeholder resources for Phase 1 connectivity testing. */
export function registerResources(server: McpServer) {
    server.resource(
        'server-info',
        'hoist://server-info',
        {
            title: 'Server Info',
            description: 'Hoist MCP server metadata and status',
            mimeType: 'application/json'
        },
        async uri => ({
            contents: [
                {
                    uri: uri.href,
                    text: JSON.stringify(
                        {
                            name: 'hoist-react',
                            version: '1.0.0',
                            status: 'running',
                            phase: 'foundation'
                        },
                        null,
                        2
                    )
                }
            ]
        })
    );
}
