# Hoist MCP & Documentation

## What This Is

An MCP (Model Context Protocol) server embedded in hoist-react that exposes framework documentation,
TypeScript type information, and development workflow prompts to LLMs during development. The server
provides 12 MCP endpoints (3 resources, 6 tools, 3 prompts) covering 40 documentation files and
full TypeScript symbol inspection across the framework.

## Core Value

LLMs assisting with Hoist development can access accurate, current framework knowledge — package
docs, component APIs, type signatures, and conventions — so they produce correct Hoist-idiomatic
code instead of guessing.

## Requirements

### Validated

- ✓ Package-level READMEs for 13 packages — existing
- ✓ Cross-cutting concept docs (authentication, persistence, lifecycle, build-and-deploy, dev environment, compilation) — existing
- ✓ Documentation index at `docs/README.md` with quick-reference table — existing
- ✓ `AGENTS.md` coding conventions and project guidance — existing
- ✓ Codebase map in `.planning/codebase/` (7 documents) — existing
- ✓ Embedded MCP server launchable via `yarn hoist-mcp` — v1.0
- ✓ MCP endpoints exposing package-level READMEs as queryable resources — v1.0
- ✓ MCP endpoints for TypeScript type/interface/class lookups (signatures, comments, inheritance) — v1.0
- ✓ TypeScript extraction pipeline using ts-morph with lazy init and eager indexing — v1.0
- ✓ MCP endpoint design optimized for AI agent consumption (structured paths, search, filtering) — v1.0
- ✓ Developer prompts for common Hoist tasks (grid, form, tabs) — v1.0

### Active

- [ ] Human-browsable documentation solution (TypeDoc partially viable per spike; custom SPA is alternative)
- [ ] Stretch goal: Custom Hoist SPA documentation browser (spec'd and built with GSD/Claude)
- [ ] Token-efficient chunked responses (relevant subsections instead of full documents)
- [ ] Type hierarchy navigation (HoistModel -> HoistBase inheritance chains)
- [ ] `@bindable` decorator documentation showing generated setter methods
- [ ] llms.txt and llms-full.txt generation from documentation index
- [ ] Streamable HTTP transport for remote/team MCP server scenarios

### Out of Scope

- Hoist Core MCP server implementation — future project, architecture accommodates it
- External deployment / hosted MCP service — local-first for now
- Replacing existing READMEs — MCP serves them as-is, improvements are separate
- Full exhaustive API reference — targeted lookups via ts-morph, not pre-generated catalog
- Mobile-specific documentation tooling — desktop-first
- Semantic/vector search — keyword search suffices for bounded ~40-doc corpus
- Authentication/access control — local development tool, auth adds friction

## Context

**Hoist React** is a comprehensive TypeScript/React UI framework built by Extremely Heavy (XH).
It provides models, components, services, and conventions for building enterprise desktop and mobile
applications. It ships as source to consuming applications and is used alongside **Hoist Core**
(Grails/Java backend).

**Current state (post v1.0):**
- MCP server: 3,169 LOC TypeScript in `mcp/` directory
- 40 docs registered (21 package, 4 concept, 4 devops, 1 conventions, 1 index + subcategories)
- ts-morph indexes ~2,400 exported symbols across 13 packages
- 4-layer bundle isolation (import chain, tsconfig, npmignore, devDependencies)
- TypeDoc validation spike: partially viable but lacks decorator annotation support

**MCP context:**
The Model Context Protocol is an open standard for providing structured context to LLMs. An MCP
server can expose resources (static content like docs), tools (dynamic operations like type lookups),
and prompts (templated queries). Claude Code, Cursor, and other AI coding tools support MCP natively.

**Meta-project context:**
This project is also a proving ground for AI-driven development at XH. Building the stretch-goal
Hoist docs SPA using Claude/GSD would demonstrate the viability of LLM-powered spec-driven
development with Hoist, advancing XH's larger transition to AI-driven workflows.

## Constraints

- **Packaging**: MCP server dependencies added as devDependencies — must not increase app bundle size
- **Runtime**: MCP server runs as Node.js process, separate from browser runtime
- **Compatibility**: Must work with Claude Code, Cursor, and other MCP-compatible tools
- **Source access**: hoist-react ships as source, so MCP server can read TypeScript directly at runtime
- **Future-proof**: Architecture must accommodate a parallel Hoist Core (Java) MCP server later

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Embed MCP server in hoist-react repo | Ships with source, no separate deployment, easy for devs to run | ✓ Good — working in production use |
| Package READMEs as first content tier | Finite, already written, immediate value | ✓ Good — 40 docs serving correctly |
| ts-morph for TypeScript extraction | Modern, well-maintained, full TypeScript compiler API access | ✓ Good — indexes ~2,400 symbols with lazy init |
| TypeDoc partially viable (spike finding) | Decorators not annotated in output; barrel exports and enums work fine | ✓ Good — informed decision to use ts-morph as sole source |
| Dev dependencies only | MCP tooling must not affect production app bundles | ✓ Good — 4-layer isolation verified |
| Hardcoded doc registry (not filesystem scan) | Doc structure stable and well-known; avoids runtime discovery complexity | ✓ Good — fast, deterministic, easy to maintain |
| AST-level methods for index building | Avoids getExportedDeclarations() ~1000x performance trap | ✓ Good — cold start well under 5s |
| Lazy Project initialization | First TS tool call pays init cost; server starts instantly | ✓ Good — no startup penalty for doc-only queries |
| Markdown-header text formatting for tool output | LLM-optimized over raw JSON | ✓ Good — clear, scannable output |
| RFC 6570 reserved expansion for doc IDs | Slash-containing IDs (e.g. cmp/grid) preserved in URI template | ✓ Good — clean resource addressing |

---
*Last updated: 2026-02-16 after v1.0 milestone*
