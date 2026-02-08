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
| `/desktop/` | 240 | Desktop-specific components and app container | [Done](../desktop/README.md) |
| `/desktop/cmp/panel/` | 7 | Panel container — toolbars, masks, collapse/resize, persistence, modal support | [Done](../desktop/cmp/panel/README.md) |
| `/desktop/cmp/dash/` | 14 | Dashboard system — DashContainer (GoldenLayout) and DashCanvas (react-grid-layout), widget persistence, ViewManager integration | [Done](../desktop/cmp/dash/README.md) |
| `/mobile/` | 131 | Mobile-specific components and app container | [Done](../mobile/README.md) |

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

| Concept | Description                                                                                                                                                                                                                                                                                                                                                      | Status |
|---------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------|
| Persistence | Hoist's built-in system for persisting user state (grid columns, form values, view selections) to various backing stores (localStorage, preferences, JsonBlob). Used by GridModel, FormModel, TabContainerModel, ViewManagerModel, and others.                                                                                                                   | Planned |
| Lifecycles | How HoistAppModel, HoistService, and HoistModel are instantiated and initialized. Covers template methods (`initAsync`, `doLoadAsync`, `onLinked`, `afterLinked`, `destroy`) and the standardized sequence for app startup, service installation, and model linking.                                                                                             | [Part 1 Done](./concepts/app-lifecycle.md) |
| Authentication | How Hoist apps authenticate users. Most apps use OAuth (Auth0, MSAL) with no Hoist-provided UI - the flow is handled externally before the app loads. Username/password auth via LoginPanel is an edge case. Covers SSO integration, identity resolution, role-based access, and the relationship between `/security/`, `IdentityService`, and `HoistAuthModel`. | Planned |
| Version Compatibility | A reference document mapping hoist-react releases to their required hoist-core versions, covering approximately the last 5-10 major versions. Helps developers ensure compatible pairings when upgrading and provides AI assistants with context about version requirements.                                                                                     | Planned |

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

### 2026-02-07
- Completed `/desktop/cmp/panel/README.md` — first desktop sub-package README:
  - Panel layout (vframe structure, flex defaults, padding stripping)
  - Toolbars (tbar/bbar, array auto-wrap, separator shortcut, compact, filler, overflow)
  - Panel + Grid pattern (most common usage, drawn from Jobsite/Veracity examples)
  - Mask (all forms: 'onLoad', TaskObserver, array, explicit, boolean)
  - Collapsing and resizing (PanelModel config, side, defaultSize, all options table)
  - collapsedTitle/collapsedIcon, compactHeader for visual hierarchy
  - Persistence (persistWith, localStorageKey, path disambiguation)
  - Modal support (ModalSupportConfig, modalToggleButton, showModalToggleButton)
  - Configuration reference tables for Panel props and PanelModel config
- Updated `/desktop/README.md` with link to Panel sub-package README
- Updated `AGENTS.md` Components table with Panel entry

### 2026-02-08
- Completed `/desktop/cmp/dash/README.md` — second desktop sub-package README:
  - Overview with "Choosing Between DashContainer and DashCanvas" comparison guide
  - Architecture diagrams for DashModel, DashViewSpec, DashViewModel hierarchies
  - Full DashContainerModel and DashCanvasModel config tables
  - DashViewSpec and DashCanvasViewSpec config tables
  - Two-level persistence architecture (layout + widget state via DashViewProvider)
  - Widget content patterns (accessing DashViewModel, dynamic titles, header items)
  - Common patterns (basic model, ViewManager integration, collapsible panel, dynamic locking, multiple instances with viewState)
  - Links to underlying libraries (GoldenLayout 1.x, react-grid-layout)
  - Common pitfalls section
- Updated `AGENTS.md` Components table with Dash entry
- Updated `/desktop/README.md` with link to Dash sub-package README
- Completed `/mobile/README.md` — mobile platform overview:
  - Overview with Onsen UI foundation, architecture tree
  - Relationship to `/cmp/` cross-platform package
  - AppContainer with correct `XH.renderApp()` pattern, idle/suspension support
  - NavigatorModel (route-based page navigation, pullDownToRefresh, transitionMs)
  - All input components with mobile-specific features (Select `enableFullscreen`, async `queryFn`)
  - Panel, DialogPanel, AppBar, Button, Toolbar, TabContainer (swipeable), Dialog, MenuButton, Popover
  - Complete "Other Mobile Components" table (12 sub-packages)
  - Platform differences (selection behavior, navigation patterns, touch considerations)
  - Common patterns (mobile page, navigator with detail pages, form with formFieldSet)
  - Common pitfalls (desktop vs mobile import confusion)
- Updated `AGENTS.md` Components table with Mobile entry, moved `/mobile/` out of "Other Packages"
- Updated `/desktop/README.md` Related Packages with link to mobile README
