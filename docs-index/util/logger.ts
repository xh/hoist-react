/**
 * Stderr-only logger for the Hoist MCP server and CLI tools.
 *
 * CRITICAL: All MCP server logging MUST use this utility. The stdout stream is
 * reserved exclusively for JSON-RPC protocol messages -- any non-protocol output
 * on stdout will corrupt the MCP communication channel.
 *
 * Environment variables:
 * - HOIST_MCP_DEBUG: Enable verbose debug output.
 * - HOIST_MCP_QUIET: Suppress info-level messages (used by CLI tools).
 */
const quiet = !!process.env.HOIST_MCP_QUIET;

export const log = {
    info: (...args: unknown[]) => {
        if (!quiet) console.error('[hoist-docs-index]', ...args);
    },
    warn: (...args: unknown[]) => console.error('[hoist-docs-index] WARN:', ...args),
    error: (...args: unknown[]) => console.error('[hoist-docs-index] ERROR:', ...args),
    debug: (...args: unknown[]) => {
        if (process.env.HOIST_MCP_DEBUG) {
            console.error('[hoist-docs-index] DEBUG:', ...args);
        }
    }
};
