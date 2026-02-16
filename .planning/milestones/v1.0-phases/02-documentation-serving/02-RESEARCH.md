# Phase 2: Documentation Serving - Research

**Researched:** 2026-02-13
**Domain:** MCP server documentation serving (resources, tools, search)
**Confidence:** HIGH

## Summary

This phase exposes hoist-react's bounded documentation corpus (~482KB across ~30 markdown files) to LLM clients through the MCP server established in Phase 1. The corpus includes 14 package-level READMEs, 10 concept/cross-cutting docs, AGENTS.md coding conventions, and the docs/README.md documentation index. The key architecture decision is **how** to expose this content: MCP resources for direct read access, MCP tools for search and filtered retrieval, and a discovery mechanism (resource listing + doc index) for LLMs to understand what is available.

The MCP specification draws a clear line: **resources** are passive, application-driven data sources for read-only context, while **tools** are model-controlled functions that perform computation. For documentation serving, this maps naturally: individual documents are resources (read by URI), while keyword search across the corpus is a tool (takes query parameters, performs computation, returns results). Both Claude Code and Cursor (0.42+) now support MCP resources, so we should use both primitives as designed.

**Primary recommendation:** Use MCP resource templates for document retrieval by path (parametric URI patterns), static resources for the doc index and conventions, and a search tool for keyword-based cross-corpus discovery. Keep the implementation simple -- Node.js `fs.readFileSync` for file loading, basic string matching for search. No external search libraries needed for a corpus this small.

## Standard Stack

### Core (already installed from Phase 1)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @modelcontextprotocol/sdk | 1.26.0 | MCP server, McpServer, ResourceTemplate, registerTool, registerResource | Official SDK, already in use |
| zod | 4.3.6 | Tool input schema validation | Required peer dep of SDK, already in use |
| tsx | latest | TypeScript execution without build step | Already in use for MCP server |

### Supporting (new -- Node.js built-ins only)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| node:fs | built-in | Read markdown files from disk | All document loading |
| node:path | built-in | Resolve file paths relative to repo root | All path construction |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| String matching search | minisearch, fuse.js, flexsearch | Overkill for ~30 files; adds dependency; corpus is small enough for simple matching |
| Vector/semantic search | N/A | Explicitly out of scope per constraints |
| Caching layer | Map-based in-memory cache | Could add later if needed, but files are small and reads are fast |

**Installation:** No new packages needed. All dependencies are already installed from Phase 1.

## Architecture Patterns

### Recommended Project Structure
```
mcp/
├── server.ts                    # Entry point (exists)
├── resources/
│   ├── placeholder.ts           # Remove/replace (exists)
│   └── docs.ts                  # NEW: document resources (static + templates)
├── tools/
│   ├── placeholder.ts           # Remove/replace (exists)
│   └── docs.ts                  # NEW: search and list tools
├── data/
│   └── doc-registry.ts          # NEW: document inventory, metadata, file loading
└── util/
    ├── logger.ts                # Exists
    └── paths.ts                 # NEW: repo root resolution, path helpers
```

### Pattern 1: Document Registry (Centralized Metadata)
**What:** A single module that builds an inventory of all documentation at startup -- scanning known locations, capturing metadata (package name, title, category, description, key topics), and providing file-loading functions.
**When to use:** Always -- both resources and tools need the same underlying doc catalog.
**Why:** Decouples document discovery from MCP registration. The registry knows where files are; the resource/tool modules know how to expose them via MCP.

```typescript
// mcp/data/doc-registry.ts
// Source: Architecture pattern derived from MCP best practices

interface DocEntry {
    /** Unique identifier for this doc, e.g. 'core', 'cmp/grid', 'lifecycle-app' */
    id: string;
    /** Display title, e.g. 'Core Framework', 'Grid Component' */
    title: string;
    /** Absolute file path */
    filePath: string;
    /** Category for filtering: 'package' | 'concept' | 'conventions' | 'index' */
    category: DocCategory;
    /** Package name if category is 'package', e.g. 'core', 'cmp', 'cmp/grid' */
    packageName?: string;
    /** Short description from the docs index */
    description: string;
    /** Key topics/keywords for search matching */
    keywords: string[];
}

type DocCategory = 'package' | 'concept' | 'devops' | 'conventions' | 'index';

/** Build the full registry at startup by scanning known doc locations */
function buildRegistry(repoRoot: string): DocEntry[] { ... }

/** Load file content by doc ID */
function loadDocContent(entry: DocEntry): string { ... }

/** Search docs by keyword, return matching entries with context snippets */
function searchDocs(registry: DocEntry[], query: string, options?: SearchOptions): SearchResult[] { ... }
```

### Pattern 2: Static Resources for Fixed Documents
**What:** Register the doc index (docs/README.md) and coding conventions (AGENTS.md) as static MCP resources with fixed URIs.
**When to use:** For documents that every LLM session should know about -- the "starting points."
**Why:** Static resources appear in `resources/list` immediately, letting clients auto-include them as context.

```typescript
// Source: @modelcontextprotocol/sdk v1.26.0 registerResource API
import {ResourceTemplate} from '@modelcontextprotocol/sdk/server/mcp.js';

// Static resource: doc index
server.registerResource(
    'doc-index',
    'hoist://docs/index',
    {
        title: 'Hoist Documentation Index',
        description: 'Complete catalog of all hoist-react documentation with descriptions and key topics. Start here to discover available docs.',
        mimeType: 'text/markdown'
    },
    async (uri) => ({
        contents: [{uri: uri.href, text: loadFile('docs/README.md')}]
    })
);

// Static resource: coding conventions
server.registerResource(
    'conventions',
    'hoist://docs/conventions',
    {
        title: 'Hoist Coding Conventions (AGENTS.md)',
        description: 'Architecture patterns, code style, key dependencies, and AI assistant guidance for hoist-react development.',
        mimeType: 'text/markdown'
    },
    async (uri) => ({
        contents: [{uri: uri.href, text: loadFile('AGENTS.md')}]
    })
);
```

### Pattern 3: Resource Template for Document Retrieval by ID
**What:** A dynamic MCP resource template that retrieves any document by its identifier.
**When to use:** For all document retrieval by name/path -- the LLM discovers what exists (via listing or search), then reads specific docs.
**Why:** Resource templates follow the MCP spec's intended pattern for parametric read access. The `list` callback enumerates all available docs, and the `complete` callback enables auto-completion of document IDs.

```typescript
// Source: @modelcontextprotocol/sdk v1.26.0 ResourceTemplate class
import {ResourceTemplate} from '@modelcontextprotocol/sdk/server/mcp.js';

const docTemplate = new ResourceTemplate(
    'hoist://docs/{docId}',
    {
        // List callback: enumerates all available documents
        list: async () => ({
            resources: registry.map(entry => ({
                uri: `hoist://docs/${entry.id}`,
                name: entry.title,
                description: entry.description,
                mimeType: 'text/markdown'
            }))
        }),
        // Complete callback: auto-complete doc IDs
        complete: {
            docId: (value) => {
                return registry
                    .filter(e => e.id.startsWith(value))
                    .map(e => e.id);
            }
        }
    }
);

server.registerResource(
    'hoist-doc',
    docTemplate,
    {
        title: 'Hoist Documentation',
        description: 'Retrieve any hoist-react package README or concept doc by ID. Use the list to discover available document IDs.',
        mimeType: 'text/markdown'
    },
    async (uri, variables) => {
        const docId = variables.docId as string;
        const entry = registry.find(e => e.id === docId);
        if (!entry) throw new McpError(ErrorCode.InvalidParams, `Document not found: ${docId}`);
        return {
            contents: [{uri: uri.href, text: loadDocContent(entry)}]
        };
    }
);
```

### Pattern 4: Search Tool for Keyword Discovery
**What:** An MCP tool that searches across all documentation by keyword, returning matching document entries with context snippets.
**When to use:** When the LLM needs to find relevant docs without knowing the exact document name.
**Why:** Search is computational (filtering, ranking, extracting snippets) -- this is exactly what MCP tools are for. Tools are model-controlled, meaning the LLM decides when to search based on user context.

```typescript
// Source: @modelcontextprotocol/sdk v1.26.0 registerTool API
server.registerTool(
    'hoist-search-docs',
    {
        title: 'Search Hoist Documentation',
        description: 'Search across all hoist-react documentation by keyword. Returns matching documents with context snippets. Use this to find relevant docs when you do not know the exact document name.',
        inputSchema: z.object({
            query: z.string().describe('Search keywords (e.g. "grid column sorting", "authentication OAuth")'),
            category: z.enum(['package', 'concept', 'devops', 'conventions', 'all']).optional()
                .describe('Filter results to a specific category. Default: all'),
            limit: z.number().min(1).max(20).optional()
                .describe('Maximum number of results to return. Default: 10')
        }),
        annotations: {
            readOnlyHint: true,
            openWorldHint: false
        }
    },
    async ({query, category, limit}) => {
        const results = searchDocs(registry, query, {category, limit: limit ?? 10});
        // Format as text content with document metadata and snippets
        const text = formatSearchResults(results);
        return {content: [{type: 'text' as const, text}]};
    }
);
```

### Pattern 5: List/Inventory Tool
**What:** An MCP tool that lists all available documentation with metadata, optionally filtered by category.
**When to use:** When the LLM needs an overview of what documentation exists before deciding what to read.
**Why:** While the resource template's `list` callback serves the same purpose for resource discovery, not all MCP clients reliably use `resources/list`. A tool ensures discoverability regardless of client capabilities.

```typescript
server.registerTool(
    'hoist-list-docs',
    {
        title: 'List Hoist Documentation',
        description: 'List all available hoist-react documentation with descriptions. Use this to discover what docs exist before reading specific ones.',
        inputSchema: z.object({
            category: z.enum(['package', 'concept', 'devops', 'conventions', 'all']).optional()
                .describe('Filter by category. Default: all')
        }),
        annotations: {
            readOnlyHint: true,
            openWorldHint: false
        }
    },
    async ({category}) => {
        const entries = category && category !== 'all'
            ? registry.filter(e => e.category === category)
            : registry;
        const text = formatDocList(entries);
        return {content: [{type: 'text' as const, text}]};
    }
);
```

### Anti-Patterns to Avoid
- **Registering every document as a separate static resource:** Bloats the `resources/list` response with 30+ entries. Use a resource template with a list callback instead -- keeps the template list compact while still enumerating all docs.
- **Returning entire documents in search results:** Search should return metadata + snippets, not full content. The LLM reads full docs via the resource template after finding what it needs.
- **Omitting descriptions on resources and tools:** LLMs rely heavily on descriptions to decide which tools/resources to use. Every registration MUST have a clear, actionable description.
- **Loading all files at startup eagerly:** Read files on demand. The filesystem is fast for ~30 files; eager loading wastes memory and complicates error handling.
- **Using console.log anywhere in MCP code:** stdout is reserved for JSON-RPC. All logging MUST use the existing stderr logger.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| URI template parsing/matching | Custom regex URI parser | SDK's `ResourceTemplate` + `UriTemplate` class | RFC 6570 compliant, handles edge cases, provides `match()` and `expand()` |
| MCP protocol message handling | Custom JSON-RPC handler | SDK's `McpServer.registerResource()` / `registerTool()` | Handles capabilities, pagination, list_changed notifications automatically |
| Input validation | Manual argument checking | Zod schemas in `registerTool` inputSchema | SDK validates automatically, generates JSON Schema for client introspection |
| Path traversal protection | Nothing (forgetting it) | Validate resolved paths are within repo root | Security: prevent `../../etc/passwd` style attacks via doc ID |

**Key insight:** The MCP SDK handles all protocol-level concerns. The implementation work is in the document registry (which files exist, their metadata) and the search logic (simple string matching). Both are straightforward Node.js code -- no libraries needed beyond the SDK and Node built-ins.

## Common Pitfalls

### Pitfall 1: Forgetting `list` Callback on ResourceTemplate
**What goes wrong:** ResourceTemplate constructor requires a `list` field, even if undefined. Omitting it causes a TypeScript error. More importantly, setting `list: undefined` means the template's documents won't appear in `resources/list` responses, making them invisible to clients that browse resources.
**Why it happens:** The SDK design forces explicit acknowledgment of whether listing is supported.
**How to avoid:** Always provide a `list` callback that returns all matching documents. For our bounded corpus, this is trivial.
**Warning signs:** Documents are accessible by URI but never appear in resource lists.

### Pitfall 2: stdout Pollution
**What goes wrong:** Any `console.log` in MCP server code corrupts the JSON-RPC stdio channel.
**Why it happens:** Habit -- developers use console.log for debugging.
**How to avoid:** Use the existing `log` utility from `mcp/util/logger.ts` which writes to stderr.
**Warning signs:** "Parse error" or "Invalid JSON" messages in MCP client logs.

### Pitfall 3: Returning Too Much Content
**What goes wrong:** Returning the full content of multiple large documents (e.g., all 482KB at once) floods the LLM's context window, leaving no room for the actual task.
**Why it happens:** Eager "give everything" approach without considering token budgets.
**How to avoid:** Search tool returns metadata + snippets only (a few lines of context around matches). Full content is returned one document at a time via the resource template. Each package README averages ~15KB (roughly 4K tokens) -- manageable individually.
**Warning signs:** LLM responses truncated or quality drops after loading docs.

### Pitfall 4: Path Traversal in Document IDs
**What goes wrong:** If doc IDs contain `..` segments, a malicious or confused client could read files outside the repo.
**Why it happens:** Naively joining doc ID with repo root without validation.
**How to avoid:** After resolving the full path, verify it starts with the repo root. Reject any doc ID containing `..` or absolute path separators.
**Warning signs:** Requests for documents outside the known registry succeed.

### Pitfall 5: Inconsistent Doc IDs Between Tools and Resources
**What goes wrong:** Search tool returns doc IDs that don't match the resource template's `{docId}` parameter format, so the LLM can't follow up by reading the doc.
**Why it happens:** Building the search index separately from the resource template's registry.
**How to avoid:** Use a single `DocEntry[]` registry shared by both resources and tools. The `id` field is the canonical identifier used everywhere.
**Warning signs:** LLM tries to read a doc after searching and gets "not found."

### Pitfall 6: Not Resolving Repo Root Correctly
**What goes wrong:** The MCP server runs from various working directories depending on how it's launched. Hard-coded relative paths break.
**Why it happens:** Assuming CWD is the repo root.
**How to avoid:** Resolve the repo root at startup by walking up from `import.meta.url` (or `__dirname` equivalent) to find a known marker file (like `package.json` with the hoist-react name, or the `AGENTS.md` file).
**Warning signs:** "File not found" errors when reading docs that definitely exist.

## Code Examples

### Complete ResourceTemplate with List and Completions
```typescript
// Source: @modelcontextprotocol/sdk v1.26.0 (verified from installed dist/esm/server/mcp.js)
import {McpServer, ResourceTemplate} from '@modelcontextprotocol/sdk/server/mcp.js';

const docTemplate = new ResourceTemplate(
    'hoist://docs/{docId}',
    {
        // REQUIRED field (can be undefined, but shouldn't be for discoverability)
        list: async () => ({
            resources: registry.map(entry => ({
                uri: `hoist://docs/${entry.id}`,
                name: entry.title,
                description: entry.description,
                mimeType: 'text/markdown'
            }))
        }),
        // OPTIONAL: auto-completion for the docId variable
        complete: {
            docId: (value: string) =>
                registry
                    .filter(e => e.id.startsWith(value))
                    .map(e => e.id)
        }
    }
);

server.registerResource(
    'hoist-doc',
    docTemplate,
    {
        title: 'Hoist Documentation',
        description: 'Read any hoist-react doc by ID. Lists all available documents.',
        mimeType: 'text/markdown'
    },
    async (uri, variables) => {
        const docId = variables.docId as string;
        const entry = findDoc(docId);
        const content = readFileSync(entry.filePath, 'utf-8');
        return {
            contents: [{uri: uri.href, text: content, mimeType: 'text/markdown'}]
        };
    }
);
```

### Simple Keyword Search Implementation
```typescript
// Source: Standard Node.js string matching -- no external library needed

interface SearchResult {
    entry: DocEntry;
    /** Lines containing matches, with line numbers */
    snippets: Array<{lineNumber: number; text: string}>;
    /** Number of keyword matches in this document */
    matchCount: number;
}

function searchDocs(
    registry: DocEntry[],
    query: string,
    options?: {category?: string; limit?: number}
): SearchResult[] {
    const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 1);
    const limit = options?.limit ?? 10;

    const results: SearchResult[] = [];

    for (const entry of registry) {
        // Filter by category if specified
        if (options?.category && options.category !== 'all' && entry.category !== options.category) {
            continue;
        }

        // Check keywords/metadata first (cheap)
        const metaText = [entry.title, entry.description, ...entry.keywords].join(' ').toLowerCase();
        const metaMatches = terms.filter(t => metaText.includes(t)).length;

        // Then check file content
        const content = readFileSync(entry.filePath, 'utf-8');
        const lines = content.split('\n');
        const contentLower = content.toLowerCase();
        const contentMatches = terms.filter(t => contentLower.includes(t)).length;

        if (metaMatches === 0 && contentMatches === 0) continue;

        // Extract snippet lines containing search terms
        const snippets: Array<{lineNumber: number; text: string}> = [];
        for (let i = 0; i < lines.length && snippets.length < 5; i++) {
            const lineLower = lines[i].toLowerCase();
            if (terms.some(t => lineLower.includes(t))) {
                snippets.push({lineNumber: i + 1, text: lines[i].trim()});
            }
        }

        results.push({
            entry,
            snippets,
            matchCount: metaMatches + contentMatches
        });
    }

    // Sort by match count descending, take top N
    return results
        .sort((a, b) => b.matchCount - a.matchCount)
        .slice(0, limit);
}
```

### Tool Annotations for Read-Only Tools
```typescript
// Source: MCP spec 2025-06-18, ToolAnnotations schema
// All documentation tools are read-only and operate on a closed set of docs

server.registerTool(
    'hoist-search-docs',
    {
        title: 'Search Hoist Documentation',
        description: 'Search across all hoist-react docs by keyword.',
        inputSchema: z.object({
            query: z.string().describe('Search keywords'),
            category: z.enum(['package', 'concept', 'devops', 'conventions', 'all'])
                .optional().describe('Filter by doc category'),
            limit: z.number().min(1).max(20).optional()
                .describe('Max results (default: 10)')
        }),
        annotations: {
            readOnlyHint: true,        // Does not modify anything
            destructiveHint: false,    // Cannot cause harm
            idempotentHint: true,      // Same query = same results
            openWorldHint: false       // Operates on known, bounded corpus
        }
    },
    async ({query, category, limit}) => { ... }
);
```

### Repo Root Resolution
```typescript
// mcp/util/paths.ts
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {existsSync} from 'node:fs';

/**
 * Resolve the hoist-react repo root by walking up from this file's location.
 * The mcp/ directory is a direct child of the repo root.
 */
export function resolveRepoRoot(): string {
    const thisFile = fileURLToPath(import.meta.url);
    // mcp/util/paths.ts -> mcp/util/ -> mcp/ -> repo root
    const repoRoot = path.resolve(path.dirname(thisFile), '..', '..');

    // Sanity check: AGENTS.md should exist at repo root
    if (!existsSync(path.join(repoRoot, 'AGENTS.md'))) {
        throw new Error(`Cannot resolve repo root. Expected AGENTS.md at ${repoRoot}`);
    }
    return repoRoot;
}

/**
 * Resolve a doc path safely within the repo, preventing path traversal.
 */
export function resolveDocPath(repoRoot: string, relativePath: string): string {
    const resolved = path.resolve(repoRoot, relativePath);
    if (!resolved.startsWith(repoRoot)) {
        throw new Error(`Path traversal detected: ${relativePath}`);
    }
    return resolved;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `server.resource()` (positional args) | `server.registerResource()` (config object) | SDK 1.18+ (2025) | Old API deprecated but still works; use new API for clarity |
| `server.tool()` (positional args) | `server.registerTool()` (config object) | SDK 1.18+ (2025) | Old API deprecated; new API supports outputSchema, annotations |
| Tools-only MCP clients | Resources + Tools support | Cursor 0.42+ (Nov 2025) | Can now use MCP resources for documentation; not limited to tools |
| Eager tool loading | MCP Tool Search (lazy loading) | Claude Code late 2025 | Reduces context overhead by 85%; tool descriptions still matter for discovery |

**Deprecated/outdated:**
- `server.resource(name, uri, callback)` -- deprecated in favor of `server.registerResource(name, uri, config, callback)`. Phase 1 placeholder uses old API and should be updated.
- `server.tool(name, description, schema, callback)` -- deprecated in favor of `server.registerTool(name, config, callback)`. Phase 1 placeholder already uses new API (good).

## Design Decisions

### Resources vs Tools: The Split

The MCP spec is clear about the distinction:
- **Resources** = passive, application-driven, read-only data. Used for: reading individual documents by URI.
- **Tools** = model-controlled, computational. Used for: searching, listing/filtering.

For this phase:
- **Resources:** doc index (static), conventions (static), all docs (template with `{docId}`)
- **Tools:** search-docs (keyword search with snippets), list-docs (filtered inventory)

Both are needed because:
1. Resources enable clients that support resources (Claude Code, Cursor) to browse and auto-include docs
2. Tools ensure universal compatibility -- any MCP client can search and list docs

### Doc ID Scheme

Documents need stable, human-friendly identifiers for the `{docId}` template variable:

| Document | Doc ID | Category |
|----------|--------|----------|
| AGENTS.md | `conventions` | conventions |
| docs/README.md | `index` | index |
| core/README.md | `core` | package |
| cmp/README.md | `cmp` | package |
| cmp/grid/README.md | `cmp/grid` | package |
| cmp/form/README.md | `cmp/form` | package |
| cmp/input/README.md | `cmp/input` | package |
| cmp/layout/README.md | `cmp/layout` | package |
| cmp/tab/README.md | `cmp/tab` | package |
| cmp/viewmanager/README.md | `cmp/viewmanager` | package |
| desktop/README.md | `desktop` | package |
| desktop/cmp/dash/README.md | `desktop/cmp/dash` | package |
| desktop/cmp/panel/README.md | `desktop/cmp/panel` | package |
| data/README.md | `data` | package |
| svc/README.md | `svc` | package |
| format/README.md | `format` | package |
| appcontainer/README.md | `appcontainer` | package |
| utils/README.md | `utils` | package |
| promise/README.md | `promise` | package |
| mobx/README.md | `mobx` | package |
| mobile/README.md | `mobile` | package |
| public/README.md | `public` | package |
| static/README.md | `static` | package |
| docs/authentication.md | `authentication` | concept |
| docs/persistence.md | `persistence` | concept |
| docs/lifecycle-app.md | `lifecycle-app` | concept |
| docs/lifecycle-models-and-services.md | `lifecycle-models-and-services` | concept |
| docs/build-and-deploy.md | `build-and-deploy` | devops |
| docs/development-environment.md | `development-environment` | devops |
| docs/compilation-notes.md | `compilation-notes` | devops |

### Search Approach: Simple String Matching

With only ~30 files totaling ~482KB, sophisticated search is unnecessary:
- Case-insensitive substring matching on file content and metadata
- Split query into terms, count term matches per document
- Sort by match count descending
- Return top N results with context snippets (matching lines)
- Filter by category optionally

This is fast (< 10ms for full corpus scan) and sufficient. If the corpus grows 10x, consider adding minisearch as a lightweight full-text index.

### Keyword Extraction

Each document's metadata includes keywords extracted from the docs/README.md index tables. These are matched before file content for fast filtering. Example: the `cmp/grid` entry has keywords `GridModel, Column, ColumnGroup, sorting, grouping, filtering, selection, inline editing, export`.

## Open Questions

1. **Upgrade notes inclusion**
   - What we know: There are 4 upgrade notes in docs/upgrade-notes/. They are version-specific and the docs index says to always check GitHub for latest.
   - What's unclear: Should these be included in the MCP doc registry? They are useful for upgrade tasks but add noise for general development.
   - Recommendation: Include them with category 'upgrade-notes' and clearly note their version-specific nature in descriptions. They can be filtered out by category.

2. **Codebase map documents (.planning/codebase/)**
   - What we know: 7 documents (~1600 lines) containing architecture, conventions, structure, etc. These are planning artifacts, not user-facing docs.
   - What's unclear: Are these useful for LLM consumption through MCP, or are they redundant with the package READMEs and AGENTS.md?
   - Recommendation: Defer to a later phase or include at Claude's discretion. The AGENTS.md and package READMEs are the authoritative sources. The codebase map may duplicate or even conflict.

3. **README-ROADMAP.md and changelog-format.md**
   - What we know: These are meta-documentation (docs about docs, changelog conventions).
   - What's unclear: Whether to include in the MCP registry.
   - Recommendation: Include changelog-format.md (useful for writing changelog entries). Skip README-ROADMAP.md (internal tracking, not useful for LLM tasks).

## Sources

### Primary (HIGH confidence)
- @modelcontextprotocol/sdk v1.26.0 installed at node_modules/@modelcontextprotocol/sdk - McpServer API, ResourceTemplate class, registerResource/registerTool signatures verified from dist/esm/server/mcp.d.ts and mcp.js
- [MCP Specification 2025-06-18: Resources](https://modelcontextprotocol.io/specification/2025-06-18/server/resources) - Resource data types, URI schemes, templates, annotations
- [MCP Specification 2025-06-18: Tools](https://modelcontextprotocol.io/specification/2025-06-18/server/tools) - Tool annotations (readOnlyHint, etc.), result types, error handling
- [MCP Server Concepts](https://modelcontextprotocol.io/docs/learn/server-concepts) - Resources vs Tools vs Prompts decision framework
- Actual hoist-react documentation corpus: 30 files, 482KB total, verified file paths and sizes

### Secondary (MEDIUM confidence)
- [MCP TypeScript SDK docs/server.md](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/server.md) - registerResource/registerTool examples
- [Build an MCP Server tutorial](https://modelcontextprotocol.io/docs/develop/build-server) - TypeScript server patterns, tool registration
- [Cursor MCP features (0.42+)](https://webrix.ai/blog/cursor-mcp-features-blog-post) - Cursor now supports resources, prompts, elicitation
- [Claude Code MCP docs](https://code.claude.com/docs/en/mcp) - Claude Code resource support via @ mentions

### Tertiary (LOW confidence)
- [library-mcp by Will Larson](https://lethain.com/library-mcp/) - Real-world markdown knowledge base MCP server patterns (single source, but from experienced practitioner)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - verified from installed SDK, no new dependencies needed
- Architecture: HIGH - patterns derived directly from MCP spec + SDK API, verified against installed code
- Pitfalls: HIGH - derived from spec constraints (stdout/stderr), SDK constructor requirements, and standard security concerns (path traversal)
- Search approach: HIGH - corpus size measured (482KB / 30 files), confirming simple string matching is appropriate

**Research date:** 2026-02-13
**Valid until:** 2026-05-13 (stable -- corpus is bounded, SDK API is mature)
