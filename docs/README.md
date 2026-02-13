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
[`/AGENTS.md`](../AGENTS.md) for coding conventions, architecture patterns, and code style guidance.
See [`README-ROADMAP.md`](./README-ROADMAP.md) for documentation coverage tracking and conventions.

## Quick Reference by Task

| If you need to... | Start here |
|---|---|
| Understand the component/model/service pattern | [`/core/`](../core/README.md) |
| Work with `XH` singleton API | [`/core/`](../core/README.md) |
| Build or configure a data grid | [`/cmp/grid/`](../cmp/grid/README.md) |
| Build a form with validation | [`/cmp/form/`](../cmp/form/README.md) |
| Understand input change/commit lifecycle | [`/cmp/input/`](../cmp/input/README.md) |
| Create a tabbed interface | [`/cmp/tab/`](../cmp/tab/README.md) |
| Build a configurable dashboard | [`/desktop/cmp/dash/`](../desktop/cmp/dash/README.md) |
| Configure a desktop panel (toolbars, masks, collapse) | [`/desktop/cmp/panel/`](../desktop/cmp/panel/README.md) |
| Build a mobile app | [`/mobile/`](../mobile/README.md) |
| Save and restore named view configurations | [`/cmp/viewmanager/`](../cmp/viewmanager/README.md) |
| Use layout containers (Box, HBox, VBox, Frame) | [`/cmp/layout/`](../cmp/layout/README.md) |
| Work with Stores, Records, Fields, or Filters | [`/data/`](../data/README.md) |
| Use FetchService, ConfigService, or PrefService | [`/svc/`](../svc/README.md) |
| Format numbers, dates, or currencies | [`/format/`](../format/README.md) |
| Understand app lifecycle (startup sequence) | [Lifecycle: App](./lifecycle-app.md) |
| Understand model/service lifecycles and loading | [Lifecycle: Models & Services](./lifecycle-models-and-services.md) |
| Add authentication (OAuth, login) | [Authentication](./authentication.md) |
| Persist UI state (columns, filters, panel sizes) | [Persistence](./persistence.md) |
| Use Promises with error handling and tracking | [`/promise/`](../promise/README.md) |
| Work with MobX, `@bindable`, or `@observable` | [`/mobx/`](../mobx/README.md) |
| Use timers, decorators, LocalDate, or utility hooks | [`/utils/`](../utils/README.md) |
| Understand app shell, dialogs, toasts, or theming | [`/appcontainer/`](../appcontainer/README.md) |
| Set up builds, CI/CD, or deployment | [Build & Deploy](./build-and-deploy.md) |
| Configure local development environment | [Development Environment](./development-environment.md) |
| Upgrade to a new major hoist-react version | [Upgrade Notes](#upgrade-notes) |

## Package Documentation

### Core Framework

| Package | Description | Key Topics |
|---------|-------------|------------|
| [`/core/`](../core/README.md) | Foundation classes defining Hoist's component, model, and service architecture | HoistBase, HoistModel, HoistService, hoistCmp, XH, element factories, decorators, lifecycle |
| [`/data/`](../data/README.md) | Observable data layer with filtering, validation, and aggregation | Store, StoreRecord, Field, Filter, Cube, View, tree data, loadData, processRawData |
| [`/svc/`](../svc/README.md) | Built-in singleton services for data access and app-wide operations | FetchService, ConfigService, PrefService, IdentityService, TrackService, WebSocketService |

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

### Other Packages

Additional packages without dedicated READMEs — see [README-ROADMAP.md](./README-ROADMAP.md)
for planned coverage:

`/admin/`, `/icon/`, `/kit/`, `/inspector/`,
`/security/`, `/styles/`

## DevOps and Environment

| Document | Description |
|----------|-------------|
| [Build & Deploy](./build-and-deploy.md) | CI configuration, build pipelines, and deployment considerations |
| [Development Environment](./development-environment.md) | Local development environment setup for Hoist and app developers |
| [Compilation Notes](./compilation-notes.md) | Notes on TypeScript/Babel compilation and build tooling internals |

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
| [v81](./upgrade-notes/v81-upgrade-notes.md) | _unreleased_ | 🟢 LOW | Panel CSS rename, `completeAuthAsync` return type, Blueprint `Card` → `BpCard` |
| [v80](./upgrade-notes/v80-upgrade-notes.md) | 2026-01-27 | 🟢 LOW | FormField BEM CSS classes, `appLoadModel` → `appLoadObserver`, jQuery resolution |
| [v79](./upgrade-notes/v79-upgrade-notes.md) | 2026-01-05 | 🟠 MEDIUM | Blueprint 5→6, `moduleResolution: "bundler"`, `loadModel` → `loadObserver` |
| [v78](./upgrade-notes/v78-upgrade-notes.md) | 2025-11-21 | 🎉 TRIVIAL | `GridModel.setColumnState` behavior change |

## Additional Resources

- [`/AGENTS.md`](../AGENTS.md) — AI coding assistant guidance: architecture patterns, coding
  conventions, code style, and key dependencies
- [`README-ROADMAP.md`](./README-ROADMAP.md) — Documentation coverage tracking, conventions,
  and progress notes
- [`/CHANGELOG.md`](../CHANGELOG.md) — Version history and release notes
- [`changelog-format.md`](./changelog-format.md) — CHANGELOG entry format conventions and
  section headers
- [Toolbox](https://github.com/xh/toolbox) — XH's example application showcasing hoist-react
  patterns and components
