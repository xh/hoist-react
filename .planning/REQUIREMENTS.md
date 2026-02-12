# Requirements: Hoist MCP & Documentation

**Defined:** 2026-02-11
**Core Value:** LLMs assisting with Hoist development can access accurate, current framework knowledge — package docs, component APIs, type signatures, and conventions — so they produce correct Hoist-idiomatic code.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### MCP Foundation

- [ ] **MCPF-01**: Developer can start a local MCP server from hoist-react via a yarn/npx command (e.g. `yarn hoist-mcp`)
- [ ] **MCPF-02**: MCP server communicates via stdio transport compatible with Claude Code, Cursor, and other MCP clients
- [ ] **MCPF-03**: MCP server uses `@modelcontextprotocol/sdk` with Zod schemas for all tool/resource definitions
- [ ] **MCPF-04**: MCP server code is isolated in a dedicated directory with tsconfig exclusion to prevent Node-only deps leaking into browser bundles
- [ ] **MCPF-05**: MCP server enforces strict stdout discipline — all logging goes to stderr only

### Documentation Serving

- [ ] **DOCS-01**: LLM can list all available packages and documentation resources via MCP
- [ ] **DOCS-02**: LLM can retrieve full README/doc content by package name or document path
- [ ] **DOCS-03**: LLM can search documentation by keyword or topic across all packages and concept docs
- [ ] **DOCS-04**: LLM can query coding conventions and architectural patterns (AGENTS.md, concept docs like lifecycle, persistence, authentication)
- [ ] **DOCS-05**: LLM can filter search and retrieval by specific package or concern area

### TypeScript Extraction

- [ ] **TSEX-01**: LLM can search for TypeScript symbols (classes, interfaces, types, functions) by name across the framework
- [ ] **TSEX-02**: LLM can retrieve detailed symbol information including type signatures, JSDoc comments, and source file location
- [ ] **TSEX-03**: LLM can list members (properties, methods) of a specific class or interface with their types and descriptions
- [ ] **TSEX-04**: TypeScript extraction pipeline uses ts-morph with lazy initialization and eager indexing for fast cold start (<5s target)

### Human Documentation

- [ ] **HDOC-01**: TypeDoc validation spike completed — confirms whether TypeDoc can generate viable HTML/JSON docs for hoist-react given its decorator patterns and barrel file structure

### Developer Experience

- [ ] **DEVX-01**: MCP server exposes templated Prompts for common Hoist development tasks (e.g. "Create a grid panel", "Add a form with validation", "Build a tab container")

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Enhanced Responses

- **RESP-01**: Server returns token-efficient chunked responses (relevant subsections instead of full documents)
- **RESP-02**: Server provides dedicated code example retrieval from READMEs and Toolbox

### Extended Type Features

- **TSEX-05**: LLM can navigate type hierarchy and inheritance chains (e.g. HoistModel -> HoistBase)
- **TSEX-06**: Custom `@bindable` decorator documentation showing generated setter methods

### Documentation Outputs

- **DOUT-01**: Server generates llms.txt and llms-full.txt files from the documentation index
- **DOUT-02**: Custom Hoist SPA documentation browser (spec'd and built with GSD/Claude as AI-driven development showcase)

### Infrastructure

- **INFR-01**: Streamable HTTP transport for remote/team MCP server scenarios

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Semantic/vector search | Massive complexity increase for a bounded ~20-doc corpus; keyword search suffices |
| Authentication/access control | Local development tool reading open-source framework docs; auth adds friction |
| Multi-version documentation | Hoist apps track a single version; complexity without clear use case |
| Real-time web scraping | Server is embedded in source — reads files directly, no scraping needed |
| Interactive "Try It" console | Toolbox already serves as the interactive playground |
| AI-powered doc generation | Conflates serving and writing docs; keep as separate Claude Code workflow |
| Hoist Core MCP implementation | Future project — architecture will accommodate it, but implementation is separate |
| Full exhaustive API reference at v1 | Targeted lookups via ts-morph; don't pre-generate catalog of every export |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| MCPF-01 | Phase 1 | Pending |
| MCPF-02 | Phase 1 | Pending |
| MCPF-03 | Phase 1 | Pending |
| MCPF-04 | Phase 1 | Pending |
| MCPF-05 | Phase 1 | Pending |
| DOCS-01 | Phase 2 | Pending |
| DOCS-02 | Phase 2 | Pending |
| DOCS-03 | Phase 2 | Pending |
| DOCS-04 | Phase 2 | Pending |
| DOCS-05 | Phase 2 | Pending |
| TSEX-01 | Phase 3 | Pending |
| TSEX-02 | Phase 3 | Pending |
| TSEX-03 | Phase 3 | Pending |
| TSEX-04 | Phase 3 | Pending |
| HDOC-01 | Phase 3 | Pending |
| DEVX-01 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 16 total
- Mapped to phases: 16
- Unmapped: 0

---
*Requirements defined: 2026-02-11*
*Last updated: 2026-02-12 after roadmap creation*
