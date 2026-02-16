# Phase 1: MCP Server Foundation - Research

**Researched:** 2026-02-12
**Domain:** MCP Server, stdio transport, Node.js CLI tooling, bundle isolation
**Confidence:** HIGH

## Summary

This phase establishes a working MCP server embedded in the hoist-react repository that communicates via stdio transport with AI coding tools (Claude Code, Cursor). The server uses `@modelcontextprotocol/sdk` v1.26.0 with Zod for schema validation, runs via `tsx` (TypeScript Execute) to avoid a separate build step, and is isolated from browser bundles through import-chain separation and tsconfig exclusion.

The key architectural insight is that hoist-react ships as raw TypeScript source -- apps compile it via webpack during their own build. Webpack only processes files reachable via import chains from entry points, so as long as no browser-targeted hoist code imports from the `mcp/` directory, MCP code and its Node-only dependencies will never be pulled into browser bundles. The tsconfig exclusion provides an additional safety net at the type-checking level.

**Primary recommendation:** Create a top-level `mcp/` directory with its own `tsconfig.json`, use `tsx` as the runtime, register the bin command via `package.json`, and add `@modelcontextprotocol/sdk`, `zod`, and `tsx` as devDependencies.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@modelcontextprotocol/sdk` | ~1.26.0 | MCP server framework with protocol handling | Official SDK from the MCP spec authors; required by MCPF-03 |
| `zod` | ^3.25.0 | Schema validation for tool/resource definitions | Peer dependency of MCP SDK; used for input/output schema definitions |
| `tsx` | ~4.21.0 | TypeScript execution without build step | Zero-config, single binary, no peer deps, runs TS directly via esbuild |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none for Phase 1) | - | - | - |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `tsx` | `ts-node` | ts-node requires tsconfig setup and TypeScript as peer dep; tsx is zero-config |
| `tsx` | Pre-compile with `tsc` | Adds a build step and output directory management; tsx is simpler for dev tooling |
| `tsx` | Node.js `--experimental-strip-types` | Available in Node 22+ but still experimental; tsx is more mature |
| `zod` v3 | `zod` v4 | SDK supports both `^3.25 \|\| ^4.0`; v3 is more stable and widely deployed |

**Installation:**
```bash
yarn add --dev @modelcontextprotocol/sdk zod tsx
```

**Note:** These MUST be `devDependencies` to avoid inflating app bundles. The MCP SDK has substantial transitive dependencies (ajv, cors, hono, express, jose, etc.) that must never leak into browser builds.

## Architecture Patterns

### Recommended Project Structure
```
hoist-react/
├── mcp/                        # MCP server code (Node-only, excluded from browser tsconfig)
│   ├── server.ts               # Entry point: creates McpServer, connects StdioServerTransport
│   ├── tools/                   # Tool registrations (one file per tool or logical group)
│   │   └── placeholder.ts      # Phase 1 placeholder tool
│   ├── resources/               # Resource registrations
│   │   └── placeholder.ts      # Phase 1 placeholder resource
│   ├── util/                    # Shared utilities (logging, path resolution, etc.)
│   │   └── logger.ts           # stderr-only logger utility
│   └── tsconfig.json           # MCP-specific tsconfig (Node target, no DOM lib)
├── bin/
│   └── hoist-mcp.mjs           # Thin CLI launcher script with shebang
├── package.json                # Updated: bin field, devDependencies, scripts
└── tsconfig.json               # Updated: exclude mcp/ directory
```

### Pattern 1: McpServer with Stdio Transport
**What:** The high-level `McpServer` class handles protocol details; `StdioServerTransport` reads JSON-RPC from stdin and writes to stdout.
**When to use:** Always for this project -- stdio is the required transport for Claude Code and Cursor local servers.
**Example:**
```typescript
// Source: MCP TypeScript SDK official docs and examples
// mcp/server.ts
import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {z} from 'zod';

const server = new McpServer({
    name: 'hoist-react',
    version: '1.0.0'
});

// Register tools/resources (see Pattern 2 and 3)

const transport = new StdioServerTransport();
await server.connect(transport);
```

### Pattern 2: Tool Registration with Zod Schemas
**What:** Tools are registered with `server.tool()` providing a name, Zod input schema, and async handler.
**When to use:** For any dynamic operation the LLM can invoke (lookups, searches, etc.)
**Example:**
```typescript
// Source: MCP TypeScript SDK official docs
server.tool(
    'echo',
    {message: z.string().describe('Message to echo back')},
    async ({message}) => ({
        content: [{type: 'text', text: `Echo: ${message}`}]
    })
);
```

**Note on API variants:** The SDK provides two registration APIs:
- `server.tool(name, schema, handler)` -- shorthand, used in quick examples
- `server.registerTool(name, {title, description, inputSchema, outputSchema}, handler)` -- full form with metadata

Use `server.registerTool()` for production code -- it supports `title`, `description`, and `annotations` which improve LLM tool discovery.

### Pattern 3: Resource Registration
**What:** Resources expose static or semi-static content the LLM can read.
**When to use:** For exposing documentation, configuration, and other reference data.
**Example:**
```typescript
// Source: MCP TypeScript SDK official docs
server.resource(
    'greeting',
    'hoist://greeting',
    {title: 'Greeting', description: 'A simple greeting', mimeType: 'text/plain'},
    async (uri) => ({
        contents: [{uri: uri.href, text: 'Hello from Hoist!'}]
    })
);
```

### Pattern 4: stderr-Only Logging
**What:** All diagnostic output goes to `console.error()` (stderr), never `console.log()` (stdout).
**When to use:** Always -- stdout is reserved exclusively for JSON-RPC protocol messages.
**Example:**
```typescript
// mcp/util/logger.ts
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
```

### Pattern 5: CLI Entry Point with Shebang
**What:** A thin `.mjs` launcher script that uses tsx to run the TypeScript server.
**When to use:** As the `bin` entry in package.json for `hoist-mcp` command.
**Example:**
```javascript
#!/usr/bin/env node
// bin/hoist-mcp.mjs
//
// Thin launcher for the Hoist MCP server.
// Uses tsx to run TypeScript directly without a build step.
//
import {execFileSync} from 'child_process';
import {fileURLToPath} from 'url';
import {dirname, resolve} from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverPath = resolve(__dirname, '..', 'mcp', 'server.ts');
const tsxPath = resolve(__dirname, '..', 'node_modules', '.bin', 'tsx');

try {
    execFileSync(tsxPath, [serverPath], {
        stdio: ['inherit', 'inherit', 'inherit'],
        env: {...process.env}
    });
} catch (e) {
    process.exit(e.status || 1);
}
```

**Alternative (simpler):** Use `tsx` directly via npx in the package.json script:
```json
{
  "scripts": {
    "hoist-mcp": "tsx mcp/server.ts"
  }
}
```

Both approaches work. The `bin` field approach allows `npx hoist-mcp` from consuming apps. The `scripts` approach is simpler for local development within hoist-react itself.

### Anti-Patterns to Avoid
- **Writing to stdout for logging:** Any non-JSON-RPC output on stdout corrupts the protocol stream and causes connection failures. Use `console.error()` exclusively.
- **Importing MCP code from browser modules:** Never add `import ... from '@xh/hoist/mcp/...'` in any existing hoist-react file. This would pull Node-only deps into browser bundles.
- **Using `console.log()` anywhere in MCP code:** Even in utility functions. Always use the stderr logger.
- **Adding MCP dependencies to `dependencies` (not `devDependencies`):** The MCP SDK pulls in express, hono, cors, jose, and many other Node-only packages. These must be devDependencies only.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON-RPC protocol handling | Custom JSON-RPC parser/serializer | `@modelcontextprotocol/sdk` McpServer + StdioServerTransport | Protocol has many edge cases (message framing, error codes, capability negotiation) |
| Schema validation | Manual type checking of tool inputs | Zod schemas via SDK's built-in integration | SDK validates automatically, generates JSON Schema for tool discovery |
| TypeScript execution | Custom tsc build pipeline for MCP | `tsx` runtime | Zero-config, handles ESM/CJS seamlessly, no build artifacts to manage |
| Stdio message framing | Manual stdin/stdout line parsing | `StdioServerTransport` | Handles newline-delimited JSON-RPC, buffering, encoding correctly |

**Key insight:** The MCP SDK handles all protocol complexity internally. The server code should focus entirely on registering tools/resources and implementing their handlers.

## Common Pitfalls

### Pitfall 1: stdout Contamination
**What goes wrong:** Any `console.log()`, library debug output, or uncaught error message on stdout corrupts the JSON-RPC stream, causing "invalid JSON" errors in the client.
**Why it happens:** Node.js defaults `console.log()` to stdout. Third-party libraries may also write to stdout.
**How to avoid:** (1) Use `console.error()` exclusively. (2) Create a stderr logger wrapper and use it everywhere. (3) Consider intercepting `process.stdout.write` with a guard that warns on non-JSON-RPC output during development.
**Warning signs:** Client reports "invalid JSON" or "connection closed" errors immediately after connecting.

### Pitfall 2: ESM vs CJS Module Resolution
**What goes wrong:** Import errors like `ERR_MODULE_NOT_FOUND` or `Cannot use import statement outside a module`.
**Why it happens:** The MCP SDK uses ESM (`"type": "module"` in its package.json). Hoist-react does NOT have `"type": "module"`. The sub-path imports like `@modelcontextprotocol/sdk/server/mcp.js` require ESM-aware resolution.
**How to avoid:** Use `tsx` which handles ESM/CJS interop transparently. The MCP-specific `tsconfig.json` should use `"module": "Node16"` or `"module": "NodeNext"` with `"moduleResolution": "Node16"` or `"NodeNext"`.
**Warning signs:** Import errors at runtime, especially with `.js` extension imports.

### Pitfall 3: MCP Dependencies Leaking into Browser Bundles
**What goes wrong:** App builds fail or become massively bloated because Node-only packages (express, net, fs) are pulled into the webpack build.
**Why it happens:** If any existing hoist-react file (even transitively) imports from `mcp/`, webpack follows the import chain and tries to bundle Node.js built-ins.
**How to avoid:** (1) Never import from `@xh/hoist/mcp/` in browser code. (2) Exclude `mcp/` in the root `tsconfig.json`. (3) Add `mcp/` to `.npmignore` -- the MCP server is a dev tool, not shipped in the npm package.
**Warning signs:** Webpack errors about missing `fs`, `net`, `child_process`, or `http` modules.

### Pitfall 4: Zod Version Conflicts
**What goes wrong:** Runtime errors like `_parse is not a function` or schema validation failures.
**Why it happens:** The MCP SDK supports both Zod 3.25+ and Zod 4.x but uses internal Zod APIs that changed between versions. Multiple Zod versions in the dependency tree can cause conflicts.
**How to avoid:** Pin to `zod@^3.25` (the stable, widely-deployed version). The SDK's peer dependency accepts this. Do NOT install Zod 4 unless specifically tested with the exact SDK version in use.
**Warning signs:** Schema-related runtime errors, especially when tools are invoked.

### Pitfall 5: Process Lifecycle Management
**What goes wrong:** MCP server doesn't shut down cleanly, leaving orphaned processes.
**Why it happens:** The stdio transport expects the client to close stdin to signal shutdown. If the server has pending timers or open handles, it may hang.
**How to avoid:** Handle SIGINT/SIGTERM signals. Don't create long-running timers or intervals. Let the StdioServerTransport manage the lifecycle.
**Warning signs:** Zombie Node.js processes after disconnecting the MCP client.

## Code Examples

Verified patterns from official sources:

### Complete Minimal MCP Server (stdio)
```typescript
// Source: MCP TypeScript SDK docs + examples
// mcp/server.ts
import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {z} from 'zod';

// Create server with metadata
const server = new McpServer({
    name: 'hoist-react',
    version: '1.0.0'
});

// Register a placeholder tool with Zod schema validation
server.registerTool(
    'hoist-ping',
    {
        title: 'Hoist Ping',
        description: 'Verify the Hoist MCP server is running and responsive',
        inputSchema: z.object({})
    },
    async () => ({
        content: [{type: 'text', text: 'Hoist MCP server is running.'}]
    })
);

// Register a placeholder resource
server.resource(
    'server-info',
    'hoist://server-info',
    {title: 'Server Info', description: 'Hoist MCP server metadata', mimeType: 'application/json'},
    async (uri) => ({
        contents: [{
            uri: uri.href,
            text: JSON.stringify({
                name: 'hoist-react',
                version: '1.0.0',
                status: 'running'
            }, null, 2)
        }]
    })
);

// Connect via stdio transport -- stdout for JSON-RPC only
const transport = new StdioServerTransport();
await server.connect(transport);

// All logging to stderr
console.error('[hoist-mcp] Server started, awaiting MCP client connection via stdio');
```

### MCP-Specific tsconfig.json
```json
// mcp/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "outDir": "../build/mcp",
    "rootDir": ".",
    "declaration": false,
    "noEmit": true
  },
  "include": ["./**/*"],
  "exclude": ["node_modules"]
}
```

### Claude Code Configuration (for testing)
```json
// Project-scoped .mcp.json (checked into repo for team use)
{
  "mcpServers": {
    "hoist-react": {
      "command": "node",
      "args": ["node_modules/.bin/tsx", "mcp/server.ts"],
      "cwd": "/path/to/hoist-react"
    }
  }
}
```

Or via Claude Code CLI:
```bash
claude mcp add --transport stdio --scope local hoist-react -- \
  npx tsx /path/to/hoist-react/mcp/server.ts
```

### Cursor Configuration (for testing)
```json
// .cursor/mcp.json or ~/.cursor/mcp.json
{
  "mcpServers": {
    "hoist-react": {
      "command": "npx",
      "args": ["tsx", "/path/to/hoist-react/mcp/server.ts"]
    }
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| HTTP+SSE transport | Streamable HTTP transport | MCP spec 2025-06-18 | SSE deprecated; but stdio remains primary for local servers |
| `Server` (low-level class) | `McpServer` (high-level class) | MCP SDK ~1.0 | McpServer handles capability negotiation, tool/resource registration automatically |
| Manual JSON-RPC parsing | SDK handles protocol entirely | SDK inception | Never hand-roll protocol handling |
| Zod 3.x only | Zod 3.25+ or Zod 4.x | SDK ~1.20 | SDK now supports both; 3.25+ recommended for stability |

**Deprecated/outdated:**
- HTTP+SSE transport: Deprecated in MCP spec 2025-06-18, replaced by Streamable HTTP. Not relevant for Phase 1 (stdio only).
- `Server` class (low-level): Still available but `McpServer` is the recommended API for most implementations.

## Bundle Isolation Strategy

This is the most architecturally important aspect of Phase 1. Here is the multi-layer isolation approach:

### Layer 1: Import-Chain Separation (Primary)
Webpack only bundles files reachable via import chains from entry points. The hoist-dev-utils `configureWebpack()` includes all of `hoistPath` in its Babel `include` list, but this only means files *are eligible* for transpilation -- webpack still only processes files that are actually imported.

**Action:** No existing hoist-react file may import from `mcp/`. This is the primary isolation mechanism.

### Layer 2: tsconfig Exclusion (Type Safety)
The root `tsconfig.json` should exclude `mcp/` so that `npx tsc --noEmit` (the project's type-check command) does not attempt to type-check MCP code against browser-targeted settings (DOM lib, ES module resolution).

**Action:** Add `"mcp"` to the `exclude` array in the root `tsconfig.json`.

### Layer 3: .npmignore Exclusion (Package Safety)
The `mcp/` directory should be listed in `.npmignore` so it is not published to npm. The MCP server is a development tool, not part of the library's public API.

**Action:** Add `mcp` to `.npmignore`.

### Layer 4: devDependencies (Dependency Safety)
All MCP-related packages (`@modelcontextprotocol/sdk`, `zod`, `tsx`) must be in `devDependencies`, not `dependencies`. This ensures consuming apps don't install these packages transitively.

**Action:** Use `yarn add --dev` for all MCP dependencies.

## package.json Changes

The following changes are needed to the root `package.json`:

```json
{
  "bin": {
    "hoist-mcp": "./bin/hoist-mcp.mjs"
  },
  "scripts": {
    "hoist-mcp": "tsx mcp/server.ts"
  },
  "devDependencies": {
    "@modelcontextprotocol/sdk": "~1.26.0",
    "tsx": "~4.21.0",
    "zod": "^3.25.0"
  }
}
```

The `bin` field enables `npx hoist-mcp` from consuming apps (when they have `@xh/hoist` installed with dev deps). The `scripts` field enables `yarn hoist-mcp` from within the hoist-react repo itself.

## Open Questions

1. **Should `.mcp.json` be committed to the repo?**
   - What we know: Claude Code supports project-scoped `.mcp.json` for team-wide MCP config. This would let any developer with the repo immediately connect.
   - What's unclear: The path to the server entry point may differ between inline-hoist (sibling dir) and installed (node_modules) modes. May need env variable expansion.
   - Recommendation: Create `.mcp.json` but test both development modes before committing. Consider using env variable expansion (`${VARIABLE:-default}`) for paths.

2. **`bin` launcher: .mjs wrapper vs direct tsx reference?**
   - What we know: The `bin` field needs to point to a JavaScript file (not TypeScript). Two options: (a) a thin `.mjs` wrapper that invokes tsx, or (b) just using the `scripts` field.
   - What's unclear: Whether consuming apps will actually use `npx hoist-mcp` or if this is primarily a hoist-react developer tool.
   - Recommendation: Start with the `scripts` approach (`yarn hoist-mcp`) and add the `bin` field with `.mjs` launcher. Both can coexist.

3. **ESLint configuration for MCP directory?**
   - What we know: The MCP code uses Node.js APIs (process, path, fs) that may trigger browser-oriented lint rules. The existing eslint config is project-wide.
   - What's unclear: Whether the current `@xh/eslint-config` will flag Node.js globals.
   - Recommendation: Test with the existing config first. Add an override for `mcp/**` only if needed.

## Sources

### Primary (HIGH confidence)
- [MCP TypeScript SDK - GitHub](https://github.com/modelcontextprotocol/typescript-sdk) - Server API, transport, tool/resource registration
- [MCP TypeScript SDK - server.md](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/server.md) - Official server documentation
- [MCP Spec - Transports](https://modelcontextprotocol.io/docs/concepts/transports) - Stdio transport specification (protocol revision 2025-06-18)
- [Claude Code MCP Docs](https://code.claude.com/docs/en/mcp) - Claude Code MCP configuration, scopes, authentication
- `@modelcontextprotocol/sdk` npm registry - Version 1.26.0, dependencies, peer dependencies, exports map (verified via `npm view`)
- hoist-react `package.json`, `tsconfig.json`, `.npmignore` - Current project configuration (read directly)
- hoist-dev-utils `configureWebpack.js` - Webpack include/exclude behavior for hoist-react (read from GitHub)

### Secondary (MEDIUM confidence)
- [tsx npm package](https://www.npmjs.com/package/tsx) - v4.21.0, Node 18+ required, zero-config TypeScript execution
- [Cursor MCP Setup](https://mcpcat.io/guides/adding-an-mcp-server-to-claude-code/) - Cursor configuration file format

### Tertiary (LOW confidence)
- Community blog posts on MCP server best practices (used for pattern validation only, not primary guidance)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - MCP SDK, Zod, and tsx versions verified via npm registry; APIs verified via official docs
- Architecture: HIGH - Import-chain isolation verified by reading hoist-dev-utils webpack config source; tsconfig exclusion is standard TypeScript
- Pitfalls: HIGH - stdout contamination is documented in MCP spec itself; ESM/CJS issues verified via SDK package.json; bundle isolation verified via webpack config analysis

**Research date:** 2026-02-12
**Valid until:** 2026-03-12 (MCP SDK is actively developed; check for breaking changes before implementation)
