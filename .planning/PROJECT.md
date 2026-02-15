# Hoist MCP & Documentation

## What This Is

An MCP (Model Context Protocol) server embedded in hoist-react that exposes framework documentation
and TypeScript type information to LLMs during development. Paired with human-browsable documentation
— either via standard tooling (TypeDoc) or a custom Hoist SPA — this creates a unified knowledge
layer serving both AI agents and human developers across the Hoist ecosystem.

## Core Value

LLMs assisting with Hoist development can access accurate, current framework knowledge — package
docs, component APIs, type signatures, and conventions — so they produce correct Hoist-idiomatic
code instead of guessing.

## Requirements

### Validated

<!-- Existing documentation assets already in the codebase. -->

- ✓ Package-level READMEs for 13 packages (appcontainer, cmp, core, data, desktop, format, mobile, mobx, promise, svc, utils, public, static) — existing
- ✓ Cross-cutting concept docs (authentication, persistence, lifecycle, build-and-deploy, dev environment, compilation) — existing
- ✓ Documentation index at `docs/README.md` with quick-reference table — existing
- ✓ `AGENTS.md` coding conventions and project guidance — existing
- ✓ Codebase map in `.planning/codebase/` (7 documents) — existing

### Active

<!-- Current scope. Building toward these. -->

- [ ] Embedded MCP server in hoist-react, launchable via `yarn hoist-mcp` or similar command
- [ ] MCP endpoints exposing package-level READMEs as queryable resources
- [ ] MCP endpoints for TypeScript type/interface/class lookups (signatures, comments, inheritance)
- [ ] TypeScript extraction pipeline using ts-morph or similar tooling
- [ ] MCP endpoint design optimized for AI agent consumption (structured paths, search, filtering)
- [ ] Human-browsable documentation solution (TypeDoc/custom — approach to be decided via research)
- [ ] Stretch goal: Custom Hoist SPA documentation browser (spec'd and built with GSD/Claude)
- [ ] Architecture designed for future Hoist Core (Java) MCP parity

### Out of Scope

<!-- Explicit boundaries. -->

- Hoist Core MCP server implementation — future project, but inform architecture now
- External deployment / hosted MCP service — local-first for now
- Replacing existing READMEs — MCP serves them as-is, improvements are separate
- Full API reference generation at v1 — type lookups are targeted, not exhaustive
- Mobile-specific documentation tooling — desktop-first

## Context

**Hoist React** is a comprehensive TypeScript/React UI framework built by Extremely Heavy (XH).
It provides models, components, services, and conventions for building enterprise desktop and mobile
applications. It ships as source to consuming applications and is used alongside **Hoist Core**
(Grails/Java backend).

**Documentation landscape today:**
- 13 package READMEs covering architecture, components, data, services, etc.
- 6 cross-cutting concept docs (authentication, persistence, lifecycle, etc.)
- `docs/README.md` serves as the documentation index
- `AGENTS.md` provides coding conventions for AI assistants
- No TSDoc/TypeDoc generation currently in place
- Toolbox app serves as a demo/testbed but not a documentation browser

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
- **Incremental**: Package READMEs first (finite, ready), then type extraction (more complex)
- **Future-proof**: Architecture must accommodate a parallel Hoist Core (Java) MCP server later

## Key Decisions

<!-- Decisions that constrain future work. Add throughout project lifecycle. -->

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Embed MCP server in hoist-react repo | Ships with source, no separate deployment, easy for devs to run | — Pending |
| Package READMEs as first content tier | Finite, already written, immediate value | — Pending |
| ts-morph for TypeScript extraction | Modern, well-maintained, full TypeScript compiler API access | — Pending |
| Human docs approach (TypeDoc vs Hoist SPA) | Needs research — TSDoc has had past hurdles, Hoist SPA is ambitious but aligned | — Pending |
| Dev dependencies only | MCP tooling must not affect production app bundles | — Pending |

---
*Last updated: 2026-02-11 after initialization*
