# Documentation Roadmap

This document tracks planned README.md additions for hoist-react packages. The primary goal is to
provide AI coding assistants with rich context for working with hoist-react -
both for library development and application development. A secondary goal is improving human-readable
documentation for all developers.

## Priority 1 - Core Framework

These packages define the fundamental patterns that everything else builds on. Understanding these
is essential for working effectively with any part of hoist-react.

| Package | Files | Description | Status |
|---------|-------|-------------|--------|
| `/` (root) | 1 | AGENTS.md provides AI-focused project guidance | [Done](../../AGENTS.md) |
| `/core/` | 48 | HoistBase, HoistModel, HoistService, XH singleton, component factory | [Done](../../core/README.md) |
| `/data/` | 45 | Store, StoreRecord, Field, Filter, validation - data layer infrastructure | [Done](../../data/README.md) |
| `/svc/` | 20 | Services architecture and built-in services (Fetch, Config, Pref, etc.) | [Done](../../svc/README.md) |

## Priority 2 - Component System

Cross-platform and platform-specific component packages. These are where most application code
interacts with Hoist.

| Package | Files | Description | Status |
|---------|-------|-------------|--------|
| `/cmp/` | 132 | Cross-platform components overview, factory pattern, component categories | [Done](../../cmp/README.md) |
| `/desktop/` | 240 | Desktop-specific components and app container | [Done](../../desktop/README.md) |
| `/desktop/cmp/panel/` | 7 | Panel container — toolbars, masks, collapse/resize, persistence, modal support | [Done](../../desktop/cmp/panel/README.md) |
| `/desktop/cmp/dash/` | 14 | Dashboard system — DashContainer (GoldenLayout) and DashCanvas (react-grid-layout), widget persistence, ViewManager integration | [Done](../../desktop/cmp/dash/README.md) |
| `/mobile/` | 131 | Mobile-specific components and app container | [Done](../../mobile/README.md) |

## Priority 3 - Key Utilities

Frequently used utilities that benefit from dedicated documentation.

| Package | Files | Description | Status |
|---------|-------|-------------|--------|
| `/format/` | 6 | Number/date/misc formatters - heavily used in grids and display | [Done](../../format/README.md) |
| `/utils/` | 26 | Async, datetime, JS utilities, React helpers | [Done](../../utils/README.md) |
| `/promise/` | 2 | Promise extensions (catchDefault, track, timeout, linkTo) | [Done](../../promise/README.md) |
| `/mobx/` | 3 | MobX re-exports, @bindable decorator, enhanced makeObservable | [Done](../../mobx/README.md) |
| `/appcontainer/` | 22 | App lifecycle, routing, messaging, banners, exception handling | [Done](../../appcontainer/README.md) |

## Priority 4 - Supporting Packages

Smaller packages that provide important but more specialized functionality.

| Package | Files | Description | Status |
|---------|-------|-------------|--------|
| `/icon/` | 5 | Icon system and FontAwesome integration | [Done](../../icon/README.md) |
| `/security/` | 7 | OAuth clients (Auth0, MSAL) | [Done](../../security/README.md) |
| `/kit/` | 18 | Third-party library wrappers (ag-grid, blueprint, highcharts, etc.) | 📝 [Draft](../../kit/README.md) |
| `/inspector/` | 6 | Development tools for debugging Hoist instances | 📝 [Draft](../../inspector/README.md) |

## Concepts

Cross-cutting concepts that don't map directly to a single sub-package. These documents explain
patterns and systems that span multiple packages.

| Concept | Description | Status |
|---------|-------------|--------|
| Lifecycles | How HoistAppModel, HoistService, and HoistModel are instantiated and initialized. Part 1 covers app startup. Part 2 covers model/service lifecycles (`onLinked`, `afterLinked`, `doLoadAsync`, `destroy`), LoadSupport, and refresh. | [Part 1 Done](../lifecycle-app.md), [Part 2 Done](../lifecycle-models-and-services.md) |
| Authentication | How Hoist apps authenticate users. Covers OAuth (MSAL/Auth0) and form-based login, HoistAuthModel, token management, IdentityService, and role-based access. | [Done](../authentication.md) |
| Persistence | Hoist's built-in system for persisting user state (grid columns, form values, view selections) to various backing stores (localStorage, preferences, ViewManager). Covers `@persist` decorators, `markPersist()`, and built-in model support (GridModel, FormModel, TabContainerModel, PanelModel). | [Done](../persistence.md) |
| Authorization | Hoist's role-based access model. Covers the client-side `hasRole()` API, the opt-in Hoist Core role management system, two-tier permission/functional role design, and the supplemental config-driven "gates" feature for lightweight feature gating. | [Done](../authorization.md) |
| Admin Console | Hoist's built-in system for application administration. Covers the `/admin/` package's configuration management, user/role management, client monitoring, log viewing, and other management UIs — and the hoist-core server-side endpoints that support them. | Planned |
| Routing | Client-side routing via RouterModel (Router5 wrapper). Covers route configuration in `getRoutes()`, route parameters, navigation, route-based tab integration, and observable route state via `XH.routerState`. | 📝 [Draft](../routing.md) |
| Error Handling | Centralized exception handling via `XH.handleException()`. Covers ExceptionDialog, `Promise.catchDefault()`, `alertType` options (dialog vs toast), server-side logging, `requireReload`, and patterns for handling errors in `doLoadAsync` and async workflows. | [Done](../error-handling.md) |
| Test Automation | How Hoist supports test automation via `testId` and `TestSupportProps`. Covers `data-testid` attribute propagation, `getTestId()` utility, and how forms and inputs automatically generate testable selectors from field names. | [Done](../test-automation.md) |
| Coding Conventions | Comprehensive coding conventions for hoist-react: imports, TypeScript style, naming, class structure, component patterns, exports, null handling, async patterns, error handling, logging, equality, and CSS naming. | [Done](../coding-conventions.md) |
| Version Compatibility | A reference document mapping hoist-react releases to their required hoist-core versions, covering approximately the last 5-10 major versions. Helps developers ensure compatible pairings when upgrading and provides AI assistants with context about version requirements. | [Done](../version-compatibility.md) |

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

Meta-tone note: writing and reviewing documentation takes time and is hard, and it is very tempting
for any developer not to do it. While working on documentation reviews and edits, lend a subtly
encouraging and upbeat tone to your responses and queries directly back to developers.

### Communicating Anti-patterns

Use a two-part approach for documenting things to avoid:

1. **Inline warnings** - Use `**Avoid:**` prefix for brief notes near relevant content
2. **Common Pitfalls section** - Add a dedicated `## Common Pitfalls` section at the end of each
   README for significant anti-patterns that warrant fuller explanation. Use `###` third-level
   headers for each individual pitfall

For code examples showing correct vs incorrect approaches, use ✅/❌ markers:

```typescript
// ✅ Do: Description of correct approach
correctCode();

// ❌ Don't: Description of what's wrong and why
incorrectCode();
```

### Terminology Conventions

1. Reserve the use of `props` for actual React Component props. Use `config` when referring to model or class constructor args.

### Review Workflow

Each document progresses through three statuses tracked in the tables above:

1. **Planned** — Document is scoped but not yet written
2. **Draft** — Initial draft is written and committed. The doc file itself includes a
   `> **Status: DRAFT** — This document is awaiting review...` banner at the top
3. **Done** — Draft has been interactively reviewed, revisions applied, and the draft banner
   removed. The doc is considered complete and authoritative

The draft → done transition requires an interactive review session. During review, expect
discussion of accuracy, completeness, tone, code examples, and coverage of edge cases.
**Only a human XH developer can mark a document as done.** Do not remove the draft banner or
update the roadmap status until the human reviewer explicitly requests it — AI-driven review
and corrections alone are not sufficient to promote a doc out of draft.

### Keeping the Documentation Index in Sync

When a new package README is completed, add a corresponding entry to the appropriate section
in [`/docs/README.md`](../README.md). Each entry should include a linked package path, a
one-sentence description, and a comma-separated list of key classes and concepts covered.

### Progress Tracking Convention

Roadmap files use a two-file pattern to keep planning documents lean while preserving
detailed history:

- **Roadmap** (`{initiative}-roadmap.md`): Lean reference document with status tables,
  guidelines, and a thematic progress summary. This is the primary file agents should read.
- **Progress Log** (`{initiative}-roadmap-log.md`): Append-only chronological session notes
  with full detail. Maintained as a historical record — consult only when investigating
  specific past decisions or context.

After a work session, append detailed notes to the log file. Update the roadmap's progress
summary only when new conventions or significant milestones are reached.

## Progress Summary

_For detailed session-by-session notes, see [docs-roadmap-log.md](./docs-roadmap-log.md)._

### Status Overview
- **Priority 1–3 (Core, Components, Utilities):** All complete (Done)
- **Priority 4 (Supporting Packages):** icon/security Done, kit/inspector in Draft
- **Concepts:** Lifecycles (Parts 1 & 2), Authentication, Persistence, Error Handling, Test Automation complete;
  Coding Conventions complete; Authorization complete; Routing in Draft;
  Admin Console planned; Version Compatibility complete
- **Documentation index** (`docs/README.md`) created and maintained alongside package READMEs

### Key Decisions
Conventions established during the documentation effort and not already captured in the
Documentation Guidelines or `doc-conventions.md` reference above:

- Created `docs/README.md` as the primary documentation index — AGENTS.md no longer hosts
  package documentation tables, instead pointing to the index with a compact directive
- Concept docs live at `docs/` root (flat structure, not nested in a `concepts/` subdirectory)
- Review workflow requires interactive human review to promote Draft → Done — AI-driven
  review alone is not sufficient

### Current Focus
- Reviewing Priority 4 Draft READMEs (kit, inspector)
- Reviewing concept doc draft: Routing
