# Architecture

**Analysis Date:** 2026-02-11

## Pattern Overview

**Overall:** Model-View-Controller with Observable State Management

**Key Characteristics:**
- Three-tier architecture: Models (state/logic), Components (view), Services (app-wide operations)
- MobX-based reactive state management with automatic component re-rendering
- Singleton XH API as framework entry point and service registry
- Element factories for composing component trees (JSX-free TypeScript)
- Platform abstraction with shared core and platform-specific implementations

## Layers

**Core Framework (`/core/`):**
- Purpose: Foundation classes and lifecycle infrastructure
- Location: `/Users/amcclain/dev/hoist-react/core/`
- Contains: `HoistBase`, `HoistModel`, `HoistService`, `hoistCmp`, `XH` singleton, element factories
- Depends on: MobX, React, lodash
- Used by: All application code, all other layers

**Data Layer (`/data/`):**
- Purpose: Observable in-memory data management with filtering and validation
- Location: `/Users/amcclain/dev/hoist-react/data/`
- Contains: `Store`, `StoreRecord`, `Field`, `Cube`, `Filter` system, validation constraints
- Depends on: Core framework
- Used by: Models that manage tabular or hierarchical data, Grid/DataView components

**Services (`/svc/`):**
- Purpose: Singleton app-wide operations (HTTP, config, preferences, identity)
- Location: `/Users/amcclain/dev/hoist-react/svc/`
- Contains: `FetchService`, `ConfigService`, `PrefService`, `IdentityService`, `TrackService`, `WebSocketService`, 18 built-in services total
- Depends on: Core framework
- Used by: Accessed globally via `XH.serviceName` or `XH` convenience methods

**Cross-Platform Components (`/cmp/`):**
- Purpose: Reusable UI components that work on both desktop and mobile
- Location: `/Users/amcclain/dev/hoist-react/cmp/`
- Contains: Grid, Chart, DataView, Form, TabContainer, layout containers, Card, filters
- Depends on: Core, Data, ag-Grid, Highcharts
- Used by: Desktop and mobile platform packages, application code

**Desktop Platform (`/desktop/`):**
- Purpose: Desktop-specific components and app shell built on Blueprint UI
- Location: `/Users/amcclain/dev/hoist-react/desktop/`
- Contains: `AppContainer`, `Panel`, desktop inputs, toolbars, buttons, desktop form fields, Grid helpers
- Depends on: Core, Components, Blueprint
- Used by: Desktop applications via `AppSpec.containerClass`

**Mobile Platform (`/mobile/`):**
- Purpose: Mobile-specific components and app shell built on Onsen UI
- Location: `/Users/amcclain/dev/hoist-react/mobile/`
- Contains: `AppContainer`, `NavigatorModel`, mobile panels, mobile inputs, touch navigation
- Depends on: Core, Components, Onsen UI
- Used by: Mobile applications via `AppSpec.containerClass`

**Application Container (`/appcontainer/`):**
- Purpose: Cross-platform app shell managing lifecycle, dialogs, theming, routing
- Location: `/Users/amcclain/dev/hoist-react/appcontainer/`
- Contains: `AppContainerModel`, dialog models (About, Exception, Feedback), `ThemeModel`, `RouterModel`, banner/toast/message sources
- Depends on: Core, Services
- Used by: Platform AppContainer components, accessed via `XH.appContainerModel`

**Utilities:**
- `/utils/` - Async utilities, `Timer`, `LocalDate`, decorators (`@debounced`, `@computeOnce`), logging
- `/promise/` - Promise extensions (`catchDefault`, `track`, `linkTo`, `timeout`)
- `/format/` - Number, date, currency formatters for grids and display
- `/mobx/` - MobX integration, `@bindable` decorator, action enforcement
- `/icon/` - Icon wrapper for Font Awesome
- `/exception/` - Exception handling infrastructure

**Third-Party Integration Kits (`/kit/`):**
- Purpose: Wraps third-party libraries for consistent integration
- Location: `/Users/amcclain/dev/hoist-react/kit/`
- Contains: Wrappers for ag-grid, blueprint, highcharts, golden-layout, onsen, react-select, react-dates, react-markdown, react-dropzone, react-beautiful-dnd, swiper
- Used by: Component packages that need third-party UI libraries

**Admin Tools (`/admin/`):**
- Purpose: Built-in admin console for managing app configuration
- Location: `/Users/amcclain/dev/hoist-react/admin/`
- Contains: Admin app for viewing activity, managing configs/prefs, monitoring clients/cluster, JSON search
- Used by: Developers and admins via `/admin` route

## Data Flow

**Application Initialization:**

1. `XH.renderApp(appSpec)` called from application entry point
2. `AppContainerModel.renderApp()` creates React root and renders platform `AppContainer`
3. `AppContainerModel.initAsync()` executes initialization sequence:
   - Sets `appState: 'PRE_AUTH'`
   - Installs `FetchService`
   - Sets `appState: 'AUTHENTICATING'`
   - Creates `HoistAuthModel` instance, calls `completeAuthAsync()`
   - Sets `appState: 'INITIALIZING_HOIST'` after auth success
   - Installs core services: `IdentityService`, `EnvironmentService`, `ConfigService`, `PrefService`, `TrackService`, etc.
   - Initializes framework models (theme, viewport, routing, dialogs)
   - Sets `appState: 'INITIALIZING_APP'`
   - Creates application's `HoistAppModel` instance, calls `initAsync()`
   - Starts router
   - Sets `appState: 'RUNNING'`

**Component Rendering:**

1. Component created via factory (e.g., `grid()`, `panel()`)
2. Factory calls `React.createElement()` with props
3. Component mounts, `hoistCmp` wrapper:
   - Resolves model via `creates()` or `uses()` spec
   - Links model to component (calls `onLinked()`, `afterLinked()`)
   - Triggers `loadAsync()` if model implements `doLoadAsync()`
4. Component's `render()` function accesses observable model properties
5. MobX observer wrapper tracks observable access, re-renders on changes
6. Component unmounts, linked model destroyed automatically

**Data Loading Pattern:**

1. Model implements `doLoadAsync(loadSpec: LoadSpec)` template method
2. Caller triggers load via `model.loadAsync()`, `refreshAsync()`, or `autoRefreshAsync()`
3. Framework creates `LoadSpec` with metadata (`isRefresh`, `isAutoRefresh`, tracking)
4. Model's `doLoadAsync()` executes:
   - Calls `XH.fetchJson({url, loadSpec})` for data
   - `FetchService` performs HTTP request with timeout/abort/tracking
   - Server returns data
   - Model updates observables in `runInAction()` block
5. MobX propagates changes to observing components
6. Components re-render with new data

**State Management:**

- Models hold observable state (`@observable`, `@bindable` decorated properties)
- Components access observables during render
- User interactions call model methods
- Model methods update observables (in `@action` or `runInAction()`)
- MobX automatically re-renders components that accessed changed observables
- No manual subscriptions or pub/sub required

## Key Abstractions

**HoistBase:**
- Purpose: Foundation for all managed Hoist objects
- Examples: `HoistModel`, `HoistService`, `Store`
- Pattern: Provides MobX subscription management (`addReaction`, `addAutorun`), resource cleanup (`@managed`, `destroy()`), persistence (`@persist`)

**HoistModel:**
- Purpose: Stateful UI backing - holds observable state and business logic
- Examples: `GridModel`, `FormModel`, `TabContainerModel`, application panel models
- Pattern: Extends `HoistBase`, lifecycle hooks (`onLinked`, `afterLinked`, `doLoadAsync`), context lookup, component linking

**HoistService:**
- Purpose: Singleton app-wide operations and shared state
- Examples: `FetchService`, `ConfigService`, `PrefService`, custom services
- Pattern: Extends `HoistBase`, installed via `XH.installServicesAsync()`, accessed via `XH.serviceName`, `initAsync()` lifecycle

**Store:**
- Purpose: Observable collection of records with filtering, validation, modification tracking
- Examples: Grid data sources, Cube data sources
- Pattern: Extends `HoistBase`, fields define schema, records are `StoreRecord` wrappers, supports hierarchical data

**Element Factory:**
- Purpose: Declarative component composition without JSX
- Examples: `panel()`, `grid()`, `button()`, `div()`
- Pattern: Function accepting props + children via `item`/`items`, returns `ReactElement`, created via `elementFactory()` or `hoistCmp.factory()`

**LoadSupport:**
- Purpose: Managed loading with state tracking and refresh coordination
- Examples: Models implementing `doLoadAsync()`, services with `doLoadAsync()`
- Pattern: Template method `doLoadAsync(loadSpec)`, public entry points `loadAsync()`/`refreshAsync()`, observable `loadObserver.isPending`

## Entry Points

**Application Entry:**
- Location: `public/index.html` loads `static/polyfills.js`, app's entry script (e.g., `App.ts`)
- Triggers: Browser page load
- Responsibilities: Calls `XH.renderApp(appSpec)` to bootstrap framework

**XH.renderApp(appSpec):**
- Location: `/Users/amcclain/dev/hoist-react/core/XH.ts`
- Triggers: Called by application entry script
- Responsibilities: Creates `AppContainerModel`, calls `renderApp()`, starts initialization

**AppContainerModel.initAsync():**
- Location: `/Users/amcclain/dev/hoist-react/appcontainer/AppContainerModel.ts`
- Triggers: AppContainer component mount
- Responsibilities: Service installation, authentication, app initialization, state transitions

**HoistAppModel.initAsync():**
- Location: Application-specific (extends `/Users/amcclain/dev/hoist-react/core/HoistAppModel.ts`)
- Triggers: Called by `AppContainerModel` after framework init
- Responsibilities: Install custom services, load reference data, configure routing

**Router.start():**
- Location: Managed by `AppContainerModel.routerModel` (Router5-based)
- Triggers: Called after app model initialization
- Responsibilities: Parse URL, activate initial route, trigger route-based model loading

## Error Handling

**Strategy:** Centralized exception handling via `XH.handleException()`

**Patterns:**
- Fetch errors: `try/catch` around `XH.fetchJson()`, pass to `XH.handleException()` with options
- Model load errors: Catch in `doLoadAsync()`, clear stale data, handle based on `loadSpec.isStale`/`isAutoRefresh`
- Component errors: `ErrorBoundary` component wraps app, catches render errors
- Unhandled errors: Global `window.onerror` handler during pre-auth, delegates to `ExceptionHandler`

**Exception Display:**
- Toast: Non-blocking notification via `XH.handleException(e, {alertType: 'toast'})`
- Dialog: Modal `ExceptionDialog` for critical errors (default)
- None: Silent handling via `XH.handleException(e, {logOnServer: true})`

**Server Logging:**
- All exceptions logged server-side via `XH.track()` with severity `'ERROR'`
- Includes stack trace, user context, correlation ID

## Cross-Cutting Concerns

**Logging:** Console-based via `XH.log()`, `XH.warn()`, `XH.error()` wrappers with optional server-side tracking

**Validation:** Field-level rules on `Store` fields, `FormModel` aggregate validation, constraints (`required`, `numberIs`, `lengthIs`), severity levels (error/warning/info)

**Authentication:** OAuth via `MsalClient`/`AuthZeroClient` or form-based login, `HoistAuthModel.completeAuthAsync()`, `IdentityService` manages user info, role-based access via `AppSpec.checkAccess`

**Persistence:** `@persist` decorator syncs observables to storage providers (LocalStorage, Preferences, ViewManager), configurable via `persistWith` option

**Activity Tracking:** `XH.track()` records user actions and app events, server-side filtering via `xhActivityTrackingConfig`, viewable in Admin Console

**Theming:** `ThemeModel` manages dark/light themes, persisted per-user, CSS variables for customization

---

*Architecture analysis: 2026-02-11*
