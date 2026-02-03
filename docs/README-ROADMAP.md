# README Documentation Roadmap

This document tracks planned README.md additions for hoist-react packages. The primary goal is to
provide AI coding assistants (Claude Code, etc.) with rich context for working with hoist-react -
both for library development and application development. A secondary goal is improving human-readable
documentation for all developers.

## Completed

| Package | Status | Notes |
|---------|--------|-------|
| `/` (root) | Done | CLAUDE.md provides AI-focused project guidance |
| `/cmp/grid/` | Done | Comprehensive grid documentation (322 lines) |
| `/core/` | Done | HoistBase, HoistModel, HoistService, hoistCmp, element factories, XH |

## Priority 1 - Core Framework

These packages define the fundamental patterns that everything else builds on. Understanding these
is essential for working effectively with any part of hoist-react.

| Package | Files | Description | Status |
|---------|-------|-------------|--------|
| `/core/` | 48 | HoistBase, HoistModel, HoistService, XH singleton, component factory | **Done** |
| `/data/` | 45 | Store, StoreRecord, Field, Filter, validation - data layer infrastructure | Planned |
| `/svc/` | 20 | Services architecture and built-in services (Fetch, Config, Pref, etc.) | Planned |

## Priority 2 - Component System

Cross-platform and platform-specific component packages. These are where most application code
interacts with Hoist.

| Package | Files | Description | Status |
|---------|-------|-------------|--------|
| `/cmp/` | 132 | Cross-platform components overview, factory pattern, component categories | Planned |
| `/desktop/` | 240 | Desktop-specific components and app container | Planned |
| `/mobile/` | 131 | Mobile-specific components and app container | Planned |

## Priority 3 - Key Utilities

Frequently used utilities that benefit from dedicated documentation.

| Package | Files | Description | Status |
|---------|-------|-------------|--------|
| `/format/` | 6 | Number/date/misc formatters - heavily used in grids and display | Planned |
| `/admin/` | 112 | Built-in admin console - configuration, monitoring, and management UI | Planned |
| `/appcontainer/` | 22 | App lifecycle, routing, messaging, banners, exception handling | Planned |

## Priority 4 - Supporting Packages

Smaller packages that provide important but more specialized functionality.

| Package | Files | Description | Status |
|---------|-------|-------------|--------|
| `/utils/` | 26 | Async, datetime, JS utilities, React helpers | Planned |
| `/promise/` | 2 | Promise extensions (catchDefault, track, timeout, linkTo) | Planned |
| `/mobx/` | 3 | MobX re-exports, custom decorators (@bindable, @managed) | Planned |
| `/icon/` | 5 | Icon system and FontAwesome integration | Planned |
| `/security/` | 7 | OAuth clients (Auth0, MSAL) | Planned |
| `/kit/` | 18 | Third-party library wrappers (ag-grid, blueprint, highcharts, etc.) | Planned |
| `/inspector/` | 6 | Development tools for debugging Hoist instances | Planned |

## Documentation Guidelines

Each README should follow the pattern established in `/cmp/grid/README.md`:

1. **Overview** - What the package does and why it exists
2. **Architecture** - Key classes, their relationships, and class hierarchy diagrams
3. **Configuration Pattern** - How to configure/create instances (Spec → Object pattern if applicable)
4. **Common Usage Patterns** - Code examples for typical use cases
5. **Properties/API Reference** - Tables summarizing key configuration options
6. **Extension Points** - How to customize or extend behavior
7. **Related Packages** - Links to connected packages

### Tone and Content

- Write for both AI assistants and human developers
- Prioritize patterns and relationships over exhaustive API documentation
- Include runnable code examples
- Explain "why" not just "what"
- Reference specific files where helpful
- Keep examples practical and representative of real usage

### Communicating Anti-patterns

Use a two-part approach for documenting things to avoid:

1. **Inline warnings** - Use `**Avoid:**` prefix for brief notes near relevant content
2. **Common Pitfalls section** - Add a dedicated section at the end of each README for significant
   anti-patterns that warrant fuller explanation

For code examples showing correct vs incorrect approaches, use ✅/❌ markers:

```typescript
// ✅ Do: Description of correct approach
correctCode();

// ❌ Don't: Description of what's wrong and why
incorrectCode();
```

### Terminology Conventions

1. Reserve the use of `props` for actual React Component props. Use `config` when referring to model or class constructor args.

## Progress Notes

_Use this section to track discussions, decisions, and context between documentation sessions._

### 2026-02-02
- Created this roadmap document
- Analyzed all 19 major packages lacking README files
- Established priority ordering based on:
  - Foundational importance (core concepts first)
  - Frequency of use
  - Complexity that benefits from explanation
  - Dependencies between packages
- Completed `/core/README.md` covering:
  - Overview of Component/Model/Service architecture
  - HoistBase foundation (MobX integration, resource management, persistence)
  - HoistModel (linked vs unlinked, load support, model lookup)
  - HoistService (singleton pattern, installation, access via XH)
  - hoistCmp factory (creates vs uses, component configuration)
  - Element factory system (alternative to JSX)
  - XH singleton overview
  - Decorator reference and common patterns
