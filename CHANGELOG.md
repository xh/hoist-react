# Changelog

## 83.0-SNAPSHOT - unreleased

### 🎁 New Features

* Added `TraceService` — client-side component of Hoist's new end-to-end distributed tracing
  support. Creates spans for user actions and fetch calls, sends `traceparent` headers on outgoing
  requests so server spans nest under client spans, and batches completed spans for relay through
  the server's export pipeline. Controlled by `xhTraceConfig` soft config. Requires hoist-core 37+.
    - `XH.withSpanAsync()` wraps async operations in a span with automatic timing and error capture.
    - `Promise.span()` provides a chainable API for tracing promise-based operations.
    - Automatic app-load spans emitted at startup, breaking down time spent in pre-auth,
      authentication, hoist init, and app init phases.
    - `FetchService` automatically creates CLIENT spans for all fetch calls and injects
      `traceparent` headers. Use `parentSpan` in fetch options to nest concurrent fetches
      under a business-level span.

* Added publish controls to the Admin Metrics tab, supporting the new opt-in metrics export
  feature in hoist-core 36.4.

### ⚙️ Technical

* Refactored documentation indexing to better support both MCP (LLM) and the toolbox docviewer.
* Improved MCP/CLI TypeScript tools: `hoist-get-members` now walks class inheritance chains,
  shows constructor config types, indexes Promise prototype extensions, and filters `_`-prefixed
  internal members.
* Fixed MCP/CLI TypeScript symbol indexing for destructured exports (e.g.
  `export const [Button, button] = hoistCmp.withFactory(...)`). Individual binding names are now
  indexed as separate symbols, enabling exact-match lookups via `hoist-ts symbol`.

## 82.0.3 - 2026-03-02

### 🐞 Bug Fixes

* Fixed bug where `DashCanvasModel.state` returned stale data when persisted state was restored
  during construction.
* Fixed bug preventing selection of favorites in the GroupingChooser

## 82.0.2 - 2026-03-02

### 🐞 Bug Fixes

* Fixed TypeScript compilation errors caused by missing `.d.ts` declaration files in published build.

## 82.0.1 - 2026-02-28

### 🐞 Bug Fixes

* Fixed a CSS issue causing desktop submenus to clip.

### ⚙️ Technical

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
* Added additional `div` with `xh-dash-tab__content` class around `DashContainerView` content.
  Apps with custom CSS targeting `xh-dash-tab` may need to adjust their selectors.
* Removed the `xh-popup--framed` CSS class. Apps applying this class to popovers should remove it —
  popover borders are now themed globally via the `--xh-popup-border-color` CSS variable.

### 🎁 New Features

* Added an embedded MCP (Model Context Protocol) server that gives AI coding tools structured access
  to hoist-react documentation and TypeScript type information. Includes tools for keyword search
  across docs, symbol lookup, and class/interface member inspection.
  See [`mcp/README.md`](mcp/README.md) for setup and usage details.
* Added `DashCanvasWidgetChooser` component — a draggable widget well for adding views to a
  `DashCanvas` via drag-and-drop from an external container. Added `allowsDrop`, `onDropDone`,
  and `onDropDragOver` config options to `DashCanvasModel` to support this, along with
  `showGridBackground` and `showAddViewButtonWhenEmpty` configs and a `'wrap'` compaction strategy.
* Added `Picker` desktop input component — a popover-based option picker for
  space-constrained areas like toolbars. Renders a trigger button that opens a dropdown
  checklist, with support for single and multi-select modes, built-in filtering, custom option and
  button renderers, and virtualized scrolling for large option lists.
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

### ⚙️ Technical

* Added instance methods to the `Filter` class hierarchy for removing child filters by type or
  field, plus a new `appendFilter()` utility for composing filters via AND. These replace the
  standalone `withFilterByField`, `withFilterByKey`, and `withFilterByTypes` utilities, which
  have been deprecated. Internal callers have been migrated to the new API.
* Transitioned the hoist-react build itself to GitHub Actions (from our previous Teamcity build).
  No change to library consumers - Hoist continues to be published to npm.
* Catches and logs an occasional, non-fatal race condition error on `DashContainer` state changes.

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
  Transient UI state (e.g. editor open/closed, pending value) is now held per-component, so
  opening one chooser no longer opens all others bound to the same model.

### ✨ Styles

* Overrode Blueprint's hardcoded popover border and arrow colors to use Hoist's themed
  `--xh-popup-border-color` CSS variable. Popover borders and arrows now match the rest of
  the Hoist theme in both light and dark modes.

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
* Changed the signatures of some `HoistAuthModel` methods to return `IdentityInfo` rather than
  a `boolean`. For most apps this will require a trivial change to the signature of the
  implementation of `HoistAuthModel.completeAuthAsync`.
* Renamed Blueprint `Card` exports to `BpCard` and `bpCard`.

### 🎁 New Features

* Added `Card` component, a bordered container for grouping related content with an optional inline
  header and collapsible content.
* Added `FormFieldSet` component for grouping `FormFields` and displaying their aggregate validation
  state.
* Added `contentBoxProps` to desktop and mobile `Panel`, providing direct control over the inner
  frame wrapping content items. Use to apply padding, change flex direction, enable scrolling, or
  add custom classes without extra wrapper elements. Matches the existing `contentBoxProps` API on
  `Card`.
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

### 🐞 Bug Fixes

* Fixed error encountered when attempting to `store.revert()` on a store with summary records.

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
    * Note that the switch to Hoist's default Inter font w/tabular numbers might require some
      inputs w/tight sizing to be made wider to avoid clipping (e.g. `DateInputs` sized to fit).
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
* Moved `TabSwitcherProps` to `cmp/tab/Types.ts` but maintained export from `cmp/tab/index.ts`.
  Some apps may need to update their imports.
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
  wholesale. Applications that were relying on the prior patching behavior will need to
  call `GridModel.applyColumnStateChanges` instead.
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
* Fixed `AgGridModel.getExpandState()` not returning a full representation of expanded groups -
  an issue that primarily affected linked tree map visualizations.

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
    * Applications implementing `groupRowRenderer` should note that the `value` property passed
      to this function is no longer stringified, but is instead the raw field value for the group.
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
* Fixed bug where `GridModel.persistableColumnState` was not including default column `widths`.
  This led to columns not being set to their expected widths when switching `ViewManager` views.
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
      Provides easier discoverability on desktop and supports this feature on mobile, where we
      don't have context menus.
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

* Upgraded the version of Hoist's default Inter UI font to a new major version, now v4.1. Note
  that this brings slight differences to the font's appearance, including tweaks to internal
  spacing and letterforms for tabular numbers. The name of the font face has also changed, from
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

* Requires `hoist-core >= 31` with new APIs to support the consolidated Admin Console "Clients"
  tab and new properties on `TrackLog`.
* Apps with a custom `AppModel` for their admin app that extends `@xh/hoist/admin/AppModel` must
  ensure they call `super.initAsync()` within their override of that lifecycle method, if
  applicable. This did not previously have any effect, but is required now for the superclass to
  initialize a new `ViewManagerModel`.
    * [Here is where Toolbox makes that call](https://github.com/xh/toolbox/blob/f15a8018ce36c2ae998b45724b48a16320b88e49/client-app/src/admin/AppModel.ts#L12).
* Requires call to `makeObservable(this)` in model constructors with `@bindable`. Note that there
  is a new dev-only runtime check on `HoistBase` to warn if this call has not been made.

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
    * ⚠️ NOTE that a misconfigured build - where the client version is not set to the same value
      as the server - would result in a false positive for an upgrade. The two should always match.
* Calls to `Promise.track()` that are rejected with an exception will be tracked with new
  severity level of `TrackSeverity.ERROR`.

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
  User Preference, and JSON Blob tabs. Supports searching JSON values stored within these objects
  to filter and match data using JSON Path expressions.
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
* `TreeMap` and `SplitTreeMap` are now cross-platform and can be used in mobile applications.
  Update imports from `@xh/hoist/desktop/cmp/treemap` to `@xh/hoist/cmp/treemap`.
* Renamed `RefreshButton.model` prop to `target` for clarity and consistency.

### 🎁 New Features

* Major improvements to the `ViewManager` component, including:
    * A clearer, better organized management dialog.
    * Support for persisting a view's pending value, to avoid users losing changes when e.g. an app
      goes into idle mode and requires a page refresh to restore.
    * Improved handling of delete / update collisions.
    * New `ViewManagerModel.settleTime` config, to allow persisted components such as dashboards to
      fully resolve their rendered state before capturing a baseline for dirty checks.
* Added `SessionStorageService` and associated persistence provider to support saving tab-local
  data across reloads. Exact analog to `LocalStorageService`, but scoped to lifetime of current tab.
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
* Improved handling of calls to `DashContainerModel.loadStateAsync()` when the component has yet
  to be rendered. Requested state updates are no longer dropped, and will be applied as soon as the
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
* Updated persistable components to support specifying distinct `PersistOptions` for individual
  bits of persisted state. E.g. you can now configure a `GroupingChooserModel` used within a
  dashboard widget to persist its value to that particular widget's `DashViewModel` while saving the
  user's favorites to a global preference.

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

* Requires `hoist-core >= 24` to support batch upload of activity tracking logs to server and
  new memory monitoring persistence.
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

* `Markdown` now supports a `reactMarkdownOptions` prop to allow passing React Markdown
  props to the underlying `reactMarkdown` instance.

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
        * `TrackOptions.correlationId` - specify an ID for a tracked activity, if not using the
          new `FetchOptions.track` API (see below).
    * If set on a fetch request, Correlation IDs are passed through to downstream error reporting
      and are available for review in the Admin Console.
* Added `FetchOptions.track` as streamlined syntax to track a request via Hoist activity tracking.
  Prefer this option (vs. a chained `.track()` call) to relay the request's `correlationId` and
  `loadSpec` automatically.
* Added `FetchOptions.asJson` to instruct `FetchService` to decode an HTTP response as JSON.
  Note that `FetchService` methods suffixed with `Json` will set this property automatically.
* Added global interceptors on `FetchService`. See `FetchService.addInterceptor()`.
* `GridModel` will now accept `contextMenu: false` to omit context menus.
* Added bindable `AppContainerModel.intializingLoadMaskMessage` to allow apps to customize the
  load mask message shown during app initialization.
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
  overridable API. This new API provides more easy customization of auth across all client-side
  apps by being easily overrideable and specified via the `AppSpec` passed to `XH.renderApp()`.
    * In most cases, upgrading should be a simple matter of moving code from `HoistAppModel` methods
      `preAuthInitAsync()` and `logoutAsync()` (removed by this change) to new `HoistAuthModel`
      methods `completeAuthAsync()` and `logoutAsync()`.

### 🎁 New Features

* Added option to `XH.reloadApp()` to reload specific app path.
* Added `headerTooltip` prop to `ColumnGroup`.

### 🐞 Bug Fixes

* Updated `.xh-viewport` sizing styles and mobile `dialog` sizing to use `dvw/dvh` instead of prior
  `svw/svh` - resolves edge case mobile issue where redirects back from an OAuth flow could leave
  an unexpected gap across the bottom of the screen. Includes fallback for secure client browsers
  that don't support dynamic viewport units.
* Updated mobile `TabContainer` to flex properly within flexbox containers.
* Fixed timing issue with missing validation for records added immediately to a new `Store`.
* Fixed CSS bug in which date picker dates wrapped when `dateEditor` used in a grid in a dialog.

## 65.0.0 - 2024-06-26

### 💥 Breaking Changes (upgrade difficulty: 🟢 TRIVIAL - dependencies only)

* Requires update to `hoist-dev-utils >= v9.0.0` with updated handling of static/public assets.
  This should be a drop-in change for applications.
* iOS < 16.4 is no longer supported, due to the use of complex RegExes in GFM parsing.

### 🎁 New Features

* Enhanced `markdown` component to support GitHub Flavored Markdown (GFM) syntax.

### ✨ Styles

* Refactored CSS classnames applied to the primary application (☰) menu on desktop and mobile.
  On both platforms the button itself now has an `xh-app-menu-button` class, the popover has
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
* Removed the `multiFieldRenderer` utility function. This has been made internal and renamed
  to `zoneGridRenderer` for exclusive use by the `ZoneGrid` component.
* Updated CSS variables related to the `ZoneGrid` component - vars formerly prefixed
  by `--xh-grid-multifield` are now prefixed by `--xh-zone-grid`, several vars have been added, and
  some defaults have changed.
* Removed obsolete `AppSpec.isSSO` property in favor of two new properties `AppSpec.enableLogout`
  and `AppSpec.enableLoginForm`. This should have no effect on the vast majority of apps which had
  `isSSO` set to `true`. For apps where `isSSO` was set to `false`, the new flags should be
  used to more clearly indicate the desired auth behavior.

### 🎁 New Features

* Improved mobile viewport handling to ensure that both standard pages and full screen dialogs
  respect "safe area" boundaries, avoiding overlap with system UI elements such as the iOS task
  switcher at the bottom of the screen. Also set background letterboxing color (to black) when
  in landscape mode for a more resolved-looking layout.
* Improved the inline grid `selectEditor` to commit its value to the backing record as soon as an
  option is selected, rather than waiting for the user to click away from the cell.
* Improved the display of Role details in the Admin Console. The detail panel for the selected role
  now includes a sub-tab listing all other roles inherited by the selected role, something that
  was previously accessible only via the linked graph visualization.
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

## 63.1.1 - 2024-04-26

### 🐞 Bug Fixes

* Fixed over-eager error handler installed on window during preflight app initialization. This can
  catch errors thrown by browser extensions unrelated to the app itself, which should not block
  startup. Make opt-in via special query param `catchPreflightError=true`.

## 63.1.0 - 2024-04-23

### 🎁 New Features

* `Store` now supports multiple `summaryRecords`, displayed if so configured as multiple pinned
  rows within a bound grid.

## 63.0.3 - 2024-04-16

### 🐞 Bug Fixes

* Ensure all required styles imported for Blueprint datetime components.

## 63.0.2 - 2024-04-16

### 🐞 Bug Fixes

* Fixed `GroupingChooser` items appearing in incorrect location while dragging to re-order.
* Removed extraneous internal padding override to Blueprint menu styles. Fixes overhang of menu
  divider borders and avoids possible triggering of horizontal scrollbars.

## 63.0.1 - 2024-04-05

### 🐞 Bug Fixes

* Recently added fields now fully available in Admin Console Activity Tracking + Client Errors.

## 63.0.0 - 2024-04-04

### 💥 Breaking Changes (upgrade difficulty: 🟠 MEDIUM - for apps with styling overrides or direct use of Blueprint components)

* Requires `hoist-core >= v19.0.0` to support improvements to activity / client error tracking.

#### Blueprint 4 to 5 Migration

This release includes Blueprint 5, a major version update of that library with breaking changes.
While most of these have been addressed by the Hoist integration layer, developers importing
Blueprint components directly should review
the [Blueprint 5 migration guide](https://github.com/palantir/blueprint/wiki/Blueprint-5.0) for
details.

There are some common breaking changes that most/many apps will need to address:

* CSS rules with the `bp4-` prefix should be updated to use the `bp5-` prefix.
* Popovers
    * For `popover` and `tooltip` components, replace `target` with `item` if using elementFactory.
      If using JSX, replace `target` prop with a child element. Also applies to the
      mobile `popover`.
    * Popovers no longer have a popover-wrapper element - remove/replace any CSS rules
      targeting `bp4-popover-wrapper`.
    * All components which render popovers now depend
      on [`popper.js v2.x`](https://popper.js.org/docs/v2/). Complex customizations to popovers may
      need to be reworked.
    * A breaking change to `Popover` in BP5 was splitting the `boundary` prop into `rootBoundary`
      and `boundary`:
      Popovers were frequently set up with `boundary: 'viewport'`, which is no longer valid since
      "viewport" can be assigned to the `rootBoundary` but not to the `boundary`.
      However, viewport is the DEFAULT value for `rootBoundary`
      per [popper.js docs](https://popper.js.org/docs/v2/utils/detect-overflow/#boundary),
      so `boundary: 'viewport'` should be safe to remove entirely.
        * [see Blueprint's Popover2 migration guide](https://github.com/palantir/blueprint/wiki/Popover2-migration)
        * [see Popover2's `boundary` &
          `rootBoundary` docs](https://popper.js.org/docs/v2/utils/detect-overflow/#boundary)
* Where applicable, the former `elementRef` prop has been replaced by the simpler, more
  straightforward `ref` prop using `React.forwardRef()` - e.g. Hoist's `button.elementRef` prop
  becomes just `ref`. Review your app for uses of `elementRef`.
* The static `ContextMenu.show()` method has been replaced with `showContextMenu()`, importable
  from `@xh/hoist/kit/blueprint`. The method signature has changed slightly.
* The exported `overlay` component now refers to Blueprint's `overlay2` component.
* The exported `datePicker` now refers to Blueprint's `datePicker3` component, which has been
  upgraded to use `react-day-picker` v8. If you are passing `dayPickerProps` to Hoist's `dateInput`,
  you may need to update your code to use the
  new [v8 `DatePickerProps`](https://react-day-picker.js.org/api/interfaces/DayPickerSingleProps).

### 🎁 New Features

* Upgraded Admin Console Activity and Client Error reporting modules to use server-side filtering
  for better support of large datasets, allowing for longer-range queries on filtered categories,
  messages, or users before bumping into configured row limits.
* Added new `MenuItem.className` prop.

### 🐞 Bug Fixes

* Fixed two `ZoneGrid` issues:
    * Internal column definitions were missing the essential `rendererIsComplex` flag and could fail
      to render in-place updates to existing record data.
    * Omitted columns are now properly filtered out.
* Fixed issue where `SplitTreeMap` would not properly render errors as intended.

### 📚 Libraries

* @blueprintjs/core `4.20 → 5.10`
* @blueprintjs/datetime `4.4` → @blueprintjs/datetime2 `2.3`

## 62.0.1 - 2024-03-28

### 🎁 New Features

* New method `clear()` added to `TaskObserver` api.

### 🐞 Bug Fixes

* Ensure application viewport is masked throughout the entire app initialization process.

## 62.0.0 - 2024-03-19

### 💥 Breaking Changes (upgrade difficulty: 🟢 TRIVIAL - dependencies only)

* Requires update to `hoist-dev-utils >= v8.0.0` with updated chunking and code-splitting strategy
  to create shorter bundle names.

### 🎁 New Features

* Added a "Reload App" option to the default mobile app menu.
* Improved perceived responsiveness when constructing a new 'FilterChooserModel' when backing data
  has many records and/or auto-suggest-enabled fields.

### 🐞 Bug Fixes

* Fixed the config differ dialog issue where long field values would cause the toolbar to get hidden
  and/or table columns to be overly wide due to content overflow.

## 61.0.0 - 2024-03-08

### 💥 Breaking Changes (upgrade difficulty: 🟢 TRIVIAL - dependencies only)

* Requires update to `hoist-dev-utils >= v7.2.0` to inject new `xhClientApps` constant.

### 🎁 New Features

* Enhanced Roles Admin UI for more streamlined role editing.
* Supports targeting alert banners to specific client apps.
* Improved logging and error logging of `method` and `headers` in `FetchService`:  Default
  values will now be included.
* Enhanced `XH.reloadApp` with cache-buster.

### 🐞 Bug Fixes

* `FilterChooser` now correctly round-trips `Date` and `LocalDate` values. Previously it emitted
  these as strings, with incorrect results when using the generated filter's test function directly.
* Fixed bug where a discarded browser tab could re-init an app to an obsolete (cached) version.

## 60.2.0 - 2024-02-16

### 🎁 New Features

* The Admin Console now indicates if a Config value is being overridden by an instance config or
  environment variable with a corresponding name.
    * Config overrides now available in `hoist-core >= v18.4`. See the Hoist Core release notes for
      additional details on this new feature. The Hoist Core update is required for this feature,
      but is not a hard requirement for this Hoist React release in general.
* `RestGridEditor` now supports an `omit` flag to hide a field from the editor dialog.
* `FormField.readonlyRenderer` is now passed the backing `FieldModel` as a second argument.

### ⚙️ Typescript API Adjustments

* `FilterChooserModel.value` and related signatures are now typed with a new `FilterChooserFilter`
  type, a union of `CompoundFilter | FieldFilter` - the two concrete filter implementations
  supported by this control.

### 📚 Libraries

* classnames `2.3 → 2.5`

## 60.1.1 - 2024-01-29

### ⚙️ Technical

* Improved unique constraint validation of Roles and Role Members in the Admin Console.

## 60.1.0 - 2024-01-18

### 🐞 Bug Fixes

* Fixed transparent background for popup inline editors.
* Exceptions that occur in custom `Grid` cell tooltips will now be caught and logged to console,
  rather than throwing the render of the entire component.

### ⚙️ Technical

* Improvements to exception handling during app initialization.

## 60.0.1 - 2024-01-16

### 🐞 Bug Fixes

* Fixed regression to `ZoneGrid`.

## 60.0.0 - 2024-01-12

### 💥 Breaking Changes (upgrade difficulty: 🟠 MEDIUM - depends on server-side Roles implementation)

* Requires `hoist-core >= v18`. Even if not using new Hoist provided Role Management, several Admin
  Console features have had deprecation support for older versions of Hoist Core removed.

### 🎁 New Features

* Introduced new Admin Console tools for enhanced Role Management available in `hoist-core >= v18`.
    * Hoist-core now supports an out-of-the-box, database-driven system for maintaining a
      hierarchical set of Roles associating and associating them with individual users.
    * New system supports app and plug-in specific integrations to AD and other enterprise systems.
    * Administration of the new system provided by a new admin UI tab provided here.
    * Consult XH and the
      [Hoist Core CHANGELOG](https://github.com/xh/hoist-core/blob/develop/CHANGELOG.md#1800---2024-01-12)
      for additional details and upgrade instructions.
* Added `labelRenderers` property to `ZoneGridModel`. This allows dynamic "data-specific" labeling
  of fields in `ZoneGrid`.

### ✨ Styles

* Added `xh-bg-intent-xxx` CSS classes, for intent-coloring the `background-color` of elements.

### 🐞 Bug Fixes

* Fixed bug where `ColumnGroup` did not properly support the `omit` flag.

## 59.5.1 - 2024-01-05

### 🐞 Bug Fixes

* Fixed `DateEditor` calendar popover not showing for non-pinned columns.

## 59.5.0 - 2023-12-11

### 🎁 New Features

* Added new `dialogWidth` and `dialogHeight` configs to `DockViewModel`.

### 🐞 Bug Fixes

* Fixed serialization of expand/collapse state within `AgGridModel`, which was badly broken and
  could trigger long browser hangs for grids with > 2 levels of nesting and numeric record IDs.
* Fixed `UniqueAggregator` to properly check equality for `Date` fields.
* Pinned `react-grid-layout@1.4.3` to avoid v1.4.4 bugs affecting `DashCanvas` interactions
  (see https://github.com/react-grid-layout/react-grid-layout/issues/1990).

## 59.4.0 - 2023-11-28

### 💥 Breaking Changes (upgrade difficulty: 🟢 LOW)

* The constructors for `ColumnGroup` no long accept arbitrary rest (e.g `...rest`)
  arguments for applying app-specific data to the object. Instead, use the new `appData` property.

### ⚙️ Technical

* Enhanced `LogUtils` to support logging objects (and any other non-string values). Also
  added new exports for `logWarn()` and `logError()` with the same standardized formatting.
* Added standardized `LogUtils` methods to `HoistBase`, for use within Hoist models and services.

### 🐞 Bug Fixes

* `ZoneGrid` will no longer render labels or delimiters for empty values.

### ⚙️ Typescript API Adjustments

* Updated type for `ReactionSpec.equals` to include already-supported string shorthands.

## 59.3.2 - 2023-11-21

### 🐞 Bug Fixes

* `ZoneGrid` will more gracefully handle state that has become out of sync with its mapper
  requirements.

## 59.3.1 - 2023-11-10

### 🐞 Bug Fixes

* Ensure an unauthorized response from a proxy service endpoint does not prompt the user to refresh
  and log in again on an SSO-enabled application.
* Revert change to `Panel` which affected where `className` was applied with `modalSupport` enabled

## 59.3.0 - 2023-11-09

### 🎁 New Features

* Improved Hoist support for automated testing via Playwright, Cypress, and similar tools:
    * Core Hoist components now accept an optional `testId` prop, to be rendered at an appropriate
      level of the DOM (within a `data-testid` HTML attribute). This can minimize the need to select
      components using criteria such as CSS classes or labels that are more likely to change and
      break tests.
    * When given a `testId`, certain composite components will generate and set "sub-testIds" on
      selected internal components. For example, a `TabContainer` will set a testId on each switcher
      button (derived from its tabId), and a `Form` will set testIds on nested `FormField`
      and `HoistInput` components (derived from their bound field names).
    * This release represents a first step in ongoing work to facilitate automated end-to-end
      testing of Hoist applications. Additional Hoist-specific utilities for writing tests in
      libraries such as Cypress and Playwright are coming soon.
* Added new `ZoneGrid` component, a highly specialized `Grid` that always displays its data with
  multi-line, full-width rows. Each row is broken into four zones (top/bottom and left/right),
  each of which can mapped by the user to render data from one or more fields.
    * Primarily intended for mobile, where horizontal scrolling can present usability issues, but
      also available on desktop, where it can serve as an easily user-configurable `DataView`.
* Added `Column.sortToBottom` to force specified values to sort the bottom, regardless of sort
  direction. Intended primarily to force null values to sort below all others.
* Upgraded the `RelativeTimestamp` component with a new `localDateMode` option to customize how
  near-term date/time differences are rendered with regards to calendar days.

### 🐞 Bug Fixes

* Fixed bug where interacting with a `Select` within a `Popover` can inadvertently cause the
  popover to close. If your app already has special handling in place to prevent this, you should
  be able to unwind it after upgrading.
* Improved the behavior of the clear button in `TextInput`. Clearing a field no longer drops focus,
  allowing the user to immediately begin typing in a new value.
* Fixed arguments passed to `ErrorMessageProps.actionFn` and `ErrorMessageProps.detailsFn`.
* Improved default error text in `ErrorMessage`.

### ⚙️ Technical

* Improved core `HoistComponent` performance by preventing unnecessary re-renderings triggered by
  spurious model lookup changes.
* New flag `GridModel.experimental.enableFullWidthScroll` enables scrollbars to span pinned columns.
    * Early test release behind the flag, expected to made the default behavior in next release.
* Renamed `XH.getActiveModels()` to `XH.getModels()` for clarity / consistency.
    * API change, but not expected to impact applications.
* Added `XH.getModel()` convenience method to return the first matching model.

## 59.2.0 - 2023-10-16

### 🎁 New Features

* New `DockViewConfig.onClose` hook invoked when a user attempts to remove a `DockContainer` view.
* Added `GridModel` APIs to lookup and show / hide entire column groups.
* Left / right borders are now rendered along `Grid` `ColumnGroup` edges by default, controllable
  with new `ColumnGroupSpec.borders` config.
* Enhanced the `CubeQuery` to support per-query post-processing functions
  with `Query.omitFn`, `Query.bucketSpecFn` and `Query.lockFn`. These properties default to their
  respective properties on `Cube`.

### 🐞 Bug Fixes

* `DashContainerModel` fixes:
    * Fix bug where `addView` would throw when adding a view to a row or column
    * Fix bug where `allowRemove` flag was dropped from state for containers
    * Fix bug in `DockContainer` where adding / removing views would cause other views to be
      remounted
* Fixed erroneous `GridModel` warning when using a tree column within a column group
* Fixed regression to alert banners. Resume allowing elements as messages.
* Fix `Grid` cell border styling inconsistencies.

### ⚙️ Typescript API Adjustments

* Added type for `ActionFnData.record`.

## 59.1.0 - 2023-09-20

### 🎁 New Features

* Introduced new `ErrorBoundary` component for finer-grained application handling of React Errors.
    * Hoist now wraps `Tab`, `DashCanvasView`, `DashContainerView`, `DockView`, and `Page` in an
      `ErrorBoundary`. This provides better isolation of application content, minimizing the chance
      that any individual component can crash the entire app.
    * A new `PanelModel.errorBoundary` prop allows developers to opt-in to an `ErrorBoundary`
      wrapper around the contents of any panel.
    * `ErrorMessage` component now provides an ability to show additional exception details.
* Added new `Markdown` component for rendering Markdown formatted strings as markup. This includes
  bundling `react-markdown` in Hoist.
    * If your app already uses `react-markdown` or similar, we recommend updating to use the
      new `Markdown` component exported by Hoist to benefit from future upgrades.
    * Admin-managed alert banners leverage the new markdown component to support bold, italics and
      links within alert messages.
* Improved and fixed up `Panel` headers, including:
    * Added new `Panel.headerClassName` prop for easier CSS manipulation of panel's header.
    * Improved `Panel.collapsedTitle` prop and added `Panel.collapsedIcon` prop. These two props now
      fully govern header display when collapsed.
* Improved styling for disabled `checkbox` inputs.

### ⚙️ Technical

* `XH.showException` has been deprecated. Use similar methods on `XH.exceptionHandler` instead.

### 📚 Libraries

* numbro `2.3 → 2.4`
* react-markdown `added @ 8.0`
* remark-breaks `added @ 3.0`

## 59.0.3 - 2023-08-25

### ⚙️ Technical

* New `XH.flags` property to govern experimental, hotfix, or otherwise provisional features.

* Provide temporary workaround to chromium bug effecting BigNumber. Enabled via flag
  `applyBigNumberWorkaround`. See https://github.com/MikeMcl/bignumber.js/issues/354.

## 59.0.2 - 2023-08-24

### 🐞 Bug Fixes

* Restored support for `Select.selectOnFocus` (had broken with upgrade to `react-select` in v59.0).
* Fixed `DateInput` bug caused by changes in Chrome v116 - clicking on inputs
  with `enableTextInput: false` now open the date picker popup as expected.
* Flex inner title element added to `Panel` headers in v59.0, and set `display:flex` on the new
  element itself. Restores previous flexbox container behavior (when not L/R collapsed) for apps
  that are providing custom components as titles.
* `DashCanvas` now properly updates its layout when shown if the browser window had been resized
  while the component was hidden (e.g. in an inactive tab).
* Reverted upgrade to `react-select` in v59.0.0 due to issues found with `selectEditor` / inline
  grid editing. We will revisit this upgrade in a future release.

### 📚 Libraries

* react-select `5.7 → 4.3`
* react-windowed-select `5.1 → 3.1`

## 59.0.1 - 2023-08-17

### 🎁 New Features

* Added new `Panel.collapsedTitle` prop to make it easier to display a different title when the
  panel is collapsed.

## 59.0.0 - 2023-08-17

### 💥 Breaking Changes (upgrade difficulty: 🟢 LOW)

* Apps must update their `typescript` dependency to v5.1. This should be a drop-in for most
  applications, or require only minor changes. Note that Hoist has not yet adopted the updated
  approach to decorators added in TS v5, maintaining compatibility with the "legacy" syntax.
* Apps that use and provide the `highcharts` library should be sure to update the version to v11.1.
  This should be a drop-in for most applications.
    * Visit https://www.highcharts.com/blog/changelog/ for specific changes.
* Apps must also update their `@xh/hoist-dev-utils` dependency to v7.0.0 or higher.
    * We recommend specifying this as `"@xh/hoist-dev-utils": "7.x"` in your `package.json` to
      automatically pick up future minor releases.
* `DataViewConfig` no longer directly supports `GridConfig` parameters - instead, nest `GridConfig`
  options you wish to set via the new `gridOptions` parameter. Please note that, as before, not
  all `GridConfig` options are supported by (or make sense for) the `DataView` component.

### 🎁 New Features

* New `GridAutosizeOptions.includeHiddenColumns` config controls whether hidden columns should
  also be included during the autosize process. Default of `false`. Useful when applications
  provide quick toggles between different column sets and would prefer to take the up-front cost of
  autosizing rather than doing it after the user loads a column set.
* New `NumberFormatOptions.strictZero` formatter config controls display of values that round to
  zero at the specified precision. Set to `false` to format those values as if they were *exactly*
  zero, triggering display of any `zeroDisplay` value and suppressing sign-based glyphs, '+/-'
  characters, and styling.
* New `DashModel.refreshContextModel` allows apps to programmatically refresh all widgets within
  a `DashCanvas` or `DashContainer`.
* New tab for monitoring JDBC connection pool stats added to the Admin Console. Apps
  with `hoist-core >= v17.2` will collect and display metrics for their primary datasource on a
  configurable frequency.
* `ButtonGroupInput` now allows `null` values for buttons as long as both `enableClear` and
  `enableMulti` are false.

### 🐞 Bug Fixes

* Fixed bug where a titled panel collapsed to either the left or right side of a layout could cause
  severe layout performance degradation (and even browser hangs) when resizing the browser window in
  the latest Chrome v115.
    * Note this required some adjustments to the internal DOM structure of `PanelHeader` - highly
      specific CSS selectors or visual tests may be affected.
* Fixed bug where `manuallySized` was not being set properly on column state.
* Fixed bug where mobile `Dialog` max height was not properly constrained to the viewport.
* Fixed bug where mobile `NumberInput` would clear when trying to enter decimals on certain devices.
* Suppressed extra top border on Grids with `hideHeaders: true`.

### ⚙️ Technical

* Suppressed dev-time console warnings thrown by Blueprint Toaster.

### 📚 Libraries

* mobx `6.8 → 6.9`
* semver `7.3 → 7.5`
* typescript `4.9 → 5.1`
* highcharts `10.3 → 11.1`
* react-select `4.3 → 5.7`
* react-windowed-select `3.1 → 5.1`

## 58.0.1 - 2023-07-13

### 🐞 Bug Fixes

* Fixed bug where `TabContainerModel` with routing enabled would drop route params when navigating
  between tabs.

## 58.0.0 - 2023-07-07

### 💥 Breaking Changes (upgrade difficulty: 🟢 LOW)

* The `Column.getValueFn` and `Column.renderer` functions will no longer be passed the `agParams`
  argument. This argument was not passed consistently by Hoist when calling these functions; and was
  specifically omitted during operations such as column sizing, tooltip generation and Grid content
  searching. We do not expect this argument was being used in practice by applications, but
  applications should ensure this is the case, and adjust these callbacks if necessary.

### 🎁 New Features

* Deprecated `xhAppVersionCheckEnabled` config in favor of object-based `xhAppVersionCheck`. Hoist
  will auto-migrate the existing value to this new config's `mode` flag. While backwards
  compatible with older versions of hoist-core, the new `forceReload` mode
  requires `hoist-core >= v16.4`.
* Enhanced `NumberFormatOptions.colorSpec` to accept CSS properties in addition to class names.
* Enhanced `TabSwitcher` to allow navigation using arrow keys when focused.
* Added new option `TrackOptions.logData` to provide support for logging application data in
  `TrackService.`  Requires `hoist-core >= v16.4`.
* New `XH.pageState` provides observable access to the current lifecycle state of the app, allowing
  apps to react to changes in page visibility and focus, as well as detecting when the browser has
  frozen a tab due to inactivity or navigation.

## 57.0.0 - 2023-06-20

### 💥 Breaking Changes (upgrade difficulty: 🟢 LOW)

* The deprecated `@settable` decorator has now been removed. Use `@bindable` instead.
* The deprecated class `@xh/hoist/admin/App` has been removed. Use `@xh/hoist/admin/AppComponent`
  instead.

### 🎁 New Features

* Enhanced Admin alert banners with the ability to save messages as presets. Useful for
  standardizing alert or downtime banners, where pre-approved language can be saved as a preset for
  later loaded into a banner by members of an application support team (
  requires `hoist-core >= v16.3.0`).
* Added bindable `readonly` property to `LeftRightChooserModel`.

### ⚙️ Technical

* Support the `HOIST_IMPERSONATOR` role introduced in hoist-core `v16.3.0`
* Hoist now supports and requires ag-Grid v30 or higher. This version includes critical
  performance improvements to scrolling without the problematic 'ResizeObserver' issues discussed
  below.

### 🐞 Bug Fixes

* Fixed a bug where Onsen components wrappers could not forward refs.
* Improved the exceptions thrown by fetchService when errors occur parsing response JSON.

## 56.6.0 - 2023-06-01

### 🎁 New Features

* New global property `AgGrid.DEFAULT_PROPS` to provide application wide defaults for any instances
  of `AgGrid` and `Grid` components.

### ⚙️ Technical

* The workaround of defaulting the AG Grid prop `suppressBrowserResizeObserver: true`, added in
  v56.3.0, has been removed. This workaround can cause sizing issues with flex columns and should
  not be needed once [the underlying issue](https://github.com/ag-grid/ag-grid/issues/6562) is fixed
  in an upcoming AG Grid release.
    * As of this release date, we recommend apps stay at AG Grid 29.2. This does not include the
      latest AG performance improvements, but avoids the sizing issues present in 29.3.5.
    * If you want to take the latest AG Grid 29.3.5, please re-enable
      the `suppressBrowserResizeObserver` flag with the new `DEFAULT_PROPS` static described
      above. Scan your app carefully for column sizing issues.

### 🐞 Bug Fixes

* Fixed broken change handler for mobile inputs that wrap around Onsen UI inputs, including
  `NumberInput`, `SearchInput`, and `TextInput`.

### 📚 Libraries

* @blueprintjs/core `^4.14 → ^4.20` (apps might have already updated to a newer minor version)

## 56.5.0 - 2023-05-26

### 🎁 New Features

* Added `regexOption` and `caseSensitive` props to the `LogDisplayModel`. (Case-sensitive search
  requires `hoist-core >= v16.2.0`).
* Added new `GroupingChooserModel.commitOnChange` config - enable to update the observable grouping
  value as the user adjusts their choices within the control. Default behavior is unchanged,
  requiring user to dismiss the popover to commit the new value.
* Added new `Select.enableTooltips` prop - enable for select inputs where the text of a
  selected value might be elided due to space constraints. The tooltip will display the full text.
* Enabled user-driven sorting for the list of available values within Grid column filters.
* Updated `CodeInput.showCopyButton` (copy-to-clipboard feature) default to true (enabled).

### ⚙️ Technical

* `DataView` now supports an `agOptions` prop to allow passing arbitrary AG Grid props to the
  underlying grid instance. (Always supported by `Grid`, now also supported by `DataView`.)

### 🐞 Bug Fixes

* Fixed layout bug where popovers triggered from a parent `Panel` with `modalSupport` active could
  render beneath that parent's own modal dialog.
* Fixed broken `CodeInput` copy-to-clipboard feature.

## 56.4.0 - 2023-05-10

### 🎁 New Features

* Ensure that non-committed values are also checked when filtering a store with a FieldFilter.
  This will maximize chances that records under edit will not disappear from user view due to
  active filters.

### 🐞 Bug Fixes

* Fix bug where Grid ColumnHeaders could throw when `groupDisplayType` was set to `singleColumn`.

### ⚙️ Technical

* Adjustment to core model lookup in Hoist components to better support automated testing.
  Components no longer strictly require rendering within an `AppContainer`.

### ⚙️ Typescript API Adjustments

* Improved return types for `FetchService` methods and corrected `FetchOptions` interface.

## 56.3.0 - 2023-05-08

### 🎁 New Features

* Added support for new `sortOrder` argument to `XH.showBanner()`. A default sort order is applied
  if unspecified, ensuring banners do not unexpectedly change order when refreshed.

### ⚙️ Typescript API Adjustments

* Improved the recommendation for the app `declare` statement within
  our [TypeScript migration docs](https://github.com/xh/hoist-react/blob/develop/docs/upgrade-to-typescript.md#bootstrapts--service-declarations).
    * See this [Toolbox commit](https://github.com/xh/toolbox/commit/8df642cf) for a small,
      recommended app-level change to improve autocompletion and usage checks within IntelliJ.
* Added generic support to `XH.message()` and `XH.prompt()` signatures with return type
  of `Promise<T | boolean>`.
* Moved declaration of optional `children` prop to base `HoistProps` interface - required for TSX
  support.

### ✨ Styles

* Removed `--xh-banner-height` CSS var.
    * Desktop banners are implemented via `Toolbar`, which correctly sets a min height.
    * Mobile banners now specify `min-height: 40px` via the `.xh-banner` class.
    * This change allows banners containing custom components to grow to fit their contents without
      requiring app-level CSS overrides.
* Added new `--xh-grid-filter-popover-[height|width]-px` CSS variables to support easier custom
  sizing for grid column header filter popovers.

### ⚙️ Technical

* Updated internal config defaults to support latest AG Grid v29.3.4+ with use of
  AG `suppressBrowserResizeObserver` config. Applications are encouraged to update to the latest AG
  Grid dependencies to take advantage of ongoing performance updates.

## 56.2.0 - 2023-04-28

### 🎁 New Features

* Added `DashContainerModel.margin` config to customize the width of the resize splitters
  between widgets.

### ⚙️ Technical

* Improve scrolling performance for `Grid` and `DataView` via internal configuration updates.

## 56.1.0 - 2023-04-14

### 🎁 New Features

* Display improved memory management diagnostics within Admin console Memory Monitor.
    * New metrics require optional-but-recommended update to `hoist-core >= v16.1.0`.

### 🐞 Bug Fixes

* Fixes bug with display/reporting of exceptions during app initialization sequence.

## 56.0.0 - 2023-03-29

### 💥 Breaking Changes (upgrade difficulty: 🟠 MEDIUM)

* Requires `hoist-core => v16`.
* Requires AG Grid v29.0.0 or higher - update your AG Grid dependency in your app's `package.json`
  file. See the [AG Grid Changelog](https://www.ag-grid.com/changelog) for details.
    * Add a dependency on `@ag-grid-community/styles` to import new dedicated styles package.
    * Imports of AG Grid CSS files within your app's `Bootstrap.ts` file will also need to be
      updated to import styles from their new location. The recommended imports are now:

```typescript
import '@ag-grid-community/styles/ag-grid.css';
import '@ag-grid-community/styles/ag-theme-balham.css';
```

* New `xhActivityTrackingConfig` soft-configuration entry places new limits on the size of
  any `data` objects passed to `XH.track()` calls.
    * Any track requests with data objects exceeding this length will be persisted, but without the
      requested data.
    * Activity tracking can also be disabled (completely) via this same config.
* "Local" preferences are no longer supported. Application should use `LocalStorageService` instead.
  With v56, the `local` flag on any preferences will be ignored, and all preferences will be saved
  on the server instead.
    * Note that Hoist will execute a one-time migration of any existing local preference values
      from the user's browser to the server on app load.
* Removed `Column.tooltipElement`. Use `tooltip` instead.
* Removed `fill` prop on `TextArea` and `NumberInput` component. Use `flex` instead.
* Removed previously deprecated `Button.modifier.outline` and `Button.modifier.quiet` (mobile only).
* Removed previously deprecated `AppMenuButton.extraItems.onClick`. Use `actionFn` instead.

### 🎁 New Features

* `PanelModel` now supports a `defaultSize` property specified in percentage as well as pixels
  (e.g. `defaultSize: '20%'` as well as `defaultSize: 200`).
* `DashCanvas` views can now be programmatically added with specified width and height dimensions.
* New `FetchService.abort()` API allows manually aborting a pending fetch request.
* Hoist exceptions have been enhanced and standardized, including new TypeScript types. The
  `Error.cause` property is now populated for wrapping exceptions.
* New `GridModel.headerMenuDisplay` config for limiting column header menu visibility to on hover.

### ⚙️ Typescript API Adjustments

* New Typescript types for all Hoist exceptions.
* Integration of AG Grid community types.

### ⚙️ Technical

* Hoist source code has been reformatted with Prettier.
* Admin Console modules that have been disabled via config are no longer hidden completely, but
  instead will render a placeholder pointing to the relevant config name.

### 📚 Libraries

* mobx `6.7 → 6.8`
* dompurify `2.4 → 3.0`

---

For versions prior to v56, see [CHANGELOG-pre-v56.md](./docs/archive/CHANGELOG-pre-v56.md).
