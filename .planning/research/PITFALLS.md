# Pitfalls Research

**Domain:** MCP server with TypeScript type extraction, embedded in a UI framework library
**Researched:** 2026-02-11
**Confidence:** HIGH (multiple sources verified, codebase-specific analysis performed)

## Critical Pitfalls

### Pitfall 1: stdout Corruption in stdio Transport

**What goes wrong:**
Any `console.log()` or `process.stdout.write()` call in an MCP server using stdio transport corrupts
the JSON-RPC message stream. A single stray log statement crashes the client session or produces
unreadable JSON. This is the most common bug in MCP server implementations and the hardest to debug
because it manifests as mysterious protocol errors, not obvious crashes.

**Why it happens:**
stdio transport uses stdout exclusively for JSON-RPC messages. Developers instinctively use
`console.log()` for debugging (it is deeply ingrained), and third-party libraries may log to stdout
internally. Even a dependency's startup banner can break the transport.

**How to avoid:**
- Establish a project-wide rule: `console.log` is forbidden in MCP server code. Use `console.error()`
  (writes to stderr) or a file-based logger.
- Add an ESLint rule (`no-console` with `allow: ["error", "warn"]`) scoped to the MCP server
  directory.
- Audit every dependency used in the MCP server path for stdout writes.
- Create a logging utility that writes to stderr and use it exclusively.

**Warning signs:**
- MCP Inspector shows garbled or truncated responses.
- Client reports `-32700` (parse error) or `-32000` (connection closed) intermittently.
- Server works with HTTP transport but fails with stdio.

**Phase to address:**
Phase 1 (MCP server scaffold). Establish logging patterns before any tool/resource code is written.

---

### Pitfall 2: ts-morph Initialization Time and Memory on 700+ File Codebase

**What goes wrong:**
ts-morph loads the entire TypeScript program into memory on initialization. For hoist-react's ~700
TypeScript files (145K lines), naive initialization with full type checking takes 10-30 seconds and
consumes significant memory (500MB+). Users experience unacceptable cold-start delays when their
AI tool first connects, and the MCP server may OOM on constrained machines.

**Why it happens:**
ts-morph wraps the TypeScript compiler API, which must parse, bind, and type-check all source files
to resolve type information. Glob-based file loading is especially slow because it reads the
filesystem multiple times. Loading all files from tsconfig.json when you only need a subset wastes
initialization time.

**How to avoid:**
- Use `skipAddingFilesFromTsConfig: true` and load files selectively with
  `addSourceFilesAtPaths()` targeting only the public API surface.
- Pre-compute and cache extracted type data as a JSON index at build time (or on first run), so
  subsequent MCP server starts load from cache rather than re-parsing.
- Use ts-morph's `forgetNodesCreatedInBlock()` to free AST nodes after extraction.
- Consider `@ts-morph/bootstrap` (lighter-weight alternative) if full manipulation APIs are not
  needed.
- Set Node.js `--max-old-space-size` explicitly in the launch script.
- Benchmark initialization on CI with a performance budget (e.g., <5 seconds cold start).

**Warning signs:**
- MCP server startup takes >5 seconds.
- Memory usage exceeds 500MB during type extraction.
- Users report "tool not ready" or timeout errors when first connecting.

**Phase to address:**
Phase 2 (TypeScript extraction pipeline). Design the caching strategy before building extraction.
Validate with benchmarks before moving to Phase 3 tool integration.

---

### Pitfall 3: Tool Response Size Exceeds LLM Context Window

**What goes wrong:**
Type extraction for a class like `GridModel` (21 decorators, dozens of methods, deep inheritance
chain via `HoistBase -> HoistModel -> GridModel`) produces massive responses. At ~400-500 tokens per
tool definition and potentially thousands of tokens per type lookup response, the MCP server floods
the LLM's context window. The LLM silently drops context, produces hallucinated completions, or the
client truncates the response.

**Why it happens:**
Developers design MCP tools to return "complete" information (full class hierarchy, all inherited
members, full JSDoc comments) without considering that the consumer has a finite context window.
Block's MCP playbook (60+ servers built) specifically warns against exposing raw, granular data
without aggregation.

**How to avoid:**
- Design responses with explicit token budgets. A single tool response should stay under ~2000 tokens.
- Implement response tiers: summary (name, one-line description, key props) vs. detail (full
  signatures, JSDoc, inheritance).
- Use pagination or follow-up tool patterns: `lookup_type("GridModel")` returns a summary;
  `lookup_type_detail("GridModel", "methods")` returns method signatures.
- For class hierarchies, return only the declared (non-inherited) members by default, with an
  `includeInherited` parameter for opt-in expansion.
- Test every tool response against a token counter during development.

**Warning signs:**
- Tool responses exceed 2000 tokens regularly.
- LLM responses reference information that was not in the tool response (hallucination from
  truncated context).
- Users report that the AI "forgets" earlier conversation context after a type lookup.

**Phase to address:**
Phase 2-3 (extraction design and MCP tool integration). Define response format and size constraints
during extraction design. Validate with real queries in tool integration phase.

---

### Pitfall 4: TypeDoc Fragility with Hoist's Decorator Patterns

**What goes wrong:**
TypeDoc struggles with hoist-react's decorator patterns. The codebase uses `experimentalDecorators:
true` with `useDefineForClassFields: true` -- a combination that creates subtle semantic differences
in how class fields behave. TypeDoc must correctly resolve:

- Custom `@bindable` decorator (not standard MobX, creates setter methods via prototype
  manipulation)
- MobX `@observable`, `@computed`, `@action` decorators (584 occurrences across 100+ files)
- Re-export chains through 95 barrel `index.ts` files
- Complex generic/intersection types like `ElementSpec<P>`

TypeDoc historically has issues with re-exports becoming "heavily nested," type aliases being
"resolved too early" by the compiler, and decorator-related errors requiring
`--ignoreCompilerErrors`.

**Why it happens:**
TypeDoc relies on the TypeScript compiler's internal representation, which resolves type aliases and
handles decorators differently than source-level representation. The `@bindable` decorator creates
runtime behavior (setter methods) that has no TypeScript type signature -- TypeDoc cannot document
what it cannot see in the type system. The `useDefineForClassFields: true` setting changes how class
fields interact with decorators at a fundamental level.

**How to avoid:**
- If using TypeDoc: override `compilerOptions` in TypeDoc config to set `skipLibCheck: true` and
  test thoroughly with the hoist-react codebase before committing to it.
- Validate TypeDoc output for specific Hoist patterns early: pick 5 representative files
  (`HoistBase.ts`, `GridModel.ts`, `Store.ts`, `decorators.ts`, `elem.ts`) and verify the output
  is usable.
- Consider using ts-morph extraction as the single source of truth for type data, feeding both the
  MCP server and any human-browsable docs, rather than maintaining two separate extraction
  pipelines (TypeDoc + ts-morph).
- For `@bindable`, document the generated setter methods via custom extraction logic rather than
  relying on TypeDoc to infer them.

**Warning signs:**
- TypeDoc output is missing decorated properties or showing them without their decorator semantics.
- TypeDoc warnings about "unable to resolve signature of decorator."
- Re-exported types appear duplicated or nested incorrectly in generated docs.
- TypeDoc crashes or produces empty output for files with complex generics.

**Phase to address:**
Research/spike phase (before committing to TypeDoc as human-docs solution). The PROJECT.md already
flags this as a pending decision -- resolve it early with a proof-of-concept.

---

### Pitfall 5: MCP Server Dependencies Leaking into Production Bundles

**What goes wrong:**
ts-morph (~15MB installed), the MCP SDK, and their transitive dependencies get pulled into
application bundles, increasing bundle size by megabytes and potentially breaking browser runtime
(ts-morph uses Node.js APIs like `fs` and `path`). Even if declared as `devDependencies`, bundler
misconfiguration or import path mistakes can cause leakage.

**Why it happens:**
The MCP server lives in the same repository as the framework library. A developer adds an import
from a shared utility that transitively imports ts-morph. Bundlers (webpack, vite) follow import
chains eagerly. `devDependencies` only prevent installation in consuming projects -- they do not
prevent bundling if an import path exists.

**How to avoid:**
- Place all MCP server code in a dedicated directory (e.g., `mcp/`) that is explicitly excluded
  from the library's build and bundler entry points.
- Add the MCP directory to the `exclude` array in `tsconfig.json` (or use a separate tsconfig
  for the MCP server).
- Never import from `mcp/` in any library source file. Use a CI check (e.g., a grep-based lint
  rule) to verify no cross-boundary imports exist.
- Add the MCP directory to webpack/bundler `externals` or `exclude` as a defense-in-depth measure.
- Test with a clean `yarn install --production` to verify no MCP deps are required at runtime.

**Warning signs:**
- Application bundle size increases after MCP server is added.
- Browser console shows errors about missing `fs`, `path`, or `child_process` modules.
- `yarn install` in a consuming app pulls in ts-morph or @modelcontextprotocol/sdk.

**Phase to address:**
Phase 1 (project scaffold). Establish directory boundaries, build exclusions, and CI checks before
writing any code.

---

### Pitfall 6: Designing Tools Around Internal Structure Instead of User Workflows

**What goes wrong:**
Developers mirror the codebase's internal package structure into MCP tools (e.g.,
`get_core_types`, `get_cmp_types`, `get_data_types` -- one tool per package). This creates too many
tools (consuming context window with tool definitions), requires users to know the package structure
to ask the right question, and produces answers that miss cross-cutting concerns.

**Why it happens:**
It is natural to organize tools by source structure. The developer thinks "I have 13 packages, so I
need 13 resource endpoints." But the LLM user asks "how do I build a filterable grid?" which spans
`cmp/grid`, `data`, `cmp/filter`, and `core`.

**How to avoid:**
- Design tools top-down from user workflows, not bottom-up from source structure. Block's playbook
  (built from 60+ MCP servers) explicitly recommends starting from "what workflow needs to be
  automated" and working backwards.
- Provide a small number of high-level tools: `search_docs(query)`, `lookup_type(name)`,
  `list_package_contents(package)`. Let the LLM compose workflows from these primitives.
- Use resources (not tools) for static content like package READMEs -- resources are
  application-driven and do not consume tool-definition context tokens.
- Limit to 10-15 tools maximum. Each tool definition consumes ~400-500 tokens of context window
  permanently.

**Warning signs:**
- More than 15 tool definitions in the MCP server.
- Users need to make multiple tool calls to answer a single question.
- Tool names mirror internal directory structure rather than user intent.

**Phase to address:**
Phase 1 (MCP tool design). Define the tool surface area before implementation.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Returning full class hierarchies in every type lookup | Complete information per query | Blows context window, degrades LLM performance | Never -- always use tiered responses |
| Parsing TypeScript on every MCP tool call (no cache) | Simpler implementation, always fresh | 5-30 second latency per query, high memory churn | Only during early prototyping with <10 files |
| Using TypeDoc AND ts-morph for separate purposes | Each tool does what it does best | Two extraction pipelines to maintain, potential inconsistencies | Only if TypeDoc spike proves it adds unique value over ts-morph alone |
| Hardcoding hoist-react paths in MCP server | Works immediately for this repo | Cannot be reused for Hoist Core Java MCP or other projects | Early phases only; parameterize before v1 |
| Skipping response format testing | Faster tool development | LLM receives poorly structured data, produces bad code | Never -- test format with MCP Inspector from day 1 |
| Embedding MCP config in package.json scripts | Quick to set up | Harder to customize per-consumer, conflicts with app package.json | Acceptable for v1; extract to standalone config later |

## Integration Gotchas

Common mistakes when connecting components in this system.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| ts-morph + hoist-react tsconfig | Loading all 700 files when only public API surface matters | Use `skipAddingFilesFromTsConfig`, selectively load entry points and resolve dependencies |
| MCP resources + package READMEs | Serving raw markdown without metadata (package name, last modified) | Wrap each README as a resource with structured URI (`hoist://docs/grid`) and metadata |
| MCP tools + type extraction cache | Cache invalidation -- serving stale data after hoist-react updates | Use file modification timestamps; invalidate cache when source files change |
| TypeDoc + experimentalDecorators | TypeDoc emits warnings/errors about decorator resolution | Set `compilerOptions.experimentalDecorators: true` in TypeDoc config AND `skipLibCheck: true` |
| ts-morph + `@bindable` decorator | ts-morph sees the decorator but not the generated `setPropName()` method | Write custom extraction logic that recognizes `@bindable` and documents the generated setter |
| MCP server + consuming app bundler | Bundler follows import chain into MCP directory | Exclude MCP directory in bundler config AND tsconfig; add CI import-boundary check |
| stdio transport + third-party libs | A dependency writes to stdout (e.g., a warning message) | Audit dependency stdout behavior; consider capturing/redirecting stdout in server init |

## Performance Traps

Patterns that work at small scale but fail as the codebase grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Full AST traversal on every type lookup | Response latency >5 seconds | Pre-compute type index at startup or build time; serve from cache | >100 files or >20K lines |
| Resolving full inheritance chains eagerly | Memory spikes, slow responses for deep hierarchies | Lazy resolution; only traverse parents when `includeInherited` is requested | Classes with 3+ levels of inheritance (common in Hoist: HoistBase -> HoistModel -> GridModel) |
| Glob-based file loading in ts-morph | Initialization takes 10-30 seconds | Use explicit file lists or `addSourceFilesAtPaths` with targeted patterns | >500 files |
| Storing all extracted data in a single in-memory object | Works fine at first, grows unbounded | Segment by package; use lazy loading per-package | >50 extracted types |
| No pagination in search/list tools | Returns hundreds of results, floods context | Implement `limit` and `offset` parameters; default to top-10 results | >50 types matching a search query |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **MCP server starts:** Often missing -- test with MCP Inspector that tools actually respond
  correctly, not just that the process launches without errors.
- [ ] **Type lookup returns data:** Often missing -- verify that decorated properties show decorator
  semantics, that `@bindable` properties document their generated setters, and that inherited
  members are attributed to the correct class in the hierarchy.
- [ ] **README resources load:** Often missing -- verify that internal markdown links (`[See
  GridModel](../cmp/grid/README.md)`) are either resolved to absolute URIs or stripped, not passed
  through as broken relative links.
- [ ] **Search returns results:** Often missing -- test with real user queries ("how do I make a
  grid column sortable"), not just exact-match type names. Verify that partial matches and
  cross-package results work.
- [ ] **Dev-only isolation:** Often missing -- verify by building a consuming app (e.g., Toolbox)
  with the MCP-enabled hoist-react and confirming zero bundle size increase and no Node.js API
  errors in browser.
- [ ] **Cache invalidation works:** Often missing -- modify a source file, verify the MCP server
  returns updated type information (not stale cache).
- [ ] **Tool descriptions are LLM-friendly:** Often missing -- test tool descriptions with an LLM
  to verify it can select the right tool for natural-language queries without explicit tool name
  hints.

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| stdout corruption (stdio) | LOW | Grep for `console.log` in MCP code; replace with stderr logger; add ESLint rule |
| ts-morph memory/perf issues | MEDIUM | Implement caching layer; switch to selective file loading; consider `@ts-morph/bootstrap` |
| Response size overflow | MEDIUM | Add token counting; implement response tiers; split large tools into summary/detail pairs |
| TypeDoc fails on hoist patterns | MEDIUM-HIGH | Abandon TypeDoc if spike fails; use ts-morph as single extraction source for both MCP and human docs |
| Bundle leakage | LOW-MEDIUM | Add directory exclusion to tsconfig/bundler; fix import paths; add CI check |
| Too many/wrong tools | MEDIUM | Consolidate tools; redesign around workflows; remove tools with low usage |
| Stale cache after updates | LOW | Add file-watcher or timestamp-based invalidation; provide manual cache-clear tool |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| stdout corruption | Phase 1: MCP scaffold | ESLint rule in place; MCP Inspector test passes |
| ts-morph perf/memory | Phase 2: Type extraction | Benchmark: <5s cold start, <300MB memory on hoist-react |
| Response size overflow | Phase 2-3: Extraction + tools | Token count test: no tool response exceeds 2000 tokens |
| TypeDoc decorator issues | Pre-Phase 2 spike | 5 representative files produce correct TypeDoc output, or decision to skip TypeDoc |
| Bundle leakage | Phase 1: Project scaffold | CI check: no cross-boundary imports; consuming app bundle size unchanged |
| Wrong tool granularity | Phase 1: Tool design | Tool count <= 15; user workflow test with real queries |
| Cache staleness | Phase 2-3: Extraction + tools | Modify source file; verify updated response within 5 seconds |
| `@bindable` not documented | Phase 2: Type extraction | `lookup_type("GridModel")` response includes generated setter methods |
| Re-export chain confusion | Phase 2: Type extraction | Types accessed via barrel exports resolve to correct source location |

## Sources

- [MCP Specification (2025-11-25)](https://modelcontextprotocol.io/specification/2025-11-25) - HIGH confidence
- [MCP Security Survival Guide - Towards Data Science](https://towardsdatascience.com/the-mcp-security-survival-guide-best-practices-pitfalls-and-real-world-lessons/) - MEDIUM confidence
- [Block's Playbook for Designing MCP Servers](https://engineering.block.xyz/blog/blocks-playbook-for-designing-mcp-servers) - HIGH confidence
- [15 Best Practices for Building MCP Servers - The New Stack](https://thenewstack.io/15-best-practices-for-building-mcp-servers-in-production/) - MEDIUM confidence
- [MCP Best Practices Architecture Guide](https://modelcontextprotocol.info/docs/best-practices/) - MEDIUM confidence
- [Hierarchical Tool Management Discussion #532](https://github.com/orgs/modelcontextprotocol/discussions/532) - MEDIUM confidence
- [ts-morph Performance Documentation](https://ts-morph.com/manipulation/performance) - HIGH confidence
- [ts-morph Instantiation/Setup](https://ts-morph.com/setup/) - HIGH confidence
- [TypeDoc Issue #1867 - Complex type alias expansion](https://github.com/TypeStrong/typedoc/issues/1867) - HIGH confidence
- [TypeDoc Issue #400 - Decorator errors](https://github.com/TypeStrong/typedoc/issues/400) - HIGH confidence
- [TypeDoc Issue #1333 - Decorator resolution](https://github.com/TypeStrong/typedoc/issues/1333) - HIGH confidence
- [TypeDoc Issue #1786 - Custom theme breaking changes](https://github.com/TypeStrong/typedoc/issues/1786) - HIGH confidence
- [TypeScript Issue #48814 - useDefineForClassFields breaks decorators](https://github.com/microsoft/TypeScript/issues/48814) - HIGH confidence
- [MCP stdio corruption Issue #835](https://github.com/ruvnet/claude-flow/issues/835) - MEDIUM confidence
- [Stainless MCP Error Handling Guide](https://www.stainless.com/mcp/error-handling-and-debugging-mcp-servers) - MEDIUM confidence
- [MCPcat Unit Testing Guide](https://mcpcat.io/guides/writing-unit-tests-mcp-servers/) - MEDIUM confidence
- hoist-react codebase analysis (tsconfig.json, decorators.ts, eslint.config.js, package.json) - HIGH confidence

---
*Pitfalls research for: MCP server with TypeScript type extraction, embedded in hoist-react*
*Researched: 2026-02-11*
