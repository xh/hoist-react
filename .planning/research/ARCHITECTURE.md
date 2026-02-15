# Architecture Research

**Domain:** Embedded MCP server + TypeScript documentation extraction for a UI framework library
**Researched:** 2026-02-11
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Consumers                                          │
│  ┌─────────────────┐   ┌──────────────────┐   ┌─────────────────────────┐  │
│  │  Claude Code /  │   │  REST/HTTP Client │   │  Future: Hoist Core    │  │
│  │  Cursor / LLM   │   │  (Docs Browser)  │   │  (Java) MCP Server     │  │
│  └────────┬────────┘   └────────┬─────────┘   └────────┬────────────────┘  │
│           │ stdio/MCP            │ HTTP                  │ shared schema    │
├───────────┴──────────────────────┴──────────────────────┴──────────────────┤
│                         Transport Layer                                     │
│  ┌──────────────────────┐   ┌──────────────────────────────────────────┐   │
│  │  StdioServerTransport│   │  Express + Streamable HTTP (Phase 2+)   │   │
│  │  (MCP primary)       │   │  (Human docs browser / remote MCP)      │   │
│  └──────────┬───────────┘   └──────────────────┬──────────────────────┘   │
│             └────────────────┬──────────────────┘                          │
├──────────────────────────────┴─────────────────────────────────────────────┤
│                         MCP Server Core                                     │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │  McpServer (@modelcontextprotocol/sdk)                                │ │
│  │  ┌────────────────┐  ┌──────────────────┐  ┌──────────────────────┐  │ │
│  │  │  Resources     │  │  Tools           │  │  Prompts             │  │ │
│  │  │  (read-only)   │  │  (callable)      │  │  (templated)         │  │ │
│  │  └────────┬───────┘  └────────┬─────────┘  └────────┬─────────────┘  │ │
│  └───────────┴───────────────────┴──────────────────────┴────────────────┘ │
├───────────────────────────────────────────────────────────────────────────────┤
│                         Content Providers                                    │
│  ┌──────────────────────┐   ┌──────────────────────────────────────────┐   │
│  │  Markdown Provider   │   │  TypeScript Provider                     │   │
│  │  (README loader)     │   │  (ts-morph extraction)                   │   │
│  └──────────┬───────────┘   └──────────────────┬──────────────────────┘   │
│             │ file I/O                          │ AST analysis              │
├─────────────┴───────────────────────────────────┴──────────────────────────┤
│                         Data Sources                                        │
│  ┌──────────────────────┐   ┌──────────────────────────────────────────┐   │
│  │  Markdown Files      │   │  TypeScript Source Files                 │   │
│  │  13 package READMEs  │   │  702 .ts files (~88K lines)             │   │
│  │  6 concept docs      │   │  Classes, interfaces, types, enums      │   │
│  │  docs/README.md      │   │  JSDoc/TSDoc comments                   │   │
│  └──────────────────────┘   └──────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **MCP Server Core** | Registers resources/tools/prompts, handles MCP protocol, routes requests | `McpServer` from `@modelcontextprotocol/sdk`, single instance |
| **Stdio Transport** | Communicates with local MCP clients (Claude Code, Cursor) via stdin/stdout | `StdioServerTransport`, spawned as child process |
| **HTTP Transport** | Serves docs browser and/or remote MCP clients over HTTP | Express + `@modelcontextprotocol/express` adapter (future phase) |
| **Markdown Provider** | Loads, parses, and serves README/concept docs from disk | Custom module, reads files from known paths, caches content |
| **TypeScript Provider** | Extracts types, interfaces, classes, signatures from TS source | ts-morph `Project`, parses AST, extracts structured info |
| **Resource Registry** | Maps URI patterns to content providers | MCP `registerResource` with `ResourceTemplate` for dynamic URIs |
| **Tool Registry** | Registers callable operations (search, lookup, list) | MCP `registerTool` with Zod input schemas |
| **Index/Cache** | Pre-computed index of available content for fast lookup | In-memory maps built at startup, refreshable |

## Recommended Project Structure

```
hoist-react/
├── mcp/                           # MCP server root (all new code lives here)
│   ├── index.ts                   # Entry point: parse args, create server, connect transport
│   ├── server.ts                  # McpServer setup: register all resources/tools/prompts
│   ├── providers/                 # Content provider modules
│   │   ├── MarkdownProvider.ts    # Loads and serves README/concept docs
│   │   └── TypeScriptProvider.ts  # ts-morph extraction pipeline
│   ├── resources/                 # MCP resource registrations
│   │   ├── docsResources.ts       # README resources (package docs, concept docs)
│   │   └── typeResources.ts       # TypeScript type/interface/class resources
│   ├── tools/                     # MCP tool registrations
│   │   ├── searchTools.ts         # Full-text search across docs and types
│   │   ├── lookupTools.ts         # Targeted lookups (class by name, interface by name)
│   │   └── listTools.ts           # List available packages, classes, interfaces
│   ├── prompts/                   # MCP prompt templates (future)
│   │   └── codingPrompts.ts       # "How do I build a grid?" style prompts
│   ├── types.ts                   # Shared TypeScript types for MCP server internals
│   ├── utils.ts                   # Shared utilities (path resolution, text processing)
│   └── tsconfig.json              # Separate tsconfig for MCP server (Node target, ESM)
├── package.json                   # devDependencies: @modelcontextprotocol/sdk, ts-morph, zod
└── ...                            # Existing hoist-react code (unchanged)
```

### Structure Rationale

- **`mcp/` at repo root:** Parallel to existing top-level packages (`core/`, `data/`, `cmp/`). Clearly
  separates MCP infrastructure from framework source. Ships with hoist-react source (which apps
  already receive) but is never imported by browser code.
- **`providers/` separation:** Content extraction logic is independent from MCP protocol wiring.
  Providers can be tested in isolation and reused if the HTTP layer needs the same data.
- **`resources/` vs `tools/`:** Mirrors the MCP protocol's own distinction. Resources serve
  read-only content (docs, type definitions), tools handle dynamic operations (search, filtered
  lookups). This separation makes it clear which MCP primitives each module registers.
- **Separate `tsconfig.json`:** The MCP server targets Node.js (not browser), uses ESM modules
  with Node16 resolution, and needs different compiler settings than hoist-react's library
  tsconfig. Keeps concerns cleanly separated.

## Architectural Patterns

### Pattern 1: Provider Abstraction

**What:** Separate content extraction (providers) from MCP protocol registration (resources/tools).
Each provider exposes a typed API that the resource/tool modules consume.

**When to use:** Always. This is the primary structural pattern for the server.

**Trade-offs:** Slightly more files, but enables testing providers independently, swapping
implementations, and reusing providers across MCP and HTTP transports.

**Example:**
```typescript
// providers/MarkdownProvider.ts
export class MarkdownProvider {
    private docs: Map<string, DocEntry> = new Map();

    async initialize(): Promise<void> {
        // Scan known paths, load READMEs, build index
    }

    getDoc(packageName: string): DocEntry | undefined {
        return this.docs.get(packageName);
    }

    listDocs(): DocEntry[] {
        return [...this.docs.values()];
    }

    search(query: string): DocEntry[] {
        // Simple text matching against cached content
    }
}

// resources/docsResources.ts
export function registerDocsResources(server: McpServer, provider: MarkdownProvider) {
    server.registerResource(
        'package-doc',
        new ResourceTemplate('hoist://docs/packages/{packageName}', {list: undefined}),
        {title: 'Package Documentation', description: '...'},
        async (uri, {packageName}) => {
            const doc = provider.getDoc(packageName as string);
            return {contents: [{uri: uri.href, mimeType: 'text/markdown', text: doc.content}]};
        }
    );
}
```

### Pattern 2: Lazy Initialization with Eager Index

**What:** Build a lightweight index at startup (package names, class names, file paths) but defer
heavy analysis (full type resolution, deep AST traversal) until a specific resource/tool is
requested.

**When to use:** For the TypeScript provider. ts-morph `Project` initialization is expensive
(parsing 702 files). Build the index once, resolve details on demand.

**Trade-offs:** First access to a specific type is slower, but startup stays fast. The index
enables listing and search without full extraction.

**Example:**
```typescript
// providers/TypeScriptProvider.ts
export class TypeScriptProvider {
    private project: Project;
    private index: Map<string, TypeIndexEntry> = new Map();
    private cache: Map<string, ExtractedType> = new Map();

    async initialize(): Promise<void> {
        this.project = new Project({tsConfigFilePath: '<hoist-react>/tsconfig.json'});
        // Build lightweight index: scan exports, record names + file paths
        for (const sourceFile of this.project.getSourceFiles()) {
            for (const exported of sourceFile.getExportedDeclarations()) {
                // Record name, kind (class/interface/type/enum), file path
            }
        }
    }

    getType(name: string): ExtractedType | undefined {
        if (this.cache.has(name)) return this.cache.get(name);
        const entry = this.index.get(name);
        if (!entry) return undefined;
        const extracted = this.extractFull(entry);  // Deep analysis on demand
        this.cache.set(name, extracted);
        return extracted;
    }
}
```

### Pattern 3: URI Scheme Convention

**What:** Use a consistent `hoist://` URI scheme with a clear hierarchy that parallels both the
codebase structure and a future Hoist Core server's scheme.

**When to use:** For all MCP resource registrations. URI schemes are the addressing system that
MCP clients use to discover and request content.

**Trade-offs:** Requires upfront design of the URI namespace, but pays off in discoverability
and consistency between hoist-react and future hoist-core MCP servers.

**URI scheme design:**
```
hoist://docs/index                     # Documentation index (docs/README.md)
hoist://docs/packages/{packageName}    # Package README (e.g., core, data, cmp/grid)
hoist://docs/concepts/{conceptName}    # Concept doc (e.g., persistence, authentication)
hoist://types/{packageName}            # List types in a package
hoist://types/{packageName}/{typeName} # Specific type (class, interface, type alias)
```

## Data Flow

### Request Flow: MCP Resource Read

```
LLM Client (Claude Code)
    │
    │  JSON-RPC over stdio: resources/read {uri: "hoist://docs/packages/core"}
    ▼
StdioServerTransport
    │
    │  Deserialize, route to McpServer
    ▼
McpServer
    │
    │  Match URI against registered ResourceTemplates
    ▼
docsResources handler
    │
    │  Extract {packageName: "core"}, call MarkdownProvider.getDoc("core")
    ▼
MarkdownProvider
    │
    │  Return cached content from Map
    ▼
Response: {contents: [{uri, mimeType: "text/markdown", text: "# Core..."}]}
    │
    │  JSON-RPC response over stdio
    ▼
LLM Client (receives content, uses as context)
```

### Request Flow: MCP Tool Call

```
LLM Client
    │
    │  JSON-RPC: tools/call {name: "lookup_type", arguments: {name: "GridModel"}}
    ▼
StdioServerTransport → McpServer → lookupTools handler
    │
    │  Validate input (Zod schema), call TypeScriptProvider.getType("GridModel")
    ▼
TypeScriptProvider
    │
    │  Check cache → miss → find in index → extract via ts-morph
    │  Parse class: properties, methods, constructor, inheritance, JSDoc
    ▼
Response: {content: [{type: "text", text: "## GridModel\n\nExtends HoistModel..."}]}
    │
    │  Formatted as structured markdown for LLM consumption
    ▼
LLM Client (receives type information, uses to generate correct code)
```

### Startup Flow

```
$ yarn hoist-mcp
    │
    ▼
mcp/index.ts
    │
    ├── Parse CLI args (--transport=stdio|http, --port=3001)
    ├── Create MarkdownProvider → initialize() → scan docs/, load READMEs
    ├── Create TypeScriptProvider → initialize() → parse project, build index
    ├── Create McpServer({name: "hoist-react", version: "..."})
    ├── Register all resources (docsResources, typeResources)
    ├── Register all tools (searchTools, lookupTools, listTools)
    ├── Connect transport (StdioServerTransport or Express/HTTP)
    └── Server running, awaiting requests
```

### Key Data Flows

1. **Docs read flow:** Client requests URI -> URI matched to ResourceTemplate -> Provider
   returns cached markdown -> Response sent as text content.
2. **Type lookup flow:** Client calls tool with type name -> Provider checks cache, falls back
   to index + ts-morph extraction -> Structured type info formatted as markdown -> Response sent.
3. **Search flow:** Client calls search tool with query string -> Provider searches across
   pre-built text index of docs and type names -> Returns ranked list of matches with URIs.
4. **List flow:** Client calls list tool with optional package filter -> Provider returns
   enumeration from index -> Client can then request individual items.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Current (1 dev, local) | Stdio transport, in-memory cache, full project parse at startup. ~2-5s startup acceptable. |
| 5-10 devs (local per-dev) | Same architecture. Each dev runs their own instance. No shared state needed. |
| Team-wide (shared remote) | Add HTTP transport, consider persistent cache (JSON on disk), optional auth. Still single-process Node. |
| Hoist Core parity | Shared URI scheme convention. Java MCP server mirrors `hoist://` namespace with `hoist-core://` prefix. Clients configure both servers. |

### Scaling Priorities

1. **First bottleneck: ts-morph startup time.** Parsing 702 TypeScript files with full type
   resolution takes 5-15 seconds. Mitigation: build index eagerly, extract details lazily.
   If startup time is unacceptable, consider a pre-built JSON cache that persists between runs
   and invalidates based on file modification times.

2. **Second bottleneck: memory usage.** ts-morph holds the full AST in memory. For hoist-react's
   ~88K lines this is manageable (~200-400MB), but worth monitoring. Mitigation:
   `project.forgetNodesCreatedInBlock()` for one-shot extractions, or limit included source
   files to public API surface only.

## Anti-Patterns

### Anti-Pattern 1: Monolithic Handler

**What people do:** Register one giant tool that accepts a "query type" parameter and handles
all operations in a single switch statement.
**Why it's wrong:** MCP clients (LLMs) use tool descriptions to decide what to call. A single
generic tool gives the LLM no signal about what operations are available.
**Do this instead:** Register focused, well-described tools. `lookup_type`, `search_docs`,
`list_packages` each with clear descriptions and typed input schemas.

### Anti-Pattern 2: Extracting Everything at Startup

**What people do:** Parse all 702 files, extract all types, all methods, all properties into a
giant JSON blob at startup.
**Why it's wrong:** Wastes 10-30 seconds at startup, uses excessive memory, and most of the
extracted data is never requested in a typical session.
**Do this instead:** Build a lightweight name-to-location index at startup. Extract full details
on demand and cache the results.

### Anti-Pattern 3: Resources for Dynamic Operations

**What people do:** Define search as a resource with a query parameter in the URI template
(e.g., `hoist://search/{query}`).
**Why it's wrong:** Resources are for static, addressable content. Search is a computation
that should be a tool. MCP clients treat resources and tools differently in their UX.
**Do this instead:** Use resources for "nouns" (docs, type definitions) and tools for "verbs"
(search, filtered lookups, analysis). A resource URI should be bookmarkable/cacheable.

### Anti-Pattern 4: Tight Coupling to MCP Protocol in Providers

**What people do:** Have providers return MCP-specific response objects
(`{content: [{type: "text", text: "..."}]}`).
**Why it's wrong:** Providers become unusable outside MCP context (e.g., for the HTTP docs
browser or for testing).
**Do this instead:** Providers return plain TypeScript objects. The resource/tool registration
layer transforms them into MCP response format.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Claude Code | stdio MCP client | Primary consumer. Spawns server as child process via `yarn hoist-mcp`. Configure in `claude_desktop_config.json` or `.claude/settings.json`. |
| Cursor | stdio MCP client | Secondary consumer. Same stdio protocol. |
| File system | Direct read via `fs` and ts-morph | All content sourced from local hoist-react checkout. No network I/O needed. |
| TypeScript compiler | Via ts-morph `Project` | Wraps `typescript` compiler. Uses hoist-react's own `tsconfig.json` for path resolution. |
| Express (future) | `@modelcontextprotocol/express` | Thin HTTP adapter over same McpServer instance. Enables docs browser. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| MCP Server Core <-> Providers | Direct method calls | Providers are instantiated by server setup, passed into resource/tool registration functions. No event bus needed. |
| Providers <-> File System | Sync/async file reads | MarkdownProvider uses `fs.readFileSync` at init. TypeScriptProvider uses ts-morph (which wraps fs internally). |
| Resource handlers <-> Tool handlers | Independent | No cross-communication. Both consume providers. A tool might return URIs that reference resources, but handlers are decoupled. |
| hoist-react library code <-> MCP server | None at runtime | The MCP server reads hoist-react source files but is never imported by hoist-react library code. Strict one-way dependency. |
| hoist-react MCP <-> Hoist Core MCP (future) | Shared URI scheme convention | No runtime communication. Parallel servers with compatible naming: `hoist://` (react) and `hoist-core://` (Java). LLM clients configure both. |

## Build Order (Component Dependencies)

The architecture has clear dependency chains that dictate implementation ordering:

```
Phase 1: Foundation
┌────────────────────┐     ┌─────────────────────┐
│  mcp/index.ts      │────▶│  mcp/server.ts       │
│  (entry point)     │     │  (McpServer setup)   │
└────────────────────┘     └──────────┬────────────┘
                                      │
Phase 2: Markdown Content             │ depends on
┌────────────────────────────┐        │
│  providers/MarkdownProvider│◀───────┘
└──────────────┬─────────────┘
               │ consumed by
┌──────────────▼─────────────┐
│  resources/docsResources   │
│  tools/searchTools (docs)  │
│  tools/listTools (packages)│
└────────────────────────────┘

Phase 3: TypeScript Extraction (can start after Phase 1)
┌──────────────────────────────┐
│  providers/TypeScriptProvider│
└──────────────┬───────────────┘
               │ consumed by
┌──────────────▼───────────────┐
│  resources/typeResources     │
│  tools/lookupTools           │
│  tools/searchTools (types)   │
└──────────────────────────────┘

Phase 4: HTTP Transport + Browser (independent of Phase 3)
┌──────────────────────────────┐
│  Express adapter             │
│  HTTP routes wrapping same   │
│  providers                   │
└──────────────────────────────┘
```

**Key dependency insight:** Phase 2 (markdown) and Phase 3 (TypeScript) are independent of
each other and could theoretically be built in parallel, but Phase 2 is simpler and delivers
immediate value. Phase 4 (HTTP) depends on providers existing but not on specific resources/tools.

## Sources

- [Build an MCP server - Official documentation](https://modelcontextprotocol.io/docs/develop/build-server) -- HIGH confidence
- [MCP TypeScript SDK - GitHub](https://github.com/modelcontextprotocol/typescript-sdk) -- HIGH confidence
- [MCP TypeScript SDK - npm](https://www.npmjs.com/package/@modelcontextprotocol/sdk) -- HIGH confidence
- [MCP Architecture overview](https://modelcontextprotocol.io/docs/learn/architecture) -- HIGH confidence
- [MCP Resources vs Tools design patterns](https://workos.com/blog/mcp-features-guide) -- MEDIUM confidence
- [MCP Resource Templates - Speakeasy](https://www.speakeasy.com/mcp/core-concepts/resources) -- MEDIUM confidence
- [Dual Transport: STDIO and HTTP](https://techcommunity.microsoft.com/blog/azuredevcommunityblog/one-mcp-server-two-transports-stdio-and-http/4443915) -- MEDIUM confidence
- [MCP Transport Specification](https://modelcontextprotocol.io/specification/2025-03-26/basic/transports) -- HIGH confidence
- [ts-morph documentation](https://ts-morph.com/) -- HIGH confidence
- [ts-morph GitHub](https://github.com/dsherret/ts-morph) -- HIGH confidence
- [ts-morph Performance guide](https://ts-morph.com/manipulation/performance) -- HIGH confidence
- [Generate TypeScript Docs Using TS Morph](https://souporserious.com/generate-typescript-docs-using-ts-morph/) -- MEDIUM confidence
- [ts-extractor - Alternative extraction library](https://github.com/ts-docs/ts-extractor) -- LOW confidence (less commonly used)
- [FastMCP TypeScript framework](https://github.com/punkpeye/fastmcp) -- MEDIUM confidence (evaluated but not recommended; official SDK preferred)

---
*Architecture research for: Hoist MCP & Documentation server*
*Researched: 2026-02-11*
