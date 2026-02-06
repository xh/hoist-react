# README Documentation Roadmap

This document tracks planned README.md additions for hoist-react packages. The primary goal is to
provide AI coding assistants with rich context for working with hoist-react -
both for library development and application development. A secondary goal is improving human-readable
documentation for all developers.

## Priority 1 - Core Framework

These packages define the fundamental patterns that everything else builds on. Understanding these
is essential for working effectively with any part of hoist-react.

| Package | Files | Description | Status |
|---------|-------|-------------|--------|
| `/` (root) | 1 | AGENTS.md provides AI-focused project guidance | [Done](../AGENTS.md) |
| `/core/` | 48 | HoistBase, HoistModel, HoistService, XH singleton, component factory | [Done](../core/README.md) |
| `/data/` | 45 | Store, StoreRecord, Field, Filter, validation - data layer infrastructure | [Done](../data/README.md) |
| `/svc/` | 20 | Services architecture and built-in services (Fetch, Config, Pref, etc.) | [Done](../svc/README.md) |

## Priority 2 - Component System

Cross-platform and platform-specific component packages. These are where most application code
interacts with Hoist.

| Package | Files | Description | Status |
|---------|-------|-------------|--------|
| `/cmp/` | 132 | Cross-platform components overview, factory pattern, component categories | [Done](../cmp/README.md) |
| `/desktop/` | 240 | Desktop-specific components and app container | Drafted |
| `/mobile/` | 131 | Mobile-specific components and app container | Drafted |

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

## Concepts

Cross-cutting concepts that don't map directly to a single sub-package. These documents explain
patterns and systems that span multiple packages.

| Concept | Description | Status |
|---------|-------------|--------|
| Persistence | Hoist's built-in system for persisting user state (grid columns, form values, view selections) to various backing stores (localStorage, preferences, JsonBlob). Used by GridModel, FormModel, TabContainerModel, ViewManagerModel, and others. | Planned |
| Lifecycles | How HoistAppModel, HoistService, and HoistModel are instantiated and initialized. Covers template methods (`initAsync`, `doLoadAsync`, `onLinked`, `afterLinked`, `destroy`) and the standardized sequence for app startup, service installation, and model linking. | Planned |
| Authentication | How Hoist apps authenticate users. Most apps use OAuth (Auth0, MSAL) with no Hoist-provided UI - the flow is handled externally before the app loads. Username/password auth via LoginPanel is an edge case. Covers SSO integration, identity resolution, role-based access, and the relationship between `/security/`, `IdentityService`, and `HoistAuthModel`. | Planned |

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

### Keeping AGENTS.md in Sync

When a new package README is completed, add a corresponding entry to the "Package Documentation"
section in `/AGENTS.md`. Each entry should include a linked package path, a one-sentence
description, and a comma-separated list of key classes and concepts covered.

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

### 2026-02-04
- Completed all `/cmp/` sub-package READMEs (interactively reviewed and refined):
  - `/cmp/README.md` - Top-level overview cataloging all 24 sub-packages
  - `/cmp/layout/README.md` - Box/Frame/Viewport, LayoutProps pixel conversion, BoxProps table
  - `/cmp/form/README.md` - FormModel, FieldModel, SubformsFieldModel, validation, Form context
  - `/cmp/input/README.md` - HoistInputModel, change/commit lifecycle, custom input guide
  - `/cmp/tab/README.md` - TabContainerModel, routing, render/refresh modes, dynamic switcher
  - `/cmp/viewmanager/README.md` - ViewManagerModel, sharing/visibility model, pinning, auto-save, default views
- Updated `/core/README.md` with model context lookup and resolution order documentation
- Added `@bindable` setter convention to `CLAUDE.md` (prefer direct assignment over generated setters)
- Added Persistence and Lifecycles concept docs to roadmap
- Key conventions established during review:
  - No Default columns in config tables (fold into descriptions)
  - Constructor-based initialization for complex models (GridModel, etc.)
  - No `myApp.` prefix in localStorageKey examples (auto-namespaced)
  - Direct assignment for `@bindable` props; call explicit `setFoo()` only when defined

### 2026-02-03
- Completed `/data/README.md` covering:
  - Store, StoreRecord, Field core classes with architecture diagram
  - Store configuration table with all key properties
  - Data loading (loadData, updateData) and local modifications (add/modify/remove)
  - Filter system (FieldFilter, CompoundFilter, FunctionFilter, multi-value matching)
  - Validation system (rules, constraints, severity levels: error/warning/info)
  - Tree/hierarchical data support and summary records
  - Cube aggregation system with View data access patterns (result vs connected stores)
  - Integration with GridModel
  - Common patterns (record reuse, processRawData, idSpec)
  - Common pitfalls section
- Updated `Store.ts` doc comment for `reuseRecords` to clarify default vs optimized behavior
- Completed `/svc/README.md` covering:
  - Overview of services architecture and singleton lifecycle
  - Service installation pattern (XH.installServicesAsync)
  - All 18 built-in services organized by category:
    - Core Data Access: FetchService, ConfigService, PrefService
    - User & Environment: IdentityService, EnvironmentService
    - Activity & Monitoring: TrackService, ClientHealthService, InspectorService
    - Communication: WebSocketService, AlertBannerService
    - Grid Support: GridExportService, GridAutosizeService
    - Persistence: JsonBlobService, LocalStorageService, SessionStorageService
    - App Lifecycle: IdleService, AutoRefreshService, ChangelogService
  - Configuration keys reference table
  - User preference keys reference table
  - Common patterns (loadSpec usage, debounced search with auto-abort, WebSocket subscriptions)
  - Common pitfalls section
