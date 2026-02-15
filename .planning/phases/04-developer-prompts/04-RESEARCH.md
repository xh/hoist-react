# Phase 4: Developer Prompts - Research

**Researched:** 2026-02-13
**Domain:** MCP Prompts API, templated developer workflows, documentation+type composition
**Confidence:** HIGH

## Summary

This phase adds MCP Prompts to the existing hoist-react MCP server, providing templated starting points for common Hoist development tasks. MCP Prompts are user-controlled templates that return structured `PromptMessage[]` arrays injected directly into the LLM conversation. In Claude Code, they surface as slash commands with the format `/mcp__hoist-react__promptname`, making them discoverable via `/` autocomplete.

The key architectural insight is that prompts are **composable** -- they can combine documentation content (from the Phase 2 doc registry) with type information (from the Phase 3 ts-morph registry) into a single structured response that gives the LLM everything it needs to generate correct Hoist code. Unlike tools (which the LLM calls autonomously), prompts are explicitly invoked by the developer, so they should be designed as comprehensive "starter kits" for specific development tasks rather than granular lookup operations.

The phase depends on both Phase 2 (doc registry for loading README content) and Phase 3 (ts-morph registry for extracting type signatures and members). Both registries expose clean public APIs -- `buildRegistry`/`loadDocContent`/`searchDocs` for docs, and `ensureInitialized`/`getSymbolDetail`/`getMembers` for types -- which prompts can call directly to compose their output.

**Primary recommendation:** Create a `mcp/prompts/` directory with a registration module following the established pattern (one `registerPrompts(server)` function called from `server.ts`). Implement at least 3 prompts targeting the most common Hoist development tasks: creating a grid panel, building a form with validation, and constructing a tab container. Each prompt should return multi-message responses combining documentation excerpts, type signatures, code patterns, and Hoist conventions.

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @modelcontextprotocol/sdk | 1.26.0 | McpServer.registerPrompt() API | Official SDK, already in use |
| zod | 4.3.6 | Prompt argument schema validation | Peer dep of SDK, already in use |

### Supporting (already available)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| mcp/data/doc-registry.ts | internal | Load documentation content for embedding in prompts | Every prompt that references docs |
| mcp/data/ts-registry.ts | internal | Extract type signatures and members for embedding | Every prompt that references types |
| mcp/util/paths.ts | internal | Repo root resolution for path construction | Path resolution |
| mcp/util/logger.ts | internal | Stderr-only logging | Diagnostic output |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Static prompt templates | Dynamic template engine (mustache, handlebars) | Overkill -- TypeScript template literals with function composition provide all needed flexibility |
| Hardcoded doc excerpts | Live doc loading via registry | Live loading keeps prompts current with doc changes; no maintenance burden |
| Manual type signature strings | Live ts-morph extraction | Live extraction ensures accuracy with code changes; minor latency cost on first call |

**Installation:** No new packages needed. All dependencies are already installed.

## Architecture Patterns

### Recommended Project Structure
```
mcp/
  server.ts               # Updated: add registerPrompts(server) call
  prompts/
    index.ts              # registerPrompts(server) -- registers all prompts
    grid.ts               # "Create a grid panel" prompt
    form.ts               # "Build a form with validation" prompt
    tabs.ts               # "Build a tab container" prompt
    util.ts               # Shared helpers: doc loading, type extraction, formatting
  tools/
    docs.ts               # Existing (Phase 2)
    typescript.ts          # Existing (Phase 3)
  resources/
    docs.ts               # Existing (Phase 2)
  data/
    doc-registry.ts       # Existing (Phase 2)
    ts-registry.ts        # Existing (Phase 3)
  util/
    logger.ts             # Existing (Phase 1)
    paths.ts              # Existing (Phase 1)
```

### Pattern 1: Prompt Registration with registerPrompt()
**What:** The SDK's `registerPrompt()` method registers a named prompt with optional title, description, argument schema, and callback handler.
**When to use:** For all prompt registrations.
**Example:**
```typescript
// Source: @modelcontextprotocol/sdk mcp.d.ts (verified from installed package)
import {z} from 'zod';
import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';

server.registerPrompt(
    'hoist-create-grid',
    {
        title: 'Create a Hoist Grid Panel',
        description: 'Generate a grid panel with model, columns, data loading, and component. Produces a structured starting point with relevant documentation and type information.',
        argsSchema: {
            dataFields: z.string()
                .optional()
                .describe('Comma-separated list of data field names (e.g. "name,value,date")'),
            features: z.string()
                .optional()
                .describe('Comma-separated features to include (e.g. "sorting,grouping,selection,export")')
        }
    },
    async ({dataFields, features}) => {
        // Compose documentation + types + patterns into messages
        return {
            description: 'Grid panel creation guide with documentation and type references',
            messages: [
                {
                    role: 'user',
                    content: {type: 'text', text: composedPromptText}
                }
            ]
        };
    }
);
```

### Pattern 2: Composing Documentation + Types into Prompt Messages
**What:** Prompts load relevant documentation and type information at invocation time, then compose them into structured multi-section text.
**When to use:** For all prompts that need to provide context from Hoist's docs and API.
**Example:**
```typescript
// Prompt handler composes content from existing registries
async function buildGridPromptContent(args: {dataFields?: string; features?: string}) {
    const repoRoot = resolveRepoRoot();
    const docRegistry = buildRegistry(repoRoot);

    // Load relevant documentation
    const gridDoc = docRegistry.find(e => e.id === 'cmp/grid');
    const gridContent = gridDoc ? loadDocContent(gridDoc) : '';
    const coreDoc = docRegistry.find(e => e.id === 'core');
    const coreContent = coreDoc ? loadDocContent(coreDoc) : '';

    // Extract type information (lazy init on first call)
    ensureInitialized();
    const gridModelDetail = getSymbolDetail('GridModel');
    const gridModelMembers = getMembers('GridModel');

    // Compose structured prompt text
    const sections = [
        '# Task: Create a Hoist Grid Panel',
        '',
        '## Hoist Conventions',
        '- Use element factories (not JSX): `grid({model: gridModel})`',
        '- Models extend HoistModel with @managed, @bindable decorators',
        '- Call makeObservable(this) in constructor',
        '- Data loading in doLoadAsync(loadSpec)',
        '',
        '## Grid Documentation (excerpt)',
        extractRelevantSections(gridContent, ['Basic Grid Setup', 'Configuration Pattern']),
        '',
        '## GridModel API',
        formatSymbolDetail(gridModelDetail),
        formatKeyMembers(gridModelMembers),
        '',
        '## Code Template',
        buildGridTemplate(args)
    ];

    return sections.join('\n');
}
```

### Pattern 3: Multi-Message Prompt Structure
**What:** Prompts can return multiple messages with different roles to set up a conversation flow.
**When to use:** When you want to provide context as "user" messages and pre-seed assistant behavior.
**Example:**
```typescript
// The GetPromptResult type supports multiple messages
return {
    description: 'Grid panel creation guide',
    messages: [
        {
            role: 'user',
            content: {
                type: 'text',
                text: `Create a Hoist grid panel with the following requirements:\n${taskDescription}`
            }
        }
    ]
};
```
**Note:** While the MCP spec supports `role: 'assistant'` messages, for Claude Code prompts a single well-structured `user` message is typically most effective. The message is injected into the conversation and Claude processes it immediately.

### Pattern 4: Embedded Resources in Prompts
**What:** Prompt messages can include `type: 'resource'` content blocks that reference MCP resources by URI.
**When to use:** When you want to embed full documentation files rather than excerpts.
**Example:**
```typescript
// Embedding a resource in a prompt message
{
    role: 'user',
    content: {
        type: 'resource',
        resource: {
            uri: 'hoist://docs/cmp/grid',
            mimeType: 'text/markdown',
            text: loadDocContent(gridDocEntry)
        }
    }
}
```
**Recommendation:** Prefer text content with curated excerpts over full embedded resources. Full docs can be very large (the grid README alone is substantial) and may consume excessive context. Extract only the sections most relevant to the prompt's task.

### Pattern 5: Shared Prompt Utilities Module
**What:** A utility module that provides common operations for all prompts -- doc loading, type formatting, section extraction.
**When to use:** To avoid duplication across prompt implementations.
**Example:**
```typescript
// mcp/prompts/util.ts

import {buildRegistry, loadDocContent, type DocEntry} from '../data/doc-registry.js';
import {ensureInitialized, getSymbolDetail, getMembers} from '../data/ts-registry.js';
import {resolveRepoRoot} from '../util/paths.js';

/** Cached doc registry -- built once per server lifetime. */
let cachedRegistry: DocEntry[] | null = null;

function getRegistry(): DocEntry[] {
    if (!cachedRegistry) {
        cachedRegistry = buildRegistry(resolveRepoRoot());
    }
    return cachedRegistry;
}

/** Load a specific doc by ID, returning empty string if not found. */
export function loadDoc(docId: string): string {
    const entry = getRegistry().find(e => e.id === docId);
    return entry ? loadDocContent(entry) : '';
}

/** Extract a named section from markdown content (## header to next ## header). */
export function extractSection(markdown: string, sectionName: string): string {
    // Extract content between ## sectionName and the next ## header
    const regex = new RegExp(
        `^## ${escapeRegex(sectionName)}\\s*\\n([\\s\\S]*?)(?=^## |\\Z)`,
        'm'
    );
    const match = markdown.match(regex);
    return match ? match[1].trim() : '';
}

/** Format a symbol detail as a readable markdown block. */
export function formatSymbolSummary(name: string): string {
    ensureInitialized();
    const detail = getSymbolDetail(name);
    if (!detail) return `(Symbol '${name}' not found)`;

    const lines = [
        `### ${detail.name} (${detail.kind})`,
        `Package: ${detail.sourcePackage}`,
    ];
    if (detail.extends) lines.push(`Extends: ${detail.extends}`);
    if (detail.jsDoc) lines.push('', detail.jsDoc);
    lines.push('', '```typescript', detail.signature, '```');
    return lines.join('\n');
}
```

### Anti-Patterns to Avoid
- **Dumping full README content:** The grid README alone is hundreds of lines. Prompts should extract only the sections relevant to the specific task, not embed entire documents.
- **Making prompts that duplicate tool functionality:** Prompts are for "give me a structured starting point for task X," not for "look up symbol Y." The latter is what tools are for.
- **Returning raw JSON in prompt content:** Prompts are consumed by LLMs. Use markdown-formatted text, not JSON blobs. This is consistent with the Phase 3 decision for markdown-header formatting.
- **Triggering ts-morph initialization unnecessarily:** The ts-morph registry has a lazy initialization cost. If a prompt only needs docs (not types), don't call `ensureInitialized()`.
- **Overly granular prompts:** A prompt for "add a column to a grid" is too narrow -- the LLM can figure that out from the grid creation prompt. Focus on complete workflow starting points.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Documentation loading | Custom file reading in each prompt | `doc-registry.ts` `buildRegistry`/`loadDocContent` | Already built, handles validation and path safety |
| Type extraction | Custom ts-morph queries in each prompt | `ts-registry.ts` `getSymbolDetail`/`getMembers` | Already built, handles lazy init and error recovery |
| Prompt argument validation | Manual argument parsing | Zod schemas via SDK's `argsSchema` | SDK validates automatically, generates JSON Schema |
| Markdown section extraction | String splitting hacks | Regex-based section extractor in util.ts | One clean implementation, tested and reusable |

**Key insight:** The prompt implementations are primarily *composition* -- assembling content from existing registries into well-structured responses. The heavy lifting (doc registry, ts-morph extraction) is already done in Phases 2 and 3.

## Common Pitfalls

### Pitfall 1: Context Window Overflow
**What goes wrong:** Prompts embed too much content (full READMEs + full member lists + full code examples), consuming a large portion of the LLM's context window before the user even starts working.
**Why it happens:** It is tempting to include "everything the LLM might need." Claude Code warns when MCP output exceeds 10,000 tokens.
**How to avoid:** (1) Extract only relevant sections from docs, not entire files. (2) For type info, include key properties/methods, not exhaustive member lists. (3) Target prompts at 2,000-4,000 tokens of content -- enough to be useful without being overwhelming. (4) Tell the LLM it can use the tools to look up more detail if needed.
**Warning signs:** Claude Code showing "large output" warnings when prompts are invoked.

### Pitfall 2: Stale Content in Prompts
**What goes wrong:** If doc content or type signatures are cached at server startup and docs change during a session, prompts return stale information.
**Why it happens:** Caching doc content for performance.
**How to avoid:** Load doc content fresh on each prompt invocation (it is fast -- just `readFileSync`). The doc registry metadata (IDs, paths) can be cached, but content should be loaded live. Type information via ts-morph is already designed for one-time lazy init, which is acceptable since source code rarely changes during a session.
**Warning signs:** Prompts returning documentation that does not match the current file on disk.

### Pitfall 3: Prompt Naming Conflicts
**What goes wrong:** Prompt names collide with existing slash commands or are confusing when prefixed with `/mcp__hoist-react__`.
**Why it happens:** Not considering the full rendered name in Claude Code.
**How to avoid:** Use short, descriptive names that read well when prefixed. Example: `create-grid` becomes `/mcp__hoist-react__create-grid`. Avoid redundant prefixes -- do NOT name it `hoist-create-grid` because the server name already provides the `hoist` context, resulting in `/mcp__hoist-react__hoist-create-grid`.
**Warning signs:** Users cannot find prompts, or names are awkwardly long.

### Pitfall 4: Missing Hoist Conventions in Output
**What goes wrong:** The prompt provides API details but omits Hoist-specific conventions (element factories over JSX, @managed decorators, makeObservable in constructors, doLoadAsync pattern). The LLM then generates code using JSX or missing lifecycle patterns.
**Why it happens:** Focusing on API surface without encoding the framework's idioms.
**How to avoid:** Every prompt should include a "Conventions" section that covers: element factory syntax, decorator usage (@managed, @bindable, @persist), constructor pattern (makeObservable), data loading pattern (doLoadAsync), and the model/component separation.
**Warning signs:** LLM generates JSX or misses @managed on child models.

### Pitfall 5: ts-morph Initialization Latency
**What goes wrong:** First prompt invocation is slow because it triggers ts-morph Project creation.
**Why it happens:** ts-morph is lazily initialized, and the first call to `ensureInitialized()` takes several seconds.
**How to avoid:** (1) Document this expected behavior. (2) If a prompt only needs documentation (not types), skip ts-morph. (3) The latency only affects the first invocation per server session.
**Warning signs:** First prompt invocation takes 3-5+ seconds.

## Candidate Prompts

Based on the phase requirements ("Create a grid panel", "Add a form with validation", "Build a tab container") and analysis of the documentation and sample apps, here are the recommended prompts:

### Prompt 1: create-grid
**Purpose:** Generate a complete grid panel with model, store, columns, data loading, and component.
**Arguments:**
- `dataFields` (optional): Comma-separated field names to pre-populate column definitions
- `features` (optional): Features to include (sorting, grouping, selection, export, filtering, treeMode)

**Content to compose:**
- Conventions section (element factories, decorators, makeObservable, doLoadAsync)
- Grid documentation excerpts (Basic Grid Setup, Configuration Pattern, Pre-built Column Specs, Sorting, Selection)
- GridModel type summary and key members (store, columns, sortBy, selModel, key methods)
- Column/ColumnSpec key properties
- Store field configuration patterns
- Complete code template for Model + Component files
- Reference to `hoist-search-docs` and `hoist-get-members` tools for additional detail

### Prompt 2: create-form
**Purpose:** Generate a form with model, field definitions, validation rules, and component rendering.
**Arguments:**
- `fields` (optional): Comma-separated field names (e.g. "firstName,lastName,email,age")
- `validation` (optional): Whether to include validation examples (default: true)

**Content to compose:**
- Conventions section
- Form documentation excerpts (Creating a FormModel, Validation, Working with Data)
- FormModel and FieldModel type summaries
- Validation rules catalog (required, lengthIs, numberIs, dateIs, custom validators)
- Input component reference (textInput, numberInput, select, dateInput, switchInput, etc.)
- Complete code template for Model + Component files
- Desktop FormField layout patterns

### Prompt 3: create-tab-container
**Purpose:** Generate a tabbed interface with model configuration and content panels.
**Arguments:**
- `tabs` (optional): Comma-separated tab names (e.g. "overview,details,history")
- `routing` (optional): Whether to include route integration (default: false)

**Content to compose:**
- Conventions section
- Tab documentation excerpts (Basic Usage, Configuration, Routing, Render Modes)
- TabContainerModel and TabModel type summaries
- RenderMode and RefreshMode options
- Complete code template for Model + Component files
- Optional routing configuration pattern

## Code Examples

Verified patterns from the installed SDK and existing codebase:

### registerPrompt API (from SDK type declarations)
```typescript
// Source: @modelcontextprotocol/sdk/dist/esm/server/mcp.d.ts (installed v1.26.0)

// Full registerPrompt signature
registerPrompt<Args extends PromptArgsRawShape>(
    name: string,
    config: {
        title?: string;
        description?: string;
        argsSchema?: Args;
    },
    cb: PromptCallback<Args>
): RegisteredPrompt;

// PromptCallback type
type PromptCallback<Args> = Args extends PromptArgsRawShape
    ? (args: ShapeOutput<Args>, extra: RequestHandlerExtra) => GetPromptResult | Promise<GetPromptResult>
    : (extra: RequestHandlerExtra) => GetPromptResult | Promise<GetPromptResult>;

// GetPromptResult (from spec.types.d.ts)
interface GetPromptResult extends Result {
    description?: string;
    messages: PromptMessage[];
}

// PromptMessage
interface PromptMessage {
    role: Role;  // "user" | "assistant"
    content: ContentBlock;  // TextContent | ImageContent | AudioContent | ResourceLink | EmbeddedResource
}
```

### Registration Pattern (following existing tool pattern)
```typescript
// mcp/prompts/index.ts
// Follows the same pattern as registerDocTools() and registerTsTools()

import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import {log} from '../util/logger.js';
import {buildGridPrompt} from './grid.js';
import {buildFormPrompt} from './form.js';
import {buildTabsPrompt} from './tabs.js';

export function registerPrompts(server: McpServer): void {
    server.registerPrompt(
        'create-grid',
        {
            title: 'Create a Hoist Grid Panel',
            description:
                'Generate a grid panel with model, columns, data loading, and component. ' +
                'Combines documentation excerpts, type signatures, and code patterns ' +
                'into a structured starting point.',
            argsSchema: {
                dataFields: z.string()
                    .optional()
                    .describe('Comma-separated data field names (e.g. "name,value,date")'),
                features: z.string()
                    .optional()
                    .describe('Features to include: sorting,grouping,selection,export,filtering,treeMode')
            }
        },
        async ({dataFields, features}) => buildGridPrompt({dataFields, features})
    );

    // ... similar for create-form, create-tab-container

    log.info('Registered 3 developer prompts');
}
```

### Server Entry Point Update
```typescript
// mcp/server.ts -- add one line
import {registerPrompts} from './prompts/index.js';

// ... existing registrations ...
registerPrompts(server);
```

### Prompt Content Composition
```typescript
// mcp/prompts/grid.ts
import type {GetPromptResult} from '@modelcontextprotocol/sdk/types.js';
import {loadDoc, extractSection, formatSymbolSummary, formatKeyMembers} from './util.js';

export async function buildGridPrompt(args: {
    dataFields?: string;
    features?: string;
}): Promise<GetPromptResult> {
    const fields = args.dataFields?.split(',').map(f => f.trim()).filter(Boolean) ?? [];
    const features = args.features?.split(',').map(f => f.trim()).filter(Boolean) ?? [];

    // Load relevant documentation sections
    const gridDoc = loadDoc('cmp/grid');
    const coreDoc = loadDoc('core');

    const basicSetup = extractSection(gridDoc, 'Common Usage Patterns');
    const configPattern = extractSection(gridDoc, 'Configuration Pattern');

    // Get type information
    const gridModelSummary = formatSymbolSummary('GridModel');
    const gridModelMembers = formatKeyMembers('GridModel', [
        'store', 'columns', 'sortBy', 'selModel', 'groupBy',
        'loadData', 'selectedRecord', 'selectedRecords'
    ]);

    // Build the composed prompt
    const text = [
        '# Task: Create a Hoist Grid Panel',
        '',
        '## Key Hoist Conventions',
        '- Use element factories, NOT JSX: `grid({model: gridModel})` not `<Grid model={gridModel} />`',
        '- Models extend HoistModel; mark child models with `@managed`',
        '- Call `makeObservable(this)` in the constructor',
        '- Data loading goes in `override async doLoadAsync(loadSpec) { ... }`',
        '- Use `@bindable` for observable properties that need auto-generated setters',
        '- Import from `@xh/hoist/...` paths',
        '',
        '## GridModel Configuration',
        configPattern,
        '',
        '## Grid Setup Examples',
        basicSetup,
        '',
        '## GridModel API Reference',
        gridModelSummary,
        '',
        '### Key Members',
        gridModelMembers,
        '',
        buildCodeTemplate(fields, features),
        '',
        '## Next Steps',
        '- Use `hoist-search-docs` tool to find more documentation',
        '- Use `hoist-get-members GridModel` to see all available properties and methods',
        '- Use `hoist-search-symbols` to find related types (Column, ColumnSpec, Store, etc.)'
    ].join('\n');

    return {
        description: 'Hoist grid panel creation guide with documentation, types, and code template',
        messages: [{
            role: 'user',
            content: {type: 'text', text}
        }]
    };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `server.prompt()` shorthand | `server.registerPrompt()` full form | SDK ~1.20+ | registerPrompt supports title, description, argsSchema in config object; shorthand is deprecated |
| No prompt capability needed | Prompts capability auto-declared | SDK handles automatically | McpServer auto-declares prompts capability when registerPrompt is called; no manual capability setup |
| Text-only prompt content | Text + Resource + Image + Audio | MCP spec 2025-11-25 | ContentBlock union supports embedded resources, but text is most practical for code generation prompts |

**Deprecated/outdated:**
- `server.prompt()`: Deprecated in favor of `server.registerPrompt()`. All four overloads of `prompt()` are marked `@deprecated` in the SDK type declarations.

## Open Questions

1. **Should prompts trigger ts-morph initialization proactively or lazily?**
   - What we know: ts-morph init takes 3-5s on first call. Prompts that include type info need it. Doc-only prompts do not.
   - What is unclear: Whether users will find the first-invocation latency acceptable, or whether we should pre-warm on server start.
   - Recommendation: Keep lazy initialization (consistent with Phase 3 decision). The latency is a one-time cost per session and is acceptable. If it proves problematic, we can add a pre-warm option later.

2. **How many prompts should we ship initially?**
   - What we know: The phase requirement says "at least 3." The three most common tasks are grid panels, forms, and tab containers.
   - What is unclear: Whether additional prompts (create-service, create-model, create-panel) add enough value for Phase 4 vs being deferred.
   - Recommendation: Ship exactly 3 for Phase 4. Keep a list of candidates for future phases (create-service, create-dashboard, create-mobile-view). More prompts can be added independently without architectural changes.

3. **Should prompt output include embedded resources or just text?**
   - What we know: The MCP spec supports `type: 'resource'` content blocks in prompt messages. These could reference hoist://docs/ resources already registered.
   - What is unclear: How well different MCP clients handle embedded resources in prompts vs plain text. Claude Code definitely handles text well.
   - Recommendation: Use text content with curated excerpts. Embedded resources risk including too much content (full READMEs). If needed, mention the resource URIs so the LLM or user can fetch them separately.

4. **Should prompts be hardcoded or data-driven?**
   - What we know: The doc registry uses a hardcoded approach (Phase 2 decision: "Hardcoded registry because doc structure is stable and well-known").
   - What is unclear: Whether prompts will need frequent updates.
   - Recommendation: Hardcode prompts. They are carefully authored content, not mechanical listings. Each prompt is a curated composition of docs, types, and patterns. The content they reference (docs, types) is loaded dynamically, so prompts stay current even as the underlying documentation and API evolve.

## Sources

### Primary (HIGH confidence)
- MCP Specification 2025-11-25 - Prompts section: protocol messages, data types, capability negotiation (https://modelcontextprotocol.io/specification/2025-11-25/server/prompts)
- @modelcontextprotocol/sdk v1.26.0 `mcp.d.ts` - registerPrompt() API, PromptCallback type, RegisteredPrompt type (read directly from installed package at `node_modules/@modelcontextprotocol/sdk/dist/esm/server/mcp.d.ts`)
- @modelcontextprotocol/sdk v1.26.0 `spec.types.d.ts` - GetPromptResult, PromptMessage, ContentBlock, EmbeddedResource types (read directly from installed package)
- Claude Code MCP documentation - Prompt surface as `/mcp__servername__promptname` slash commands, argument handling (https://code.claude.com/docs/en/mcp)
- Existing MCP server code - server.ts, tools/docs.ts, tools/typescript.ts, data/doc-registry.ts, data/ts-registry.ts (read directly from codebase)
- Hoist documentation - grid README, form README, tab README, core README, AGENTS.md (read directly from codebase)
- Toolbox example apps - RecallsPanelModel.ts, TodoPanelModel.ts, TaskService.ts, ContactService.ts (read from ../toolbox)

### Secondary (MEDIUM confidence)
- MCP TypeScript SDK server.md documentation on GitHub - registerPrompt examples, argsSchema usage (https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/server.md)
- MCP Concepts: Prompts page - user interaction model, prompt design patterns (https://modelcontextprotocol.io/docs/concepts/prompts)

### Tertiary (LOW confidence)
- None. All findings verified against primary sources.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new dependencies; registerPrompt API verified from installed SDK type declarations
- Architecture: HIGH - Follows established patterns from Phases 1-3 (registration functions, module organization, data registry reuse)
- Pitfalls: HIGH - Context overflow and naming verified against Claude Code documentation; convention requirements verified against AGENTS.md and sample apps
- Prompt content design: MEDIUM - Specific section extractions and content sizing will need iteration during implementation

**Research date:** 2026-02-13
**Valid until:** 2026-03-13 (MCP SDK is stable; prompt content may need refinement based on user feedback)
