# Roadmap: Hoist MCP & Documentation

## Overview

This roadmap delivers an embedded MCP server in hoist-react that gives LLMs accurate, queryable access to framework documentation, TypeScript type information, and development workflow prompts. The work progresses from foundational MCP infrastructure through documentation serving and TypeScript extraction, culminating in templated prompts that tie everything together for common Hoist development tasks.

## Phases

- [x] **Phase 1: MCP Server Foundation** - Working MCP server with stdio transport, proper isolation, and logging discipline
- [x] **Phase 2: Documentation Serving** - Package docs, concept docs, and conventions queryable by LLMs via MCP
- [ ] **Phase 3: TypeScript Extraction** - Type lookups, symbol search, and class member inspection via ts-morph
- [ ] **Phase 4: Developer Prompts** - Templated MCP Prompts for common Hoist development workflows

## Phase Details

### Phase 1: MCP Server Foundation
**Goal**: A developer can start a local MCP server from hoist-react that communicates correctly with AI coding tools without affecting production bundles
**Depends on**: Nothing (first phase)
**Requirements**: MCPF-01, MCPF-02, MCPF-03, MCPF-04, MCPF-05
**Success Criteria** (what must be TRUE):
  1. Developer can run a single command (e.g. `yarn hoist-mcp`) and a local MCP server starts successfully
  2. Claude Code or Cursor can connect to the server via stdio and receive valid MCP protocol responses
  3. All server logging appears on stderr only -- no stdout contamination that would corrupt the JSON-RPC stream
  4. MCP server code and its Node-only dependencies are fully isolated from browser bundle entry points (importing from any hoist-react package does not pull in MCP dependencies)
  5. Server registers at least one placeholder tool/resource using `@modelcontextprotocol/sdk` with Zod schema validation
**Plans:** 2 plans

Plans:
- [x] 01-01-PLAN.md -- Infrastructure setup: install MCP dependencies, configure bundle isolation, create MCP tsconfig and stderr logger
- [x] 01-02-PLAN.md -- Server implementation: MCP server with placeholder tool/resource, CLI launcher, Claude Code connectivity verification

### Phase 2: Documentation Serving
**Goal**: LLMs can discover, read, search, and filter all Hoist framework documentation through the MCP server
**Depends on**: Phase 1
**Requirements**: DOCS-01, DOCS-02, DOCS-03, DOCS-04, DOCS-05
**Success Criteria** (what must be TRUE):
  1. LLM can list all available packages and documentation resources, seeing the full inventory of what the server knows about
  2. LLM can retrieve the complete content of any package README or concept doc by name or path
  3. LLM can search across all documentation by keyword and receive relevant results with context
  4. LLM can query coding conventions (AGENTS.md) and architectural patterns (lifecycle, persistence, authentication docs) as first-class resources
  5. LLM can filter documentation queries to a specific package or concern area, reducing noise in results
**Plans:** 2 plans

Plans:
- [x] 02-01-PLAN.md -- Document registry data layer: path utilities, document inventory with metadata, file loading, keyword search
- [x] 02-02-PLAN.md -- MCP resources and tools: static resources (doc index, conventions), resource template (all docs by ID), search/list tools, replace Phase 1 placeholders

### Phase 3: TypeScript Extraction
**Goal**: LLMs can look up TypeScript symbols, inspect class/interface members, and get type signatures from across the hoist-react framework
**Depends on**: Phase 1 (MCP infrastructure); Phase 2 not required but expected complete
**Requirements**: TSEX-01, TSEX-02, TSEX-03, TSEX-04, HDOC-01
**Success Criteria** (what must be TRUE):
  1. LLM can search for a TypeScript symbol by name (e.g. "GridModel") and find it across the framework with its source location
  2. LLM can retrieve detailed information for a symbol including its full type signature, JSDoc comments, and file path
  3. LLM can list all properties and methods of a class or interface (e.g. GridModel members) with their types and descriptions
  4. MCP server cold start completes in under 5 seconds, with the ts-morph extraction pipeline using lazy initialization and eager indexing
  5. TypeDoc validation spike is completed with documented findings on whether TypeDoc can handle hoist-react's decorator patterns, barrel exports, and experimentalDecorators configuration
**Plans**: TBD

Plans:
- [ ] 03-01: TBD
- [ ] 03-02: TBD
- [ ] 03-03: TBD

### Phase 4: Developer Prompts
**Goal**: LLMs have access to templated prompts for common Hoist development tasks that combine documentation and type knowledge into actionable starting points
**Depends on**: Phase 2 (documentation available), Phase 3 (type information available)
**Requirements**: DEVX-01
**Success Criteria** (what must be TRUE):
  1. LLM can invoke at least 3 MCP Prompts for common Hoist development tasks (e.g. "Create a grid panel", "Add a form with validation", "Build a tab container")
  2. Prompts produce structured output that references relevant package documentation and type signatures, giving the LLM actionable context for code generation
**Plans**: TBD

Plans:
- [ ] 04-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. MCP Server Foundation | 2/2 | ✓ Complete | 2026-02-13 |
| 2. Documentation Serving | 2/2 | ✓ Complete | 2026-02-13 |
| 3. TypeScript Extraction | 0/TBD | Not started | - |
| 4. Developer Prompts | 0/TBD | Not started | - |

---
*Roadmap created: 2026-02-12*
*Last updated: 2026-02-13*
