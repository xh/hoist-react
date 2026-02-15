# Documentation Roadmap — Progress Log

> This file contains detailed, chronological session notes for the documentation effort
> tracked in [docs-roadmap.md](./docs-roadmap.md). It is maintained as a historical record.
> **For current status, guidelines, and key decisions, read the roadmap instead.**

## Progress Notes

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
- Completed `/format/README.md` — formatting package overview:
  - Formatter functions vs renderer factories distinction (key concept)
  - Full `NumberFormatOptions` reference table
  - Auto-precision rules
  - Ledger format with `forceLedgerAlign` explanation
  - `ColorSpec` (default classes, custom classes, inline styles)
  - `zeroPad` behavior (boolean and numeric)
  - All convenience number formatters (fmtThousands/Millions/Billions, fmtQuantity, fmtPrice, fmtPercent)
  - `fmtNumberTooltip` and `parseNumber`
  - Date formatting with ISO 8601 recommendation, format constants, all core formatters
  - `fmtCompactDate` with examples at multiple time scales
  - Timestamp replacement utilities
  - Miscellaneous formatting (fmtSpan, fmtJson, capitalizeWords)
  - Common patterns (reusable column specs, app-specific formatters, currency labels, custom date formats)
- Updated `AGENTS.md` with Format entry, moved `/format/` out of "Other Packages"

### 2026-02-08 (cont.)
- Completed `/appcontainer/README.md` — application shell package overview:
  - Overview of AppContainerModel as root coordinator with 17 sub-models
  - Architecture tree grouping all 22 models by category
  - Messages (richest section): XH.message, alert, confirm, prompt with full MessageSpec table
  - Extra confirmation (extraConfirmText), messageKey deduplication, custom inputs for prompts
  - Toasts: XH.toast and convenience variants (success/warning/danger), programmatic dismissal, action buttons
  - Banners: XH.showBanner/hideBanner, category-based uniqueness, BannerSpec table
  - Exception handling: XH.handleException options (alertType, showAlert, requireReload, logOnServer)
  - App Options dialog: getAppOptions(), built-in convenience options (theme/sizing/autoRefresh)
  - Theme, Sizing Mode, Viewport/Device detection
  - About Dialog, Changelog, Feedback, Impersonation (minimal)
  - Routing (minimal, cross-ref to planned concept doc)
  - Login Panel, Version Bar
- Updated `AGENTS.md` with AppContainer entry, moved `/appcontainer/` out of "Other Packages"
- Added cross-links from `/desktop/README.md` and `/mobile/README.md` to new appcontainer README
- Added "Routing" and "Error Handling" concept docs to roadmap (Planned)

### 2026-02-09
- Completed `/utils/README.md` — utility package overview:
  - Async utilities: Timer (polling, dynamic config-based intervals, timeout), forEachAsync/whileAsync
  - DateTime utilities: time constants (SECONDS, MINUTES, etc.), olderThan, LocalDate (immutable memoized date class, factory methods, manipulation, business-day logic)
  - JS utilities: decorators (@debounced, @computeOnce, @sharePendingPromise, @logWithInfo/Debug, @abstract, @enumerable), logging (logInfo/Warn/Error/Debug, withInfo/withDebug, log levels), language utils (getOrCreate, withDefault, throwIf, deepFreeze, pluralize, mergeDeep), DOM utils, version utils, test utils
  - React utilities: hooks (useOnMount, useOnUnmount, useOnResize, useOnVisibleChange, useOnScroll, useCached), layout prop utils, createObservableRef, getClassName
- Completed `/promise/README.md` — Promise extensions:
  - Standalone functions: wait, waitFor, resolve, never
  - Prototype extensions: catchDefault, catchWhen, catchDefaultWhen (selective error handling), track (activity tracking with timing), linkTo (TaskObserver masking), timeout, wait (instance), thenAction (MobX-safe then), tap (pass-through side effects)
  - Standard load pattern: fetchJson → thenAction → linkTo → track → catchDefault
- Completed `/mobx/README.md` — MobX integration layer:
  - Re-exported APIs table (observable, computed, action, autorun, reaction, when, observer, etc.)
  - enforceActions: 'observed' configuration
  - @bindable decorator: auto-generated action setters, @bindable.ref for reference-only tracking
  - @bindable vs @observable guidance, setter convention (prefer direct assignment)
  - Enhanced makeObservable (processes @bindable metadata into observable.box instances)
  - isObservableProp and checkMakeObservable diagnostic utilities
- Updated `AGENTS.md` Utilities table with entries for utils, promise, and mobx
- Removed `/mobx/`, `/promise/`, `/utils/` from "Other Packages" list
- Priority 3 now fully complete — all Key Utilities documented

### 2026-02-10
- Reviewed and refined `/promise/README.md` (Draft → Done):
  - Removed `@managed` advice on TaskObserver (unnecessary, added pitfall note)
  - Replaced standard load pattern with try/catch style over catchDefault
  - Removed "forgetting catchDefault" pitfall (not always recommended)
  - Clarified `never()` description
- Reviewed and refined `/utils/README.md` (Draft → Done):
  - Timer: added `@managed` guidance (implements destroy, should be cleaned up)
  - forEachAsync: clarified use case as yielding during tight synchronous loops
  - Time constants: fixed examples to use `5 * MINUTES` style, added `ONE_MINUTE` readability note
  - LocalDate: expanded with business-context examples (maturity dates, Map keys), emphasized
    memoization/equality, distinguished `get()` vs `from()`, added chaining and toJSON examples
  - Decorators: added note about legacy (Stage 2) decorator support via Babel
  - Logging: major expansion — instance method examples with auto class name prepending,
    withInfo/withDebug timed execution, log level system with zero-overhead debug calls,
    XH.setLogLevel/enableDebugLogging APIs, standalone usage
  - React hooks: added useOnResize and useOnVisibleChange examples with realistic patterns
    (compact mode switching, subscription suspend/resume), composeRefs composition
  - Layout props: added cross-reference link to layout README
- Added Testing concept doc to roadmap (testId, TestProps, form/input integration)

### 2026-02-10 (cont.)
- Created three cross-cutting concept docs (Lifecycles Part 2, Authentication, Persistence):
  - `docs/concepts/lifecycle-models-and-services.md` — Model/service lifecycles after app startup:
    - HoistModel lifecycle phases: construction → linking (onLinked) → post-link (afterLinked,
      initial load, RefreshContext registration) → refresh → destruction
    - `@lookup` decorator and `lookupModel()` availability during linking
    - HoistService differences (initAsync, singleton, no component linking)
    - LoadSupport deep dive: LoadSpec properties (isStale, isObsolete, isAutoRefresh),
      loadObserver (TaskObserver for masking), auto-refresh skip logic
    - Refresh system: RefreshContextModel, RootRefreshContextModel (AppModel-first ordering),
      XH.refreshAppAsync() flow, TabContainer refresh contexts
    - Destruction cascade: disposers → managedInstances → @managed properties
    - Common patterns and pitfalls (lookupModel before linking, direct doLoadAsync calls,
      reaction closures, @managed on owned models, isStale checking)
  - `docs/concepts/authentication.md` — Authentication and identity:
    - Authentication flow state diagram (PRE_AUTH → AUTHENTICATING → ...)
    - HoistAuthModel: completeAuthAsync(), loadConfigAsync(), getAuthStatusFromServerAsync()
    - OAuth clients: MSAL (Entra ID) and Auth0, with init flow diagrams
    - BaseOAuthClient shared features (token refresh, re-login, redirect state)
    - Step-by-step AuthModel implementation guide with Auth0 and MSAL examples
    - Token management: ID vs access tokens, auto-refresh timer, re-login on expiration
    - Identity and access control: IdentityService, checkAccess, impersonation
    - Form-based login: LoginPanel, conditional enableLoginForm
  - `docs/concepts/persistence.md` — State persistence system:
    - Core flow: read → apply → watch → write (no thrashing)
    - Six backing stores: localStorage, sessionStorage, Preference, ViewManager, DashView, Custom
    - PersistOptions configuration table
    - Three approaches: @persist decorators, markPersist(), model constructor config
    - Built-in model support: GridModel (4 aspects), FormModel (field values, Date/LocalDate),
      TabContainerModel (activeTabId, favoriteTabIds), PanelModel (collapsed, size)
    - Configuration inheritance via mergePersistOptions
    - Timing and construction order (decorator timing, constructor sequence)
- Reordered Concepts table: Lifecycles → Authentication → Persistence first (now with drafts),
  then remaining planned docs; moved Version Compatibility to end
- Updated AGENTS.md with Concepts documentation section

### 2026-02-11
- Reviewed and refined all three concept docs (Draft → Done):
  - `lifecycle-models-and-services.md`:
    - Expanded HoistService LoadSupport section: services must be explicitly wired into
      AppModel.doLoadAsync() with loadSpec passthrough; tiered loading pattern
    - Added AutoRefreshService coverage (xhAutoRefreshIntervals config, xhAutoRefreshEnabled pref,
      per-clientAppCode intervals, AppBar refresh button connection)
    - Enhanced "Standard Model" example with try/catch error handling, isStale checks,
      and ExceptionHandler auto-refresh suppression via loadSpec
    - Added selective masking example (panel mask: 'onLoad' vs sibling mask() component)
    - Added pitfall: "Not Wiring Service Loads into AppModel.doLoadAsync()"
  - `authentication.md`:
    - Rewrote MSAL variant: standard Bearer auth header for Hoist server requests, separate
      ApiService example for external API calls with named access tokens
    - Added MsalClientConfig.accessTokens spec example (scopes, fetchMode eager/lazy)
    - Expanded impersonation section: Shift+I hotkey, user vs authUser table, code example
      restricting features during impersonation, "use responsibly" warnings summary
    - Added cross-links from appcontainer/README.md and svc/README.md
  - `persistence.md`:
    - Added intro paragraph on uniform API across backing stores (upgrade store without
      changing consuming models)
    - Clarified settleTime (component re-interpretation at render, e.g. relative→pixel sizes)
    - DashView: best practice for looking up DashViewModel in multi-instance widgets
    - markPersist: featured dashboard widget pattern (lookupModel in onLinked, set persistWith,
      then markPersist)
    - GridModel: mixed-mode persistence example (ViewManager + localStorage override)
    - PanelModel: noted as natural localStorage candidate (screen/device-driven sizing)
    - GroupingChooserModel/FilterChooserModel: split-store pattern (value per-view,
      favorites shared via pref), auto-enabled favorites UI
    - Configuration inheritance: added detailFilterModel with custom path to avoid collisions
    - ViewManager initialization: deep link to ViewManager README
  - Added Authorization concept doc to roadmap (Planned)
  - Updated cross-links: appcontainer/README.md → authentication.md#impersonation,
    svc/README.md IdentityService → authentication.md
- All inter-doc links validated (89 links across 9 files, all valid)

### 2026-02-11 (cont.)
- Reorganized `/docs/` folder: moved concept docs out of `docs/concepts/` to `docs/` (flat structure)
- Created `docs/README.md` — new primary documentation index for hoist-react:
  - "Quick Reference by Task" table mapping natural-language goals to the right doc
  - Package Documentation tables (migrated from AGENTS.md) with descriptions and key topics
  - DevOps and Environment section indexing build-and-deploy, development-environment, compilation-notes
  - Additional Resources section with cross-links to AGENTS.md, roadmap, changelog, and Toolbox
- Replaced AGENTS.md Package Documentation section (~56 lines of tables) with compact directive
  pointing to `docs/README.md` — keeps AGENTS.md focused on architecture patterns and coding conventions
- Updated skill files (xh-update-doc-links, xh-update-docs, doc-conventions) to reference
  `docs/README.md` as primary index instead of AGENTS.md
- Fixed all inter-doc links affected by the concept doc move

### 2026-02-15
- Added Review Workflow subsection to Documentation Guidelines, ported from hoist-core's ROADMAP:
  - Three-status lifecycle: Planned → Draft → Done
  - Draft banner convention for in-progress docs
  - Human review requirement for draft → done promotion
- Drafted all four Priority 4 package READMEs:
  - `/icon/README.md` — Icon singleton, factory methods, IconProps, weight variants, intent
    coloring, file-type icons, serialization/deserialization, HTML mode, placeholder
  - `/security/README.md` — BaseOAuthClient lifecycle, Auth0 and MSAL client configs, access
    token specs (eager/lazy), Token class, auto-refresh, re-login, redirect state handling
  - `/kit/README.md` — All 11 sub-packages: ag-Grid/Highcharts install functions with version
    constraints, Blueprint wrappers (disabled transitions, element factories), Onsen HoistModel
    prop stripping, GoldenLayout React 18 patches, react-select variants, and remaining libraries
  - `/inspector/README.md` — InspectorPanel architecture, Stats view (model count, heap memory,
    sync runs), Instances view (property inspection, watchlist, getter evaluation, observable
    tracking), xhInspectorConfig, activation methods, model leak detection patterns
- Updated Priority 4 roadmap table: all four entries moved from Planned to Draft with links
- Updated `docs/README.md` index:
  - Added new "Supporting Packages" section with entries for all four packages
  - Added Quick Reference entries for icons, OAuth, Inspector debugging, and Kit integration
  - Trimmed "Other Packages" list to only `/admin/` and `/styles/`

### 2026-02-15 (cont.)
- Reviewed and refined `/icon/README.md` (Draft → Done):
  - Updated icon count from "100+" to "150+ direct factories and ~40 semantic aliases"
  - Added FA animation/transform props (spin, pulse, beat, bounce, rotation, flip) with examples
  - Added fixed-width default note (fa-fw and xh-icon classes applied automatically)
  - Corrected HTML mode description: Highcharts tooltips, not ag-Grid cell renderers
  - Corrected serialization usage: DashContainer widget icons, not GridModel column state
  - Added App-Level Icon Catalogs section: pattern for app `Icons.ts` file centralizing
    custom FA registration and app-specific semantic factories (based on real-world app patterns)
  - Folded "Custom FontAwesome Icons" subsection into App-Level Icon Catalogs
  - Added pitfall: using non-FontAwesome icon libraries (stick with FA for cohesive look and feel)
  - Added pitfall: referencing icons from wrong FA version (use version picker on FA site)
  - Added FA icon search links (latest and v6)
- Reviewed and refined `/security/README.md` (Draft → Done):
  - Added "Selected Username" section documenting `getSelectedUsername()`/`setSelectedUsername()`
    public API on BaseOAuthClient
  - Added intro note about the `loadConfigAsync()` / `xh/authConfig` pattern for loading OAuth
    client config from the server rather than hardcoding
  - Added pitfall: MSAL requires `blank.html` for silent iframe requests — provided by
    `hoist-react/public/` and copied automatically by Hoist Dev Utils
  - Enhanced popup blockers pitfall with Chrome `PopupsAllowedForUrls` enterprise policy
  - Enhanced third-party cookie pitfall with Chrome 142+ Local Network Access restrictions
    and `LocalNetworkAccessAllowedForUrls` enterprise policy (affects MSAL `ssoSilent()`)
  - Linked upstream MSAL issue #8100 for LNA details
