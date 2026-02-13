# Phase 3: TypeScript Extraction - Research

**Researched:** 2026-02-13
**Domain:** TypeScript static analysis via ts-morph, MCP tool registration, TypeDoc validation
**Confidence:** HIGH

## Summary

This phase adds TypeScript symbol extraction to the hoist-react MCP server, enabling LLMs to search
for symbols (classes, interfaces, types, functions), retrieve detailed type signatures with JSDoc
comments, and list class/interface members. The primary extraction engine is **ts-morph** (v27.0.2),
a TypeScript Compiler API wrapper that provides high-level AST traversal and type information. The
hoist-react codebase is ~703 TypeScript files totaling ~88,000 lines, with ~224 exported classes,
extensive barrel exports (`export * from` in ~56 `index.ts` files), and heavy use of legacy
`experimentalDecorators` (MobX `@observable`, `@action`, `@computed`, `@bindable`, plus Hoist's own
`@managed` and `@persist`).

The key architectural challenge is **cold start performance** -- the <5 second target for MCP server
startup. ts-morph project creation involves parsing all source files and optionally resolving their
dependency graph. The recommended approach is **lazy initialization with eager indexing**: create the
ts-morph `Project` lazily (on first TypeScript tool invocation), but then eagerly build a lightweight
symbol index (name -> source file location) that supports fast search without per-query AST
traversal. Detailed symbol information (type signatures, JSDoc, members) is extracted on-demand from
individual source files.

A secondary requirement (HDOC-01) is a TypeDoc validation spike -- a time-boxed experiment to
determine whether TypeDoc (v0.28.16) can generate usable HTML/JSON documentation for hoist-react
given its decorator patterns, barrel export structure, and `experimentalDecorators` configuration.
This spike produces a written finding, not production code.

**Primary recommendation:** Use ts-morph 27.0.2 with the hoist-react tsconfig.json (which includes
`experimentalDecorators: true` and `paths` aliases). Build a pre-computed symbol index at
initialization time for fast search. Extract detailed info on-demand. Register three MCP tools:
`hoist-search-symbols`, `hoist-get-symbol`, and `hoist-get-members`. Run the TypeDoc spike as an
isolated experiment with documented pass/fail findings.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| ts-morph | 27.0.2 | TypeScript AST parsing, type extraction, symbol analysis | De facto standard TS Compiler API wrapper; used by all known MCP TS analysis servers; supports experimentalDecorators via tsconfig; same TS ~5.9.x as hoist-react |
| @modelcontextprotocol/sdk | 1.26.0 | MCP server, registerTool | Already installed from Phase 1 |
| zod | 4.3.6 | Tool input schema validation | Already installed from Phase 1 |
| tsx | ^4.21.0 | TypeScript execution without build step | Already installed from Phase 1 |

### Supporting (for HDOC-01 spike only)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| typedoc | 0.28.16 | TypeDoc validation spike | HDOC-01 spike only -- install temporarily, remove after spike |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| ts-morph | Raw TypeScript Compiler API | Lower-level, more boilerplate, same underlying engine; ts-morph adds convenience with no meaningful overhead |
| ts-morph | @ts-morph/bootstrap | Lighter weight but provides only raw TS compiler types, no AST navigation helpers (getDecorators, getJsDocs, etc.) -- would require writing our own |
| ts-morph | TypeDoc JSON output | Could parse TypeDoc's JSON for symbol info, but adds build step dependency and TypeDoc may not handle hoist-react patterns (that's what the spike determines) |
| In-memory index | Full-text search library (minisearch, flexsearch) | Overkill for ~700 files; simple Map-based index with string matching is sufficient |

**Installation:**
```bash
# ts-morph as devDependency (MCP server only, not in browser bundle)
yarn add -D ts-morph
# For HDOC-01 spike only (temporary):
yarn add -D typedoc
```

## Architecture Patterns

### Recommended Project Structure
```
mcp/
├── server.ts                    # Entry point (exists) -- add TS tool registration
├── data/
│   ├── doc-registry.ts          # Exists -- unchanged
│   └── ts-registry.ts           # NEW: ts-morph Project wrapper, symbol index, extraction API
├── resources/
│   └── docs.ts                  # Exists -- unchanged
├── tools/
│   ├── docs.ts                  # Exists -- unchanged
│   └── typescript.ts            # NEW: hoist-search-symbols, hoist-get-symbol, hoist-get-members
└── util/
    ├── logger.ts                # Exists -- unchanged
    └── paths.ts                 # Exists -- unchanged
```

### Pattern 1: Lazy ts-morph Project with Eager Symbol Index
**What:** The ts-morph `Project` is created lazily on the first TypeScript tool invocation (not at
server startup). Once created, an in-memory symbol index is eagerly built by scanning all source
files once and recording: symbol name, kind (class/interface/type/function/const), source file path,
and export status. Subsequent searches use this index (a `Map<string, SymbolEntry[]>`) rather than
re-traversing the AST.
**When to use:** Always -- this is the core performance pattern.
**Key design details:**
- Project creation uses `tsConfigFilePath` pointing to the repo's root `tsconfig.json`, which
  provides `experimentalDecorators: true`, `paths` aliases (`@xh/hoist/*`), and the correct file
  includes/excludes.
- Use `skipFileDependencyResolution: true` at construction, then call
  `project.resolveSourceFileDependencies()` explicitly -- this gives us control over initialization
  timing.
- Index is a `Map<string, SymbolEntry[]>` keyed by lowercase symbol name for case-insensitive
  search, where each entry contains `{name, kind, filePath, isExported}`.
- The index is built by iterating over `project.getSourceFiles()` and using AST-level methods
  (`getClasses()`, `getInterfaces()`, `getTypeAliases()`, `getFunctions()`, `getVariableStatements()`)
  rather than the expensive `getExportedDeclarations()` method (which requires full type binding and
  can be ~1000x slower).
```typescript
// Source: ts-morph official docs + GitHub issue #644 performance analysis
import {Project, SourceFile, SyntaxKind} from 'ts-morph';

let project: Project | null = null;
let symbolIndex: Map<string, SymbolEntry[]> | null = null;

function getProject(): Project {
    if (!project) {
        project = new Project({
            tsConfigFilePath: resolve(resolveRepoRoot(), 'tsconfig.json'),
            skipFileDependencyResolution: true
        });
        project.resolveSourceFileDependencies();
        symbolIndex = buildSymbolIndex(project);
    }
    return project;
}

function buildSymbolIndex(project: Project): Map<string, SymbolEntry[]> {
    const index = new Map<string, SymbolEntry[]>();
    for (const sourceFile of project.getSourceFiles()) {
        // Skip node_modules, build artifacts, mcp directory
        const filePath = sourceFile.getFilePath();
        if (filePath.includes('node_modules') || filePath.includes('/build/')) continue;

        for (const cls of sourceFile.getClasses()) {
            addToIndex(index, {
                name: cls.getName() ?? '(anonymous)',
                kind: 'class',
                filePath,
                isExported: cls.isExported()
            });
        }
        // ... repeat for interfaces, type aliases, functions, exported consts
    }
    return index;
}
```

### Pattern 2: On-Demand Detail Extraction
**What:** When an LLM requests detailed symbol info (type signature, JSDoc, members), extract it
on-demand from the already-loaded ts-morph `SourceFile` rather than pre-computing all details.
**When to use:** For `hoist-get-symbol` and `hoist-get-members` tools.
**Why:** Pre-extracting detailed info for all ~700+ symbols would be wasteful -- most queries ask
about a small number of specific symbols. ts-morph keeps parsed source files in memory, so
re-accessing them is fast (no re-parsing).
```typescript
// Getting JSDoc for a class
const jsDocs = classDecl.getJsDocs();
const description = jsDocs.map(d => d.getDescription()).join('\n');

// Getting type signature for a property
const propType = property.getType().getText(property);

// Getting decorators
const decorators = property.getDecorators().map(d => d.getName());

// Getting members of a class
const methods = classDecl.getInstanceMethods().map(m => ({
    name: m.getName(),
    returnType: m.getReturnType().getText(m),
    parameters: m.getParameters().map(p => ({
        name: p.getName(),
        type: p.getType().getText(p)
    })),
    docs: m.getJsDocs().map(d => d.getDescription()).join('\n')
}));
```

### Pattern 3: MCP Tool Registration (Consistent with Phase 2)
**What:** Register TypeScript tools following the same pattern established in `mcp/tools/docs.ts` --
a `registerTsTools(server)` function that takes the McpServer instance and registers all TS tools
with Zod schemas, annotations, and structured text output.
**When to use:** For all three new tools.
```typescript
export function registerTsTools(server: McpServer): void {
    // Tools registered here with same pattern as docs.ts
    server.registerTool('hoist-search-symbols', { ... }, async ({query, kind}) => { ... });
    server.registerTool('hoist-get-symbol', { ... }, async ({name, filePath}) => { ... });
    server.registerTool('hoist-get-members', { ... }, async ({name, filePath}) => { ... });
}
```

### Pattern 4: Hoist-React Specific Symbol Patterns
**What:** The hoist-react codebase has several patterns that affect how symbols should be extracted
and presented.
**Key patterns to handle:**
1. **Frozen const objects as "enums"** -- e.g., `export const RefreshMode = Object.freeze({...})` with
   a companion `export type RefreshMode = ...`. These should surface as both a const and a type.
2. **`hoistCmp.factory()` component definitions** -- Components are exported as const element
   factories, not as classes. The symbol extractor should capture these.
3. **Barrel exports (`export * from`)** -- 56 index.ts files re-export symbols. The index should
   record the *original* declaration file, not the barrel file, since that's where JSDoc/type info
   lives.
4. **Decorator annotations** -- `@observable`, `@bindable`, `@managed`, `@persist`, `@computed`,
   `@action` carry semantic meaning. The member listing should include decorator names.
5. **Path aliases** -- Imports use `@xh/hoist/*` paths. ts-morph resolves these automatically when
   given the tsconfig.json with the `paths` configuration.

### Anti-Patterns to Avoid
- **Using `getExportedDeclarations()`** for index building: This method triggers full type binding
  and is ~1000x slower than AST-level traversal for the same information. Reserve it only if
  absolutely needed for specific edge cases.
- **Pre-computing all member details at startup**: Wastes memory and time. Extract on-demand.
- **Creating a separate tsconfig for MCP**: The MCP ts-morph Project should use the repo's root
  `tsconfig.json` to get the same compiler options, path aliases, and file includes that the real
  codebase uses. The MCP directory's own `tsconfig.json` is for type-checking the MCP server code
  itself -- they serve different purposes.
- **Returning raw AST dumps**: LLMs need human-readable formatted output, not AST node dumps.
  Format type signatures as clean TypeScript syntax.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| TypeScript parsing | Custom regex-based TS parser | ts-morph Project | Handles generics, decorators, complex types, path aliases correctly |
| Type signature text | String concatenation from AST | `type.getText(node)` from ts-morph | Handles generic parameters, union types, conditional types, mapped types correctly |
| Path alias resolution | Custom path mapping logic | ts-morph + tsconfig.json `paths` | TS compiler handles this natively when given the tsconfig |
| JSDoc extraction | Regex on file content | `node.getJsDocs()` from ts-morph | Handles multi-line docs, tags, code blocks correctly |
| Decorator detection | Regex for `@decorator` patterns | `node.getDecorators()` from ts-morph | Handles decorator factories, arguments, nested decorators |

**Key insight:** ts-morph wraps the TypeScript Compiler API, which already solves all the hard
parsing problems. Every time you think about regex or string parsing for TS code, use ts-morph
instead.

## Common Pitfalls

### Pitfall 1: getExportedDeclarations() Performance Trap
**What goes wrong:** Using `sourceFile.getExportedDeclarations()` to build the symbol index causes
the entire type-checking/binding pass to run, taking ~1 second per file instead of ~1ms.
**Why it happens:** This method uses TypeScript's symbol resolution, which requires the full program
to be bound. AST-level methods like `getClasses()` only need parsing, not binding.
**How to avoid:** Use AST-level methods (`getClasses()`, `getInterfaces()`, `getTypeAliases()`,
`getFunctions()`, `getVariableStatements()`) for index building. Only use type-system methods
(`getType()`, `getText()`) during on-demand detail extraction for individual symbols.
**Warning signs:** Index building takes more than 2-3 seconds.

### Pitfall 2: Cold Start Timeout
**What goes wrong:** The MCP server takes too long to start, and the client times out or the
developer experience is poor.
**Why it happens:** Loading ts-morph Project + parsing 700 files + building index at server startup.
**How to avoid:** Lazy initialization -- don't create the Project until the first TypeScript tool is
invoked. The MCP server starts instantly (just registers tools), and the first TS query pays the
initialization cost (~2-4 seconds expected for 700 files).
**Warning signs:** Server startup time exceeds 5 seconds. Measure with `Date.now()` around
initialization.

### Pitfall 3: Memory Pressure from Full AST Retention
**What goes wrong:** ts-morph keeps all parsed ASTs in memory, and for a 700-file project this can
use significant RAM.
**Why it happens:** ts-morph caches parsed source files and their AST nodes.
**How to avoid:** This is acceptable for our use case (read-only analysis of a bounded codebase).
Do NOT use `sourceFile.forget()` or `forgetDescendants()` since we need the ASTs for on-demand
queries. If memory becomes an issue (unlikely for 700 files / ~88K lines), consider using
`skipLoadingLibFiles: true` to avoid loading TypeScript's standard library definitions.
**Warning signs:** MCP server process memory exceeds 500MB.

### Pitfall 4: Stale Index After File Changes
**What goes wrong:** Developer edits a hoist-react source file, but the MCP server's symbol index
still reflects the old state.
**Why it happens:** The ts-morph Project is loaded once and cached.
**How to avoid:** For Phase 3, accept this limitation -- the MCP server is restarted when the
developer restarts their editor or MCP client. Document this as a known limitation. A future
enhancement could add file-watching, but that's out of scope.
**Warning signs:** LLM gets outdated type information.

### Pitfall 5: Duplicate Symbols from Barrel Re-exports
**What goes wrong:** The same class appears multiple times in search results -- once from its
declaration file and once from each barrel `index.ts` that re-exports it.
**Why it happens:** Barrel files use `export * from './Module'`, which creates additional export
declarations. If we scan barrel files for exports, we double-count.
**How to avoid:** When building the index, only record symbols from their *original declaration*
file. Skip `export * from` and `export { X } from` re-export statements. ts-morph's
`sourceFile.getClasses()` returns classes *declared* in that file, not re-exported ones, so this
is naturally handled if we use the right methods.
**Warning signs:** Search for "GridModel" returns multiple results from different files.

### Pitfall 6: Anonymous/Default Export Handling
**What goes wrong:** Some symbols don't have names, or are exported as default exports, and get
missed or cause errors.
**Why it happens:** `class.getName()` returns `undefined` for anonymous classes; default exports
have different AST structure.
**How to avoid:** Use `getName() ?? '(anonymous)'` with null guards. For default exports, check
`isDefaultExport()`. In practice, hoist-react uses named exports almost exclusively, so this is
a minor concern.
**Warning signs:** `TypeError: Cannot read property 'toLowerCase' of undefined` during indexing.

## Code Examples

Verified patterns from official ts-morph documentation:

### Creating a Project from tsconfig.json
```typescript
// Source: https://ts-morph.com/setup/
import {Project} from 'ts-morph';

const project = new Project({
    tsConfigFilePath: '/path/to/hoist-react/tsconfig.json',
    skipFileDependencyResolution: true  // Defer for manual control
});
// Explicitly resolve after setup
project.resolveSourceFileDependencies();
```

### Extracting Class Information
```typescript
// Source: https://ts-morph.com/details/classes
const sourceFile = project.getSourceFileOrThrow('/path/to/GridModel.ts');
const gridModel = sourceFile.getClassOrThrow('GridModel');

// Base class
const baseClass = gridModel.getBaseClass(); // HoistModel
const baseTypeName = gridModel.getExtends()?.getText(); // 'HoistModel'

// Properties with decorators
for (const prop of gridModel.getInstanceProperties()) {
    const name = prop.getName();
    const type = prop.getType().getText(prop);
    const decorators = prop.getDecorators?.()?.map(d => d.getName()) ?? [];
    // e.g., name="columns", type="ColumnOrGroup[]", decorators=["observable"]
}

// Methods
for (const method of gridModel.getInstanceMethods()) {
    const name = method.getName();
    const returnType = method.getReturnType().getText(method);
    const params = method.getParameters().map(p => ({
        name: p.getName(),
        type: p.getType().getText(p)
    }));
}
```

### Extracting JSDoc Comments
```typescript
// Source: https://ts-morph.com/details/documentation
const jsDocs = gridModel.getJsDocs();
for (const doc of jsDocs) {
    const description = doc.getDescription();  // Main comment text
    const tags = doc.getTags();  // @param, @returns, @see, etc.
    for (const tag of tags) {
        const tagText = tag.getText();  // Full tag text with @ symbol
    }
}
```

### Extracting Interface Members
```typescript
// Source: https://ts-morph.com/details/interfaces
const sourceFile = project.getSourceFileOrThrow('/path/to/core/types/Interfaces.ts');
const iface = sourceFile.getInterfaceOrThrow('HoistBaseClass');

for (const prop of iface.getProperties()) {
    const name = prop.getName();
    const type = prop.getType().getText(prop);
    const isOptional = prop.hasQuestionToken();
    const docs = prop.getJsDocs().map(d => d.getDescription()).join('\n');
}

for (const method of iface.getMethods()) {
    const name = method.getName();
    const returnType = method.getReturnType().getText(method);
}
```

### Extracting Decorator Information
```typescript
// Source: https://ts-morph.com/details/decorators
const prop = gridModel.getInstancePropertyOrThrow('columns');
const decorators = prop.getDecorators();
for (const decorator of decorators) {
    const name = decorator.getName();           // 'observable'
    const fullName = decorator.getFullName();    // 'observable.ref' if applicable
    const isFactory = decorator.isDecoratorFactory();
    const args = decorator.getArguments().map(a => a.getText());
}
```

## TypeDoc Spike (HDOC-01) Approach

### What to Validate
The HDOC-01 spike must answer: **Can TypeDoc generate usable HTML and/or JSON documentation for
hoist-react given its specific patterns?**

### Known Risk Areas
1. **`experimentalDecorators: true`** -- TypeDoc historically required `--ignoreCompilerErrors` with
   experimental decorators. Recent versions (0.28.x) may handle this better, but must be verified.
2. **Barrel exports (`export * from`)** -- TypeDoc has had persistent issues with re-export
   documentation. While improvements were made in 0.28.x (especially 0.28.7 for `export { type X }`),
   the specific `export * from` pattern used extensively in hoist-react needs testing.
3. **`Object.freeze()` const-as-enum pattern** -- Hoist uses `export const X = Object.freeze({...})`
   with companion types, not TS enums. TypeDoc may not document these well.
4. **`@xh/hoist/*` path aliases** -- TypeDoc uses the TS compiler internally and should respect
   tsconfig `paths`, but this needs verification.
5. **JSON output** -- Even if HTML output has issues, JSON output (`--json docs.json`) might be
   parseable for programmatic consumption.

### Spike Execution Plan
1. Install TypeDoc temporarily: `yarn add -D typedoc`
2. Create a minimal `typedoc.json` config pointing to hoist-react entry points
3. Run TypeDoc with `--json` output first (most useful for MCP consumption)
4. Run TypeDoc with `--out` HTML output for visual inspection
5. Check specifically: Are decorated properties documented? Are barrel re-exports resolved? Are
   frozen const objects documented? Does the JSON contain usable type information?
6. Document findings in a spike report with pass/fail for each risk area
7. Remove typedoc dependency if not needed going forward

### Expected Outcome
Based on research, TypeDoc 0.28.x has significantly improved re-export handling and TS 5.x support.
However, the `experimentalDecorators` + `Object.freeze` enum pattern + deep barrel export chains
create a unique combination that may still cause issues. **Confidence: MEDIUM** that TypeDoc will
work fully; **Confidence: HIGH** that at least JSON output will be partially usable.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| ts-morph with bundled TS compiler | ts-morph 27.0.2 with TS ~5.9.x | 2025 | Supports latest TS features including satisfies, const type params |
| TypeDoc 0.25.x with manual re-export config | TypeDoc 0.28.16 with improved re-export handling | 2025 | Better barrel export support, JSON schema file added |
| Custom TS Compiler API usage | ts-morph as standard wrapper | Established | De facto standard for programmatic TS analysis |
| getExportedDeclarations() for symbol discovery | AST-level traversal (getClasses, etc.) | Recognized best practice | ~1000x faster for index building |

**Deprecated/outdated:**
- `@ts-morph/bootstrap`: Not deprecated but provides only raw compiler types without AST helpers -- insufficient for our needs.
- TypeDoc < 0.28: Significantly worse re-export and TS 5.x support.

## Open Questions

1. **Exact cold start timing for 700-file project**
   - What we know: ts-morph Project creation + file parsing takes measurable time; AST-level
     indexing is fast. The `getExportedDeclarations()` issue (#644) shows binding is the bottleneck,
     not parsing.
   - What's unclear: Exact wall-clock time for hoist-react's 703 files with
     `skipFileDependencyResolution: true` then `resolveSourceFileDependencies()`.
   - Recommendation: Measure during implementation. If >5 seconds, consider
     `skipLoadingLibFiles: true` or reducing the file set to only public-API packages (core, data,
     cmp, svc, format, utils, etc.) excluding admin/inspector internals.

2. **Should admin/inspector internal symbols be indexed?**
   - What we know: The `admin/` and `inspector/` packages contain internal implementation classes
     that app developers rarely use directly.
   - What's unclear: Whether including them adds noise to search results or whether they're useful
     for LLM context.
   - Recommendation: Include them in the index but consider a `scope` filter parameter (e.g.,
     "public" vs "all") if search results are too noisy. Start with "include everything" and refine.

3. **TypeDoc spike outcome**
   - What we know: TypeDoc 0.28.16 supports TS 5.9 and has improved re-export handling.
   - What's unclear: Whether hoist-react's specific combination of patterns works.
   - Recommendation: Execute the spike early in the phase. If TypeDoc works well, its JSON output
     could supplement or validate ts-morph extraction. If it fails, ts-morph is the sole extraction
     source and the spike documents why.

4. **How to handle `hoistCmp.factory()` component exports**
   - What we know: Components are exported as `export const myComponent = hoistCmp.factory({...})`,
     which are const variable declarations, not classes.
   - What's unclear: Whether these should appear as "function" kind or a custom "component" kind in
     search results.
   - Recommendation: Index them as "const" kind and extract their type annotation if available.
     Consider a "component" kind if we can detect the `hoistCmp.factory()` call pattern.

## Sources

### Primary (HIGH confidence)
- [ts-morph official docs](https://ts-morph.com/) - Setup, performance, classes, interfaces, types, decorators, JSDoc API
- [ts-morph GitHub](https://github.com/dsherret/ts-morph) - package.json shows v27.0.2, TS ~5.9.2 devDep
- [ts-morph npm](https://www.npmjs.com/package/ts-morph) - Version 27.0.2, published ~Oct 2025
- [TypeDoc releases](https://github.com/TypeStrong/typedoc/releases) - v0.28.16, TS 5.9 support confirmed
- hoist-react codebase direct inspection - 703 TS files, 88K lines, 224 exported classes, 56 barrel files, experimentalDecorators tsconfig

### Secondary (MEDIUM confidence)
- [ts-morph issue #644](https://github.com/dsherret/ts-morph/issues/644) - getExportedDeclarations() performance (~1s vs ~1ms), maintainer confirmed binding is root cause
- [CaptainCrouton89/static-analysis MCP server](https://github.com/CaptainCrouton89/static-analysis) - Architecture patterns for ts-morph + MCP: caching, parallel processing, 4-tool design
- [TypeDoc issue #712](https://github.com/TypeStrong/typedoc/issues/712) - Re-export documentation issues, historical context
- [TypeDoc JSON output docs](https://typedoc.org/documents/Options.Output.html) - `--json` output option, `pretty` formatting

### Tertiary (LOW confidence)
- [t3ta/ts-morph-mcp-server](https://mcp.so/server/ts-morph-mcp-server/t3ta) - "TypeScript Package Introspector" MCP server; limited documentation available about internals
- General web search for TypeDoc + experimentalDecorators -- most results are from 2016-2023 and may not reflect current state

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - ts-morph 27.0.2 is the clear choice, verified compatible with TS 5.9 and experimentalDecorators
- Architecture: HIGH - Lazy init + eager index + on-demand detail is a well-established pattern, verified with ts-morph performance characteristics
- Pitfalls: HIGH - getExportedDeclarations() bottleneck is well-documented; barrel export handling is understood from codebase inspection
- TypeDoc spike: MEDIUM - Outcome is uncertain by design (it's a spike); approach is clear but results are unpredictable

**Research date:** 2026-02-13
**Valid until:** 2026-03-15 (ts-morph and TypeDoc are stable, slow-moving libraries)
