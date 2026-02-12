# Project Research Summary

**Project:** MCP Server + Documentation Tooling for hoist-react
**Domain:** Embedded MCP server with TypeScript documentation extraction for a UI framework library
**Researched:** 2026-02-11
**Confidence:** HIGH

## Executive Summary

This project will embed a Model Context Protocol (MCP) server directly within hoist-react to serve framework documentation and TypeScript API information to AI coding assistants. The recommended approach uses the official `@modelcontextprotocol/sdk` for MCP infrastructure, `ts-morph` for TypeScript extraction, and optional `typedoc` for human-browsable documentation. The server should operate via stdio transport for local development and ship as developer tooling alongside the framework source code.

The key architectural insight is that unlike external documentation services (Context7, Ref.Tools, Microsoft Learn), this MCP server reads directly from the framework source with zero configuration, making it always in-sync and immediately available to developers using hoist-react. The critical path is establishing TypeScript extraction infrastructure that handles hoist-react's decorator patterns (MobX, custom `@bindable`) and 700+ file codebase without unacceptable startup time.

Major risks include ts-morph initialization overhead on a large codebase (10-30s cold start), TypeDoc fragility with hoist-react's decorator patterns and `experimentalDecorators` configuration, and stdio transport corruption from stray logging. Mitigation strategies are well-understood: lazy initialization with eager indexing, selective file loading, TypeDoc validation spike, and strict stdout discipline.

## Key Findings

### Recommended Stack

The official TypeScript MCP SDK (`@modelcontextprotocol/sdk` ~1.26.0) is the only credible choice for MCP infrastructure—all alternatives are wrappers or add unnecessary scaffolding. For TypeScript extraction, `ts-morph` 27.0.2 is recommended as the primary tool because it bundles TypeScript 5.9 (matching hoist-react's 5.9.2), works directly on source files, and provides escape hatches to the compiler API. TypeDoc 0.28.16 is suggested for human-browsable HTML documentation with JSON output support, but requires validation against hoist-react's decorator patterns.

**Core technologies:**
- `@modelcontextprotocol/sdk` (1.26.0): Official MCP server implementation—actively maintained, weekly releases, only credible option
- `ts-morph` (27.0.2): Programmatic TypeScript extraction wrapper—bundles TS 5.9, direct source access, structured API for interfaces/classes/types
- `typedoc` (0.28.16): API documentation generator with HTML and JSON output—supports TS 5.0-5.9, enables future custom Hoist SPA without lock-in
- `zod` (^4.0): Schema validation for MCP tool inputs—required peer dependency of SDK
- `tsx` (4.21.0): Fast TypeScript execution for dev server—esbuild-based, 20-30x faster than ts-node

**Critical decision:** TypeDoc's viability for hoist-react's decorator patterns (MobX + custom `@bindable` with `experimentalDecorators` and `useDefineForClassFields`) is unproven and requires early validation. If TypeDoc struggles, ts-morph can serve both MCP and human-docs needs as a single extraction source.

### Expected Features

Research analyzed 10+ documentation MCP servers across vendor (Microsoft, Google, AWS) and open-source (Context7, MCP-Typescribe, docs-mcp-server) implementations. The feature landscape shows clear differentiation between table stakes (search, retrieval, type lookup) and competitive advantages (embedded delivery, convention documentation, MCP prompts).

**Must have (table stakes):**
- Search documentation by keyword/topic—every documentation MCP provides this; LLMs need discoverability
- Retrieve full document content—all major servers expose full-page retrieval after search
- List available documentation—LLMs need to discover what exists without guessing
- TypeScript type/interface lookup—the core value proposition; MCP-Typescribe proves this pattern works
- stdio transport—standard local MCP transport; 90%+ of servers use this
- Token-efficient responses—Ref.Tools built their value proposition on this; context windows are finite

**Should have (competitive):**
- Embedded in framework source—unique advantage; no external service, indexing, or API key required
- Convention/pattern documentation tools—serve AGENTS.md and architectural patterns; no existing MCP server does this well
- Type hierarchy and relationship navigation—show how HoistModel/HoistService/hoistCmp relate
- MCP Prompts for common development tasks—no documentation MCP currently offers prompts; high-leverage for onboarding
- Context-aware filtering by package/concern—reduces noise, increases relevance
- Code example retrieval—Microsoft and Google plan this; hoist-react's READMEs contain inline examples

**Defer (v2+):**
- Human-browsable documentation SPA—stretch goal; large scope, depends on extraction infrastructure being solid
- Semantic/vector search—massive complexity increase for a bounded 20-doc corpus; keyword search suffices
- Streamable HTTP transport—local-first constraints for v1; add when team/remote scenarios arise
- Multi-version documentation—Hoist apps track single version; complexity without clear use case

### Architecture Approach

The recommended architecture separates content extraction (providers) from MCP protocol wiring (resources/tools). A `MarkdownProvider` loads README and concept docs from disk with caching. A `TypeScriptProvider` uses ts-morph to build a lightweight index at startup (package names, class names, file paths) and performs deep analysis on-demand. This lazy initialization with eager indexing pattern keeps cold start fast while enabling comprehensive type lookups.

**Major components:**
1. **MCP Server Core** (`McpServer` from SDK)—registers resources/tools/prompts, handles protocol, routes requests
2. **Content Providers** (Markdown + TypeScript)—abstract extraction logic from MCP protocol; testable in isolation, reusable across transports
3. **Transport Layer** (stdio primary, HTTP future)—stdio via `StdioServerTransport` for local dev; Express + Streamable HTTP for docs browser
4. **Index/Cache Layer**—in-memory maps built at startup, refreshed on file change; enables fast listing and search without full extraction

**Critical patterns:**
- **Provider abstraction:** Separate extraction from protocol registration; enables testing and transport flexibility
- **Lazy initialization:** Build lightweight index eagerly, defer heavy analysis until requested; keeps startup under 5 seconds
- **URI scheme convention:** Consistent `hoist://` namespace parallel to future Hoist Core (Java) server; enables cross-framework tooling

**Project structure:** All MCP code lives in `mcp/` directory at repo root, parallel to existing packages. Separate `tsconfig.json` targets Node.js with ESM, never imported by browser code. Directory excluded from library builds and bundler entry points.

### Critical Pitfalls

Research identified six critical pitfalls from MCP specification, ts-morph performance docs, TypeDoc issue tracker, and Block's playbook (60+ MCP servers):

1. **stdout corruption in stdio transport**—Any `console.log()` or dependency logging corrupts JSON-RPC stream; manifests as mysterious protocol errors. Prevention: strict stderr-only logging policy, ESLint rule, dependency auditing. Address in Phase 1 scaffold.

2. **ts-morph initialization time and memory**—Naive parsing of 700 files takes 10-30s and consumes 500MB+. Prevention: selective file loading with `skipAddingFilesFromTsConfig`, pre-computed JSON cache, `forgetNodesCreatedInBlock()` to free AST nodes. Address in Phase 2 extraction design with benchmarking.

3. **Tool response size exceeds LLM context window**—Full class hierarchies with inheritance produce 2000+ token responses, flooding context. Prevention: tiered responses (summary vs. detail), declared-members-only default, explicit token budgets. Address in Phase 2-3 extraction and tool design.

4. **TypeDoc fragility with decorator patterns**—hoist-react uses `experimentalDecorators` + `useDefineForClassFields` + custom `@bindable` + 95 barrel exports. TypeDoc historically struggles with decorators and re-exports. Prevention: early validation spike on representative files, consider ts-morph as single source of truth. Address pre-Phase 2 with proof-of-concept.

5. **MCP dependencies leaking into production bundles**—ts-morph (15MB) and SDK could enter app bundles if import paths cross boundaries. Prevention: dedicated `mcp/` directory excluded from library tsconfig and bundler, CI import-boundary check. Address in Phase 1 scaffold.

6. **Designing tools around internal structure**—Mirroring package structure into tools creates too many tools (consuming context window) and poor UX. Prevention: design top-down from user workflows, limit to 10-15 tools maximum. Address in Phase 1 tool design.

## Implications for Roadmap

Based on research, suggested 4-phase structure with clear dependency chains:

### Phase 1: MCP Foundation + README Serving
**Rationale:** Establishes MCP infrastructure and delivers immediate value with documentation access before tackling TypeScript extraction complexity. Validates the MCP approach with simple content that has no extraction dependencies. Foundational patterns (logging, directory boundaries, tool design) must be correct before building on them.

**Delivers:** Working MCP server with stdio transport, README and concept doc serving, basic keyword search across markdown, list packages tool.

**Addresses:** Table stakes features (search docs, retrieve content, list available, stdio transport), convention/pattern documentation tool (serve AGENTS.md).

**Avoids:** stdout corruption (Phase 1 pitfall), bundle leakage (Phase 1 pitfall), wrong tool granularity (Phase 1 pitfall).

**Key decisions validated:**
- Tool naming and descriptions (test with MCP Inspector)
- URI scheme convention (`hoist://docs/packages/{name}`)
- Directory isolation and build exclusions
- Logging patterns (stderr only, ESLint enforcement)

**Research flags:** None—MCP SDK documentation is excellent, README serving is straightforward file I/O.

---

### Phase 2: TypeScript Extraction Pipeline
**Rationale:** The critical path for type lookups and human-browsable docs. This phase must resolve TypeDoc viability, establish extraction patterns, and achieve performance targets before tools are built on top. Dependencies: ts-morph initialization, caching strategy, decorator handling. This is the riskiest phase—front-load it with a TypeDoc validation spike.

**Delivers:** ts-morph Project initialization with selective file loading, lightweight type index (names, kinds, file paths), on-demand full extraction with caching, custom `@bindable` decorator recognition, performance benchmarks (<5s cold start, <300MB memory).

**Uses:** ts-morph 27.0.2, optional TypeDoc 0.28.16 (if spike succeeds).

**Implements:** TypeScriptProvider architecture component, Index/Cache Layer.

**Avoids:** ts-morph performance trap (Phase 2 pitfall), TypeDoc decorator fragility (Phase 2 pitfall).

**Key decisions validated:**
- TypeDoc viability with hoist-react patterns (pre-phase spike)
- Cache invalidation strategy (file modification times)
- Response format for type information (tiered: summary vs. detail)
- Token counting implementation (stay under 2000 tokens)

**Research flags:**
- **TypeDoc validation spike needed**—Risk: HIGH. Decorator patterns + `experimentalDecorators` + barrel exports historically problematic. Test 5 representative files (HoistBase.ts, GridModel.ts, Store.ts, decorators.ts, elem.ts) before committing.
- **Caching strategy needs design**—Pre-computed JSON vs. runtime cache with invalidation. Performance target: <5s cold start.

---

### Phase 3: Type Lookup MCP Tools
**Rationale:** With extraction infrastructure proven and performant, expose it via MCP tools. Dependencies: Phase 2 complete. This phase integrates extraction with MCP protocol and validates the end-to-end workflow.

**Delivers:** `lookup_type(name)` tool with tiered responses, `search_symbols(query)` across types, `list_package_types(package)` enumeration, optional `get_type_hierarchy(name)` for relationships.

**Addresses:** TypeScript type lookup (P1 table stakes), type hierarchy navigation (P2 competitive), context-aware filtering (P2 competitive).

**Implements:** MCP tools registry, type resources registration, token-efficient responses.

**Avoids:** Response size overflow (Phase 3 pitfall).

**Key validations:**
- LLM can select correct tool for natural language queries
- Tiered responses keep token counts under budget
- Inheritance chains resolve correctly (HoistBase -> HoistModel -> GridModel)
- Decorated properties show semantics (`@bindable` generates setter)

**Research flags:** None—patterns proven by MCP-Typescribe and ts-morph documentation.

---

### Phase 4: Documentation SPA (Stretch Goal)
**Rationale:** With extraction proven, MCP tools delivering value, and TypeDoc decision resolved, build a human-browsable documentation browser as a showcase of Hoist itself. Dependencies: Phase 2 and 3 complete, TypeDoc validated or ts-morph rendering established. This is the largest scope item and correctly deferred.

**Delivers:** Custom Hoist-built documentation browser SPA, reuses extraction data layer (TypeDoc JSON or ts-morph output), showcases framework capabilities, interactive search and type navigation.

**Addresses:** Human-browsable docs SPA (P3 nice-to-have).

**Implements:** HTTP transport via Express, docs browser React app, optional Streamable HTTP for remote access.

**Research flags:**
- **Hoist component library familiarity needed**—Building a Hoist SPA requires deep framework knowledge. Sample apps (Jobsite, Veracity) provide patterns.
- **UI/UX design for API docs**—No standard pattern for TypeScript docs in a Hoist-styled SPA. Inspiration: TypeDoc themes, React docs, Storybook.

---

### Phase Ordering Rationale

- **README serving before TypeScript extraction:** Independent concerns; READMEs deliver value immediately while TypeScript extraction is high-risk and time-intensive. Validates MCP infrastructure with simple content.
- **Extraction before tools:** Tools are useless without extraction; extraction can be tested independently of MCP protocol. Performance targets must be met before building on top.
- **Type lookup tools before docs SPA:** Tools deliver value to AI assistants immediately; SPA is showcase project with longer build time. Extraction data layer serves both.
- **Front-load TypeDoc spike:** TypeDoc viability is a blocking decision for Phase 2. Run proof-of-concept on 5 representative files before committing to extraction architecture.

**Dependency visualization:**
```
Phase 1 (MCP + README)
  ├── Phase 2 (TypeScript extraction) [blocks Phase 3]
  │     └── Phase 3 (Type lookup tools) [blocks Phase 4]
  │           └── Phase 4 (Docs SPA)
  └── [Phase 2-4 independent of Phase 1 README tools]
```

### Research Flags

**Phases needing deeper research during planning:**
- **Phase 2 (TypeScript extraction):** TypeDoc validation spike required—decorator patterns + `experimentalDecorators` compatibility unproven. Test HoistBase.ts, GridModel.ts, Store.ts, decorators.ts, elem.ts before architecture commitment.
- **Phase 4 (Docs SPA):** UI/UX design for TypeScript docs browser—no standard Hoist pattern exists. Review sample apps (Jobsite, Veracity) for component library usage patterns.

**Phases with standard patterns (skip research-phase):**
- **Phase 1 (MCP + README):** MCP SDK documentation excellent, README serving is basic file I/O, search is simple text matching. Well-trodden path.
- **Phase 3 (Type lookup tools):** MCP-Typescribe demonstrates exact pattern (`search_symbols`, `get_symbol_details`), ts-morph docs cover extraction APIs comprehensively.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Official SDK actively maintained; ts-morph 27 explicitly supports TS 5.9; TypeDoc peer dep verified via npm. Versions, compatibility, alternatives thoroughly researched. |
| Features | HIGH | Analyzed 10+ production MCP servers across vendors and open-source. Table stakes vs. differentiators clear. MVP definition validated against established patterns. |
| Architecture | HIGH | Provider abstraction, lazy initialization, URI conventions proven in multiple MCP servers. ts-morph patterns documented. Component responsibilities clear. |
| Pitfalls | HIGH | Sources include Block's 60-server playbook, MCP spec, ts-morph performance docs, TypeDoc issue tracker, hoist-react codebase analysis. stdout corruption, ts-morph perf, response size, bundle leakage all verified problems with known mitigations. |

**Overall confidence:** HIGH

### Gaps to Address

**TypeDoc viability with hoist-react patterns:**
- **Gap:** Uncertain whether TypeDoc can correctly handle `experimentalDecorators` + `useDefineForClassFields` + custom `@bindable` + 95 barrel exports.
- **Impact:** Blocking decision for Phase 2 extraction architecture—TypeDoc failure means ts-morph becomes single source of truth for both MCP and human docs.
- **Resolution:** Pre-Phase 2 spike testing 5 representative files. Budget: 2-4 hours. If TypeDoc fails, proceed with ts-morph extraction feeding both MCP tools and custom rendering.

**`@bindable` decorator documentation:**
- **Gap:** Custom decorator creates runtime behavior (setter methods) with no TypeScript type signature. ts-morph sees decorator but not generated methods. TypeDoc may miss entirely.
- **Impact:** GridModel and other core classes won't document their generated `setPropName()` methods.
- **Resolution:** Custom extraction logic recognizing `@bindable` and synthesizing setter documentation. Pattern established in Phase 2 extraction design.

**Token counting implementation:**
- **Gap:** No standard library for counting tokens in tool responses. Need accurate measurement to enforce <2000 token budget.
- **Impact:** Cannot validate response size until tooling exists.
- **Resolution:** Simple heuristic (divide character count by 4) for development; consider `tiktoken` library for production accuracy. Address in Phase 2-3.

**Cache invalidation strategy:**
- **Gap:** Multiple options (file watchers, timestamp-based, manual refresh) with different trade-offs.
- **Impact:** Stale data served after hoist-react updates if cache doesn't invalidate correctly.
- **Resolution:** Start with timestamp-based invalidation (check file mtimes on startup). Add file watcher if hot-reload needed. Validate in Phase 2 with real file modifications.

## Sources

### Primary (HIGH confidence)
- [MCP TypeScript SDK GitHub](https://github.com/modelcontextprotocol/typescript-sdk)—official repo, server docs, examples
- [MCP TypeScript SDK npm v1.26.0](https://www.npmjs.com/package/@modelcontextprotocol/sdk)—peer deps, engines verified
- [MCP Specification 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25)—protocol spec for resources/tools/prompts
- [ts-morph GitHub v27.0.2](https://github.com/dsherret/ts-morph)—changelog confirms TS 5.9 support
- [ts-morph documentation](https://ts-morph.com/)—interface/type extraction API, performance guide
- [TypeDoc GitHub v0.28](https://github.com/TypeStrong/typedoc)—peer dep supports TS 5.9.x
- [TypeDoc JSON output API](https://typedoc.org/api/modules/JSONOutput.html)—JSONOutput.ProjectReflection interface
- [Block's MCP Playbook](https://engineering.block.xyz/blog/blocks-playbook-for-designing-mcp-servers)—60+ servers built, tool design patterns
- hoist-react codebase analysis—tsconfig.json, decorators.ts, package.json, file counts verified

### Secondary (MEDIUM confidence)
- [MCP-Typescribe](https://github.com/yWorks/mcp-typescribe)—TypeScript MCP server reference implementation
- [Context7 MCP Server](https://github.com/upstash/context7)—documentation MCP patterns
- [docs-mcp-server](https://github.com/arabold/docs-mcp-server)—open-source documentation scraper
- [Microsoft Learn MCP](https://github.com/MicrosoftDocs/mcp)—official vendor documentation MCP
- [Google Developer Knowledge API](https://developers.googleblog.com/introducing-the-developer-knowledge-api-and-mcp-server/)—vendor documentation patterns
- [AWS Documentation MCP](https://awslabs.github.io/mcp/servers/aws-documentation-mcp-server)—vendor implementation
- [Ref.Tools MCP](https://docs.ref.tools/mcp/tools)—token-efficient documentation focus
- [MCP Resources vs Tools](https://workos.com/blog/mcp-features-guide)—WorkOS guide to MCP primitives
- [15 Best Practices for MCP Servers](https://thenewstack.io/15-best-practices-for-building-mcp-servers-in-production/)
- [MCP Security Survival Guide](https://towardsdatascience.com/the-mcp-security-survival-guide-best-practices-pitfalls-and-real-world-lessons/)
- TypeDoc issue tracker—#1867 (type alias expansion), #400 (decorator errors), #1333 (decorator resolution), #1786 (custom themes)
- TypeScript issue #48814—useDefineForClassFields breaks decorators

### Tertiary (LOW confidence)
- Community discussion on MCP v2 timeline—Q1 2026 anticipated but not officially confirmed by Anthropic

---
*Research completed: 2026-02-11*
*Ready for roadmap: yes*
