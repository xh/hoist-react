# Hoist React Documentation Index

This is the primary catalog for all hoist-react documentation. It indexes package-level READMEs,
cross-cutting concept docs, and DevOps guides — with descriptions and key topics to support fast,
targeted retrieval.

## How to Use This Index

**AI coding agents:** Scan the tables below and match the **Key Topics** column against the APIs,
classes, or patterns you're working with. Use the [Quick Reference by Task](#quick-reference-by-task)
table to map natural-language goals to the right document.

**Application developers:** Navigate by package to find architecture, configuration, and usage
patterns for specific hoist-react features. Start with the [Core Framework](#core-framework) table
for foundational concepts, then drill into [Components](#components) or [Utilities](#utilities).

**Library developers:** In addition to the docs below, see
[`/AGENTS.md`](../AGENTS.md) for architecture patterns and AI assistant guidance, and
[Coding Conventions](./coding-conventions.md) for detailed code style and naming conventions.
See [`docs-roadmap.md`](./planning/docs-roadmap.md) for documentation coverage tracking and conventions.

## Quick Reference by Task

| If you need to... | Start here                                                                                                          |
|---|---------------------------------------------------------------------------------------------------------------------|
| Understand the component/model/service pattern | [`/core/`](../core/README.md)                                                                                       |
| Work with `XH` singleton API | [`/core/`](../core/README.md)                                                                                       |
| Build or configure a data grid | [`/cmp/grid/`](../cmp/grid/README.md)                                                                               |
| Build a form with validation | [`/cmp/form/`](../cmp/form/README.md)                                                                               |
| Understand input change/commit lifecycle | [`/cmp/input/`](../cmp/input/README.md)                                                                             |
| Create a tabbed interface | [`/cmp/tab/`](../cmp/tab/README.md)                                                                                 |
| Build a desktop app or explore desktop components | [`/desktop/`](../desktop/README.md)                                                                                 |
| Build a configurable dashboard | [`/desktop/cmp/dash/`](../desktop/cmp/dash/README.md)                                                               |
| Configure a desktop panel (toolbars, masks, collapse) | [`/desktop/cmp/panel/`](../desktop/cmp/panel/README.md)                                                             |
| Build a mobile app | [`/mobile/`](../mobile/README.md)                                                                                   |
| Save and restore named view configurations | [`/cmp/viewmanager/`](../cmp/viewmanager/README.md)                                                                 |
| Use layout containers (Box, HBox, VBox, Frame) | [`/cmp/layout/`](../cmp/layout/README.md)                                                                           |
| Work with Stores, Records, Fields, or Filters | [`/data/`](../data/README.md)                                                                                       |
| Use FetchService, ConfigService, or PrefService | [`/svc/`](../svc/README.md)                                                                                         |
| Add distributed tracing spans to operations | [`/svc/`](../svc/README.md)                                                                                         |
| Format numbers, dates, or currencies | [`/format/`](../format/README.md)                                                                                   |
| Understand app lifecycle (startup sequence) | [Lifecycle: App](./lifecycle-app.md)                                                                                |
| Understand model/service lifecycles and loading | [Lifecycle: Models & Services](./lifecycle-models-and-services.md)                                                  |
| Add authentication (OAuth, login) | [Authentication](./authentication.md)                                                                               |
| Persist UI state (columns, filters, panel sizes) | [Persistence](./persistence.md)                                                                                     |
| Check roles, gates, or app access | [Authorization](./authorization.md)                                                                                 |
| Configure client-side routing or URL-driven tabs | [Routing](./routing.md)                                                                                             |
| Handle exceptions and display error dialogs | [Error Handling](./error-handling.md)                                                                               |
| Add testId selectors for test automation | [Test Automation](./test-automation.md)                                                                             |
| Use Promises with error handling and tracking | [`/promise/`](../promise/README.md)                                                                                 |
| Work with MobX, `@bindable`, or `@observable` | [`/mobx/`](../mobx/README.md)                                                                                       |
| Use timers, decorators, LocalDate, or utility hooks | [`/utils/`](../utils/README.md)                                                                                     |
| Understand app shell, dialogs, toasts, or theming | [`/appcontainer/`](../appcontainer/README.md)                                                                       |
| Use icons in buttons, menus, and grids | [`/icon/`](../icon/README.md)                                                                                       |
| Configure OAuth authentication (Auth0 or MSAL) | [`/security/`](../security/README.md) + [Authentication](./authentication.md)                                       |
| Debug model instances or detect memory leaks | [`/inspector/`](../inspector/README.md)                                                                             |
| Understand third-party library integration | [`/kit/`](../kit/README.md)                                                                                         |
| Set up builds, CI/CD, or deployment | [Build & Publish Hoist React](./build-and-publish.md), [Build & Deploy Apps](./build-and-deploy-app.md) |
| Configure local development environment | [Development Environment](./development-environment.md)                                                             |
| Use MCP tools with AI assistants | [`/mcp/`](../mcp/README.md)                                                                                         |
| Customize colors, fonts, spacing, or theme | [`/styles/`](../styles/README.md)                                                                                   |
| Follow XH coding conventions | [Coding Conventions](./coding-conventions.md)                                                                       |
| Check hoist-react / hoist-core version compatibility | [Version Compatibility](./version-compatibility.md)                                                                 |
| Upgrade to a new major hoist-react version | [Upgrade Notes](#upgrade-notes)                                                                                     |

## Package Documentation

### Core Framework

| Package | Description | Key Topics |
|---------|-------------|------------|
| [`/core/`](../core/README.md) | Foundation classes defining Hoist's component, model, and service architecture | HoistBase, HoistModel, HoistService, hoistCmp, XH, element factories, decorators, lifecycle |
| [`/data/`](../data/README.md) | Observable data layer with filtering, validation, and aggregation | Store, StoreRecord, Field, Filter, Cube, View, tree data, loadData, processRawData |
| [`/svc/`](../svc/README.md) | Built-in singleton services for data access and app-wide operations | FetchService, ConfigService, PrefService, IdentityService, TrackService, TraceService, WebSocketService |

### Components

| Package | Description | Key Topics |
|---------|-------------|------------|
| [`/cmp/`](../cmp/README.md) | Cross-platform component overview and catalog | Component categories, factory pattern, platform-specific vs shared |
| [`/cmp/grid/`](../cmp/grid/README.md) | Primary data grid built on ag-Grid | GridModel, Column, ColumnGroup, sorting, grouping, filtering, selection, inline editing, export |
| [`/cmp/form/`](../cmp/form/README.md) | Form infrastructure for data entry with validation | FormModel, FieldModel, SubformsFieldModel, validation rules, data binding |
| [`/cmp/input/`](../cmp/input/README.md) | Base classes and interfaces for input components | HoistInputModel, change/commit lifecycle, value binding, focus management |
| [`/cmp/layout/`](../cmp/layout/README.md) | Flexbox-based layout containers | Box, VBox, HBox, Frame, Viewport, LayoutProps, pixel conversion |
| [`/cmp/tab/`](../cmp/tab/README.md) | Tabbed interface system | TabContainerModel, routing integration, render modes, refresh strategies |
| [`/cmp/viewmanager/`](../cmp/viewmanager/README.md) | Save/load named bundles of component state | ViewManagerModel, views, sharing, pinning, auto-save, JsonBlob persistence |
| [`/desktop/`](../desktop/README.md) | Desktop-specific components and app container | Desktop components, Blueprint wrappers, desktop navigation |
| [`/desktop/cmp/dash/`](../desktop/cmp/dash/README.md) | Configurable dashboard system with draggable, resizable widgets | DashContainerModel, DashCanvasModel, DashViewSpec, DashViewModel, widget persistence, ViewManager integration |
| [`/desktop/cmp/panel/`](../desktop/cmp/panel/README.md) | Desktop panel container with toolbars, masks, and collapsible behavior | Panel, PanelModel, Toolbar, mask, collapse/resize, persistence, modal support |
| [`/mobile/`](../mobile/README.md) | Mobile-specific components built on Onsen UI | AppContainer, NavigatorModel, Panel, AppBar, mobile inputs, touch navigation, swipeable tabs |

### Utilities

| Package | Description | Key Topics |
|---------|-------------|------------|
| [`/format/`](../format/README.md) | Number, date, and miscellaneous formatting for grids and display | fmtNumber, fmtPercent, fmtMillions, numberRenderer, dateRenderer, ledger, colorSpec, auto-precision |
| [`/appcontainer/`](../appcontainer/README.md) | Application shell — lifecycle, dialogs, toasts, banners, theming, and environment | AppContainerModel, MessageSpec, ToastSpec, BannerSpec, ExceptionDialogModel, ThemeModel, RouterModel, AppOption |
| [`/utils/`](../utils/README.md) | Async, datetime, JS, and React utility functions used throughout hoist-react | Timer, LocalDate, forEachAsync, decorators (@debounced, @computeOnce, @sharePendingPromise), logging, hooks |
| [`/promise/`](../promise/README.md) | Promise prototype extensions for error handling, tracking, masking, and timeouts | catchDefault, catchWhen, track, linkTo, timeout, thenAction, wait, waitFor, tap |
| [`/mobx/`](../mobx/README.md) | MobX integration layer — re-exports, action enforcement, and @bindable decorator | @bindable, @bindable.ref, makeObservable, observer, action, observable, computed, enforceActions |

### Concepts

Cross-cutting documentation that spans multiple packages:

| Concept | Description | Key Topics |
|---------|-------------|------------|
| [Lifecycle: App](./lifecycle-app.md) | How a Hoist app initializes — from entry point to RUNNING state | XH.renderApp, AppSpec, AppContainerModel, initialization sequence, AppState |
| [Lifecycle: Models & Services](./lifecycle-models-and-services.md) | Model, service, and load/refresh lifecycles after app startup | HoistModel (onLinked, afterLinked, doLoadAsync, destroy), HoistService (initAsync), LoadSupport, LoadSpec, RefreshContextModel |
| [Authentication](./authentication.md) | How Hoist apps authenticate users via OAuth or form-based login | HoistAuthModel, MsalClient, AuthZeroClient, Token, IdentityService, checkAccess, impersonation |
| [Persistence](./persistence.md) | Persisting user UI state to various backing stores | @persist, markPersist, PersistenceProvider, localStorage, Preference, ViewManager, GridModel/FormModel/PanelModel persistence |
| [Authorization](./authorization.md) | Role-based authorization and config-driven feature gates | HoistUser, hasRole, hasGate, checkAccess, HOIST_ADMIN, roles, gates, Admin Console role management |
| [Routing](./routing.md) | Client-side routing via RouterModel (Router5 wrapper) | RouterModel, getRoutes, XH.routerState, XH.navigate, route parameters, TabContainerModel route integration, NavigatorModel |
| [Error Handling](./error-handling.md) | Centralized exception handling, display, and logging | XH.handleException, ExceptionDialog, catchDefault, alertType, toast, requireReload, ErrorBoundary, doLoadAsync |
| [Test Automation](./test-automation.md) | Test automation support via testId selectors | testId, TestSupportProps, data-testid, getTestId, FormField auto-testId, XH.getModelByTestId |
| [Coding Conventions](./coding-conventions.md) | Coding conventions for imports, naming, class structure, component patterns, null handling, async, error handling, logging, and CSS | conventions, code style, imports, naming, TypeScript, class structure, hoistCmp, exports, async, error handling, logging, CSS, BEM |
| [Version Compatibility](./version-compatibility.md) | Reference mapping hoist-react releases to required/recommended hoist-core versions | version matrix, hoist-core pairing, upgrade requirements, compatibility |

### Supporting Packages

| Package | Description | Key Topics |
|---------|-------------|------------|
| [`/icon/`](../icon/README.md) | Factory-based icon system wrapping FontAwesome Pro | Icon singleton, IconProps, intent coloring, size variants, asHtml, fileIcon, serializeIcon |
| [`/security/`](../security/README.md) | OAuth 2.0 client abstraction for Auth0 and Microsoft Entra ID (MSAL) | BaseOAuthClient, AuthZeroClient, MsalClient, Token, AccessTokenSpec, auto-refresh, re-login |
| [`/kit/`](../kit/README.md) | Centralized wrappers for third-party libraries used by Hoist | installAgGrid, installHighcharts, Blueprint, Onsen, GoldenLayout, react-select, version constraints |
| [`/inspector/`](../inspector/README.md) | Built-in developer tool for real-time inspection of Hoist instances and memory | InspectorPanel, StatsModel, InstancesModel, property watchlist, model leak detection |
| [`/styles/`](../styles/README.md) | CSS custom properties, theming, BEM naming, SCSS conventions, and utility classes | `--xh-*` CSS vars, vars.scss, XH.scss, dark theme, ThemeModel, BEM, `xh-` prefix, intent colors, utility classes |

### Other Packages

Additional packages without dedicated READMEs — see [docs-roadmap.md](./planning/docs-roadmap.md)
for planned coverage:

`/admin/`

## DevOps and Environment

| Document | Description |
|----------|-------------|
| [Build & Publish](./build-and-publish.md) | GitHub Actions workflows for linting, CodeQL analysis, and npm publishing of hoist-react |
| [App Build & Deploy](./build-and-deploy-app.md) | Building and deploying full-stack Hoist applications (Gradle, Webpack, Docker) |
| [Development Environment](./development-environment.md) | Local development environment setup for Hoist and app developers |
| [Compilation Notes](./compilation-notes.md) | Notes on TypeScript/Babel compilation and build tooling internals |

## Developer Tools

| Tool | Description |
|------|-------------|
| [MCP Server](../mcp/README.md) | Model Context Protocol server providing AI assistants with structured access to documentation, TypeScript types, and code generation prompts |

## Upgrade Notes

Step-by-step guides for upgrading applications across major hoist-react versions, with
breaking changes, before/after code examples, and verification checklists.

> **Always check the latest version of these notes on the
> [`develop` branch on GitHub](https://github.com/xh/hoist-react/tree/develop/docs/upgrade-notes).**
> Upgrade notes are refined after release as developers report issues and new patterns emerge. The
> copy bundled in your installed hoist-react package may be outdated — the GitHub version is the
> most authoritative source.

| Version | Released | Difficulty | Key Changes |
|---------|----------|------------|-------------|
| [v82](./upgrade-notes/v82-upgrade-notes.md) | 2026-02-25 | 🟢 LOW | `FetchService` static correlation IDs, `xh-popup--framed` removal, DashContainer CSS wrapper |
| [v81](./upgrade-notes/v81-upgrade-notes.md) | 2026-02-12 | 🟢 LOW | Panel CSS rename, `completeAuthAsync` return type, Blueprint `Card` → `BpCard` |
| [v80](./upgrade-notes/v80-upgrade-notes.md) | 2026-01-27 | 🟢 LOW | FormField BEM CSS classes, `appLoadModel` → `appLoadObserver`, jQuery resolution |
| [v79](./upgrade-notes/v79-upgrade-notes.md) | 2026-01-05 | 🟠 MEDIUM | Blueprint 5→6, `moduleResolution: "bundler"`, `loadModel` → `loadObserver` |
| [v78](./upgrade-notes/v78-upgrade-notes.md) | 2025-11-21 | 🎉 TRIVIAL | `GridModel.setColumnState` behavior change |
| [v77](./upgrade-notes/v77-upgrade-notes.md) | 2025-10-29 | 🟠 MEDIUM | Highcharts v11→v12, `disableXssProtection` → `enableXssProtection`, AG Grid context menu markup |
| [v76](./upgrade-notes/v76-upgrade-notes.md) | 2025-09-26 | 🟠 MEDIUM | AG Grid v31→v34, new package names and module registration, `groupRowRenderer` value change |
| [v75](./upgrade-notes/v75-upgrade-notes.md) | 2025-08-11 | 🟢 LOW | Removed deprecated APIs, Cube View row data `_meta`/`buckets` removal |
| [v74](./upgrade-notes/v74-upgrade-notes.md) | 2025-06-11 | 🟢 LOW | `ViewManagerModel.settleTime` removal, `ChartModel.showContextMenu` → `contextMenu` |
| [v73](./upgrade-notes/v73-upgrade-notes.md) | 2025-05-16 | 🟢 LOW | `hoist-core >= 31`, `makeObservable` enforcement, admin `initAsync` super call, ESLint 9 |

## Additional Resources

- [`/AGENTS.md`](../AGENTS.md) — AI coding assistant guidance: architecture patterns and key
  dependencies
- [`docs/coding-conventions.md`](./coding-conventions.md) — Detailed coding conventions: imports,
  naming, class structure, component patterns, null handling, async, error handling, logging, CSS
- [`planning/`](./planning/) — Roadmaps and progress tracking for active library initiatives
  (documentation, testing). Not indexed here — these are project management artifacts, not
  hoist-react reference material.
- [`/CHANGELOG.md`](../CHANGELOG.md) — Version history and release notes (v56+)
- [`archive/CHANGELOG-pre-v56.md`](./archive/CHANGELOG-pre-v56.md) — Archived changelog for
  versions prior to v56
- [`changelog-format.md`](./changelog-format.md) — CHANGELOG entry format conventions and
  section headers
- [Toolbox](https://github.com/xh/toolbox) — XH's example application showcasing hoist-react
  patterns and components
