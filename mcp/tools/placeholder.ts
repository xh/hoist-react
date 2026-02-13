import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';

/** Register placeholder tools for Phase 1 connectivity testing. */
export function registerTools(server: McpServer) {
    server.registerTool(
        'hoist-ping',
        {
            title: 'Hoist Ping',
            description: 'Verify the Hoist MCP server is running and responsive',
            inputSchema: z.object({})
        },
        async () => ({
            content: [{type: 'text' as const, text: 'Hoist MCP server is running.'}]
        })
    );
}
