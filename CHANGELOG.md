# Changelog

## 87.0.0-SNAPSHOT - unreleased

### 💥 Breaking Changes (upgrade difficulty: 🟠 MEDIUM - React 19 upgrade)

* Hoist v87 updates to React 19. Apps may require minor adjustments - test carefully.
    * Apply any type adjustments needed to meet React 19's stricter typing. See
      https://react.dev/blog/2024/04/25/react-19-upgrade-guide#typescript-changes for more info.
    * Both desktop and mobile `Popover` implementations now render on Floating UI, rather than
      Popper.js, which is not React-19 compatible. This changes the underlying DOM and CSS classes
      for popovers. Test popover-based UI (menus, selects, date inputs, filter choosers) and adjust
      any custom styling that targeted Blueprint or Popper CSS classes (e.g. `bp6-minimal`).
    * Removed the `popperOptions` escape-hatch prop from the mobile `Popover`.
* `View.result.leafMap` is now null unless the `Query` sets `includeLeaves` or `provideLeaves`. Set
     either flag if an aggregate-only view needs leaf access, or read source records from `Cube.store`.
* Leaf rows published by Cube `View`s now use their source cube record's id as their row/record
  id, rather than a generated id encoding the row's full dimension path. Review any code that
  parses leaf row ids - aggregate and bucket row ids are unchanged. `Store.idEncodesTreePath` may
  no longer be configured on a connected store -- it is now supplanted by more effective
  performance optimzations.
* New exported `getCubeLeaves()` helper replaces the `ViewRowData.cubeLeaves` getter, supporting
  important memory optimizations in this version. Update any code reading `row.cubeLeaves` to call
  `getCubeLeaves(row)`.
* Read `StoreRecord.data` by field name only - enumerating, spreading, or calling `JSON.stringify()`
  on this object does not reliably see default field values. Review any code enumerating `data`
  directly and use `StoreRecord.getValues()` / `getModifiedValues()` instead. This never worked
  reliably, but the new memory optimizations in this version make it far more likely to bite.
* Grid columns newly added to the code are now initially hidden when column state is persisted to a
  `ViewManagerModel` or `DashViewModel`, ensuring a software release does not add columns to views
  users have curated and named. They remain available via the column chooser. Set the new
  `GridModelPersistOptions.hideNewColumns` config to `false` to restore the prior behavior.

### 🎁 New Features

* Hoist v87 delivers a major round of performance work across `FetchService` and the `data`
  package, substantially reducing memory footprint and load/update costs for apps working with
  large datasets. Records, Cube `View` rows, and raw payloads all take leaner representations,
  alongside new opt-in configs for zero-copy projection, digest-based record reuse, and streaming
  loads:
    * Improved `Store` memory efficiency - record `data` objects now take one of two compact
      representations, which `Store` picks per record by how many fields hold non-default values:
      the established sparse form for lightly-populated records, and a fixed shape cloned from a
      shared per-Store template for wider records. Avoids dropping into V8's memory-hungry
      "dictionary" mode, substantially reducing per-record memory on stores with wide records.
    * Improved Cube `View` memory efficiency - each `View` now clones its `ViewRowData` rows from a
      shared template, so all rows in a View share one compact, fixed shape. Substantially reduces
      per-row memory and speeds up view builds, especially for queries with many fields.
    * Cube `View`s no longer copy leaf row data when their results do not expose leaves (neither
      `includeLeaves` nor `provideLeaves` set) - leaf rows read directly from cube records,
      eliminating per-View leaf data objects and speeding up view builds for aggregate-only views
      over large datasets. Such views no longer publish a `View.result.leafMap` - see Breaking
      Changes.
    * Added an opt-in `Store.projectionOnly` config to mark a store as a read-only projection of
      data that its provider parses and owns - use for stores connected to a Cube `View`, or fed by
      an endpoint returning data in its final client-side form. Records use the provider's row
      object as their `data` by reference rather than re-parsing and copying it, collapsing the
      usual two per-row objects to one and skipping the per-row parse on every load and update.
      Local modification APIs (e.g. `modifyRecords`) throw in this mode - see the `projectionOnly`
      config docs for the full contract.
    * Enhanced `Store.reuseRecords` to also accept a digest specification - a raw data property
      name or a function deriving a digest value - reusing the existing record whenever an
      incoming raw object yields an unchanged digest. Applies to both `loadData()` and
      `updateData()`, where `Store` drops unchanged-digest updates as no-ops. Snapshotted
      digests are exposed as `StoreRecord.digest`. Stores connected to a Cube `View` get a
      suitable digest installed automatically.
    * Enhanced Cube `View`s to reuse their generated rows across data updates, reloads, and
      regrouping/filtering. Unchanged rows - validated against their source records and child
      rows - retain their data objects and reuse digests, skipping re-aggregation for untouched
      subtrees and record rebuilds in connected stores. Update costs now scale with the size of
      the change rather than the size of the dataset. Complex (non-`dependsOnChildrenOnly`)
      aggregators also reuse their rows, re-deriving all aggregations in place each generation
      and republishing only values that actually changed.
    * Added `CubeConfig.reuseRecords`, passed through to the Cube's internal Store - lets a
      source supplying per-row digests preserve record identity across full `Cube.loadDataAsync()`
      reloads, extending View row reuse to wholesale refreshes.
    * Added `Store.retainRaw` config (default `true`). Set to `false` to drop each record's
      reference to its raw source data object after parsing, reducing memory usage on large
      stores where `StoreRecord.raw` is not needed. Not compatible with `reuseRecords: true`.
    * Added `Store.loadDataAsync()` to load a complete dataset from a streaming source - a sync
      or async iterable yielding raw records. Creates records incrementally without buffering the
      complete raw dataset in memory, then installs them in a single transaction once the source
      completes. `Cube.loadDataAsync()` likewise accepts a streaming source.
    * Added `XH.fetchNdjson()` to consume an NDJSON (newline-delimited JSON) response
      incrementally. Returns a `lines` async iterable of parsed records - the natural streaming
      source for `Store.loadDataAsync()` - plus a `meta` promise for an optional leading metadata
      record. Optionally pairs with hoist-core v41's `BaseController.renderNdjson()`.
    * Added `FetchOptions.internStrings` to intern (deduplicate) repeated string values within
      large JSON and NDJSON responses, reducing retained memory for high-volume tabular datasets.
      `FetchService` can also share interned values across successive fetches of the same logical
      dataset, which the app identifies with a required key, per a configurable `retainMode`. Skip
      known high-cardinality fields (e.g. UUID columns) via `excludeFields`.

* Added an `icon` prop to `Badge`, rendered before the badge's content. Spacing between the icon and
  content is controlled by the new `--xh-badge-gap` CSS variable.
* Added a `View Surrounding Lines` right-click action to the Admin Console log viewer. Clears any
  active filter and reloads the log around the selected line, then re-selects it and centers it in
  the viewport - useful for examining the context around a hit found via filtering.
* Added a `position` option to `GridModel.ensureRecordsVisibleAsync()`,
  `ensureSelectionVisibleAsync()`, and `selectAsync()`. Allows callers to request that a row be
  scrolled to the `top`, `middle`, or `bottom` of the viewport, rather than just scrolling the
  minimum amount required.

### 🐞 Bug Fixes

* Fixed `View.getDimensionValues()` returning sets of `undefined` rather than the actual unique
  values for each dimension.
* Fixed stale `ViewRowData.cubeBuckets` values on rows reused across query updates - bucket
  assignments are now re-derived from each row's current position on every View generation.
* Fixed `StoreRecord.getModifiedValues()` omitting fields locally modified back to their default
  value - it now reports every difference against committed data, regardless of how the record's
  `data` object represents defaults.
* Fixed Cube `View` forcing a full (rather than incremental) update on every data update when the
  `Query`'s fields did not also include a `BucketSpec.dependentFields` entry.
* Fixed `Grid` retaining an extra generation of records in memory indefinitely - ag-Grid's stored
  `rowData` pinned the record array from the last load into an empty grid, along with every
  `StoreRecord`, `data`, and retained `raw` object in it.
* Fixed `Query.clone()` retaining dimensions dropped by a dimension-only update within its `fields`.
  Cube `View`s changing dimensions via `updateQuery()` accumulated these stale fields, aggregating
  each one on every aggregate row despite nothing having requested or displayed them.
* Fixed `SumAggregator`, `MinAggregator`, and `MaxAggregator` mishandling incoming `null` values on
  incremental Cube `View` updates, leaving aggregates disagreeing with a full rebuild.

### ⚙️ Technical

* Moved both desktop and mobile popover implementations off the deprecated, React-18-capped
  Popper.js onto Floating UI for React 19 compatibility. Updated the Hoist `Popover` components
  (mobile and desktop) so apps require no call-site changes.
* Applied type adjustments to meet React 19's stricter `@types/react` typing.
* Field XSS protection now preserves the reference identity of string values that sanitization
  does not modify (the common case). Previously every parsed string value was replaced with a
  freshly-allocated copy, doubling string memory on stores retaining raw data and defeating any
  upstream deduplication of repeated values.
* Added experimental `Store` config `denseRecordThreshold` - the populated (non-default) field
  count at/above which a record's `data` takes its fixed dense shape rather than the sparse form.
  For testing/tuning only - set to e.g. `999` to restore the pre-v87 (all-sparse) behavior.

### ⚙️ Typescript API Adjustments

* Retyped `BaseRow.data` from `ViewRowData` to `PlainObject`, reflecting that custom `Aggregator`
  implementations may only rely on queried field values - not `ViewRowData` metadata - when reading
  row data. Use row-level getters such as `BaseRow.isLeaf` in place of `data.cubeRowType`.
* Corrected `ChildRawData.rawData` type from `PlainObject[]` to `PlainObject` - the runtime has
  always expected a single raw record per object, and an array would throw on load.

### 📚 Libraries

* @auth0/auth0-spa-js `2.23 → 2.24`
* react `18.2 → 19.2`
* react-window `2.2 → 2.3`

## 86.4.0 - 2026-07-15

### 🎁 New Features

* Added `PrefService.isSet()` to report whether the current user has an explicit value on file for a
  preference vs. receiving its server-side default - a distinction that cannot be reliably inferred
  by comparing the value to the default. Requires a hoist-core version that emits the backing
  `isSet` flag; against older servers all prefs report as unset.

### 🐞 Bug Fixes

* `PrefService.unset()` now performs a true server-side unset, clearing the user's stored value so
  the preference reverts to its (possibly changing) default and `isSet()` reports `false`.
  Previously it persisted the current default as an explicit user value. Falls back to the legacy
  behavior against hoist-core versions that predate the `xh/unsetPrefs` endpoint.
* Fixed `FilterChooser` popover mode to render an opaque background when expanded.

## 86.3.0 - 2026-07-10

### 🎁 New Features

* `Select` now accepts a `generateOptionFn` prop to resolve an option for a selected value that is
  not present in the current options list (e.g. with `queryFn`-based selects or readonly forms),
  ensuring such values render with their proper label rather than falling back to the raw value.
* `SegmentedControl` options (desktop and mobile) now accept a `testId`, emitted on the option's
  rendered button as `data-testid` for E2E targeting. If an option omits its own `testId` but the
  control has one, an id is auto-derived as `${controlTestId}-${value}` - restoring parity with the
  legacy `ButtonGroupInput` test-hook pattern for apps migrating between the two.

### 🐞 Bug Fixes

* Fixed grid columns configured as `hidden` becoming visible after being grouped and then ungrouped.
  `GridModel` now re-asserts each column's configured visibility whenever `groupBy`
  changes, keeping AG Grid's column state in sync with `columnState`.
* Fixed `StoreFilterField` and grid Find so an active quick-filter or find query no longer returns
  different results when the grid's `groupBy` changes.
* Fixed inline grid cell editors to reliably commit their value when editing ends, including popup
  editors (e.g. `textAreaEditor`) within a dialog, which previously dropped edits on Enter or
  click-away.
* Fixed `Select` to correctly handle non-primitive (object) values: selected-option matching and
  async query de-duplication now use deep equality, so object values no longer render as
  `[object Object]` or collide with one another.
* Hardened the grid column filter's Custom tab against filters it previously mishandled -
  multi-value clauses are now expanded into editable rows and recombined on commit, and filters it
  cannot represent are left untouched rather than corrupted.
* Fixed `FilterChooser` popover mode (formerly `PopoverFilterChooser`) so its collapsed control no
  longer disappears when opened - it now always occupies its place in the layout, so surrounding
  elements no longer shift. Its clear and favorites controls also respond to a single click rather
  than requiring the popover to be opened first. This mode is now enabled more naturally via a new
  option `filterChooser({popover: true})`, deprecating `PopoverFilterChooser`, which remains as a
  thin alias.
* Fixed "not a valid MIME type" console warnings from `FileChooser`. Accepted extensions are now
  passed under a dummy MIME type key, silencing the warnings while continuing to filter selected
  files by extension.

### ⚙️ Typescript API Adjustments

* Retyped `GridModel.colChooserModel` as the new cross-platform `IColChooserModel` interface,
  replacing the bare `HoistModel` type and exposing `isOpen`, `open()`, and `close()` directly.
* Added the exported `HoistRoute` type - Router5's `Route` extended with Hoist's `omit` key - and
  retyped `HoistAppModel.getRoutes()` to return it, so declarative route exclusion (e.g.
  `omit: !XH.getUser().isHoistAdmin`) now type-checks without a cast.

### 🤖 AI Docs + Tooling

* Fixed the MCP server and `hoist-ts` CLI TypeScript symbol tools (`search`, `symbol`, `members`)
  returning no results on Windows, where a path-separator mismatch left the symbol index empty. Path
  handling is now normalized so the developer tools work on Windows as well as macOS/Linux.

### 📚 Libraries

* @auth0/auth0-spa-js `2.21 → 2.23`
* @azure/msal-browser `5.14 → 5.16`
* swiper  `12.1 -> 14.0`

## 86.2.0 - 2026-06-25

### 🎁 New Features

* `CodeInput` / `JsonInput` now auto-format content for display via their configured `formatter`,
  controlled by a new `autoFormat` prop. On editable inputs, content is tidied automatically on blur
  (never mid-edit) - users get clean, consistently-formatted JSON without reaching for the format
  button. For `readonly` inputs it defaults to true, so applications can bind directly to raw source
  values and drop their pre-formatting logic, simplifying call sites substantially.
* Grid column filter specs now support a `sortValue` config, letting the Values tab of the filter
  dialog sort its entries the same way the underlying grid column sorts them. When not provided, the
  column's own `sortValue` is used.
* `GridModel.levelLabels` now accepts a partial array covering only the top levels of a tree or
  grouped grid. The "Expand to..." menu and `ExpandToLevelButton` offer one entry per labelled
  level, so deeper, unlabelled levels (e.g. system-managed) are no longer required and are omitted
  as expand-to targets - previously a too-short array disabled the feature entirely.
* Added a `lossless` option to `fmtQuantity` to compact values to millions / billions units only
  when doing so loses no precision, rendering the full value otherwise (e.g. `7,100,100` stays
  `7,100,100` rather than collapsing to `7.10m`).

### 🐞 Bug Fixes

* Fixed grid `NumberEditor` to allow starting an edit by typing `-`, `+`, or `.` (e.g. to enter a
  negative or decimal value), while reliably rejecting other non-numeric keypresses.
* `fmtNumber` now treats a `precision` of `null` as full, unrestricted precision rather than
  `'auto'`, aligning a `NumberInput` with `precision: null` so its blurred display matches its
  focused and committed (full-precision) value.
* Fixed inline grid editing not ending when clicking empty grid space to the right of the last
  column or below the last row - such clicks now commit the active edit.
* Fixed `Icon.placeholder()` to render with the correct width.
* `CheckboxButton` no longer leaks `HoistInputProps` into underlying HTML `<button>` element.
* Fixed `Select` (and `SelectEditor`) dropdown menu sizing: windowed menus now auto-size to their
  option labels instead of the control/cell width, and an explicit `menuWidth` is respected rather
  than overridden by content auto-sizing.

### ⚙️ Typescript API Adjustments

* `GridFilterFieldSpec.renderer` is now typed as a pure value transform (`GridFilterRenderer`),
  rather than a `ColumnRenderer`. This more accurately represents the existing run-time limitation
  that a complex column renderer would throw.

### ✨ Styles

* Vertical (left/right) `TabContainer` switchers now render a modern rounded-pill treatment by
  default, customizable via new `--xh-tab-switcher-vertical-*` CSS variables.

## 86.1.0 - 2026-06-22

### 🎁 New Features

* Added a mobile `SegmentedControl` input - the mobile counterpart to the desktop component, with a
  matching `options`-driven API for selecting a single value from a set of mutually exclusive
  choices. Built on Hoist's mobile `Button` (no Blueprint dependency).
    * The shared `SegmentedControlOption` option types now export from `@xh/hoist/cmp/input` rather
      than the desktop `SegmentedControl` module; update any direct type imports.
* Added a `leftIcon` prop to mobile `TextInput`.
* `FilterChooser` and grid column filters on a timestamp (`date`) field now filter by calendar day,
  comparing against full-day bounds for range and equality operators rather than midnight - e.g.
  `> 2023-05-31` excludes the 31st and `= 2023-05-31` matches any time that day. Filter specs now
  default a `date` source field to `fieldType: 'localDate'`; set `fieldType: 'date'` for exact
  timestamps. Applications using workarounds to provide similar behavior may be able to unwind that
  behavior and rely on Hoist default behavior.

### 🐞 Bug Fixes

* Fixed the "Is blank" / "Is not blank" grid column filters for `tags`-typed fields - empty tag
  arrays now correctly match "Is blank", and such filters are edited on the Custom tab rather than
  producing a phantom blank entry in the Values list.
* Fixed an issue where `Grid` column headers could fall out of sync with body content during
  horizontal scrolling when both `enableFullWidthScroll` and `useVirtualColumns` were enabled.
* Updated `DynamicTabSwitcher` to properly apply `testId` passed down by `TabContainer`.
* Ensure publication of `router5-plugin-browser` TS module augmentation.
* Set an explicit `%` unit on the `flex-basis: 0` of `TabContainer`'s flex shorthand to ensure that
  the `0` is not interpreted as a `0px` basis and that the container sizes as expected.
    * ⚠️Apps that upgrade to `hoist-dev-utils v13.x` and use `flex: 1 1 0` or `flex-basis: 0` should
      verify that their flex layouts continue to work as expected and add an explicit unit if not
      (e.g. `flex: 1 1 0%` or `flex-basis: 0%`).

### ⚙️ Technical

* `JsonBlobService` and `HoistAuthModel` now accept an optional `CallContextLike` argument on all of
  their public methods, allowing callers to nest their fetches within an existing trace.

### ✨ Styles

* Mobile `Button` now defaults to a more touch-friendly height (40px, up from 28px) and rounder
  corners for buttons in body content. Toolbar buttons derive their height from the toolbar size so
  a single token drives both, landing slightly taller than before (34px, up from 28px).
    * `SegmentedControl` adopts the same standard height for a consistent control row.
    * ⚠️ Mobile buttons outside toolbars are now taller - verify body / form / panel layouts that
      pair tightly with button dimensions.
* Mobile tab content (`TabContainer`) now takes the themed app background, so content reads
  correctly in dark mode rather than showing through to Onsen's light default page background.
* Applied the active theme's `color-scheme` onto `html` and added a `theme-color` meta tag matching
  the active theme's app-bar color, so browser chrome and overscroll / safe-area regions might
  better match the theme.

### 📚 Libraries

* @azure/msal-browser `5.13 → 5.14`

## 86.0.1 - 2026-06-16

### 🐞 Bug Fixes

* Fixed a circular import introduced in v86 that caused problems for apps using `@ComputeOnce`.
* Fixed a regression to favorites icon size for `FilterChooser.`

### ⚙️ Technical

* `TrackService`, `PrefService`, and `TraceService` now flush their pending entries reliably when
  the page is hidden or unloaded, reacting to `XH.pageState` and issuing the flush via
  `fetch({keepalive: true})` (replacing the less reliable `beforeunload` + normal-fetch approach).

### 📚 Libraries

* @azure/msal-browser `5.11 → 5.13`
* mobx `6.15 → 6.16`

## 86.0.0 - 2026-06-12

### 💥 Breaking Changes (upgrade difficulty: 🟠 MEDIUM - library upgrades + component API changes)

See [`docs/upgrade-notes/v86-upgrade-notes.md`](docs/upgrade-notes/v86-upgrade-notes.md) for
detailed, step-by-step upgrade instructions with before/after code examples.

* Deprecated `HoistBase.withSpan()` and the `FetchOptions.span` / `loadSpec` fields, in favor of the
  `Runner` chain (`runner().span()`) and the new `CallContext` argument to fetch methods (see below
  for more details). Both log a warning and are scheduled for removal in v88.
* Upgraded `CodeInput` to CodeMirror v6 (upgraded from v5).
    * Removed `editorProps` prop - most use cases now supported via first-class `CodeInput` props
      such as `readonly`, `language`, `lineNumbers`, and `lineWrapping`.
    * Replaced the `mode` prop with `language`. See
      [language-data](https://github.com/codemirror/language-data/blob/main/src/language-data.ts)
      for valid language strings (aliases and names are both accepted).
* Redesigned `FileChooser`, moving configuration from component props to the `FileChooserModel`
  constructor config and adding a fully customizable display API.
    * Options such as `accept` and the file-size limits are now set on `FileChooserModel` rather
      than as `FileChooser` props.
    * Renamed `maxSize` / `minSize` to `maxFileSize` / `minFileSize`.
    * Removed `enableMulti` / `enableAddMulti` - use `maxFiles` (set to `1` for single-file
      selection).
    * Removed `targetText` and `showFileGrid` - customize via the new `emptyDisplay` / `fileDisplay`
      content props. The default `fileDisplay` is a file grid, or a compact card with replace /
      remove actions when `maxFiles` is 1.
    * Removed the `onFilesChange()` model hook - react to the observable `files` array or use the
      new `onFileAccepted` / `onFileRejected` callbacks.
* `DashContainerModel` no longer persists per-view `icon` in its layout state, aligning with
  `DashCanvasModel`. Icons now always come from the `DashViewSpec`. Apps that set
  `DashViewModel.icon` at runtime still see it render, but the override is no longer saved.
* Removed the `serializeIcon()` / `deserializeIcon()` helpers from `@xh/hoist/icon`, which existed
  only to support the above.
* Replaced the mobile `DateInput`'s picker with the browser's native `<input type="date">`, dropping
  the abandoned `react-dates` dependency. Removed the obsolete `formatString`,
  `initialMonth`, `placeholder`, and `singleDatePickerProps` props from `DateInputProps`.

### 🎁 New Features

* `FileChooser` gained extensive new capabilities as part of its redesign: a `maxFiles` limit, fully
  customizable `emptyDisplay` / `fileDisplay` content, `onFileAccepted` / `onFileRejected`
  callbacks, configurable rejection toasts, `maskOnDrag` / `maskOnDisabled` options, and a
  programmatic `openFileBrowser()` method. In multi-file mode a persistent drop target sits
  alongside the grid - placement set via the `dropTargetPlacement` prop (`left`, `top`, or
  `hidden`) - so users can keep adding files until the limit is reached.
* Added the `Runner` API - a fluent builder (via `HoistBase.runner()`) that composes spanning,
  logging, activity tracking, metrics, and task-linking around async work and fetch calls. It
  threads a shared `CallContext` (trace + load state) across call boundaries, which fetch methods
  now accept as an optional argument.
* Added a client-side `MetricsService` (`XH.metricsService`) for recording timers and counters,
  batched to the server's Micrometer registry. Recording requires `hoist-core >= 40.0.1`.
* Trace spans can now chain onto a remote `traceparent` received off-channel (e.g. a WebSocket, SSE,
  or queue message), in addition to a local parent span.
* Desktop `DateInput` now supports a `commitOnChange` prop (default `true`). Set to `false` to defer
  parsing and value commit until blur, Enter, or picker selection. Useful when configuring
  `parseStrings` such that one format is a prefix of another (e.g. `MM/DD/YY` and `MM/DD/YYYY`),
  where the eager default would reformat the user's text mid-typing.
* `SegmentedControl` now supports a per-option `intent`, with an option's own intent taking
  precedence over the control-level default. Its control-level `intent` prop was widened from
  `'none' | 'primary'` to `'none' | Intent`, now accepting `success` / `warning` / `danger` as well
  (a backward-compatible widening).
* Added `pathPrefix` to `PersistOptions` - an inheritable prefix prepended to the resolved `path`,
  concatenated through `persistOptions()`. Enables hierarchical namespacing of persistence so a
  parent model can scope all descendants (`@persist` properties, `markPersist` calls, child
  `GridModel` / `PanelModel` / etc.) under a single shared key in one backing store. See
  [`docs/persistence.md`](docs/persistence.md#hierarchical-namespacing-with-pathprefix).
* Added exported `persistOptions()` function for merging one or more `PersistOptions` objects, with
  later arguments overriding earlier ones. Replaces the now-deprecated
  `PersistenceProvider.mergePersistOptions`.

### 🐞 Bug Fixes

* Updated the chart right-to-left "zoom out" gesture to activate for charts configured with the
  modern `chart.zooming.type` Highcharts option, in addition to the legacy `chart.zoomType`.
* Improved desktop `Select` to no longer hijack `Home`/`End` keys, allowing native caret movement in
  the input. See [#3930](https://github.com/xh/hoist-react/issues/3930).
* Fixed `GridFilter` column header values tab crashing with a duplicate-ID error when re-opened for
  a `tags`-typed field with an active filter.
* Fixed `RelativeTimestamp` ignoring an explicitly passed `model` prop when resolving its `bind`
  source - the prop is now honored, falling back to the context model only when unset.
* Fixed `UniqueAggregator` permanently caching `null` on grouped cube rows after a diverge →
  reconverge sequence of child updates; the aggregator now falls back to a sibling re-scan when the
  cache could be transitioning.
* Fixed a set of view title-handling bugs in the Dash components: `DashCanvasModel.loadState()`
  wiped titles omitted from state entries, `DashContainerModel` ignored incoming titles when
  reloading state over existing views (e.g. failing to reset renames on `restoreDefaultsAsync()`),
  and `DashContainer` tab headers lost renames after a drag. Omitted titles now reset to the
  `DashViewSpec` default in both components.
* Fixed `DashCanvasModel` not publishing layout-only state changes - e.g. `restoreDefaults()` after
  a user had only moved or resized widgets - leaving persisted state stale.
* Fixed `GridModel.beginEditAsync()` ignoring a specified `record` with the id `0`.
* Fixed the `DashCanvas` view menu showing a `Replace` option with an empty fly-out when no view
  specs remain available - the option is now hidden, matching the handling of `Add`.

### 🤖 AI Docs + Tooling

* Added a `hoist-read-doc` MCP tool that reads a full document by exact ID, giving MCP parity with
  the `hoist-docs read` CLI and `hoist-core`'s `hoist-core-read-doc`.
* `hoist-read-doc`, the `hoist://docs/{id}` resource, and `hoist-docs read` now tolerate common
  doc-ID shortenings (e.g. `grid`, `core`, `v85`), resolving to the canonical ID or suggesting
  candidates when ambiguous.
* Added a `hoist-docs ping` CLI subcommand mirroring the `hoist-ping` MCP tool; both now report the
  indexed `@xh/hoist` library version.
* MCP/CLI symbol JSDoc is no longer truncated at the first `@`-prefixed line inside a fenced code
  block (e.g. an `@observable.ref` in a usage example), recovering example code, "SEE ALSO" lists,
  and trailing prose that were previously dropped.

### 📚 Libraries

* @azure/msal-browser `4.29 → 5.11`
    * Major upgrade with broad architectural changes. Hoist no longer hard-codes
      `system.iframeHashTimeout`; apps that override MSAL `system` / `cache` / `auth` options via
      `msalClientOptions` on `MsalClient` must review
      the [v4 → v5 migration guide](https://learn.microsoft.com/en-us/entra/msal/javascript/browser/v4-migration)
      for renamed or removed keys.
* @codemirror `5.x → 6.x`
    * Replaces the v5 monolithic `codemirror` package, with several new direct dependencies now
      managed by hoist-react to maintain all supported functionality.
    * See breaking change note above for `CodeInput` prop changes.
* @seznam/compose-react-refs `removed`
    * Replaced by a Hoist-owned `composeRefs` utility exported from `@xh/hoist/utils/react`.
      Behavior unchanged.
* @xh/hoist-dev-utils `12.x → 13.x`
* ag-grid `34.x → 35.x`.
    * Apps must bump their `ag-grid-community`, `ag-grid-enterprise`, and `ag-grid-react`
      dependencies to `35.x`. See
      the [AG Grid v35 upgrade guide](https://www.ag-grid.com/javascript-data-grid/upgrading-to-ag-grid-35/);
      no Hoist API changes required.
* clipboard-copy `removed`
    * Replaced by a Hoist-owned `copyToClipboard` utility exported from `@xh/hoist/utils/js`.
      Behavior unchanged (async Clipboard API with `execCommand` fallback).
* debounce-promise `removed`
    * Replaced by a Hoist-owned `debouncePromise` utility exported from `@xh/hoist/promise`.
      Behavior unchanged for the trailing-edge / shared-promise usage Hoist relies on; leading-edge
      and accumulate modes were not used and have been omitted.
* golden-layout `removed`
    * Forked the unmaintained `golden-layout` 1.5.9 into `kit/golden-layout/`, removing unused code,
      porting jQuery usage to native DOM, and folding existing monkey-patches into the source.
      See [#4336](https://github.com/xh/hoist-react/issues/4336).
* jquery `removed`
    * Was included due to golden-layouts consumer, which now no longer needs the library.
    * Apps with previously required `"jquery": "3.x"` pin in package.json `resolutions` should now
      be able to remove that pin.
* react-beautiful-dnd `removed`
    * Replaced by `@hello-pangea/dnd` 18.0, a maintained, React 19-ready, drop-in fork. The
      now-archived `react-beautiful-dnd` will receive no further updates. No Hoist or app API
      changes - drag-and-drop behavior is unchanged.
* react-dates `removed`
    * The mobile `DateInput` now uses the browser's native `<input type="date">`. See the breaking
      change note above.
* react-dropzone `10.x → 15.x`
    * See the `FileChooser` redesign note under Breaking Changes above.
* react-select `4.3 → 5.10`
* react-windowed-select `3.1 → 5.2`
* semver `7.7 → 7.8`

## 85.0.0 - 2020-04-30

### 💥 Breaking Changes (upgrade difficulty: 🟢 LOW)

See [`docs/upgrade-notes/v85-upgrade-notes.md`](docs/upgrade-notes/v85-upgrade-notes.md) for
detailed, step-by-step upgrade instructions with before/after code examples.

Note that `hoist-core >= 39.0` is recommended (not required) to pair with the span-sampling and
app-load span changes in this release.

* `XH.installServicesAsync()` no longer accepts the spread-args form. Callers must pass an array of
  service classes plus the current phase's `InitContext`:
  ```ts
  // before
  await XH.installServicesAsync(MyServiceA, MyServiceB);
  // after
  await XH.installServicesAsync([MyServiceA, MyServiceB], ctx);
  ```
  The `ctx` is the one passed to your `AppModel.initAsync(ctx)` override. Forwarding it ensures
  service-init spans nest under the current phase's root span (e.g. `xh.client.appInit`
  for app-level services, `xh.client.hoistInit` for Hoist-internal services).
* `HoistService.initAsync()` and `HoistAppModel.initAsync()` signatures now take an
  `InitContext` argument. Override signatures must be updated to `initAsync(ctx: InitContext)` - the
  upgrade notes cover the mechanical changes and recommended ways to forward `ctx.span`
  into init-time fetch and async work.
* `HoistBase.withSpan()` / `withSpanAsync()` have been removed in favor of the new
  `HoistBase.span()` builder. Replace `this.withSpanAsync(cfg, fn)` with
  `this.span(cfg).run(fn)`. The underlying `XH.traceService.withSpan()` API remains for advanced
  use - now a single async method (the prior sync `withSpan` and async
  `withSpanAsync` on `TraceService` have been merged).
* `TraceService` no longer supports the `alwaysSampleErrors` flag, which was deemed inappropriate
  for head-based sampling. This change is consistent with a similar update in hoist-core v39. Apps
  requiring full visibility into error spans for a particular set of errors should ensure they are
  sampled via the existing rules.
* Removed several APIs that had been deprecated for one or more prior versions - including
  `loadModel` getters across model/service/store classes, static defaults setters on `GridModel`/
  `ChartModel`/`ExceptionHandler`/`FetchService`, and the legacy `withFilterByField`/
  `withFilterByKey`/`replaceFilterByKey`/`withFilterByTypes` filter helpers. See the v85 upgrade
  notes for the full list and replacements.

### 🎁 New Features

* Added `Span.setTag()`/`setTags()`. Span passed to spanned functions is now non-nullable, matching
  the server-side API.
* `LoadSpecConfig.span` lets callers seed the parent trace context for a managed load via loadAsync
  (). This span will be made available on the LoadSpec and automatically picked up by FetchService
  for properly nesting fetch calls.
* `HoistService.initAsync()` and `HoistAppModel.initAsync()` now receive an `InitContext`
  argument carrying the current phase's `span`, so service init spans can nest under the caller's
  span. Pass it along to any `loadAsync()` calls via `LoadSpecConfig.span` to continue the chain.
* `sampleRules` in `xhTraceConfig` now support matching against the span's name via the reserved
  `name` key (same syntax as tag-value patterns). Matches addition in hoist-core.
* Added the `user.name` tag to all spans. New `xh.impersonating` tag on spans shows impersonated
  user, if any.
* Improved, properly nested spans for app loading: `xh.client.load`, `xh.client.hoistInit`, and
  `xh.client.appInit`.
* Added `Picker` props for richer multi-select trigger rendering: `multiSelectButtonStyle: 'values'`
  shows comma-separated selected labels (overflow-ellipsed) instead of the default summary count,
  and `multiSelectShowCount` adds a small selection-count badge to the left of the text. Both are
  app-wide overridable via `Picker.defaults`.

### 🐞 Bug Fixes

* Updated `HoistBase.withSpan` to auto-populate `caller` with `this`, ensuring emitted spans
  correctly stamp `code.namespace`.
* Fixes to built-in fetch CLIENT span:  install `http.response.status_code` and `url.full` tags.
* Fixed downstream app type-check failures on hoist-react asset imports by adding triple-slash
  references to `assets.d.ts` from the files that import PNGs. The ambient declarations were not
  reachable from consumer tsconfigs with narrower `include` patterns.
* Upgraded Swiper `11 → 12` to resolve CVE-2026-27212, a critical prototype pollution vulnerability
  in `Swiper.extendDefaults()`. Apps consuming Swiper's own SCSS should update imports from
  `swiper/scss` to `swiper/css` - Swiper 12 ships CSS sources only.

### 🤖 AI Docs + Tooling

* MCP/CLI symbol and member search now support multi-word queries combining class and member names
  (e.g. `"StoreRecord raw"`).
* Expanded member-index coverage to every exported class and every exported `*Config` interface.
* Added an `@mcpHint` JSDoc tag for attaching short hints to indexed classes/interfaces.
* All MCP tools now expose structured output via `outputSchema` / `structuredContent`; matching CLI
  subcommands gained a `--json` flag.
* `hoist-get-members` surfaces `@param` and `@returns` JSDoc, including via `implements` fallback.
* Added a disk-persisted index cache at `node_modules/.cache/hoist-mcp/`, dropping cold CLI search
  invocations from multi-second builds to sub-second loads. `HOIST_MCP_NO_CACHE=1` to bypass.
* Added MCP server `instructions` and disambiguating language to tool descriptions.
* Fixed a member-index collision where same-named owners clobbered each other's `memberNames`.

### ⚙️ Technical

* Improvements to the naming and tagging of hoist-created spans for consistency with hoist-core and
  easier tag-based sampling.
* Suppressed `Trace ID` display in exception dialogs/toasts for routine or unsampled exceptions.

### 📚 Libraries

* swiper `11.2 → 12.1`
* @onsenui/fastclick `removed`
* @popperjs/core `removed`
* react-transition-group `removed`
* resize-observer-polyfill `removed`

Removed dependencies were obsolete or no longer used by hoist-react internals. No app impact
expected - none were part of the public API surface. Apps that imported these directly (relying on
them as transitive hoist-react dependencies) must add their own direct dependencies.

## 84.0.2 - 2026-05-13

### 🐞 Bug Fixes

* Fixed downstream app type-check failures on hoist-react asset imports by adding triple-slash
  references to `assets.d.ts` from the files that import PNGs. The ambient declarations were not
  reachable from consumer tsconfigs with narrower `include` patterns. Backport of the fix originally
  shipped in v85.0.0.

## 84.0.1 - 2026-04-20

### 🐞 Bug Fixes

* Fixed an unrecoverable crash when calling `XH.prompt()` (and any other `FormField` rendered
  without an explicit `model` prop). `InstanceManager.registerModelWithTestId()` dereferenced a null
  model when a `testId` was supplied, introduced by the v84 expansion of `testId` coverage on
  built-in appcontainer components.

## 84.0.0 - 2026-04-15

### 💥 Breaking Changes (upgrade difficulty: 🟢 LOW)

See [`docs/upgrade-notes/v84-upgrade-notes.md`](docs/upgrade-notes/v84-upgrade-notes.md) for
detailed, step-by-step upgrade instructions with before/after code examples.

* Requires `hoist-core >= 38.0`.
* Removed the `getClassName()` utility from `@xh/hoist/utils/react`. This function had no remaining
  usages in the framework — the `className` spec field on `hoistCmp.factory()` /
  `hoistCmp.withFactory()` handles base class merging automatically.

### 🎁 New Features

* Updated FontAwesome to v7, bringing subtle visual tweaks and performance optimizations to Hoist's
  icon library. All previously supported icons remain and no app changes should be required.
* Replaced animated PNG `Spinner` with a FontAwesome icon-based spinner, making it scalable,
  themeable, and consistent with the rest of the icon system. The icon and weight can be configured
  globally via `Spinner.defaults` or per-instance via props. A `usePng` flag is available to
  preserve the original PNG appearance if desired.
* Added client-side span sampling to `TraceService`. Evaluates `xhTraceConfig.sampleRules` at span
  creation, with child spans inheriting their parent's decision. The `traceparent` header now
  propagates the sampling flag to the server.
* `FetchOptions.span` now accepts a `string` or `SpanConfig` in addition to an existing `Span`. When
  a string or config is provided, `FetchService` creates and manages the parent span internally,
  simplifying a common tracing pattern for fetch calls.

### 🤖 AI Docs + Tooling

* Added JSDoc to ~60 exported Config/Spec interfaces and improved class-level docs on key framework
  classes. Added README cross-references, when-to-use guidance, and `@see` navigation links
  throughout.
* Split Cube documentation into dedicated `data/cube/README.md` with expanded query patterns
  covering grand totals, leaf drill-down, dynamic updates, and `executeQuery()`.
* Enhanced MCP/CLI symbol search to match JSDoc content with multi-word AND queries (e.g.
  `"panel modal"` finds `ModalSupportModel`). Added disambiguation hints for duplicate symbol names
  and fixed resolution of symbols shadowed by dynamics stubs.

### ⚙️ Technical

* Added support for a typed `defaults` object on `hoistCmp` components — static config that apps can
  override at bootstrap (e.g. `Button.defaults.minimal = false`). Instance props take precedence.
  Added initial defaults to `Button`, `Panel`, `Spinner`, and `Toolbar`.
* Added `suppressStackTrace` and `includeStartMessages` fields to the Log Levels admin panel,
  supporting the new hoist-core per-logger logging behavior overrides.
* Added `assets.d.ts` type declarations for image and markdown imports (`*.png`, `*.gif`, `*.jpg`,
  `*.svg`, `*.md`), removing the need for `@ts-ignore` on asset imports.
* Added hardcoded `xh-` prefixed `testId` props to all desktop and mobile appcontainer components
  for Playwright testing support.
* Namespaced auto-installed `TraceService` span and metric tags with an `xh.` prefix, aligning with
  OTEL semantic conventions.

### ✨ Styles

* Improved default grid tooltip styling — long strings now wrap at a configurable max-width (`400px`
  default) using `pre-wrap`. New `--xh-grid-tooltip-*` CSS variables added for app-level
  customization of background, border, border-radius, padding, and max-width.

### 📚 Libraries

* @auth0/auth0-spa-js `2.17 → 2.19`
* @fortawesome/* `6.0 → 7.2`
* @fortawesome/react-fontawesome `0.2 → 3.2`
* dompurify `3.3 → 3.4`
* lodash `4.17 → 4.18`

## 83.1.0 - 2026-04-07

### 🐞 Bug Fixes

* Fixed `EnvironmentService.ensureVersionRunnable()` to correctly detect client/server version
  mismatches on startup. The previous check compared two values both sourced from the server
  response, making it a tautology that could never fail. Now compares the webpack-baked
  `clientVersion` against the server-reported `appVersion`.

### 🤖 AI Docs + Tooling

* Improved MCP/CLI TypeScript symbol tools to surface full JSDoc documentation in search results and
  resolve a discoverability gap around component Props interfaces. `hoist-search-symbols`
  now includes JSDoc snippets with each result. Props interfaces (e.g. `PanelProps`) without their
  own JSDoc inherit documentation from their companion component via naming convention.
  `hoist-get-symbol` now cross-references between Props interfaces and their components.

## 83.0.2 - 2026-03-30

### ⚙️ Technical

* Updated `WebSocketService` to support same-origin `baseUrl` values (e.g. `/api/`). Previously
  assumed a cross-origin `baseUrl` in dev mode. Required for compatibility with the new
  webpack-dev-server proxy in `@xh/hoist-dev-utils` v12.

## 83.0.1 - 2026-03-25

### ⚙️ Technical

* Update upgrade notes skill to properly register upgrade note

## 83.0.0 - 2026-03-24

### 💥 Breaking Changes (upgrade difficulty: 🟢 LOW)

See [`docs/upgrade-notes/v83-upgrade-notes.md`](docs/upgrade-notes/v83-upgrade-notes.md) for
detailed, step-by-step upgrade instructions with before/after code examples.

* Requires `hoist-core >= 37.0` (paired major release — tracing and metrics features depend on new
  server-side infrastructure).
* Deprecated ad-hoc static properties on `GridModel`, `ChartModel`, `ExceptionHandler`, and
  `FetchService` in favor of the new `static defaults` pattern. Old properties log warnings and are
  scheduled for removal in v85.
* Removed `downloadjs` dependency. Apps that imported `downloadjs` directly (relying on it as a
  transitive hoist-react dependency) must replace those usages. Use the new
  `downloadBlob(blob, filename)` or `downloadViaUrl(url, filename?)`
  utilities from `@xh/hoist/utils/js` instead.

### 🎁 New Features

* Added `TraceService` — client-side distributed OTEL tracing, configurable via `xhTraceConfig`.
    - `withSpan()` and `withSpanAsync()` wrap operations with automatic timing and error capture.
    - `Promise.span()` provides a chainable API for tracing promise-based operations.
    - `FetchService` auto-creates CLIENT spans and injects `traceparent` headers.
    - Exceptions thrown during traced operations include a top-level `traceId` for correlation.
    - Automated app-load spans covering pre-auth, hoist init, and app init phases.
* Added `SegmentedControl` desktop input component — a toggle group for mutually exclusive options
  with strong visual differentiation of the active selection. Consider as replacement for
  `ButtonGroupInput`.
* Added `CheckboxButton` desktop input component — a button-based boolean toggle matching the
  existing mobile component. Added `checkedIcon` and `uncheckedIcon` props to both desktop and
  mobile versions for custom icon support.
* Added publish controls to the Admin Metrics tab, supporting the new opt-in metrics export feature
  in `hoist-core >= 37.0`.
* Added `activeFilterIcon` config to `GridFilterModel` to customize the icon displayed in column
  headers when a filter is active. Accepts any `Icon` element, enabling use of a different icon,
  prefix (e.g. solid), or intent (e.g. warning).

### ⚙️ Technical

* Introduced a standard `static defaults` pattern for app configuration overrides across several
  core models. `GridModel.defaults` is the prime example — see `GridModelDefaults` for the full set
  of visual, behavioral, and structural props now available. Apps should review available defaults
  and set them at startup to reduce per-instance boilerplate. Instance-level config always takes
  precedence. Previous ad-hoc static properties (e.g.
  `GridModel.DEFAULT_AUTOSIZE_MODE`) are deprecated — update to the new
  `ModelClassName.defaults.propName` form.
* Added `TabContainerModel.setActiveTabId()` for programmatic tab activation, suitable for use as a
  `bind` target (e.g. with `SegmentedControl`). Previously required calling `activateTab()`.
* Switched `sizingModeAppOption` and `themeAppOption` app option control presets to use new
  `SegmentedControl` and set new `refreshRequired: false` flag to avoid data refresh when changed.
* Made `DashCanvasModel.loadState()` public, allowing applications to restore canvas state directly
  from a `DashCanvasItemState[]` array without wrapping as `PersistableState`.
* Updated `FieldFilter` to log console warning for any field not found in linked `Store`.

### 🤖 AI Docs + Tooling

* Refactored documentation indexing to better support both MCP (LLM) and the Toolbox Docs viewer.
* Improved MCP/CLI TypeScript tools: `hoist-get-members` now walks both class and interface
  inheritance chains, shows constructor config types, indexes Promise prototype extensions, and
  filters `_`-prefixed internal members.
* Fixed MCP/CLI TypeScript symbol indexing for destructured exports (e.g.
  `export const [Button, button] = hoistCmp.withFactory(...)`). Individual binding names are now
  indexed as separate symbols, enabling exact-match lookups via `hoist-ts symbol`.

## 82.0.4 - 2026-03-23

### 🐞 Bug Fixes

* Fixed `Store.getFieldValues()` to include `null` in its returned set when records contain
  null/undefined values. Previously these were silently excluded, preventing grid column filters
  from offering a [blank] option.
* Fixed `FilterChooser` `QueryEngine` to handle null values in suggestion generation without
  throwing. Added error logging so failures in `queryAsync` surface in the console rather than
  silently killing the dropdown. The 'is' pseudo-operator is now listed in the e.g. operator hints,
  and 'is blank' / 'is not blank' suggestions are offered when a field contains null values.

## 82.0.3 - 2026-03-02

### 🐞 Bug Fixes

* Fixed bug where `DashCanvasModel.state` returned stale data when persisted state was restored
  during construction.
* Fixed bug preventing selection of favorites in the `GroupingChooser`.

## 82.0.2 - 2026-03-02

### 🐞 Bug Fixes

* Fixed TS compilation errors caused by missing `.d.ts` declaration files in published build.

## 82.0.1 - 2026-02-28

### 🐞 Bug Fixes

* Fixed a CSS issue causing desktop submenus to clip.

### 🤖 AI Docs + Tooling

* Enhanced the MCP server's `hoist-search-symbols` tool to also search public members (properties,
  methods, accessors) of 18 key framework classes. The TypeScript index is now built asynchronously
  after server startup so the first tool call doesn't pay the initialization cost.

## 82.0.0 - 2026-02-27

Note that a server-side upgrade to `hoist-core >= 36.3` is recommended to support new Admin Metrics
tab, but is not strictly required.

### 💥 Breaking Changes (upgrade difficulty: 🟢 LOW)

See [`docs/upgrade-notes/v82-upgrade-notes.md`](docs/upgrade-notes/v82-upgrade-notes.md) for
detailed, step-by-step upgrade instructions with before/after code examples.

* Converted `FetchService` correlation ID properties (`autoGenCorrelationIds`, `genCorrelationId`,
  `correlationIdHeaderKey`) from instance to static. These can now be configured in the app's
  `Bootstrap` module to ensure correlation IDs are active from the very first request, including
  early hoist core init calls. Apps that configure these properties should update references from
  `XH.fetchService.<prop>` to `FetchService.<prop>`.
* Added additional `div` with `xh-dash-tab__content` class around `DashContainerView` content. Apps
  with custom CSS targeting `xh-dash-tab` may need to adjust their selectors.
* Removed the `xh-popup--framed` CSS class. Apps applying this class to popovers should remove it —
  popover borders are now themed globally via the `--xh-popup-border-color` CSS variable.

### 🎁 New Features

* Added `DashCanvasWidgetChooser` component — a draggable widget well for adding views to a
  `DashCanvas` via drag-and-drop from an external container. Added `allowsDrop`, `onDropDone`, and
  `onDropDragOver` config options to `DashCanvasModel` to support this, along with
  `showGridBackground` and `showAddViewButtonWhenEmpty` configs and a `'wrap'` compaction strategy.
* Added `Picker` desktop input component — a popover-based option picker for space-constrained areas
  like toolbars. Renders a trigger button that opens a dropdown checklist, with support for single
  and multi-select modes, built-in filtering, custom option and button renderers, and virtualized
  scrolling for large option lists.
* Added new Admin Console Cluster > Metrics tab, providing a cluster-wide view of all registered
  Micrometer meters, part of Hoist's ongoing observability updates.
    * Feature requires `hoist-core >= 36.3`.
* Added `description` property to `Field` and `Column`. `Column.description` defaults from
  `Field.description` and serves as the default for both `headerTooltip` and `chooserDescription`
  when those are not explicitly set, providing a single point of configuration for supplementary
  descriptive text that flows from the data layer through to the grid UI.
* Added `bind` config to `GroupingChooserModel` for two-way syncing of the selected grouping to a
  `GridModel` (via `setGroupBy()`) or Cube `View` (via `updateQuery({dimensions})`). When `bind` is
  provided, dimensions can be omitted and will be auto-populated from the target's fields where
  `isDimension: true`. Explicitly provided dimensions are validated against the target's fields.
    * Promoted `isDimension` from `CubeField` to the base `Field` class (defaults to `false`),
      allowing Store fields to be marked as groupable dimensions.
* Added `testId` support to mobile `Button`, `FormField`, `TabContainer`, and all mobile input
  components (`Checkbox`, `DateInput`, `NumberInput`, `SearchInput`, `Select`, `SwitchInput`,
  `TextArea`, `TextInput`).

### 🐞 Bug Fixes

* Fixed `testId` generation in `RadioInput` (use option `value` instead of `label`) and `RestGrid`
  action buttons (scope by parent `testId` to prevent collisions across multiple grids).
* Fixed `parseFieldValue` for `'date'`-typed fields to detect `LocalDate` inputs and convert via
  `.date` rather than passing through `new Date()`.
* Fixed `Panel` content styling to `display: block` when `scrollable` is `true`.
* Fixed `DynamicTabSwitcher` to consume the `onContextMenu` event on its tabs.
* Improved `DashCanvas` and `DashContainer` persistence such that individual `ViewModel` state can
  be updated without reloading the entire dashboard and owned views.
* Fixed `GroupingChooser` to support multiple instances sharing the same `GroupingChooserModel`.
  Transient UI state (e.g. editor open/closed, pending value) is now held per-component, so opening
  one chooser no longer opens all others bound to the same model.

### ⚙️ Technical

* Added instance methods to the `Filter` class hierarchy for removing child filters by type or
  field, plus a new `appendFilter()` utility for composing filters via AND. These replace the
  standalone `withFilterByField`, `withFilterByKey`, and `withFilterByTypes` utilities, which have
  been deprecated. Internal callers have been migrated to the new API.
* Transitioned the hoist-react build itself to GitHub Actions (from our previous Teamcity build). No
  change to library consumers - Hoist continues to be published to npm.
* Catches and logs an occasional, non-fatal race condition error on `DashContainer` state changes.

### 🤖 AI Docs + Tooling

* Added an embedded MCP (Model Context Protocol) server that gives AI coding tools structured access
  to hoist-react documentation and TypeScript type information. Includes tools for keyword search
  across docs, symbol lookup, and class/interface member inspection. See [
  `mcp/README.md`](mcp/README.md) for setup and usage details.

### ✨ Styles

* Overrode Blueprint's hardcoded popover border and arrow colors to use Hoist's themed
  `--xh-popup-border-color` CSS variable. Popover borders and arrows now match the rest of the Hoist
  theme in both light and dark modes.

### 📚 Libraries

* @azure/msal-browser `4.26 → 4.29`
* @auth0/auth0-spa-js `2.9 → 2.17`
* react-grid-layout `2.1 → 2.2.2`
* react-window `2.2` (new — windowed rendering for `Picker` virtual option lists)
* qs `6.14.0 → 6.15.0`

## 81.0.2 - 2026-02-12

### 💥 Breaking Changes (upgrade difficulty: 🟢 LOW)

See [`docs/upgrade-notes/v81-upgrade-notes.md`](docs/upgrade-notes/v81-upgrade-notes.md) for
detailed, step-by-step upgrade instructions with before/after code examples.

* Requires `hoist-core >= 36.1`.
* Renamed the CSS class on Panel's outer structural wrapper from `xh-panel__content` to
  `xh-panel__inner`. The `xh-panel__content` class is now used on the new inner frame wrapping
  content items (the target of `contentBoxProps`). Update any app CSS selectors targeting the old
  `xh-panel__content` class accordingly.
* Changed the signatures of some `HoistAuthModel` methods to return `IdentityInfo` rather than a
  `boolean`. For most apps this will require a trivial change to the signature of the implementation
  of `HoistAuthModel.completeAuthAsync`.
* Renamed Blueprint `Card` exports to `BpCard` and `bpCard`.

### 🎁 New Features

* Added `Card` component, a bordered container for grouping related content with an optional inline
  header and collapsible content.
* Added `FormFieldSet` component for grouping `FormFields` with aggregated validation state.
* Added `contentBoxProps` to desktop and mobile `Panel`, providing direct control over the inner
  frame wrapping content items. Use to apply padding, change flex direction, enable scrolling, or
  add custom classes without extra nesting. Matches the existing `contentBoxProps` API on `Card`.
* Added `scrollable` prop to desktop `Panel`, matching the existing mobile `Panel` API. Sets
  `overflowY: 'auto'` on the content area.
* Enhanced layout props `padding`, `margin` (and their directional variants), and `gap` to accept a
  boolean shorthand: `true` - resolves to the standard app padding CSS variable (`--xh-pad-px`,
  default 10px), with `false` treated as unset.

### 🐞 Bug Fixes

* Fixed bug where inline editable `Grid` with `groupDisplayType` other than `groupRows` would throw.
* Fixed bug where attempting to access validation errors on subforms would throw.

### ⚙️ Typescript API Adjustments

* Updated `GridFilterModel.setFilter` signature to accept `FilterLike` rather than `Filter`.
* Added `ResolvedLayoutProps` type alias. `getLayoutProps()` and `splitLayoutProps()` now return
  `ResolvedLayoutProps` (with boolean values resolved) instead of `LayoutProps`.

### ⚙️ Technical

* Improved the efficiency of initialization by reducing the number of fetch requests required to
  load user identity.

## 80.0.1 - 2026-01-28

### ⚙️ Technical

* Added `Cube.lastUpdated` and `View.cubeUpdated` properties to support more efficient updating of
  connected cube views.

## 80.0.0 - 2026-01-27

### 💥 Breaking Changes (upgrade difficulty: 🟢 LOW)

See [`docs/upgrade-notes/v80-upgrade-notes.md`](docs/upgrade-notes/v80-upgrade-notes.md) for
detailed, step-by-step upgrade instructions with before/after code examples.

* Modified several CSS classes related to `FormField` to better follow BEM conventions.
    * ⚠️The commonly targeted `xh-form-field-label` class is now `xh-form-field__label`, although
      please review new CSS vars (below) and consider using those instead of class-based selectors.
    * Modifier classes now follow BEM conventions (e.g. `xh-form-field-invalid` is now
      `xh-form-field--invalid`).
* Completed the refactoring from `loadModel` to `loadObserver` started in v79:
    * Renamed `XH.appLoadModel` to `XH.appLoadObserver`. The prior getter remains as an alias but is
      deprecated and scheduled for removal in v82.
    * Renamed `AppContainerModel.loadModel` to `loadObserver`. This is primarily an internal model,
      so there is no deprecated alias. Any app usages should swap to `XH.appLoadObserver`.
    * Removed additional references to deprecated `loadModel` within Hoist itself.
* Removed the following instance getters - use new static typeguards instead:
    * `Store.isStore`
    * `View.isView`
    * `Filter.isFilter`
* Replaced `LeftRightChooserFilter.anyMatch` with `matchMode`. Changes are not expected to be
  required as apps typically do not create this component directly.

### 🎁 New Features

* Enhanced `Field.rules` to support `warning` and `info` severity. Useful for non-blocking
  validation scenarios, such as providing guidance to users without preventing form submission.
* Added new `AppMenuButton.renderWithUserProfile` prop as a built-in alternative to the default
  hamburger menu. Set to `true` to render the current user's initials instead or provide a function
  to render a custom element for the user.
* Added `AggregationContext` as an additional argument to `CubeField.canAggregateFn`.
* Added `filterMatchMode` option to `ColChooserModel`, allowing customizing match to `start`,
  `startWord`, or `any`.
* Added support for reconnecting a `View` to its associated `Cube`.

### 🐞 Bug Fixes

* Fixed error encountered when attempting to `store.revert()` on a store with summary records.

### ⚙️ Typescript API Adjustments

* Introduced new `FilterBindTarget` and `FilterValueSource` interfaces to generalize the data
  sources that could be used with `FilterChooserModel` and `GridFilterModel`. Both `Store` and
  `View` implement these interfaces, meaning no changes are required for apps, but it is now
  possible to use these models with alternate implementations.
* Added new static typeguard methods on `Store`, `View`, and `Filter` + its subclasses.
* Removed `RecordErrorMap` + reorganized validation types (not expected to impact most apps).

### ✨ Styles

* Applied the app-wide `--xh-font-family` to `input` elements. Previously these had continued to
  take a default font defined by the browser stylesheet.
    * Customize for inputs if needed via `--xh-input-font-family`.
    * Note that the switch to Hoist's default Inter font w/tabular numbers might require some inputs
      w/tight sizing to be made wider to avoid clipping (e.g. `DateInputs` sized to fit).
* Updated + added validation-related `FormField` CSS classes and variables to account for new `info`
  and `warning` validation levels. Additionally validation messages and the `info` text element no
  longer clip at a single line - they will wrap as needed.
* Added new CSS variables for `FormField` to allow easier customization of commonly adjusted styles,
  with a focus on labels. See `vars.scss` for the full list. Consider replacing existing class-based
  CSS overrides with overrides to variables where possible.
* Added new CSS variables `--xh-intent-danger-text-color` (and others). Consider using these when
  styling text with Hoist intent colors to enhance legibility in dark mode.
* Tweaked styling of `DashContainer` tab controls, adding a left border to the control surface and
  improving the visibility of the tab overflow dropdown.

### 📚 Libraries

* Added a direct dependency and forced resolution to pin to `jquery@3.x`. This is a transitive
  dependency of the `golden-layout` library and is specified by that library very loosely as `*`,
  causing a break if upgraded to jQuery's new 4.x release.
    * ⚠️Apps will need to add their own resolution to ensure they stay on the last 3.x version.

## 79.0.0 - 2026-01-05

### 💥 Breaking Changes (upgrade difficulty: 🟠 MEDIUM)

See [`docs/upgrade-notes/v79-upgrade-notes.md`](docs/upgrade-notes/v79-upgrade-notes.md) for
detailed, step-by-step upgrade instructions with before/after code examples.

Note that a server-side upgrade to `hoist-core >= 35` is recommended to support several changes in
this release, but is not strictly required.

* Upgraded Blueprint from version 5 to version 6. Most apps will not need to change, but
  see https://github.com/palantir/blueprint/wiki/Blueprint-6.0 for more details.
    * ⚠️ Note that any custom CSS overrides to BP classes will need to replace the `bp5` prefix with
      `bp6` and should be reviewed for accuracy/neccessity.
* Renamed `LoadSupport.loadModel` to `LoadSupport.loadObserver` for clarity. This property is a
  `TaskObserver` instance, not a `HoistModel`.
    * The getter methods `HoistModel.loadModel` and `HoistService.loadModel` remain as aliases but
      are deprecated and scheduled for removal in v82.
    * Apps should update their code to use `loadObserver` instead of `loadModel`.
* Renamed `GridModel.applyColumnStateChanges()` to `updateColumnState()` for clarity and better
  symmetry with `setColumnState()`.
    * The prior method remains as an alias but is deprecated and scheduled for removal in v82.
* Moved `TabSwitcherProps` to `cmp/tab/Types.ts` but maintained export from `cmp/tab/index.ts`. Some
  apps may need to update their imports.
* Repurposed `TabContainerConfig.switcher` to accept a `TabSwitcherConfig`. To pass
  `TabSwitcherProps` via a parent `TabContainer`, use `TabContainerProps.switcher`.
* Tightened the typing of `LocalDate` adjustment methods with new `LocalDateUnit` type. Some less
  common or ambiguous units (e.g. `date` or `d`) are no longer supported. Also typed the adjustment
  `value` args to `number` where applicable.
* Your app must update `compilerOptions.moduleResolution` to "bundler" in `tsconfig.json`
* If using the `DashCanvas.rglOptions` prop, you might have to update it to reflect changes in
  `react-grid-layout` v2+ (not common).
* Modified `DashCanvasModel.containerPadding` to apply to the `react-grid-layout` div created by the
  library, instead of the Hoist-created containing div. This may affect printing layouts.

### 🎁 New Features

* Added new `DynamicTabSwitcher` component, a more user-customizable version of `TabSwitcher` that
  allows for dynamic addition, removal, and drag-and-drop reordering of tabs with the ability to
  persist "favorited" tab state across sessions. Additionally, existing static `TabSwitcher` now
  supports context-menu items. See `TabContainerConfig.switcher`.
* Enhanced `LocalDate` with `addWeekdays` and `subtractWeekdays` methods.
* Upgraded `DashCanvas` with support for a gridded background to match widget sizing/snapping
  settings, plus two compacting strategies: 'vertical' and 'horizontal'.
* Changed the icon used for the Grid autosize buttons and menu option (to 🪄).
* Added `clientAppCode` to Activity Tracking logs. Requires `hoist-core >= 35`.

### 🐞 Bug Fixes

* Fixed the column chooser to display columns in the same order as they appear in the grid.
* Defaulted Highcharts font to Hoist default `--xh-font-family`.
* Restored previous behavior of Highcharts treemap labels with regard to visibility and positioning.
* Tweaked `GridFindField` to forward a provided `ref` to its underlying `TextInput`.
* Fixed bug where `SelectEditor` with `queryFn` would not commit on enter keydown.
* Enabled deletion of larger numbers of log files via Admin Console. Requires `hoist-core >= 35`.

### ⚙️ Technical

* Removed the following previously deprecated configs as planned:
    * `AppSpec.websocketsEnabled` - enabled by default, disable via `disableWebSockets`
    * `GroupingChooserProps.popoverTitle` - use `editorTitle`
    * `RelativeTimestampProps.options` - provide directly as top-level props
* Improved the efficiency and logging of `MsalClient`.
* Improved protections against server/app version mismatches (i.e. a stale client app version cached
  and restored by the browser).
* Introduced opt-in `Grid` performance optimizations on an experimental basis with
  `GridExperimentalFlags.deltaSort` and `GridExperimentalFlags.disableScrollOptimization`

### 📚 Libraries

* @blueprintjs/core: `5.10 → 6.3`
* @blueprintjs/datetime: `5.3 → 6.0`
* react-grid-layout `1.5 → 2.1`

## 78.1.4 - 2025-12-05

### 🐞 Bug Fixes

* Fixed logging during `MsalClient` creation.

## 78.1.3 - 2025-12-04

### 🐞 Bug Fixes

* Fixed Highcharts timezone handling regression from version 77.
    * Note that Highcharts has deprecated the `time.useUTC` option and its functioning seems
      suspect - set `time.timezone` instead. See https://api.highcharts.com/highcharts/time.useUTC.

### ⚙️ Technical

* Enabled cross-tab persistence of client logging-level customizations.

## 78.1.0 - 2025-12-02

### ⚙️ Technical

* Added new property `MsalClientConfig.enableSsoSilent` to govern use of MSAL SSO API.
* Changed default for `MsalClientConfig.enableTelemetry` to `true`.
* Improved use of MSAL client API to maximize effectiveness of SSO, along with updates to docs and
  logging.
    * Note that Iframe attempts will now time out by default after 3s (vs. 10s). Customize if needed
      via `MsalClientConfig.msalClientOptions.system.iFrameHashTimeout`.

### 📚 Libraries

* @auth0/auth0-spa-js `2.7 → 2.9`
* @azure/msal-browser `4.25 → 4.26`

## 78.0.0 - 2025-11-21

### 💥 Breaking Changes (upgrade difficulty: 🎉 TRIVIAL)

See [`docs/upgrade-notes/v78-upgrade-notes.md`](docs/upgrade-notes/v78-upgrade-notes.md) for
detailed, step-by-step upgrade instructions with before/after code examples.

* `GridModel.setColumnState` no longer patches existing column state, but instead replaces it
  wholesale. Applications that were relying on the prior patching behavior will need to call
  `GridModel.applyColumnStateChanges` instead.
* `GridModel.cleanColumnState` is now private (not expected to impact applications).

### 🎁 New Features

* Added new `FieldFilter` operators `not begins` and `not ends`.
* Added new optional `BucketSpec.dependentFields` config to the Cube API, allowing apps to ensure
  proper re-bucketing of rows during data-only updates where those updates could affect bucketing
  determinations made by the spec.

### 🐞 Bug Fixes

* Fixed `GridModel` not appending children to the parents correctly when recs have numeric IDs.
* Fixed issue where newly added columns would appear in the Displayed Columns section of the column
  chooser after loading grid state that was persisted before the columns were added to the grid.
* Removed a minor Cube `Query` annoyance - `dimensions` are now automatically added to the `fields`
  list and do not need to be manually repeated there.

### ⚙️ Technical

* Improved documentation on `BucketSpec` class.
* Enhanced `FetchService` to recognize variants on the `application/json` content-type when
  processing failed responses and decoding exceptions - e.g. `application/problem+json`.

## 77.1.1 - 2025-11-12

### 💥 Breaking Changes (upgrade difficulty: 🟢 LOW)

* Upgraded Highcharts to v12.
    * Refer to Toolbox's `Bootstrap.js` for required changes to imports and chart initialization.
    * Visit https://www.highcharts.com/blog/changelog/ for additional details on the upgrade.

### 🎁 New Features

* Added `StoreRecord.getModifiedValues()` to return an object with edited field values only.

### 🐞 Bug Fixes

* Improved `StoreRecord.isModified` to not return `true` after a field has been edited but then
  returned to its original value in a subsequent edit.
* Restored support for `TabModel.content` set to `null`, to support dynamic tab content.
* Fixed an issue where stray context menus could appear when clicking on column group headers and
  other grid empty space.

## 77.0.1 - 2025-10-29

### 💥 Breaking Changes

* Removed the `disableXssProtection` flag supported by `AppSpec` and `FieldSpec` and replaced with
  its opposite, `enableXssProtection`, now an opt-in feature.
    * While store-based XSS protection via DomPurify is still available to apps that can display
      untrusted or potentially malicious data, this is an uncommon use case for Hoist apps and was
      deemed to not provide enough benefit relative to potential performance pitfalls for most
      applications. In addition, the core change to React-based AG Grid rendering has reduced the
      attack surface for such exploits relative to when this system was first implemented.
    * Apps that were previously opting-out via `disableXssProtection` should simply remove that
      flag. Apps for which this protection remains important should enable at either the app level
      or for selected Fields and/or Stores.

### 🐞 Bug Fixes

* Fixed regressions in grid context menus for filtering and copy/paste introduced by AG Grid v34.
    * Note: AG Grid v34+ no longer supports HTML markup in context menus. Applications setting the
      `text` or `secondaryText` properties of `RecordGridAction` to markup should be sure to use
      React nodes for formatting instead.
* Fixed `AgGridModel.getExpandState()` not returning a full representation of expanded groups - an
  issue that primarily affected linked tree map visualizations.

### ⚙️ Technical

* Added support for Grails 7 service name conventions in admin client (backward compatible).

## 76.2.0 - 2025-10-22

### ⚙️ Technical

* Implemented minor performance improvements within `Store` for large data sets.
* Added new `ViewRowData.cubeRowType` property to support identifying bucketed rows.
* Improved `waitFor` to accept a `null` value for its timeout.

## 76.1.0 - 2025-10-17

### 🎁 New Features

* Added a public `@bindable titleDetails` config to `DashViewModel` to support displaying additional
  information in the title bar of dashboard widgets. The new property is not persisted, allowing
  apps to programmatically show dynamic info in a widget header without perturbing its saved state.
* Enhanced grid column filtering to support sorting the list of available values.

### ⚙️ Technical

* Autofocus the user input when the impersonation bar is shown.

### 📚 Libraries

* @auth0/auth0-spa-js `2.4 → 2.7`
* @azure/msal-browser `4.23 → 4.25`
* dompurify `3.2 → 3.3`
* mobx `6.13 → 6.15`

## 76.0.0 - 2025-09-26

### 💥 Breaking Changes (upgrade difficulty: 🟠 MEDIUM - AG Grid update, Hoist React upgrade)

* Hoist v76 **upgrades AG Grid to v34** (from v31), covering three major AG Grid releases with their
  own potentially breaking changes.
    * Fortunately, internal Hoist updates to our managed API wrappers mean that most apps will see
      very minimal changes, although there are required adjustments to app-level `package.json` to
      install updated grid dependencies and `Bootstrap.ts` to import and register your licensed grid
      modules at their new import paths.
    * Applications implementing `groupRowRenderer` should note that the `value` property passed to
      this function is no longer stringified, but is instead the raw field value for the group.
    * See AG's upgrade guides for more details:
        * [Upgrade to v32](https://www.ag-grid.com/react-data-grid/upgrading-to-ag-grid-32/)
        * [Upgrade to v33](https://www.ag-grid.com/react-data-grid/upgrading-to-ag-grid-33/)
        * [Upgrade to v34](https://www.ag-grid.com/react-data-grid/upgrading-to-ag-grid-34/)
* Modified the `TabModel` constructor to take its owning container as a second argument.
    * Apps very rarely create `TabModels` directly, so this unlikely to require changes.
* Moved the `Exception` class and `HoistException` type from `@xh\hoist\core` to a new lower-level
  package `@xh\hoist\exception` to reduce the risk of circular dependencies within Hoist.
    * Apps rarely interact with these directly, so also unlikely to require changes.

### 🎁 New Features

* Added `extraConfirmText` + `extraConfirmLabel` configs to `MessageOptions`. Use these new options
  to require the specified text to be re-typed by a user when confirming a potentially destructive
  or disruptive action. Note their usage within Hoist's Admin Console when deleting a role.
* Updated grid column filters to apply on `Enter` / dismiss on `Esc`. Tweaked the filter popup
  toolbar for clarity.
* Added new ability to specify nested tab containers in a single declarative config. Apps may now
  provide a spec for a nested tab container directly to the `TabConfig.content` property.
* Improved `ViewManager` features:
    * Enabled globally sharing a new view directly from the 'Save/Save As' dialog.
    * Simplified presentation and management of view visibility via new "Visibility" control.
    * Removed support for the `isDefaultPinned` attribute on global views. All global views will be
      pinned (i.e. show up in user menus) by default. Users can still explicitly "unpin" any global
      views to remove them from their menus.
* Added a `validEmails` constraint rule to validate one or more email addresses in an input field.
* Added `DashCanvas.rglOptions` prop - passed through to the underlying `react-grid-layout`.
* Promoted experimental grid feature `enableFullWidthScroll` to a first-class `GridModel` config.
  Set to true to ensure that the grid will have a single horizontal scrollbar spanning the width of
  all columns, including any pinned columns.

### 🐞 Bug Fixes

* Handled an edge-case `ViewManager` bug where `enableDefault` changed to `false` after some user
  state had already been persisted w/users pointed at in-code default view. The manager now calls
  its configured `initialViewSpec` function as expected in this case.
* Updated `XH.restoreDefaultsAsync` to clear basic view state, including the user's last selected
  view. Views themselves will be preserved. Requires `hoist-core >= 32.0`.
* Fixed bug where `GridModel.persistableColumnState` was not including default column `widths`. This
  led to columns not being set to their expected widths when switching `ViewManager` views.
* Fixed bug where a `Grid` with managed autosizing was not triggering an autosize as expected when
  new column state was loaded (e.g. via `ViewManager`).

### ⚙️ Technical

* Added a new `@sharePendingPromise` decorator for returning a shared Promise across concurrent
  async calls. Calls made to a decorated method while a prior call with the same args is still
  pending won't kick off a new call, but will instead receive the same Promise as the first call.
* Added `XH.logLevel` to define a minimum logging severity threshold for Hoist's client-side logging
  utilities. Defaulted to 'info' to prevent possible memory and performance impacts of verbose
  logging on 'debug'. Change at runtime via new `XH.setLogLevel()` when troubleshooting. See
  `LogUtils.ts` for more info.
* Added control to trigger browser GC from app footer. Useful for troubleshooting memory issues.
  Requires running chromium-based browser via e.g. `start chrome --js-flags="--expose-gc`.

### ⚙️ Typescript API Adjustments

* Corrected `ColChooserConfig.width` and `height` types.

### 📚 Libraries

* @auth0/auth0-spa-js `2.3 → 2.4`
* @azure/msal-browser `4.16 → 4.23`
* typescript `5.8 → 5.9`

## 75.0.1 - 2025-08-11

### 🎁 New Features

* Added new `GridModel.expandLevel` config to control the expansion state of tree/grouped grids.
    * Replaces the use of the `agOptions.groupDefaultExpanded` on the component.
    * The most recently expanded level is persistable with other grid state.
    * The default grid context menu now supports a new item to allow users to expand/collapse out to
      a specific level/depth. Set `GridModel.levelLabels` to activate this feature.
    * A new `ExpandToLevelButton` menu component is also available for both desktop and mobile.
      Provides easier discoverability on desktop and supports this feature on mobile, where we don't
      have context menus.
* Enhanced `FilterChooser` to better handle filters with different `op`s on the same field.
    * Multiple "inclusive" ops (e.g. `=`, `like`) will be OR'ed together.
    * Multiple "exclusive" ops (e.g. `!=`, `not like`) will be AND'ed together.
    * Range ops (e.g. `<`, `>` ) use a heuristic to avoid creating a filter that could never match.
    * This behavior is consistent with current behavior and user intuition and should maximize the
      ability to create useful queries using this component.
* Deprecated the `RelativeTimestamp.options` prop - all the same options are now top-level props.
* Added new `GroupingChooserModel.sortDimensions` config. Set to `false` to respect the order in
  which `dimensions` are provided to the model.
* Added new `ClipboardButton.errorMessage` prop to customize or suppress a toast alert if the copy
  operation fails. Set to `false` to fail silently (the behavior prior to this change).
* Added new `Cube.modifyRecordsAsync` for modifying individual field values in a local uncommitted
  state. Additionally enhanced `Store.modifyRecords` to return a `StoreChangeLog` of updates.
* Cube Views now emit data objects of type `ViewRowData`, rather than an anonymous `PlainObject`.
  This new object supports several documented properties, including a useful `cubeLeaves` property,
  which can be activated via the `Query.provideLeaves` property.

### 🐞 Bug Fixes

* Fixed bugs where `Store.modifyRecords`, `Store.revertRecords` and `Store.revert` were not properly
  handling changes to `SummaryRecords`.
* Fixed minor `DashCanvas` issues with `allowAdd: false`, ensuring it does not block additions made
  via `loadState()` and hiding the `Add` context menu item in views as intended.
* Updated `DashCanvas` CSS to set `position: relative;`, ensuring that the empty state overlay is
  positioned as intended and does not extend beyond the canvas.
* Improved the core `useContextModel` hook to make it reactive to a change of an (observable)
  resolved model. Previously this value was cached on first render.
* Fixed framework components that bind to grids (e.g. `ColChooserButton`, `ColAutosizeButton`,
  `GridFindField`), ensuring they automatically rebind to a new observable `GridModel` via context.

### ⚙️ Technical

* WebSockets are now enabled by default for client apps, as they have been on the server since Hoist
  Core v20.2. Maintaining a WebSocket connection back to the Hoist server enables useful Admin
  Console functionality and is recommended, but clients that must disable WebSockets can do so via
  `AppSpec.disableWebSockets`. Note `AppSpec.webSocketsEnabled` is deprecated and can be removed.
* Hoist now sets a reference to an app's singleton `AuthModel` on a static `instance` property of
  the app-specified class. App developers can declare a typed static `instance` property on their
  model class and use it to access the singleton with its proper type, vs. `XH.authModel`.
    * The `XH.authModel` property is still set and available - this is a non-breaking change.
    * This approach was already (and continues to be) used for services and the `AppModel`
      singleton.

### 💥 Breaking Changes (upgrade difficulty: 🟢 LOW - removing deprecations)

* Removed deprecated `LoadSupport.isLoadSupport`
* Removed deprecated `FileChooserModel.removeAllFiles`
* Removed deprecated `FetchService.setDefaultHeaders`
* Removed deprecated `FetchService.setDefaultTimeout`
* Removed deprecated `IdentityService.logoutAsync`
* Change to the row objects returned by `View`: the undocumented `_meta` and `buckets` properties
  have been removed. Use the documented properties on the new `ViewRowData` class instead.

### ✨ Styles

* Upgraded the version of Hoist's default Inter UI font to a new major version, now v4.1. Note that
  this brings slight differences to the font's appearance, including tweaks to internal spacing and
  letterforms for tabular numbers. The name of the font face has also changed, from
  `Inter Var` to `InterVariable`. The default value of the `--xh-font-family` CSS variable has been
  updated to match, making this change transparent for most applications.

### 📚 Libraries

* @auth0/auth0-spa-js `2.1 → 2.3`
* @azure/msal-browser `4.12 → 4.16`
* filesize `6.4 → 11.0`
* inter-ui `3.19 → 4.1`
* mobx-react-lite `4.0 → 4.1`
* qs `6.13 → 6.14`
* react-markdown `9.0 → 10.1`
* regenerator-runtime `0.13 → 0.14`
* semver `7.6 → 7.7`
* short-unique-id `5.2 → 5.3`
* ua-parser-js `1.0 → 2.0`

## 74.1.2 - 2025-07-03

### 🐞 Bug Fixes

* Fixed `GroupingChooser` layout issue, visible only when favorites are disabled.

## 74.1.1 - 2025-07-02

### 🎁 New Features

* Further refinements to the `GroupingChooser` desktop UI.
    * Added new props `favoritesSide` and `favoritesTitle`.
    * Deprecated `popoverTitle` prop - use `editorTitle` instead.
    * Moved "Save as Favorite" button to a new compact toolbar within the popover.

### 🐞 Bug Fixes

* Fixed a bug where `TrackService` was not properly verifying that tracked `data` was below the
  configured `maxDataLength` limit.

## 74.1.0 - 2025-06-30

### 🎁 New Features

* Updated the `GroupingChooser` UI to use a single popover for both updating the value and
  selecting/managing favorite groupings (if enabled).
    * Adjusted `GroupingChooserModel` API and some CSS class names and testIds of `GroupingChooser`
      internals, although those changes are very unlikely to require app-level adjustments.
    * Adjusted/removed (rarely used) desktop and mobile `GroupingChooser` props related to popover
      sizing and titling.
    * Updated the mobile UI to use a full-screen dialog, similar to `ColumnChooser`.
* Added props to `ViewManager` to customize icons used for different types of views, and modified
  default icons for Global and Shared views.
* Added `ViewManager.extraMenuItems` prop to allow insertion of custom, app-specific items into the
  component's standard menu.

## 74.0.0 - 2025-06-11

### 💥 Breaking Changes (upgrade difficulty: 🟢 LOW - minor changes to ViewManagerModel, ChartModel)

See [`docs/upgrade-notes/v74-upgrade-notes.md`](docs/upgrade-notes/v74-upgrade-notes.md) for
detailed, step-by-step upgrade instructions with before/after code examples.

* Removed `ViewManagerModel.settleTime`. Now set via individual `PersistOptions.settleTime` instead.
* ️Removed `ChartModel.showContextMenu`. Use a setting of `false` for the new
  `ChartModel.contextMenu` property instead.

### 🎁 New Features

* Added `ViewManagerModel.preserveUnsavedChanges` flag to opt-out of that behaviour.
* Added `PersistOptions.settleTime` to configure time to wait for state to settle before persisting.
* Support for grid column level `onCellClicked` events.
* General improvements to `MenuItem` api
    * New `MenuContext` object now sent as 2nd arg to `actionFn` and `prepareFn`.
    * New `ChartModel.contextMenu` property provides a fully customizable context menu for charts.

### 🐞 Bug Fixes

* Improved `ViewManagerModel.settleTime` by delegating to individual `PersistenceProviders`.
* Fixed bug where grid column state could become unintentionally dirty when columns were hidden.
* Improved `WebsocketService` heartbeat detection to auto-reconnect when the socket reports as open
  and heartbeats can be sent, but no heartbeat acknowledgements are being received from the server.
* Restored zoom out with mouse right-to-left drag on Charts.

## 73.0.1 - 2025-05-19

### 🐞 Bug Fixes

* Fixed a minor issue with Admin Console Role Management.

## 73.0.0 - 2025-05-16

### 💥 Breaking Changes (upgrade difficulty: 🟢 LOW - upgrade to Hoist Core)

See [`docs/upgrade-notes/v73-upgrade-notes.md`](docs/upgrade-notes/v73-upgrade-notes.md) for
detailed, step-by-step upgrade instructions with before/after code examples.

* Requires `hoist-core >= 31` with new APIs to support the consolidated Admin Console "Clients"
  tab and new properties on `TrackLog`.
* Apps with a custom `AppModel` for their admin app that extends `@xh/hoist/admin/AppModel` must
  ensure they call `super.initAsync()` within their override of that lifecycle method, if
  applicable. This did not previously have any effect, but is required now for the superclass to
  initialize a new `ViewManagerModel`.
    * [Here is where Toolbox makes that call](https://github.com/xh/toolbox/blob/f15a8018ce36c2ae998b45724b48a16320b88e49/client-app/src/admin/AppModel.ts#L12).
* Requires call to `makeObservable(this)` in model constructors with `@bindable`. Note that there is
  a new dev-only runtime check on `HoistBase` to warn if this call has not been made.

### 🎁 New Features

* Updated and improved Grid column based filtering to better match the behavior of Excel.
    * `GridFilterModel.commitOnChage` now `false` by default
    * Added ability to append terms to active filter *only* when `commitOnChage:false`
* Added new `PopoverFilterChooser` component - wraps `FilterChooser` in a `Popover` to allow it to
  expand vertically when used in a `Toolbar` or other space-constrained, single-line layout.
* Enhanced OAuth clients with a new `reloginEnabled` config. Set to true to allow the client to do a
  potentially interactive popup login mid-session to re-establish auth if its refresh token has
  expired or been invalidated. Strongly recommended for all OAuth usages.
* Significantly upgraded the Admin Console "User Activity" tab:
    * Consolidated client error reports and user feedback into Activity Tracking.
    * Added support for custom views via `ViewManager`.
    * New ability to promote data in `data` block to grids for aggregation, reporting and charting.
    * Enhanced track messages with new `tabId` and `loadId` properties, to disambiguate activity for
      users across multiple browser tabs + loads of the app.
* Added a new Admin Console "Clients" tab - a consolidated view of all websocket-connected clients
  across all instances in the cluster, with integrated activity detail viewer.
* Updated `FormModel` to support `persistWith` for storing and recalling its values, including
  developer options to persist only a subset of fields.
* Added new `XH.openWindow()` util to ensure that new windows/tabs are opened without an unintended
  `opener` relationship with the original window.

### 🐞 Bug Fixes

* Fixed drag-and-drop usability issues with the mobile `ColChooser`.
* Made `GridModel.defaultGroupSortFn` null-safe and improved type signature.
* Disabled `dashCanvasAddViewButton` if there are no `menuItems` to show.
* Hardened `@bindable` and `@persist` to handle lifecycle-related bugs. Note that previously
  `@bindable` would work even if `makeObservable()` was not called, but this is no longer the case.
  Please ensure you call `makeObservable(this)` in your model's constructor when using `@bindable`!
* Improved client `WebSocketService` heartbeat to check that it has been receiving inbound messages
  from the server, not just successfully sending outbound heartbeats.

### ⚙️ Technical

* Updated the background version checking performed by `EnvironmentService` to use the app version
  and build information baked into the client build when comparing against the latest values from
  the server. Previously the versions loaded from the server on init were used as the baseline.
    * The two versions *should* be the same, but in cases where a browser "restores" a tab and
      re-inits an app without reloading the code itself, the upgrade check would miss the fact that
      the client remained on an older version.
    * ⚠️ NOTE that a misconfigured build - where the client version is not set to the same value as
      the server - would result in a false positive for an upgrade. The two should always match.
* Calls to `Promise.track()` that are rejected with an exception will be tracked with new severity
  level of `TrackSeverity.ERROR`.

### ⚙️ Typescript API Adjustments

* Corrected `GridGroupSortFn` param types.
* Corrected `StoreCountLabelProps` interface.
* Corrected `textAlign` type across several `HoistInput` prop interfaces.

### 📚 Libraries

* @azure/msal-browser `4.8 → 4.12`

Note that all of the below are `devDependencies`, so they will not directly affect your application
build. That said, we *strongly* recommend taking these same changes into your app if you can.

* @xh/hoist-dev-utils `10.x → 11.x`
* eslint `8.x → 9.x`
    * Apps making this update must also rename their `.eslintrc` file to `eslint.config.js`. See the
      configuration found in Toolbox's `eslint.config.js` as your new baseline.
* eslint-config-prettier `9.x → 10.x`
* typescript `5.1 → 5.8`

## 72.5.1 - 2025-04-15

### 🐞 Bug Fixes

* Allow the display of very long log lines in Admin log viewer.

## 72.5.0 - 2025-04-14

### 🎁 New Features

* Added option from the Admin Console > Websockets tab to request a client health report from any
  connected clients.
* Enabled telemetry reporting from `WebSocketService`.
* Updated `MenuItem.actionFn()` to receive the click event as an additional argument.
* Support for reporting App Build, Tab Id, and Load Id in websocket admin page.

## 72.4.0 - 2025-04-09

### 🎁 New Features

* Added new methods for formatting timestamps within JSON objects. See `withFormattedTimestamps`
  and `timestampReplacer` in the `@xh/hoist/format` package.
* Added new `ViewManagerConfig.viewMenuItemFn` option to support custom rendering of pinned views in
  the drop-down menu.

### ⚙️ Technical

* Added dedicated `ClientHealthService` for managing client health report. Additional enhancements
  to health report to include information about web sockets, idle time, and page state.

## 72.3.0 - 2025-04-08

### 🎁 New Features

* Added support for posting a "Client Health Report" track message on a configurable interval. This
  message will include basic client information, and can be extended to include any other desired
  data via `XH.clientHealthService.addSource()`. Enable by updating your app's
  `xhActivityTrackingConfig` to include `clientHealthReport: {intervalMins: XXXX}`.
* Enabled opt-in support for telemetry in `MsalClient`, leveraging hooks built-in to MSAL to collect
  timing and success/failure count for all events emitted by the library.
* Added the reported client app version as a column in the Admin Console WebSockets tab.

### 🐞 Bug Fixes

* Improved fetch request tracking to include time spent loading headers as specified by application.

### 📚 Libraries

* @azure/msal-browser `3.28 → 4.8`

## 72.2.0 - 2025-03-13

### 🎁 New Features

* Modified `TabContainerModel` to make more methods `protected`, improving extensibility for
  advanced use-cases.
* Enhanced `XH.reloadApp` with new argument to clear query parameters before loading.
* Enhanced exception handling in `FetchService` to capture messages returned as raw strings, or
  without explicit names.
* Added dedicated columns to the Admin Console "Client Errors" tab for error names and messages.
* `BaseOAuthClient` has been enhanced to allow `lazy` loading of Access Tokens, and also made more
  robust such that Access Tokens that fail to load will never prevent the client from
  initialization.

### 🐞 Bug Fixes

* Prevented native browser context menu from showing on `DashCanvas` surfaces and obscuring the
  `DashCanvas` custom context menu.

## 72.1.0 - 2025-02-13

### 🎁 New Features

* Introduced a new "JSON Search" feature to the Hoist Admin Console, accessible from the Config,
  User Preference, and JSON Blob tabs. Supports searching JSON values stored within these objects to
  filter and match data using JSON Path expressions.
    * ⚠️Requires `hoist-core >= 28.1` with new APIs for this (optional) feature to function.
* Added new getters `StoreRecord.isDirty`, `Store.dirtyRecords`, and `Store.isDirty` to provide a
  more consistent API in the data package. The pre-existing `isModified` getters are retained as
  aliases, with the same semantics.

### 🐞 Bug Fixes

* Tuned mobile swipe handling to prevent horizontal swipes on a scrolling grid view from triggering
  the Navigator's back gesture.
* Prevented the Admin Console Roles grid from losing its expand/collapse/scroll state on refresh.
* Fixed bug when merging `PersistOptions` with conflicting implicit provider types.
* Fixed bug where explicit `persistGrouping` options were not being respected by `GridModel`.

## 72.0.0 - 2025-01-27

### 💥 Breaking Changes (upgrade difficulty: 🟢 TRIVIAL - minor changes to mobile nav)

* Mobile `Navigator` no longer supports `animation` prop, and `NavigatorModel` no longer supports
  `swipeToGoBack`. Both of these properties are now managed internally by the `Navigator` component.

### 🎁 New Features

* Mobile `Navigator` has been rebuilt to support smooth swipe-based navigation. The API remains
  largely the same, notwithstanding the minor breaking changes detailed above.

### 🐞 Bug Fixes

* Fixed `ViewManagerModel` unique name validation.
* Fixed `GridModel.restoreDefaultsAsync()` to restore any default filter, rather than simply
  clearing it.
* Improved suboptimal column state synchronization between `GridModel` and AG Grid.

### ⚙️ Technical

* Added support for providing custom `PersistenceProvider` implementations to `PersistOptions`.

### ⚙️ Typescript API Adjustments

* Improved signature of `HoistBase.markPersist`.

## 71.0.0 - 2025-01-08

### 💥 Breaking Changes (upgrade difficulty: 🟠 MEDIUM - Hoist core update, import adjustments)

* Requires `hoist-core >= 27.0` with new APIs to support `ViewManager` and enhanced cluster state
  monitoring in the Admin Console.
* `ErrorMessage` is now cross-platform - update imports from `@xh/hoist/desktop/cmp/error`
  or `@xh/hoist/mobile/cmp/error` to `@xh/hoist/cmp/error`.
* `Mask` is now cross-platform - update imports from `@xh/hoist/desktop/cmp/mask` or
  `@xh/hoist/mobile/cmp/mask` to `@xh/hoist/cmp/mask`.
* `LoadingIndicator` is now cross-platform - update imports from
  `@xh/hoist/desktop/cmp/loadingindicator` or `@xh/hoist/mobile/cmp/loadingindicator` to
  `@xh/hoist/cmp/loadingindicator`.
* `TreeMap` and `SplitTreeMap` are now cross-platform and can be used in mobile applications. Update
  imports from `@xh/hoist/desktop/cmp/treemap` to `@xh/hoist/cmp/treemap`.
* Renamed `RefreshButton.model` prop to `target` for clarity and consistency.

### 🎁 New Features

* Major improvements to the `ViewManager` component, including:
    * A clearer, better organized management dialog.
    * Support for persisting a view's pending value, to avoid users losing changes when e.g. an app
      goes into idle mode and requires a page refresh to restore.
    * Improved handling of delete / update collisions.
    * New `ViewManagerModel.settleTime` config, to allow persisted components such as dashboards to
      fully resolve their rendered state before capturing a baseline for dirty checks.
* Added `SessionStorageService` and associated persistence provider to support saving tab-local data
  across reloads. Exact analog to `LocalStorageService`, but scoped to lifetime of current tab.
* Added `AuthZeroClientConfig.audience` config to support improved flow for Auth0 OAuth clients that
  request access tokens. Specify your access token audience here to allow the client to fetch both
  ID and access tokens in a single request and to use refresh tokens to maintain access without
  relying on third-party cookies.
* Updated sorting on grouped grids to place ungrouped items at the bottom.
* Improved `DashCanvas` views to support resizing from left/top edges in addition to right/bottom.
* Added functional form of `FetchService.autoGenCorrelationIds` for per-request behavior.
* Added a new `Cluster›Objects` tab in Admin Console to support comparing state across the cluster
  and alerting of any persistent state inconsistencies.

### 🐞 Bug Fixes

* Fixed sizing and position of mobile `TabContainer` switcher, particularly when the switcher is
  positioned with `top` orientation.
* Fixed styling of `ButtonGroup` in vertical orientations.
* Improved handling of calls to `DashContainerModel.loadStateAsync()` when the component has yet to
  be rendered. Requested state updates are no longer dropped, and will be applied as soon as the
  component is ready to do so.

### ⚙️ Technical

* Added explicit `devDependencies` and `resolutions` blocks for `@types/react[-dom]` at v18.x.
* Added workaround for problematic use of SASS-syntax-in-CSS shipped by `react-dates`. This began
  throwing "This function isn't allowed in plain CSS" with latest version of sass/sass-loader.

### ⚙️ Typescript API Adjustments

* Improved accuracy of `IconProps` interface, with use of the `IconName` and `IconPrefix` types
  provided by FontAwesome.
* Improved accuracy of `PersistOptions.type` enum.
* Corrected the type of `ColumnSpec.editor`.

### 📚 Libraries

* @azure/msal-browser `3.27 → 3.28`
* dompurify `3.1 → 3.2`
* react-grid-layout `1.4 → 1.5`

## 70.0.0 - 2024-11-15

### 💥 Breaking Changes (upgrade difficulty: 🟢 LOW - changes to advanced persistence APIs)

* Upgraded the `PersistenceProvider` API as noted in `New Features`. Could require updates in apps
  with advanced direct usages of this API (uncommon).
* Updated `GridModel` persistence to omit the widths of autosized columns from its persisted state.
  This helps to keep persisted state more stable, avoiding spurious diffs due to autosize updates.
  Note this can result in more visible column resizing for large grids without in-code default
  widths. Please let XH know if this is a noticeable annoyance for your app.
* Removed the following persistence-related model classes, properties, and methods:
    * `GridPersistenceModel` and `ZoneGridPersistenceModel`
    * `GridModel|ZoneGridModel.persistenceModel`
    * `GridModel.autosizeState`
    * `Column.manuallySized`
    * `GroupingChooserModel|FilterChooserModel.persistValue`
    * `DashModel|GroupingChooserModel|FilterChooserModel|PanelModel|TabContainerModel.provider`
    * `PersistenceProvider.clearRaw()`
* Renamed `ZoneGridModelPersistOptions.persistMappings`, adding the trailing `s` for consistency.
* Changed signature of `JsonBlobService.listAsync()` to inline `loadSpec` with all other args in a
  single options object.
* Changed signature of `waitFor()` to take its optional `interval` and `timeout` arguments in a
  single options object.

### 🎁 New Features

* Introduced a new `ViewManager` component and backing model to support user-driven management of
  persisted component state - e.g. saved grid views.
    * Bundled with a desktop-only menu button based component, but designed to be extensible.
    * Bindable to any persistable component with `persistWith: {viewManagerModel: myViewManager}`.
    * Detects changes to any bound components and syncs them back to saved views, with support for
      an autosave option or user-driven saving with a clear "dirty" indicator.
    * Saves persisted state back to the server using Hoist Core `JSONBlob`s for storage.
    * Includes a simple sharing model - if enabled for all or some users, allows those users to
      publish saved views to everyone else in the application.
    * Users can rename views, nest them into folders, and mark them as favorites for quick access.
* Generally enhanced Hoist's persistence-related APIs:
    * Added new `Persistable` interface to formalize the contract for objects that can be persisted.
    * `PersistenceProvider` now targets a `Persistable` and is responsible for setting persisted
      state on its bound `Persistable` when the provider is constructed and persisting state from
      its bound `Persistable` when changes are detected.
    * In its constructor, `PersistenceProvider` also stores the initial state of its bound
      `Persistable` and clears its persisted state when structurally equal to the initial state.
* Updated persistable components to support specifying distinct `PersistOptions` for individual bits
  of persisted state. E.g. you can now configure a `GroupingChooserModel` used within a dashboard
  widget to persist its value to that particular widget's `DashViewModel` while saving the user's
  favorites to a global preference.

### ⚙️ Typescript API Adjustments

* Tightened `FilterChooserFilterLike` union type to remove the generic `Filter` type, as filter
  chooser supports only `FieldFilter` and `CompoundFilter`.
* Improved `HoistBase.markPersist()` signature to ensure the provided property name is a known key
  of the model.
* Expanded the `JsonBlob` interface to include additional properties present on all blobs.
* Corrected `DashViewSpec.title` to be optional - it can be defaulted from the `id`.
* Corrected the return type for `SelectProps.loadingMessageFn` and `noOptionsMessageFn` to return
  `ReactNode` vs `string`. The component supports rendering richer content via these options.

## 69.1.0 - 2024-11-07

### 🐞 Bug Fixes

* Updated minimum required version of FontAwesome to 6.6, as required by the `fileXml()` icon added
  in the prior Hoist release. The previous spec for FA dependencies allowed apps to upgrade to 6.6,
  but did not enforce it, which could result in a build error due to an unresolved import.

### ⚙️ Technical

* Deprecated `FileChooserModel.removeAllFiles()`, replaced with `clear()` for brevity/consistency.
* Improved timeout error message thrown by `FetchService` to format the timeout interval in seconds
  where possible.

### 📚 Libraries

* @azure/msal-browser `3.23 → 3.27`
* @fortawesome/fontawesome-pro `6.2 → 6.6`
* qs `6.12 → 6.13`
* store2 `2.13 → 2.14`

## 69.0.0 - 2024-10-17

### 💥 Breaking Changes (upgrade difficulty: 🟢 LOW - Hoist core update)

* Requires `hoist-core >= 24` to support batch upload of activity tracking logs to server and new
  memory monitoring persistence.
* Replaced `AppState.INITIALIZING` with finer-grained states (not expected to impact most apps).

### 🎁 New Features

* Optimized activity tracking to batch its calls to the server, reducing network overhead.
* Enhanced data posted with the built-in "Loaded App" entry to include a new `timings` block that
  breaks down the overall initial load time into more discrete phases.
* Added an optional refresh button to `RestGrid`s toolbar.
* Updated the nested search input within Grid column filters to match candidate values on `any` vs
  `startsWith`. (Note that this does not change how grid filters are applied, only how users can
  search for values to select/deselect.)
* Support for persisting of memory monitoring results

### ⚙️ Typescript API Adjustments

* Improved typing of `HoistBase.addReaction` to flow types returned by the `track` closure through
  to the `run` closure that receives them.
    * Note that apps might need to adjust their reaction signatures slightly to accommodate the more
      accurate typing, specifically if they are tracking an array of values, destructuring those
      values in their `run` closure, and passing them on to typed APIs. Look out for `tsc` warnings.

### ✨ Styles

* Reset the `--xh-popup-bg` background color to match the primary `--xh-bg` color by default.

### 🐞 Bug Fixes

* Fixed broken `Panel` resizing in Safari. (Other browsers were not affected.)

## 68.1.0 - 2024-09-27

### 🎁 New Features

* `Markdown` now supports a `reactMarkdownOptions` prop to allow passing React Markdown props to the
  underlying `reactMarkdown` instance.

### ⚙️ Technical

* Misc. Improvements to Cluster Tab in Admin Panel.

## 68.0.0 - 2024-09-18

### 💥 Breaking Changes (upgrade difficulty: 🟢 LOW - Hoist Core update)

* Requires `hoist-core >= 22.0` for consolidated polling of Alert Banner updates (see below).

### 🎁 New Features

* Added expand/collapse affordance in the left column header of ZoneGrids in tree mode.

### ⚙️ Technical

* Updated Admin Console's Cluster tab to refresh more frequently.
* Consolidated the polling check for Alert Banner updates into existing `EnvironmentService`
  polling, avoiding an extra request and improving alert banner responsiveness.

### ⚙️ Typescript API Adjustments

* Corrected types of enhanced `Promise` methods.

### 📚 Libraries

* @azure/msal-browser `3.17 → 3.23`
* mobx  `6.9 → 6.13`,
* mobx-react-lite  `3.4 → 4.0`,

## 67.0.0 - 2024-09-03

### 💥 Breaking Changes (upgrade difficulty: 🟢 LOW - Hoist Core update)

* Requires `hoist-core >= 21.0`.

### 🎁 New Features

* Added support for Correlation IDs across fetch requests and error / activity tracking:
    * New `FetchService` members: `autoGenCorrelationIds`, `genCorrelationId` and
      `correlationIdHeaderKey` to support generation and inclusion of Correlation IDs on outbound
      request headers.
    * Correlation IDs are assigned via:
        * `FetchOptions.correlationId` - specify an ID to be used on a particular request or `true`
          to use a UUID generated by Hoist (see `FetchService.genCorrelationId()`).
        * `TrackOptions.correlationId` - specify an ID for a tracked activity, if not using the new
          `FetchOptions.track` API (see below).
    * If set on a fetch request, Correlation IDs are passed through to downstream error reporting
      and are available for review in the Admin Console.
* Added `FetchOptions.track` as streamlined syntax to track a request via Hoist activity tracking.
  Prefer this option (vs. a chained `.track()` call) to relay the request's `correlationId` and
  `loadSpec` automatically.
* Added `FetchOptions.asJson` to instruct `FetchService` to decode an HTTP response as JSON. Note
  that `FetchService` methods suffixed with `Json` will set this property automatically.
* Added global interceptors on `FetchService`. See `FetchService.addInterceptor()`.
* `GridModel` will now accept `contextMenu: false` to omit context menus.
* Added bindable `AppContainerModel.intializingLoadMaskMessage` to allow apps to customize the load
  mask message shown during app initialization.
* Enhanced `select` component with new `emptyValue` prop, allowing for a custom value to be returned
  when the control is empty (vs `null`). Expected usage is `[]` when `enableMulti:true`.
* Added `GroupingChooserModel.setDimensions()` API, to support updating available dimensions on an
  already constructed `GroupingChooserModel`.

### 🐞 Bug Fixes

* Fixed Admin Console bug where a role with a dot in its name could not be deleted.
* Fixed inline `SelectEditor` to ensure new value is flushed before grid editing stops.
* `WebSocketService` now attempts to establish a new connection when app's server instance changes.

### ✨ Styles

* Added CSS variables to support customization of `Badge` component styling.

### 📚 Libraries

* short-unique-id `added @ 5.2`

## 66.1.1 - 2024-08-01

### 🐞 Bug Fixes

* `HoistException` now correctly passes an exception message to its underlying `Error` instance.
* Fixed `GridModel.cellBorders` to apply top and bottom cell borders, as expected.
* Fix to new `mergeDeep` method.

## 66.1.0 - 2024-07-31

### 🎁 New Features

* Enhanced `markdown` component to support the underlying `components` prop from `react-markdown`.
  Use this prop to customize markdown rendering.
* New `mergeDeep` method provided in `@xh/hoist/utils/js` as an alternative to `lodash.merge`,
  without lodash's surprising deep-merging of array-based properties.
* Enhanced Roles Admin UI to support bulk category reassignment.
* Enhanced the number formatters' `zeroPad` option to take an integer in addition to true/false, for
  finer-grained control over padding length.

### 🐞 Bug Fixes

* Fixed `Record.descendants` and `Record.allDescendants` getters that were incorrectly returning the
  parent record itself. Now only the descendants are returned, as expected.
    * ⚠️ Note that apps relying on the previous behavior will need to adjust to account for the
      parent record no longer being included. (Tree grids with custom parent/child checkbox
      selection are one example of a component that might be affected by this change.)
* Fixed `Grid` regression where pinned columns were automatically un-pinned when the viewport became
  too small to accommodate them.
* Fixed bug where `Grid` context-menus would lose focus when rendered inside `Overlay` components.

### ⚙️ Typescript API Adjustments

* ⚠️ Please ensure you update your app to `hoist-dev-utils >= v9.0.1` - this ensures you have a
  recent version of `type-fest` as a dev dependency, required to compile some recent Hoist
  typescript changes.
* The `NumberFormatOptions.precision` arg has been more strictly typed to `Precision`, a new type
  exported from `@xh/hoist/format`. (It was previously `number`.) Apps might require minor
  adjustments - e.g. typing shared format configs as `NumberFormatOptions` to satisfy the compiler.

### ⚙️ Technical

* Enhanced beta `MsalClient` and `AuthZeroClient` OAuth implementations to support passing
  app-specific configs directly into the constructors of their underlying client implementation.

## 66.0.2 - 2024-07-17

### 🐞 Bug Fixes

* Improved redirect handling within beta `MsalClient` to use Hoist-provided blank URL (an empty,
  static page) for all iFrame-based "silent" token requests, as per MS recommendations. Intended to
  avoid potential race conditions triggered by redirecting to the base app URL in these cases.
* Fixed bug where `ContextMenu` items could be improperly positioned.
    * ⚠️ Note that `MenuItems` inside a desktop `ContextMenu` are now rendered in a portal, outside
      the normal component hierarchy, to ensures that menu items are positioned properly relative to
      their parent. It should not affect most apps, but could impact menu style customizations that
      rely on specific CSS selectors targeting the previous DOM structure.

## 66.0.1 - 2024-07-10

### 🐞 Bug Fixes

* Fixed bug where inline grid edit of `NumberInput` was lost after quick navigation.

## 66.0.0 - 2024-07-09

### 💥 Breaking Changes (upgrade difficulty: 🟢 LOW - minor adjustments to client-side auth)

* New `HoistAuthModel` exposes the client-side authentication lifecycle via a newly consolidated,
  overridable API. This new API provides more easy customization of auth across all client-side apps
  by being easily overrideable and specified via the `AppSpec` passed to `XH.renderApp()`.
    * In most cases, upgrading should be a simple matter of moving code from `HoistAppModel` methods
      `preAuthInitAsync()` and `logoutAsync()` (removed by this change) to new `HoistAuthModel`
      methods `completeAuthAsync()` and `logoutAsync()`.

### 🎁 New Features

* Added option to `XH.reloadApp()` to reload specific app path.
* Added `headerTooltip` prop to `ColumnGroup`.

### 🐞 Bug Fixes

* Updated `.xh-viewport` sizing styles and mobile `dialog` sizing to use `dvw/dvh` instead of prior
  `svw/svh` - resolves edge case mobile issue where redirects back from an OAuth flow could leave an
  unexpected gap across the bottom of the screen. Includes fallback for secure client browsers that
  don't support dynamic viewport units.
* Updated mobile `TabContainer` to flex properly within flexbox containers.
* Fixed timing issue with missing validation for records added immediately to a new `Store`.
* Fixed CSS bug in which date picker dates wrapped when `dateEditor` used in a grid in a dialog.

## 65.0.0 - 2024-06-26

### 💥 Breaking Changes (upgrade difficulty: 🟢 TRIVIAL - dependencies only)

* Requires update to `hoist-dev-utils >= v9.0.0` with updated handling of static/public assets. This
  should be a drop-in change for applications.
* iOS < 16.4 is no longer supported, due to the use of complex RegExes in GFM parsing.

### 🎁 New Features

* Enhanced `markdown` component to support GitHub Flavored Markdown (GFM) syntax.

### ✨ Styles

* Refactored CSS classnames applied to the primary application (☰) menu on desktop and mobile. On
  both platforms the button itself now has an `xh-app-menu-button` class, the popover has
  `xh-app-menu-popover`, and the menu itself has `xh-app-menu`.

### ⚙️ Technical

* Improved popup behavior of (beta) `MsalClient` - uses recommended `blank.html`.
* Added new convenience method `XH.renderAdminApp()` - consider replacing the call within your
  project's `src/apps/admin.ts` file with this new method and removing any duplicate config values
  if the defaults introduced here are suitable for your application's Hoist Admin console.
* Prop types for components passed to `elementFactory` and `createElement` are now inferred from the
  component itself where possible.

### 📚 Libraries

* @xh/hoist-dev-utils `8.x → 9.x`
* react-markdown `8.0 → 9.0`
* remark-breaks `3.0 → 4.0`
* remark-gfm `4.0`

## 64.0.5 - 2024-06-14

### 🐞 Bug Fixes

* Added a workaround for a mobile-only bug where Safari auto-zooms on orientation change if the user
  had previously zoomed the page themselves.

### ⚙️ Technical

* Improved logout behavior of (beta) `MsalClient`.

### 📚 Libraries

* @azure/msal-browser `3.14 → 3.17`

## 64.0.4 - 2024-06-05

### ⚙️ Typescript API Adjustments

* Improved `ref` typing in JSX.

## 64.0.3 - 2024-05-31

### 🐞 Bug Fixes

* Restored previous suppression of Blueprint animations on popovers and tooltips. These had been
  unintentionally (re)enabled in v63 and are now turned off again.

### ⚙️ Technical

* Adjusted (beta) APIs of OAuth-related `BaseOAuthClient`, `MsalClient`, and `AuthZeroClient`.

## 64.0.2 - 2024-05-23

### ⚙️ Technical

* Adjusted (beta) API of `BaseOAuthClient`.
* Improved `FetchService.addDefaultHeaders()` to support async functions.

## 64.0.1 - 2024-05-19

### ⚙️ Technical

* Adjusted (beta) API of `BaseOAuthClient` and its approach to loading ID tokens.

## 64.0.0 - 2024-05-17

### 💥 Breaking Changes (upgrade difficulty: 🟠 MEDIUM - major Hoist Core + AG Grid updates)

#### Hoist Core v20 with Multi-Instance Support

Requires update to `hoist-core >= 20.0.0` with multi-instance support.

* See the Hoist Core changelog for details on this major upgrade to Hoist's back-end capabilities.
* Client-side application changes should be minimal or non-existent, but the Hoist Admin Console has
  been updated extensively to support management of multiple instances within a cluster.

#### AG Grid v31

Requires update to `@ag-grid >= 31.x`, a new major AG Grid release with its own breaking changes.
See AG's [What's New](https://blog.ag-grid.com/whats-new-in-ag-grid-31/)
and [Upgrade Guide](https://www.ag-grid.com/javascript-data-grid/upgrading-to-ag-grid-31/?ref=blog.ag-grid.com)
for more details.

* AG Grid removed `ColumnApi`, consolidating most of its methods to `GridApi`. Corresponding Hoist
  update removes `GridModel.agColumnApi` - review and migrate usages to `GridModel.agApi` as
  appropriate.
* Many methods on `agApi` are replaced with `agApi.updateGridOptions({property: value})`. Review
  your app for any direct usages of the underlying AG API that might need to change.
* All apps will need to update their `@ag-grid` dependencies within `package.json` and make a minor
  update to their `Bootstrap` registration as per
  this [Toolbox example](https://github.com/xh/toolbox/pull/709/files/5626e21d778e1fc72f9735d2d8f011513e1ac9c6#diff-304055320a29f66ea1255446ba8f13e0f3f1b13643bcea0c0466aa60e9288a8f).
    * `Grid` and `AgGrid` components default to `reactiveCustomComponents: true`. If your app has
      custom tooltips or editors, you should confirm that they still work with this setting. (It
      will be the default in agGrid v32.)
    * For custom editors, you will have to convert them from "imperative" to "reactive". If this is
      not possible, you can set `reactiveCustomComponents: false` in your `GridModel` to continue
      using the old "imperative" mode, but note that this will preclude the use of upgraded Hoist
      editors in that same grid instance. (See the links below for AG docs on this change.)
    * For custom tooltips, note AG-Grid's deprecation of `getReactContainerClasses`.
    * Consult the AG Grid docs for more information:
        * [Updated docs on Custom Components](https://ag-grid.com/react-data-grid/cell-editors/#custom-components)
        * [Migrating from Imperative to Reactive components](https://ag-grid.com/react-data-grid/upgrading-to-ag-grid-31-1/#migrating-custom-components-to-use-reactivecustomcomponents-option)
        * [React-related deprecations](https://ag-grid.com/react-data-grid/upgrading-to-ag-grid-31-1/#react)

#### Other Breaking Changes

* Removed support for passing a plain object to the `model` prop of Hoist Components (previously
  deprecated back in v58). Use the `modelConfig` prop instead.
* Removed the `multiFieldRenderer` utility function. This has been made internal and renamed to
  `zoneGridRenderer` for exclusive use by the `ZoneGrid` component.
* Updated CSS variables related to the `ZoneGrid` component - vars formerly prefixed by
  `--xh-grid-multifield` are now prefixed by `--xh-zone-grid`, several vars have been added, and
  some defaults have changed.
* Removed obsolete `AppSpec.isSSO` property in favor of two new properties `AppSpec.enableLogout`
  and `AppSpec.enableLoginForm`. This should have no effect on the vast majority of apps which had
  `isSSO` set to `true`. For apps where `isSSO` was set to `false`, the new flags should be used to
  more clearly indicate the desired auth behavior.

### 🎁 New Features

* Improved mobile viewport handling to ensure that both standard pages and full screen dialogs
  respect "safe area" boundaries, avoiding overlap with system UI elements such as the iOS task
  switcher at the bottom of the screen. Also set background letterboxing color (to black) when in
  landscape mode for a more resolved-looking layout.
* Improved the inline grid `selectEditor` to commit its value to the backing record as soon as an
  option is selected, rather than waiting for the user to click away from the cell.
* Improved the display of Role details in the Admin Console. The detail panel for the selected role
  now includes a sub-tab listing all other roles inherited by the selected role, something that was
  previously accessible only via the linked graph visualization.
* Added new `checkboxRenderer` for rendering booleans with a checkbox input look and feel.
* Added new mobile `checkboxButton`, an alternate input component for toggling boolean values.
* Added beta version of a new Hoist `security` package, providing built-in support for OAuth flows.
  See `BaseOAuthClient`, `MsalClient`, and `AuthZeroClient` for more information. Please note that
  package is being released as a *beta* and is subject to change before final release.

### ✨ Styles

* Default mobile font size has been increased to 16px, both for better overall legibility and also
  specifically for input elements to avoid triggering Safari's auto-zoom behavior on focus.
    * Added new mobile-only CSS vars to allow for more granular control over font sizes:
        * `--xh-mobile-input-font-size`
        * `--xh-mobile-input-label-font-size`
        * `--xh-mobile-input-height-px`
    * Increased height of mobile toolbars to better accommodate larger nested inputs.
    * Grid font sizes have not changed, but other application layouts might need to be adjusted to
      ensure labels and other text elements fit as intended.
* Mobile App Options dialog has been updated to use a full-screen `DialogPanel` to provide a more
  native feel and better accommodate longer lists of app options.

### 🐞 Bug Fixes

* Fixed poor truncation / clipping behavior of the primary (right-side) metric in `ZoneGrid`. Values
  that do not fit within the available width of the cell will now truncate their right edge and
  display an ellipsis to indicate they have been clipped.
* Improved `RestGridModel.actionWarning` behavior to suppress any warning when the provided function
  returns a falsy value.
* Fixed mobile `Toast` intent styling.

### ⚙️ Technical

* NumberEditor no longer activates on keypress of letter characters.
* Removed initial `ping` call `FetchService` init.
* Deprecated `FetchService.setDefaultHeaders` and replaced with new `addDefaultHeaders` method to
  support independent additions of default headers from multiple sources in an application.

### 📚 Libraries

* @ag-grid `30.x → 31.x`
* @auth0/auth0-spa-js `added @ 2.1`
* @azure/msal-browser `added @ 3.14`
* dompurify `3.0 → 3.1`
* jwt-decode `added @ 4.0`
* moment `2.29 → 2.30`
* numbro `2.4 → 2.5`
* qs `6.11 → 6.12`
* semver `7.5 → 7.6`

---

For versions prior to v64, see [CHANGELOG-archive.md](./docs/archive/CHANGELOG-archive.md).
