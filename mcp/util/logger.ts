/**
 * Stderr-only logger for the Hoist MCP server.
 *
 * CRITICAL: All MCP server logging MUST use this utility. The stdout stream is
 * reserved exclusively for JSON-RPC protocol messages -- any non-protocol output
 * on stdout will corrupt the MCP communication channel.
 *
 * Enable debug logging by setting the HOIST_MCP_DEBUG environment variable.
 */
export const log = {
    info: (...args: unknown[]) => console.error('[hoist-mcp]', ...args),
    warn: (...args: unknown[]) => console.error('[hoist-mcp] WARN:', ...args),
    error: (...args: unknown[]) => console.error('[hoist-mcp] ERROR:', ...args),
    debug: (...args: unknown[]) => {
        if (process.env.HOIST_MCP_DEBUG) {
            console.error('[hoist-mcp] DEBUG:', ...args);
        }
    }
};
