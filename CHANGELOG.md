# Changelog

## v74.1.1 - 2025-07-02

### 🎁 New Features

* Further refinements to the `GroupingChooser` desktop UI.
  * Added new props `favoritesSide` and `favoritesTitle`.
  * Deprecated `popoverTitle` prop - use `editorTitle` instead.
  * Moved "Save as Favorite" button to a new compact toolbar within the popover.

## v74.1.0 - 2025-06-30

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

## v74.0.0 - 2025-06-11

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

## v73.0.1 - 2025-05-19

### 🐞 Bug Fixes

* Fixed a minor issue with Admin Console Role Management.

## v73.0.0 - 2025-05-16

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

## v72.5.1 - 2025-04-15

### 🐞 Bug Fixes

* Allow the display of very long log lines in Admin log viewer.

## v72.5.0 - 2025-04-14

### 🎁 New Features

* Added option from the Admin Console > Websockets tab to request a client health report from any
  connected clients.
* Enabled telemetry reporting from `WebSocketService`.
* Updated `MenuItem.actionFn()` to receive the click event as an additional argument.
* Support for reporting App Build, Tab Id, and Load Id in websocket admin page.

## v72.4.0 - 2025-04-09

### 🎁 New Features

* Added new methods for formatting timestamps within JSON objects. See `withFormattedTimestamps`
  and `timestampReplacer` in the `@xh/hoist/format` package.
* Added new `ViewManagerConfig.viewMenuItemFn` option to support custom rendering of pinned views in
  the drop-down menu.

### ⚙️ Technical

* Added dedicated `ClientHealthService` for managing client health report. Additional enhancements
  to health report to include information about web sockets, idle time, and page state.

## v72.3.0 - 2025-04-08

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

## v72.2.0 - 2025-03-13

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

## v72.1.0 - 2025-02-13

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

## v72.0.0 - 2025-01-27

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

## v71.0.0 - 2025-01-08

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

## v70.0.0 - 2024-11-15

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
* mobx  `6.9.1 -> 6.13.2`,
* mobx-react-lite  `3.4.3 -> 4.0.7`,

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

## v56.4.0 - 2023-05-10

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

## v56.3.0 - 2023-05-08

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

## v56.2.0 - 2023-04-28

### 🎁 New Features

* Added `DashContainerModel.margin` config to customize the width of the resize splitters
  between widgets.

### ⚙️ Technical

* Improve scrolling performance for `Grid` and `DataView` via internal configuration updates.

## v56.1.0 - 2023-04-14

### 🎁 New Features

* Display improved memory management diagnostics within Admin console Memory Monitor.
    * New metrics require optional-but-recommended update to `hoist-core >= v16.1.0`.

### 🐞 Bug Fixes

* Fixes bug with display/reporting of exceptions during app initialization sequence.

## v56.0.0 - 2023-03-29

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

## v55.4.0 - 2023-03-23

### 💥 Breaking Changes

* Requires AG Grid v29.0.0 or higher - see release notes for v56.0.0 above.

### 🐞 Bug Fixes

* Addresses `AgGrid` v28 regression whereby changing column visibility via state breaks grid
  rendering when column groups are set via the `groupId` property.

## v55.3.2 - 2023-03-22

### 🐞 Bug Fixes

* Fixed issue where a filter on a `LocalDate` field created via `FilterChooser` would cause a
  grid column filter on the same field to fail to properly render when shown.

## v55.3.1 - 2023-03-14

### 🐞 Bug Fixes

* Revert native `structuredClone` to lodash `deepClone` throughout toolkit.

## v55.3.0 - 2023-03-03

### 🐞 Bug Fixes

* Grid column filters scroll their internal grid horizontally to avoid clipping longer values.
* Minor improvements to the same grid filter dialog's alignment and labelling.

### ⚙️ Technical

* Use native `structuredClone` instead of lodash `deepClone` throughout toolkit.

## v55.2.1 - 2023-02-24

### 🐞 Bug Fixes

* Fixed issue where a resizable `Panel` splitter could be rendered incorrectly while dragging.

## v55.2.0 - 2023-02-10

### 🎁 New Features

* `DashCanvas` enhancements:
    * Views now support minimum and maximum dimensions.
    * Views now expose an `allowDuplicate` flag for controlling the `Duplicate` menu item
      visibility.

### 🐞 Bug Fixes

* Fixed a bug with Cube views having dimensions containing non-string or `null` values. Rows grouped
  by these dimensions would report values for the dimension which were incorrectly stringified (e.g.
  `'null'` vs. `null` or `'5'` vs. `5`). This has been fixed. Note that the stringified value is
  still reported for the rows' `cubeLabel` value, and will be used for the purposes of grouping.

### ⚙️ Typescript API Adjustments

* Improved signatures of `RestStore` APIs.

## v55.1.0 - 2023-02-09

Version 55 is the first major update of the toolkit after our transition to Typescript. In addition
to a host of runtime fixes and features, it also contains a good number of important Typescript
typing adjustments, which are listed below. It also includes a helpful
[Typescript upgrade guide](https://github.com/xh/hoist-react/blob/develop/docs/upgrade-to-typescript.md).

### 🎁 New Features

* Grid exports can now be tracked in the admin activity tab by setting `exportOptions.track` to
  true (defaults to false).
* Miscellaneous performance improvements to the cube package.
* The implementation of the `Cube.omitFn` feature has been enhanced. This function will now be
  called on *all* non-leaf nodes, not just single child nodes. This allows for more flexible
  editing of the shape of the resulting hierarchical data emitted by cube views.

### 🐞 Bug Fixes

* Fixed: grid cell editors would drop a single character edit.
* Fixed: grid date input editor's popup did not position correctly in a grid with pinned columns.
* Fixed issue with `DashContainer` flashing its "empty" text briefly before loading.
* Several Hoist TypeScript types, interfaces, and signatures have been improved or corrected (typing
  changes only).
* Fix bug where a `className` provided to a `Panel` with `modalSupport` would be dropped when in a
  modal state. Note this necessitated an additional layer in the `Panel` DOM hierarchy. Highly
  specific CSS selectors may be affected.
* Fix bug where `TileFrame` would not pass through the keys of its children.

### 💥 Breaking Changes

* The semantics of `Cube.omitFn` have changed such that it will now be called on all aggregate
  nodes, not just nodes with a single child. Applications may need to adjust any implementation of
  this function accordingly.
* `hoistCmp.containerFactory` and `hoistCmp.withContainerFactory` are removed in favor of
  the basic `hoistCmp.factory` and `hoistCmp.withFactory` respectively. See typescript
  API adjustments below.

### ⚙️ Typescript API Adjustments

The following Typescript API were adjusted in v55.

* Removed the distinction between `StandardElementFactory` and `ContainerElementFactory`. This
  distinction was deemed to be unnecessary, and overcomplicated the understanding of Hoist.
  Applications should simply continue to use `ElementFactory` instead. `hoistCmp.containerFactory`
  and `hoistCmp.withContainerFactory` are also removed in favor of the basic `hoistCmp.factory` and
  `hoistCmp.withFactory` respectively.
* `HoistProps.modelConfig` now references the type declaration of `HoistModel.config`. See
  `PanelModel` and `TabContainerModel` for examples.
* The new `SelectOption` type has been made multi-platform and moved to `@xh/hoist/core`.

**Note** that we do not intend to make such extensive Typescript changes going forward post-v55.0.
These changes were deemed critical and worth adjusting in our first typescript update, and before
typescript has been widely adopted in production Hoist apps.

### ⚙️ Technical

* Hoist's `Icon` enumeration has been re-organized slightly to better separate icons that describe
  "what they look like" - e.g. `Icon.magnifyingGlass()` - from an expanded set of aliases that
  describe "how they are used" - e.g. `Icon.search()`.
    * This allows apps to override icon choices made within Hoist components in a more targeted way,
      e.g. by setting `Icon.columnMenu = Icon.ellipsisVertical`.
* All Hoist configurations that support `omit: boolean` now additionally support a "thunkable"
  callback of type `() => boolean`.
* `Grid` will only persist minimal user column state for hidden columns, to reduce user pref sizes.

### 📚 Libraries

* @blueprintjs/core `^4.12 → ^4.14`
* corejs `^3.26 → ^3.27`
* mobx `6.6 → 6.7`
* onsenui `2.11 → 2.12` (*see testing note below)
* react-onsenui `1.11 > 1.13`

### ✅ Testing Scope

* *Full regression testing recommended for _mobile_ apps.* While the upgrade from 2.11 to 2.12
  appears as a minor release, it was in fact a major update to the library.
  See [the Onsen release notes](https://github.com/OnsenUI/OnsenUI/releases/tag/2.12.0) for
  additional details. Note that Hoist has handled all changes required to its Onsen API calls,
  and there are no breaking changes to the Hoist mobile component APIs. As a result, mobile apps
  _might_ not need to change anything, but extra care in testing is still recommended.

## v54.0.0 - 2022-12-31

We are pleased to announce that Hoist React has been fully rewritten in TypeScript! ✨🚀

All core Hoist Components, Models, and other utilities now have TypeScript interfaces for their
public APIs, improving the developer ergonomics of the toolkit with much more accurate dev-time type
checking and intellisense. Developers now also have the option (but are not required) to write
application code using TypeScript.

Runtime support for TypeScript is provided by `@xh/hoist-dev-utils v6.1+`, which recognizes and
transpiles TypeScript files (`.ts|.tsx`) via the `@babel/plugin-transform-typescript` plugin.
Development-time support can be provided by the user's IDE (e.g. IntelliJ or VSCode, which both
provide strong TypeScript-based error checking and auto-completion).

The goal of this release is to be backward compatible with v53 to the greatest degree possible, and
most applications will run with minimal or no changes. However, some breaking changes were required
and can require application adjustments, as detailed below.

As always, please review our [Toolbox project](https://github.com/xh/toolbox/), which we've updated
to use TypeScript for its own app-level code.

### 🎁 New Features

* New TypeScript interface `HoistProps` and per-component extensions to specify props for all
  components. This replaces the use of the `PropTypes` library, which is no longer included.
* ~~Enhanced TypeScript-aware implementations of `ElementFactory`, including separate factories for
  standard components (`elementFactory`) and components that often take children only
  (`containerElementFactory`).~~
* The `@bindable` annotation has been enhanced to produce a native javascript setter for its
  property as well as the `setXXX()` method it currently produces. This provides a more typescript
  friendly way to set properties in a mobx action, and should be the favored method going forward.
  The use of the `setXXX()` method will continue to be supported for backward compatibility.
* References to singleton instances of services and the app model can now also be gained via the
  static `instance` property on the class name of the singleton - e.g. `MyAppModel.instance`.
  Referencing app-level services and the AppModel via `XH` is still fully supported and recommended.
* New utility function `waitFor` returns a promise that will resolve after a specified condition
  has been met, polling at a specified interval.
* Hoist Components will now automatically remount if the model passed to them (via context or props)
  is changed during the lifetime of the component. This allows applications to swap out models
  without needing to manually force the remounting of related components with an explicit
  `key` setting, i.e.  `key: model.xhId`.
* `fmtQuantity` function now takes two new flags `useMillions` and `useBillions`.

### 💥 Breaking Changes

* The constructors for `GridModel` and `Column` no long accept arbitrary rest (e.g `...rest`)
  arguments for applying app-specific data to the object. Instead, use the new `appData` property
  on these objects.
* ~~The `elemFactory` function has been removed. Applications calling this function should specify
  `elementFactory` (typically) or `containerElementFactory` instead.~~
    * ~~Most application components are defined using helper aliases `hoistCmp.factory`
      and `hoistCmp.withFactory` - these calls do _not_ need to change, unless your component
      needs to take a list of children directly (i.e. `someComponent(child1, child2)`).~~
    * ~~Update the definition of any such components to use `hoistCmp.containerFactory` instead.~~
    * ~~Where possible, favor the simpler, default factory for more streamlined type suggestions /
      error messages regarding your component's valid props.~~
* The use of the `model` prop to provide a config object for a model to be created on-the-fly
  is deprecated.
    * Use the new `modelConfig` prop when passing a *plain object config* -
      e.g. `someComp({modelConfig: {modelOpt: true}})`
    * Continue to use the `model` prop when passing an existing model *instance* -
      e.g. `someComp({model: someCompModel})`.
* PropTypes support has been removed in favor of the type script interfaces discussed above. Apps
  importing Hoist Proptypes instances should simply remove these compile-time references.

### 🐞 Bug Fixes

* Fix bug where dragging on any panel header which is a descendant of a `DashCanvasView` would move
  the `DashCanvasView`.
* Fix bug where `GridModel.ensureRecordsVisibleAsync` could fail to make collapsed nodes visible.
* Fix bug where `GridPersistenceModel` would not clean outdated column state.
* Fix animation bug when popping pages in the mobile navigator.

### ⚙️ Technical

* Update `preflight.js` to catch errors that occur on startup, before our in-app exception handling
  is initialized.

### 📚 Libraries

* @blueprintjs/core `4.11 → 4.12`
* @xh/hoist-dev-utils `6.0 → 6.1`
* typescript `added @ 4.9`
* highcharts `9.3 → 10.3`

### ✅ Testing Scope

* *Full regression testing recommended* - this is a major Hoist release and involved a significant
  amount of refactoring to the toolkit code. As such, we recommend a thorough regression test of any
  applications updating to this release from prior versions.

## v53.2.0 - 2022-11-15

### 🎁 New Features

* New methods `Store.errors`, `Store.errorCount`, and `StoreRecord.allErrors` provide convenient
  access to validation errors in the data package.
* New flag `Store.validationIsComplex` indicates whether *all* uncommitted records in a store should
  be revalidated when *any* record in the store is changed.
    * Defaults to `false`, which should be adequate for most use cases and can provide a significant
      performance boost in apps that bulk-insert 100s or 1000s of rows into editable grids.
    * Set to `true` for stores with validations that depend on other editable record values in the
      store (e.g. unique constraints), where a change to record X should cause another record Y to
      change its own validation status.

## v53.1.0 - 2022-11-03

### 🎁 New Features

* `PanelModel` now supports `modalSupport.defaultModal` option to allow rendering a Panel in an
  initially modal state.

### 🐞 Bug Fixes

* Fixed layout issues caused by top-level DOM elements created by `ModalSupport`
  and `ColumnWidthCalculator` (grid auto-sizing). Resolved occasional gaps between select inputs and
  their drop-down menus.
* Fix desktop styling bug where buttons inside a `Toast` could be rendered with a different color
  than the rest of the toast contents.
* Fix `GridModel` bug where `Store` would fail to recognize dot-separated field names as paths
  when provided as part of a field spec in object form.

### ⚙️ Technical

* Snap info (if available) from the `navigator.connection` global within the built-in call to track
  each application load.

## v53.0.0 - 2022-10-19

### 🎁 New Features

* The Hoist Admin Console is now accessible in a read-only capacity to users assigned the
  new `HOIST_ADMIN_READER` role.
* The pre-existing `HOIST_ADMIN` role inherits this new role, and is still required to take any
  actions that modify data.

### 💥 Breaking Changes

* Requires `hoist-core >= 14.4` to support the new `HOIST_ADMIN_READER` role described above. (Core
  upgrade _not_ required otherwise.)

## v52.0.2 - 2022-10-13

### 🐞 Bug Fixes

* Form field dirty checking now uses lodash `isEqual` to compare initial and current values,
  avoiding false positives with Array values.

## v52.0.1 - 2022-10-10

### 🎁 New Features

* New "Hoist Inspector" tool supports displaying and querying all of the Models, Services, and
  Stores within a running application.
    * Admin/dev-focused UI is built into all Desktop apps, activated via discrete new toggle in the
      bottom version bar (look for the 🔍 icon), or by running `XH.inspectorService.activate()`.
    * Selecting a model/service/store instance provides a quick view of its properties, including
      reactively updated observables. Useful for realtime troubleshooting of application state.
    * Includes auto-updated stats on total application model count and memory usage. Can aid in
      detecting and debugging memory leaks due to missing `@managed` annotations and other issues.
* New `DashCanvasViewModel.autoHeight` option fits the view's height to its rendered contents.
* New `DashCanvasAddViewButton` component supports adding views to `DashCanvas`.
* New `TabContainerModel.refreshContextModel` allows apps to programmatically load a `TabContainer`.
* `FilterChooserModel` now accepts shorthand inputs for numeric fields (e.g. "2m").
* Admin Console Config/Pref/Blob differ now displays the last updated time and user for each value.
* New observable `XH.environmentService.serverVersion` property, updated in the background via
  pre-existing `xhAppVersionCheckSecs` config. Note this does not replace or change the built-in
  upgrade prompt banner, but allows apps to take their own actions (e.g. reload immediately) when
  they detect an update on the server.

### 💥 Breaking Changes

* This release moves Hoist to **React v18**. Update your app's `package.json` to require the latest
  18.x versions of `react` and `react-dom`. Unless your app uses certain react-dom APIs directly, no
  other changes should be required.
* Removed deprecated method `XH.setDarkTheme()`. Use `XH.setTheme()` instead to select from our
  wide range of (two) theme options.

### 🐞 Bug Fixes

* `CompoundTaskObserver` improved to prioritize using specific messages from subtasks over the
  overall task message.
* Grid's built in context-menu option for filtering no longer shows `[object Object]` for columns
  that render React elements.
* `Store.updateData()` properly handles data in the `{rawData, parentId}` format, as documented.
* Disabled tabs now render with a muted text color on both light and dark themes, with
  new `--tab-disabled-text-color` CSS var added to customize.

### ⚙️ Technical

* `HoistComponents` no longer mutate the props object passed to them in React production mode. This
  was not causing noticeable application issues, but could result in a component's base CSS class
  being applied multiple times to its DOM element.
* `ModelSelector` used for model lookup and matching will now accept the class name of the model to
  match. Previously only a class reference could be provided.
* New check within service initialization to ensure that app service classes extend `HoistService`
  as required. (Has always been the expectation, but was not previously enforced.)
* `GridModel` will once again immediately sync data with its underlying AG Grid component. This
  reverses a v50.0.0 change that introduced a minimal debounce in order to work around an AG Grid
  rendering bug. The AG Grid bug has been resolved, and this workaround is no longer needed.
* `GridExportService` has improved support for columns of `FieldType.AUTO` and for columns with
  multiple data types and custom export functions. (`hoist-core >= 14.3` required for these
  particular improvements, but not for this Hoist React version in general.)
* The `trimToDepth` has been improved to return a depth-limited clone of its input that better
  handles nested arrays and passes through primitive inputs unchanged.

### 📚 Libraries

* @blueprintjs/core `4.6 → 4.11`
* @blueprintjs/datetime `4.3 → 4.4`
* @fortawesome `6.1 → 6.2`
* dompurify `2.3 → 2.4`
* react `17.0.1 → 18.2.0`
* react-dom `17.0.1 → 18.2.0`

## v51.0.0 - 2022-08-29

### 🎁 New Features

* `ButtonGroupInput` supports new `enableMulti` prop.
* `AboutDialog` can now display more dynamic custom properties.
* New option added to the Admin Activity Tracking chart to toggle on/off weekends when viewing a
  time series.
* The `filterText` field in `ColumnHeaderFilter` now gets autoFocused.

### 💥 Breaking Changes

* `CodeInput` is now rendered within an additional `div` element. Unlikely to cause issues, unless
  using targeted styling of this component.
* `xhAboutMenuConfigs` soft-config is no longer supported. To customize the `AboutDialog`, see
  `HoistAppModel.getAboutDialogItems()`

### 🐞 Bug Fixes

* Fixed issue where `ModalSupport` would trigger `MobX` memo warning in console.
* Fixed issues with `ModalSupport` implementation in `CodeInput`.
* Fixed `Grid` rendering glitches when used inside `Panel` with `ModalSupport`.
* Fixed incorrect text color on desktop toasts with a warning intent.
* Fixed potential for duplication of default Component `className` within list of CSS classes
  rendered into the DOM.
* Added missing `@computed` annotations to several `Store` getters that relay properties from
  its internal recordsets, including `maxDepth` and getters returning counts and empty status.
    * Avoids unnecessary internal render cycles within `Grid` when in tree mode.
    * Could require adjustments for apps that unintentionally relied on these observable getters
      triggering re-renders when records have changed in any way (but their output values have not).
* Hoist-supported menus will no longer filter out a `MenuDivider` if it has a `title`.
* The default `FormField` read-only renderer now supports line breaks.

### ⚙️ Technical

* The `addReaction()` and `addAutorun()` methods on `HoistBase` (i.e. models and services) now
  support passing multiple reactions in a single call and will ignore nullish inputs.

## v50.1.1 - 2022-07-29

### 🐞 Bug Fixes

* Fixed bug where components utilizing `ModalSupport` could render incorrectly when switching
  between inline and modal views.
* Improved behavior of `GridModel.whenReadyAsync()` to allow Grid more time to finish loading data.
  This improves the behavior of related methods `preSelectFirstAsync`, `selectFirstAsync`, and
  `ensureVisibleAsync`.
* `Grid` context menus are now disabled when a user is inline editing.
* An empty `DashCanvas` / `DashContainer` 'Add View' button now only displays a menu of available
  views, without unnecessarily nesting them inside an 'Add' submenu.
* Update `AppMenuButton` and `ContextMenu` to support Blueprint4 `menuItem`.

## v50.1.0 - 2022-07-21

### 🎁 New Features

* New `GridModel` method `ensureRecordsVisibleAsync` accepts one or more store records or IDs and
  scrolls to make them visible in the grid.

### 📚 Libraries

* @blueprintjs/core `4.5 → 4.6`
* qs `6.10 → 6.11`
* react-popper `2.2 → 2.3`

## v50.0.0 - 2022-07-12

### 🎁 New Features

* New `PanelModel.modalSupport` option allows the user to expand a panel into a configurable modal
  dialog - without developers needing to write custom dialog implementations and without triggering
  a remount/rerender of the panel's contents.
* FilterChooser field suggestions now search within multi-word field names.
* Autosize performance has been improved for very large grids.
* New `@abstract` decorator now available for enforcing abstract methods / getters.
* `MessageModel` now receives `dismissable` and `cancelOnDismiss` flags to control the behavior of a
  popup message when clicking the background or hitting the escape key.

### 💥 Breaking Changes

* Hoist now requires AG Grid v28.0.0 or higher - update your AG Grid dependency in your app's
  `package.json` file. See the [AG Grid Changelog](https://www.ag-grid.com/changelog) for details.
* The data reactions between `GridModel` and the underlying Ag-Grid is now minimally debounced. This
  avoids multiple data updates during a single event loop tick, which can corrupt Ag-Grid's
  underlying state in the latest versions of that library.
    * This change should not affect most apps, but code that queries grid state immediately after
      loading or filtering a grid (e.g. selection, row visibility, or expansion state) should be
      tested carefully and may require a call to `await whenReadyAsync()`.
    * Note that this method is already incorporated in to several public methods on `GridModel`,
      including `selectFirstAsync()` and `ensureSelectionVisibleAsync()`.
    * ⚠ NOTE - this change has been reverted as of v52 (see above).
* Blueprint has updated all of its CSS class names to use the `bp4-` prefix instead of the `bp3-`
  prefix. Any apps styling these classes directly may need to be adjusted. See
  https://github.com/palantir/blueprint/wiki/Blueprint-4.0 for more info.
* Both `Panel.title` and `Panel.icon` props must be null or undefined to avoid rendering
  a `PanelHeader`. Previously specifying any 'falsey' value for both (e.g. an empty string
  title) would omit the header.
* `XHClass` (top-level Singleton model for Hoist) no longer extends `HoistBase`
* `DockView` component has been moved into the desktop-specific package `@xh/hoist/desktop/cmp`.
  Users of this component will need to adjust their imports accordingly.
* Requires `hoist-core >= 14.0`. Excel file exporting defaults to using column FieldType.

### 🐞 Bug Fixes

* Fixed several issues introduced with Ag-Grid v27 where rows gaps and similar rendering issues
  could appear after operating on it programmatically (see breaking changes above).
* `ColumnHeaders` now properly respond to mouse events on tablets (e.g. when using a Bluetooth
  trackpad on an iPad).
* Fixed bug where `DashCanvasModel.removeView()` was not properly disposing of removed views
* Fixed exception dialog getting overwhelmed by large messages.
* Fixed exporting to Excel file erroneously coercing certain strings (like "1e10") into numbers.

### ⚙️ Technical

* Hoist will now throw if you import a desktop specific class to a mobile app or vice-versa.

### 📚 Libraries

* @blueprintjs `3.54 → 4.5`

[Commit Log](https://github.com/xh/hoist-react/compare/v49.2.0...v50.0.0)

## v49.2.0 - 2022-06-14

### 🎁 New Features

* New `@enumerable` decorator for making class members `enumerable`
* New `GridAutosizeOption` `renderedRowsOnly` supports more limited autosizing
  for very large grids.

### 🐞 Bug Fixes

* Fix `FilterChooser` looping between old values if updated too rapidly.
* Allow user to clear an unsupported `FilterChooser` value.
* Fix bug where `Panel` would throw when `headerItems = null`
* Fix column values filtering on `tags` fields if another filter is already present.
* Fix bug where `SwitchInput` `labelSide` would render inappropriately if within `compact` `toolbar`
* Fix bug where `SplitTreeMapModel.showSplitter` property wasn't being set in constructor

### 📚 Libraries

* mobx `6.5 → 6.6`

[Commit Log](https://github.com/xh/hoist-react/compare/v49.1.0...v49.2.0)

## v49.1.0 - 2022-06-03

### 🎁 New Features

* A `DashCanvasViewModel` now supports `headerItems` and `extraMenuItems`
* `Store` now supports a `tags` field type
* `FieldFilter` supports `includes` and `excludes` operators for `tags` fields

### 🐞 Bug Fixes

* Fix regression with `begins`, `ends`, and `not like` filters.
* Fix `DashCanvas` styling so drag-handles no longer cause horizontal scroll bar to appear
* Fix bug where `DashCanvas` would not resize appropriately on scrollbar visibility change

[Commit Log](https://github.com/xh/hoist-react/compare/v49.0.0...v49.1.0)

## v49.0.0 - 2022-05-24

### 🎁 New Features

* Improved desktop `NumberInput`:
    * Re-implemented `min` and `max` props to properly constrain the value entered and fix several
      bugs with the underlying Blueprint control.
    * Fixed the `precision` prop to be fully respected - values emitted by the input are now
      truncated to the specified precision, if set.
    * Added additional debouncing to keep the value more stable while a user is typing.
* Added new `getAppMenuButtonExtraItems()` extension point on `@xh/hoist/admin/AppModel` to allow
  customization of the Admin Console's app menu.
* Devs can now hide the Admin > General > Users tab by setting `hideUsersTab: true` within a new,
  optional `xhAdminAppConfig` soft-config.
* Added new `SplitTreeMapModel.showSplitter` config to insert a four pixel buffer between the
  component's nested maps. Useful for visualizations with both positive and negative heat values on
  each side, to keep the two sides clearly distinguished from each other.
* New `xhChangelogConfig.limitToRoles` soft-config allows the in-app changelog (aka release notes)
  to be gated to a subset of users based on their role.
* Add support for `Map` and `WeakMap` collections in `LangUtils.getOrCreate()`.
* Mobile `textInput` now accepts an `enableClear` property with a default value of false.

### 💥 Breaking Changes

* `GridModel.groupRowElementRenderer` and `DataViewModel.groupRowElementRenderer` have been removed,
  please use `groupRowRenderer` instead. It must now return a React Element rather than an HTML
  string (plain strings are also OK, but any formatting must be done via React).
* Model classes passed to `HoistComponents` or configured in their factory must now
  extend `HoistModel`. This has long been a core assumption, but was not previously enforced.
* Nested model instances stored at properties with a `_` prefix are now considered private and will
  not be auto-wired or returned by model lookups. This should not affect most apps, but will require
  minor changes for apps that were binding components to non-standard or "private" models.
* Hoist will now throw if `Store.summaryRecord` does not have a unique ID.

### 🐞 Bug Fixes

* Fixed a bug with Panel drag-to-resize within iframes on Windows.
* Worked around an Ag-Grid bug where the grid would render incorrectly on certain sorting changes,
  specifically for abs sort columns, leaving mis-aligned rows and gaps in the grid body layout.
* Fixed a bug in `SelectEditor` that would cause the grid to lose keyboard focus during editing.

### ⚙️ Technical

* Hoist now protects against custom Grid renderers that may throw by catching the error and printing
  an "#ERROR" placeholder token in the affected cell.
* `TreeMapModel.valueRenderer` and `heatRenderer` callbacks are now passed the `StoreRecord` as a
  second argument.
* Includes a new, additional `index-manifest.html` static file required for compatibility with the
  upcoming `hoist-dev-utils v6.0` release (but remains compatible with current/older dev-utils).

### 📚 Libraries

* mobx-react-lite `3.3 → 3.4`

[Commit Log](https://github.com/xh/hoist-react/compare/v48.0.1...v49.0.0)

## v48.0.1 - 2022-04-22

### 🐞 Bug Fixes

* Improve default rendering to call `toString()` on non-react elements returned by renderers.
* Fixed issue with `model` property missing from `Model.componentProps` under certain conditions.

[Commit Log](https://github.com/xh/hoist-react/compare/v48.0.0...v48.0.1)

## v48.0.0 - 2022-04-21

### 🎁 New Features

* A new `DashCanvas` layout component for creating scrollable dashboards that allow users to
  manually place and size their widgets using a grid-based layout. Note that this component is in
  beta and its API is subject to change.
* FontAwesome upgraded to v6. This includes redesigns of the majority of bundled icons - please
  check your app's icon usages carefully.
* Enhancements to admin log viewer. Log file metadata (size & last modified) available with
  optional upgrade to `hoist-core >= 13.2`.
* Mobile `Dialog` will scroll internally if taller than the screen.
* Configs passed to `XH.message()` and its variants now take an optional `className` to apply to the
  message dialog.
* `fmtQuantity` now displays values greater than one billion with `b` unit, similar to current
  handling of millions with `m`.

### 💥 Breaking Changes

* Hoist now requires AG Grid v27.2.0 or higher - update your AG Grid dependency in your app's
  `package.json` file. See the [AG Grid Changelog](https://www.ag-grid.com/changelog) for details.
  NOTE that AG Grid 27 includes a big breaking change to render cell contents via native React
  elements rather than HTML, along with other major API changes. To accommodate these changes, the
  following changes are required in Hoist apps:
    * `Column.renderer` must now return a React Element rather than an HTML string (plain strings
      are also OK, but any formatting must be done via React). Please review your app grids and
      update any custom renderers accordingly. `Column.elementRenderer` has been removed.
    * `DataViewModel.elementRenderer` has been renamed `DataViewModel.renderer`.
    * Formatter methods and renderers (e.g. `fmtNumber`, `numberRenderer`, etc.) now return React
      Elements by default. The `asElement` option to these functions has been removed. Use the
      new `asHtml` option to return an HTML string where required.
    * The `isPopup` argument to `useInlineEditorModel()` has been removed. If you want to display
      your inline editor in a popup, you must set the new flag `Column.editorIsPopup` to `true`.
* Deprecated message configs `confirmText`, `confirmIntent`, `cancelText`, `cancelIntent` have been
  removed.

### 🐞 Bug Fixes

* Set AG Grid's `suppressLastEmptyLineOnPaste` to true to work around a bug with Excel (Windows)
  that adds an empty line beneath the range pasted from the clipboard in editable grids.
* Fixes an issue where `NumberInput` would initially render blank values if `max` or `min` were
  set.
* Fixes an issue where tree maps would always show green for a `heatValue` of zero.

### 📚 Libraries

* @fortawesome/fontawesome-pro `5.14 → 6.1`
* mobx `6.3 → 6.5`
* mobx-react-lite `3.2 → 3.3`

[Commit Log](https://github.com/xh/hoist-react/compare/v47.1.2...v48.0.0)

## v47.1.2 - 2022-04-01

### 🐞 Bug Fixes

* `FieldFilter`'s check of `committedData` is now null safe. A record with no `committedData` will
  not be filtered out.

[Commit Log](https://github.com/xh/hoist-react/compare/v47.1.1...v47.1.2)

## v47.1.1 - 2022-03-26

### 🎁 New Features

* New "sync with system" theme option - sets the Hoist theme to light/dark based on the user's OS.
* Added `cancelAlign` config to `XH.message()` and variants. Customize to "left" to render
  Cancel and Confirm actions separated by a filler.
* Added `GridModel.restoreDefaultsFn`, an optional function called after `restoreDefaultsAsync`.
  Allows apps to run additional, app-specific logic after a grid has been reset (e.g. resetting
  other, related preferences or state not managed by `GridModel` directly).
* Added `AppSpec.lockoutPanel`, allowing apps to specify a custom component.

### 🐞 Bug Fixes

* Fixed column auto-sizing when `headerName` is/returns an element.
* Fixed bug where subforms were not properly registering as dirty.
* Fixed an issue where `Select` inputs would commit `null` whilst clearing the text input.
* Fixed `Clock` component bug introduced in v47 (configured timezone was not respected).

### 📚 Libraries

* @blueprintjs/core `3.53 → 3.54`
* @blueprintjs/datetime `3.23 → 3.24`

[Commit Log](https://github.com/xh/hoist-react/compare/v47.0.1...v47.1.1)

## v47.0.1 - 2022-03-06

### 🐞 Bug Fixes

* Fix to mobile `ColChooser` error re. internal model handling.

[Commit Log](https://github.com/xh/hoist-react/compare/v47.0.0...v47.0.1)

## v47.0.0 - 2022-03-04

### 🎁 New Features

* Version 47 provides new features to simplify the wiring of models to each other and the components
  they render. In particular, it formalizes the existing concept of "linked" HoistModels - models
  created by Hoist via the `creates` directive or the `useLocalModel` hook - and provides them with
  the following new features:
    - an observable `componentProps` property with access to the props of their rendered component.
    - a `lookupModel()` method and a `@lookup` decorator that can be used to acquire references to
      other HoistModels that are ancestors of the model in the component hierarchy.
    - new `onLinked()` and `afterLinked()` lifecycle methods, called when the model's associated
      component is first rendered.
* As before, linked models are auto-loaded and registered for refreshes within the `RefreshContext`
  they reside in, as well as destroyed when their linked component is unmounted. Also note that the
  new features described above are all "opt-in" and should be fully backward compatible with
  existing application code.
* Hoist will now more clearly alert if a model specified via the `uses()` directive cannot be
  resolved. A new `optional` config (default false) supports components with optional models.
* New support in Cube views for aggregators that depend on rows in the data set other than their
  direct children. See new property `Aggregator.dependOnChildrenOnly` and new `AggregationContext`
  argument passed to `Aggregator.aggregate()` and `Aggregator.replace()`
* Clarified internal CSS classes and styling for `FormField`.
    * ⚠️ Note that as part of this change, the `xh-form-field-fill` class name is no longer in use.
      Apps should check for any styles for that class and replace with `.xh-form-field-inner--flex`.

### 🐞 Bug Fixes

* Fixed an issue where the menu would flash open and closed when clicking on the `FilterChooser`
  favorites button.

### 💥 Breaking Changes

* Dashboard widgets no longer receive the `viewModel` prop. Access to the `DashViewModel` within a
  widget should be obtained using either the lookup decorator (i.e. `@lookup(DashViewModel)`)
  or the `lookupModel()` method.

### 📚 Libraries

* @blueprintjs/core `3.52 → 3.53`

[Commit Log](https://github.com/xh/hoist-react/compare/v46.1.2...v47.0.0)

## v46.1.2 - 2022-02-18

### 🐞 Bug Fixes

* Fixed an issue where column autosize can reset column order under certain circumstances.

[Commit Log](https://github.com/xh/hoist-react/compare/v46.1.1...v46.1.2)

## v46.1.1 - 2022-02-15

### 🐞 Bug Fixes

* Prevent `onClick` for disabled mobile `Buttons`.

[Commit Log](https://github.com/xh/hoist-react/compare/v46.1.0...v46.1.1)

## v46.1.0 - 2022-02-07

### Technical

* This release modifies our workaround to handle the AG Grid v26 changes to cast all of their node
  ids to strings. The initial approach in v46.0.0 - matching the AG Grid behavior by casting all
  `StoreRecord` ids to strings - was deemed too problematic for applications and has been reverted.
  Numerical ids in Store are once again fully supported.
* To accommodate the AG Grid changes, applications that are using AG Grid APIs (e.g.
  `agApi.getNode()`) should be sure to use the new property `StoreRecord.agId` to locate and compare
  records. We expect such usages to be rare in application code.

### 🎁 New Features

* `XH.showFeedbackDialog()` now takes an optional message to pre-populate within the dialog.
* Admins can now force suspension of individual client apps from the Server > WebSockets tab.
  Intended to e.g. force an app to stop refreshing an expensive query or polling an endpoint removed
  in a new release. Requires websockets to be enabled on both server and client.
* `FormField`s no longer need to specify a child input, and will simply render their readonly
  version if no child is specified. This simplifies the common use-case of fields/forms that are
  always readonly.

### 🐞 Bug Fixes

* `FormField` no longer throw if given a child that did not have `propTypes`.

[Commit Log](https://github.com/xh/hoist-react/compare/v46.0.0...v46.1.0)

## v46.0.0 - 2022-01-25

### 🎁 New Features

* `ExceptionHandler` provides a collection of overridable static properties, allowing you to set
  app-wide default behaviour for exception handling.
* `XH.handleException()` takes new `alertType` option to render error alerts via the familiar
  `dialog` or new `toast` UI.
* `XH.toast()` takes new `actionButtonProps` option to render an action button within a toast.
* New `GridModel.highlightRowOnClick` config adds a temporary highlight class to grid rows on user
  click/tap. Intended to improve UI feedback - especially on mobile, where it's enabled by default.
* New `GridModel.isInEditingMode` observable tracks inline editing start/stop with a built-in
  debounce, avoiding rapid cycling when e.g. tabbing between cells.
* `NumberInput` now supports a new `scaleFactor` prop which will be applied when converting between
  the internal and external values.
* `FilterChooser` now displays more minimal field name suggestions when first focused, as well as a
  new, configurable usage hint (`FilterChooserModel.introHelpText`) above those suggestions.

### 💥 Breaking Changes

* Hoist now requires AG Grid v26.2.0 or higher - update your AG Grid dependency in your app's
  `package.json` file. See the [AG Grid Changelog](https://www.ag-grid.com/changelog) for details.
* ~~`StoreRecord.id` must now be a String. Integers IDs were previously supported, but will be cast
  Strings during record creation.~~
    * ~~Apps using numeric record IDs for internal or server-side APIs will need to be reviewed and
      updated to handle/convert string values.~~
    * ~~This change was necessitated by a change to Ag-Grid, which now also requires String IDs for
      its row node APIs.~~
    * NOTE - the change above to require string IDs was unwound in v46.1.
* `LocalDate` methods `toString()`, `toJSON()`, `valueOf()`, and `isoString()` now all return the
  standard ISO format `YYYY-MM-DD`, consistent with built-in `Date.toISOString()`. Prior versions
  returned`YYYYMMDD`.
* The `stringifyErrorSafely` function has been moved from the `@xh/hoist/exception` package to a
  public method on `XH.exceptionHandler`. (No/little impact expected on app code.)

### 🐞 Bug Fixes

* Fix to incorrect viewport orientation reporting due to laggy mobile resize events and DOM APIs.

[Commit Log](https://github.com/xh/hoist-react/compare/v45.0.2...v46.0.0)

## v45.0.2 - 2022-01-13

### 🎁 New Features

* `FilterChooser` has new `menuWidth` prop, allowing you to specify as width for the dropdown menu
  that is different from the control.

### 🐞 Bug Fixes

* Fixed cache clearing method on Admin Console's Server > Services tab.
* Several fixes to behavior of `GridAutosizeMode.MANAGED`

[Commit Log](https://github.com/xh/hoist-react/compare/v45.0.1...v45.0.2)

## v45.0.1 - 2022-01-07

### 🐞 Bug Fixes

* Fixed a minor bug preventing Hoist apps from running on mobile Blackberry Access (Android)
  browsers

### ⚙️ Technical

* New flag `Store.experimental.castIdToString`

[Commit Log](https://github.com/xh/hoist-react/compare/v45.0.0...v45.0.1)

## v45.0.0 - 2022-01-05

### 🎁 New Features

* Grid filters configured with `GridFilterFieldSpec.enableValues` offer autocomplete suggestions
  for 'Equals' and 'Not Equals' filters.
* `GridFilterFieldSpec` has new `values` and `forceSelection` configs.
* `FilterChooser` displays a list of fields configured for filtering to improve the usability /
  discoverability of the control. Enabled by default, but can be disabled via
  new `suggestFieldsWhenEmpty` model config.
* `TreeMap` uses lightest shading for zero heat, reserving grey for nil.
* New property `Store.reuseRecords` controls if records should be reused across loads based on
  sharing identical (by reference) raw data. NOTE - this behavior was previously always enabled, but
  can be problematic under certain conditions and is not necessary for most applications. Apps with
  large datasets that want to continue to use this caching should set this flag explicitly.
* Grid column filters tweaked with several improvements to usability and styling.
* `LocalDate.get()` now supports both 'YYYY-MM-DD' and 'YYYYMMDD' inputs.
* Mobile `Button` has new `intent`, `minimal` and `outlined` props.

### 💥 Breaking Changes

* `FilterChooserFieldSpec.suggestValues` has been renamed `enableValues`, and now only accepts a
  boolean.
* `Column.exportFormat`, `Column.exportWidth` and the `ExportFormat` enum have been renamed
  `Column.excelFormat`, `Column.excelWidth` and `ExcelFormat` respectively.
* `Store.reuseRecords` must now be explicitly set on Stores with large datasets that wish to cache
  records by raw data identity (see above).
* `Record` class renamed to `StoreRecord` in anticipation of upcoming changes to JavaScript standard
  and to improve compatibility with TypeScript.
    * Not expected to have much or any impact on application code, except potentially JSDoc typings.
* Mobile `Button` no longer supports `modifier` prop. Use `minimal` and `outlined` instead.
* The following deprecated APIs were removed:
    * GridModel.selection
    * GridModel.selectedRecordId
    * StoreSelectionModel.records
    * StoreSelectionModel.ids
    * StoreSelectionModel.singleRecord
    * StoreSelectionModel.selectedRecordId
    * DataViewModel.selection
    * DataViewModel.selectedRecordId
    * RestGridModel.selection
    * LogUtils.withShortDebug
    * Promise.start

### 🐞 Bug Fixes

* `DashContainer` overflow menu still displays when the optional menu button is enabled.
* Charts in fullscreen mode now exit fullscreen mode gracefully before re-rendering.

### 📚 Libraries

* @popperjs/core `2.10 → 2.11`
* codemirror `5.63 → 6.65`
* http-status-codes `2.1 → 2.2`
* prop-types `15.7 → 15.8`
* store2 `2.12 → 2.13`
* ua-parser-js `0.7 → 1.0.2` (re-enables auto-patch updates)

[Commit Log](https://github.com/xh/hoist-react/compare/v44.3.0...v45.0.0)

## v44.3.0 - 2021-12-15

### 🐞 Bug Fixes

* Fixes issue with columns failing to resize on first try.
* Fixes issue preventing use of context menus on iPad.

### 📚 Libraries

* @blueprintjs/core `3.51 → 3.52`

* [Commit Log](https://github.com/xh/hoist-react/compare/v44.2.0...v44.3.0)

## v44.2.0 - 2021-12-07

### 🎁 New Features

* Desktop inline grid editor `Select` now commits the value immediately on selection.
* `DashContainerModel` now supports an observable `showMenuButton` config which will display a
  button in the stack header for showing the context menu
* Added `GridAutosizeMode.MANAGED` to autosize Grid columns on data or `sizingMode` changes, unless
  the user has manually modified their column widths.
* Copying from Grids to the clipboard will now use the value provided by the `exportValue`
  property on the column.
* Refresh application hotkey is now built into hoist's global hotkeys (shift + r).
* Non-SSO applications will now automatically reload when a request fails due to session timeout.
* New utility methods `withInfo` and `logInfo` provide variants of the existing `withDebug` and
  `logDebug` methods, but log at the more verbose `console.log` level.

### 🐞 Bug Fixes

* Desktop panel splitter can now be dragged over an `iframe` and reliably resize the panel.
* Ensure scrollbar does not appear on multi-select in toolbar when not needed.
* `XH.isPortrait` property fixed so that it no longer changes due to the appearance of the mobile
  keyboard.

[Commit Log](https://github.com/xh/hoist-react/compare/v44.1.0...v44.2.0)

## v44.1.0 - 2021-11-08

### 🎁 New Features

* Changes to App Options are now tracked in the admin activity tab.
* New Server > Environment tab added to Admin Console to display UI server environment variables and
  JVM system properties. (Requires `hoist-core >= 10.1` to enable this optional feature.)
* Provided observable getters `XH.viewportSize`, `XH.isPortrait` and `XH.isLandscape` to allow apps
  to react to changes in viewport size and orientation.

### 🐞 Bug Fixes

* Desktop inline grid editor `DateInput` now reliably shows its date picker pop-up aligned with the
  grid cell under edit.
* Desktop `Select.hideDropdownIndicator` now defaults to `true` on tablet devices due to UX bugs
  with the select library component and touch devices.
* Ensure `Column.autosizeBufferPx` is respected if provided.

### ✨ Styles

* New `--xh-menu-item` CSS vars added, with tweaks to default desktop menu styling.
* Highlight background color added to mobile menu items while pressed.

[Commit Log](https://github.com/xh/hoist-react/compare/v44.0.0...v44.1.0)

## v44.0.0 - 2021-10-26

⚠ NOTE - apps must update to `hoist-core >= 10.0.0` when taking this hoist-react update.

### 🎁 New Features

* TileFrame now supports new `onLayoutChange` callback prop.

### 🐞 Bug Fixes

* Field Filters in data package now act only on the `committed` value of the record. This stabilizes
  filtering behavior in editable grids.
* `JsonBlobService.updateAsync()` now supports data modifications with `null` values.
* Fixes an issue with Alert Banner not broadcasting to all users.
* Selected option in `Select` now scrolls into view on menu open.

### 💥 Breaking Changes

* Update required to `hoist-core >= 10.0.0` due to changes in `JsonBlobService` APIs and the
  addition of new, dedicated endpoints for Alert Banner management.

[Commit Log](https://github.com/xh/hoist-react/compare/v43.2.0...v44.0.0)

## v43.2.0 - 2021-10-14

### 🎁 New Features

* Admins can now configure an app-wide alert banner via a new tab in the Hoist Admin console.
  Intended to alert users about planned maintenance / downtime, known problems with data or upstream
  systems, and other similar use cases.
* Minor re-org of the Hoist Admin console tabs. Panels relating primarily to server-side features
  (including logging) are now grouped under a top-level "Server" tab. Configs have moved under
  "General" with the new Alert Banner feature.

### 🐞 Bug Fixes

* Always enforce a minimal `wait()` within `GridModel.autosizeAsync()` to ensure that the Grid has
  reacted to any data changes and AG Grid accurately reports on expanded rows to measure.

[Commit Log](https://github.com/xh/hoist-react/compare/v43.1.0...v43.2.0)

## v43.1.0 - 2021-10-04

### 🎁 New Features

* The Admin Console log viewer now supports downloading log files.
    * Note apps must update to `hoist-core >= v10.0` to enable this feature.
    * Core upgrade is _not_ a general requirement of this Hoist React release.
* The `field` key in the constructor for `Column` will now accept an Object with field defaults, as
  an alternative to the field name. This form allows the auto-construction of fully-defined `Field`
  objects from the column specification.

### 🐞 Bug Fixes

* `GridModel` no longer mutates any `selModel` or `colChooser` config objects provided to its
  constructor, resolving an edge-case bug where re-using the same object for either of these configs
  across multiple GridModel instances (e.g. as a shared set of defaults) would break.
* Grid autosizing tweaked to improve size estimation for indented tree rows and on mobile.

### 📚 Libraries

* @blueprintjs/core `3.50 → 3.51`

[Commit Log](https://github.com/xh/hoist-react/compare/v43.0.2...v43.1.0)

## v43.0.2 - 2021-10-04

### 🐞 Bug Fixes

* Fix (important) to ensure static preload spinner loaded from the intended path.
    * Please also update to latest `hoist-dev-utils >= 5.11.1` if possible.
    * Avoids issue where loading an app on a nested route could trigger double-loading of app
      assets.

[Commit Log](https://github.com/xh/hoist-react/compare/v43.0.1...v43.0.2)

## v43.0.1 - 2021-10-04

### 🎁 New Features

* New `GridFindField` component that enables users to search through a Grid and select rows that
  match the entered search term, _without_ applying any filtering. Especially useful for grids with
  aggregations or other logic that preclude client-side filtering of the data.
* Tree grid rows can be expanded / collapsed by clicking anywhere on the row. The new
  `GridModel.clicksToExpand` config can be used to control how many clicks will toggle the row.
  Defaults to double-click for desktop, and single tap for mobile - set to 0 to disable entirely.
* Added `GridModel.onCellContextMenu` handler. Note that for mobile (phone) apps, this handler fires
  on the "long press" (aka "tap and hold") gesture. This means it can be used as an alternate event
  for actions like drilling into a record detail, especially for parent rows on tree grids, where
  single tap will by default expand/collapse the node.
* In the `@xh/hoist/desktop/grid` package, `CheckboxEditor` has been renamed `BooleanEditor`. This
  new component supports a `quickToggle` prop which allows for more streamlined inline editing of
  boolean values.
* `LoadSpec` now supports a new `meta` property. Use this property to pass app-specific metadata
  through the `LoadSupport` loading and refresh lifecycle.
* A spinner is now shown while the app downloads and parses its javascript - most noticeable when
  loading a new (uncached) version, especially on a slower mobile connection. (Requires
  `@xh/hoist-dev-utils` v5.11 or greater to enable.)
* Log Levels now include information on when the custom config was last updated and by whom.
    * Note apps must update their server-side to `hoist-core v10.0` or greater to persist the date
      and username associated with the config (although this is _not_ a general or hard requirement
      for taking this version of hoist-react).

### ⚙️ Technical

* Removed `DEFAULT_SORTING_ORDER` static from `Column` class in favor of three new preset constants:
  `ASC_FIRST`, `DESC_FIRST`, and `ABS_DESC_FIRST`. Hoist will now default sorting order on columns
  based on field type. Sorting order can still be manually set via `Column.sortingOrder`.

### 🐞 Bug Fixes

* The ag-grid grid property `stopEditingWhenCellsLoseFocus` is now enabled by default to ensure
  values are committed to the Store if the user clicks somewhere outside the grid while editing a
  cell.
* Triggering inline editing of text or select editor cells by typing characters will no longer lose
  the first character pressed.

### ✨ Styles

* New `TreeStyle.COLORS` and `TreeStyle.COLORS_AND_BORDERS` tree grid styles have been added. Use
  the `--xh-grid-tree-group-color-level-*` CSS vars to customize colors as needed.
* `TreeStyle.HIGHLIGHTS` and `TreeStyle.HIGHLIGHTS_AND_BORDERS` now highlight row nodes on a
  gradient according to their depth.
* Default colors for masks and dialog backdrops have been adjusted, with less obtrusive colors used
  for masks via `--xh-mask-bg` and a darker `--xh-backdrop-bg` var now used behind dialogs.
* Mobile-specific styles and CSS vars for panel and dialog title background have been tweaked to use
  desktop defaults, and mobile dialogs now respect `--xh-popup-*` vars as expected.

### 💥 Breaking Changes

* In the `@xh/hoist/desktop/grid` package, `CheckboxEditor` has been renamed `BooleanEditor`.

### ⚙️ Technical

* The `xhLastReadChangelog` preference will not save SNAPSHOT versions to ensure the user continues
  to see the 'What's New?' notification for non-SNAPSHOT releases.

### 📚 Libraries

* @blueprintjs/core `3.49 → 3.50`
* codemirror `5.62 → 5.63`

[Commit Log](https://github.com/xh/hoist-react/compare/v42.6.0...v43.0.1)

## v42.6.0 - 2021-09-17

### 🎁 New Features

* New `Column.autosizeBufferPx` config applies column-specific autosize buffer and overrides
  `GridAutosizeOptions.bufferPx`.
* `Select` input now supports new `maxMenuHeight` prop.

### 🐞 Bug Fixes

* Fixes issue with incorrect Grid auto-sizing for Grids with certain row and cell styles.
* Grid sizing mode styles no longer conflict with custom use of `groupUseEntireRow: false` within
  `agOptions`.
* Fixes an issue on iOS where `NumberInput` would incorrectly bring up a text keyboard.

### ✨ Styles

* Reduced default Grid header and group row heights to minimize their use of vertical space,
  especially at larger sizing modes. As before, apps can override via the `AgGrid.HEADER_HEIGHTS`
  and `AgGrid.GROUP_ROW_HEIGHTS` static properties. The reduction in height does not apply to group
  rows that do not use the entire width of the row.
* Restyled Grid header rows with `--xh-grid-bg` and `--xh-text-color-muted` for a more minimal look
  overall. As before, use the `--xh-grid-header-*` CSS vars to customize if needed.

[Commit Log](https://github.com/xh/hoist-react/compare/v42.5.0...v42.6.0)

## v42.5.0 - 2021-09-10

### 🎁 New Features

* Provide applications with the ability to override default logic for "restore defaults". This
  allows complex and device-specific sub-apps to perform more targeted and complete clearing of user
  state. See new overridable method `HoistAppModel.restoreDefaultsAsync` for more information.

### 🐞 Bug Fixes

* Improved coverage of Fetch `abort` errors.
* The in-app changelog will no longer prompt the user with the "What's New" button if category-based
  filtering results in a version without any release notes.

### ✨ Styles

* New CSS vars added to support easier customization of desktop Tab font/size/color. Tabs now
  respect standard `--xh-font-size` by default.

### 📚 Libraries

* @blueprintjs/core `3.48 → 3.49`
* @popperjs/core `2.9 → 2.10`

[Commit Log](https://github.com/xh/hoist-react/compare/v42.4.0...v42.5.0)

## v42.4.0 - 2021-09-03

### 🎁 New Features

* New `GridFilterModel.commitOnChange` config (default `true`) applies updated filters as soon as
  they are changed within the pop-up menu. Set to `false` for large datasets or whenever filtering
  is a more intensive operation.
* Mobile `Select` input now supports async `queryFn` prop for parity with desktop.
* `TreeMapModel` now supports new `maxLabels` config for improved performance.

### ✨ Styles

* Hoist's default font is now [Inter](https://rsms.me/inter/), shipped and bundled via the
  `inter-ui` npm package. Inter is a modern, open-source font that leverages optical sizing to
  ensure maximum readability, even at very small sizes (e.g. `sizingMode: 'tiny'`). It's also a
  "variable" font, meaning it supports any weights from 1-1000 with a single font file download.
* Default Grid header heights have been reduced for a more compact display and greater
  differentiation between header and data rows. As before, apps can customize the pixel heights used
  by overwriting the `AgGrid.HEADER_HEIGHTS` static, typically within `Bootstrap.js`.

### ⚙️ Technical

* Mobile pull-to-refresh/swipe-to-go-back gestures now disabled over charts to avoid disrupting
  their own swipe-based zooming and panning features.

[Commit Log](https://github.com/xh/hoist-react/compare/v42.2.0...v42.4.0)

## v42.2.0 - 2021-08-27

### 🎁 New Features

* Charts now hide scrollbar, rangeSelector, navigator, and export buttons and show axis labels when
  printing or exporting images.

[Commit Log](https://github.com/xh/hoist-react/compare/v42.1.1...v42.2.0)

## v42.1.1 - 2021-08-20

* Update new `XH.sizingMode` support to store distinct values for the selected sizing mode on
  desktop, tablet, and mobile (phone) platforms.
* Additional configuration supported for newly-introduced `AppOption` preset components.

### 📚 Libraries

* @blueprintjs/core `3.47 → 3.48`

[Commit Log](https://github.com/xh/hoist-react/compare/v42.1.0...v42.1.1)

## v42.1.0 - 2021-08-19

### 🎁 New Features

* Added observable `XH.sizingMode` to govern app-wide `sizingMode`. `GridModel`s will bind to this
  `sizingMode` by default. Apps that have already implemented custom solutions around a centralized
  `sizingMode` should endeavor to unwind in favor of this.
    * ⚠ NOTE - this change requires a new application preference be defined - `xhSizingMode`. This
      should be a JSON pref, with a suggested default value of `{}`.
* Added `GridAutosizeMode.ON_SIZING_MODE_CHANGE` to autosize Grid columns whenever
  `GridModel.sizingMode` changes - it is now the default `GridAutosizeOptions.mode`.
* Added a library of reusable `AppOption` preset components, including `ThemeAppOption`,
  `SizingModeAppOption` and `AutoRefreshAppOptions`. Apps that have implemented custom `AppOption`
  controls to manage these Hoist-provided options should consider migrating to these defaults.
* `Icon` factories now support `intent`.
* `TreeMapModel` and `SplitTreeMapModel` now supports a `theme` config, accepting the strings
  'light' or 'dark'. Leave it undefined to use the global theme.
* Various usability improvements and simplifications to `GroupingChooser`.

### 🐞 Bug Fixes

* Fixed an issue preventing `FormField` labels from rendering if `fieldDefaults` was undefined.

### ✨ Styles

* New `Badge.compact` prop sets size to half that of parent element when true (default false). The
  `position` prop has been removed in favor of customizing placement of the component.

[Commit Log](https://github.com/xh/hoist-react/compare/v42.0.0...v42.1.0)

## v42.0.0 - 2021-08-13

### 🎁 New Features

* Column-level filtering is now officially supported for desktop grids!
    * New `GridModel.filterModel` config accepts a config object to customize filtering options, or
      `true` to enable grid-based filtering with defaults.
    * New `Column.filterable` config enables a customized header menu with filtering options. The
      new control offers two tabs - a "Values" tab for an enumerated "set-type" filter and a "
      Custom" tab to support more complex queries with multiple clauses.
* New `TaskObserver` replaces existing `PendingTaskModel`, providing improved support for joining
  and masking multiple asynchronous tasks.
* Mobile `NavigatorModel` provides a new 'pull down' gesture to trigger an app-wide data refresh.
  This gesture is enabled by default, but can be disabled via the `pullDownToRefresh` flag.
* `RecordAction` now supports a `className` config.
* `Chart` provides a default context menu with its standard menu button actions, including a new
  'Copy to Clipboard' action.

### 💥 Breaking Changes

* `FilterChooserModel.sourceStore` and `FilterChooserModel.targetStore` have been renamed
  `FilterChooserModel.valueSource` and `FilterChooserModel.bind` respectively. Furthermore, both
  configs now support either a `Store` or a cube `View`. This is to provide a common API with the
  new `GridFilterModel` filtering described above.
* `GridModel.setFilter()` and `DataViewModel.setFilter()` have been removed. Either configure your
  grid with a `GridFilterModel`, or set the filter on the underlying `Store` instead.
* `FunctionFilter` now requires a `key` property.
* `PendingTaskModel` has been replaced by the new `TaskObserver` in `@xh/hoist/core`.
    * ⚠ NOTE - `TaskObserver` instances should be created via the provided static factory methods
      and
      _not_ directly via the `new` keyword. `TaskObserver.trackLast()` can be used as a drop-in
      replacement for `new PendingTaskModel()`.
* The `model` prop on `LoadingIndicator` and `Mask` has been replaced with `bind`. Provide one or
  more `TaskObserver`s to this prop.

### ⚙️ Technical

* `GridModel` has a new `selectedIds` getter to get the IDs of currently selected records. To
  provide consistency across models, the following getters have been deprecated and renamed:
    + `selectedRecordId` has been renamed `selectedId` in `GridModel`, `StoreSelectionModel`, and
      `DataViewModel`
    + `selection` has been renamed `selectedRecords` in `GridModel`, `DataViewModel`, and
      `RestGridModel`
    + `singleRecord`, `records`, and `ids` have been renamed `selectedRecord`, `selectedRecords`,
      and
      `selectedIds`, respectively, in `StoreSelectionModel`

### ✨ Styles

* Higher contrast on grid context menus for improved legibility.

[Commit Log](https://github.com/xh/hoist-react/compare/v41.3.0...v42.0.0)

## v41.3.0 - 2021-08-09

### 🎁 New Features

* New `Cube` aggregators `ChildCountAggregator` and `LeafCountAggregator`.
* Mobile `NavigatorModel` provides a new "swipe" gesture to go back in the page stack. This is
  enabled by default, but may be turned off via the new `swipeToGoBack` prop.
* Client error reports now include the full URL for additional troubleshooting context.
    * Note apps must update their server-side to `hoist-core v9.3` or greater to persist URLs with
      error reports (although this is _not_ a general or hard requirement for taking this version of
      hoist-react).

[Commit Log](https://github.com/xh/hoist-react/compare/v41.2.0...v41.3.0)

## v41.2.0 - 2021-07-30

### 🎁 New Features

* New `GridModel.rowClassRules` and `Column.cellClassRules` configs added. Previously apps needed to
  use `agOptions` to dynamically apply and remove CSS classes using either of these options - now
  they are fully supported by Hoist.
    * ⚠ Note that, to avoid conflicts with internal usages of these configs, Hoist will check and
      throw if either is passed via `agOptions`. Apps only need to move their configs to the new
      location - the shape of the rules object does *not* need to change.
* New `GridAutosizeOptions.includeCollapsedChildren` config controls whether values from collapsed
  (i.e. hidden) child records should be measured when computing column sizes. Default of `false`
  improves autosize performance for large tree grids and should generally match user expectations
  around WYSIWYG autosizing.
* New `GridModel.beginEditAsync()` and `endEditAsync()` APIs added to start/stop inline editing.
    * ⚠ Note that - in a minor breaking change - the function form of the `Column.editable` config
      is no longer passed an `agParams` argument, as editing might now begin and need to be
      evaluated outside the context of an AG-Grid event.
* New `GridModel.clicksToEdit` config controls the number of clicks required to trigger
  inline-editing of a grid cell. Default remains 2 (double click ).
* Timeouts are now configurable on grid exports via a new `exportOptions.timeout` config.
* Toasts may now be dismissed programmatically - use the new `ToastModel` returned by the
  `XH.toast()` API and its variants.
* `Form` supports setting readonlyRenderer in `fieldDefaults` prop.
* New utility hook `useCached` provides a more flexible variant of `React.useCallback`.

### 🐞 Bug Fixes

* Inline grid editing supports passing of JSX editor components.
* `GridExportService` catches any exceptions thrown during export preparation and warns the user
  that something went wrong.
* GridModel with 'disabled' selection no longer shows "ghost" selection when using keyboard.
* Tree grids now style "parent" rows consistently with highlights/borders if requested, even for
  mixed-depth trees where some rows have children at a given level and others do not.

### ⚙️ Technical

* `FetchService` will now actively `abort()` fetch requests that it is abandoning due to its own
  `timeout` option. This allows the browser to release the associated resources associated with
  these requests.
* The `start()` function in `@xh/hoist/promise` has been deprecated. Use `wait()` instead, which can
  now be called without any args to establish a Promise chain and/or introduce a minimal amount of
  asynchronousity.
* ⚠ Note that the raw `AgGrid` component no longer enhances the native keyboard handling provided by
  AG Grid. All Hoist key handling customizations are now limited to `Grid`. If you wish to provide
  custom handling in a raw `AgGrid` component, see the example here:
  https://www.ag-grid.com/javascript-grid/row-selection/#example-selection-with-keyboard-arrow-keys

### ✨ Styles

* The red and green color values applied in dark mode have been lightened for improved legibility.
* The default `colorSpec` config for number formatters has changed to use new dedicated CSS classes
  and variables.
* New/renamed CSS vars `--xh-grid-selected-row-bg` and `--xh-grid-selected-row-text-color` now used
  to style selected grid rows.
    * ⚠ Note the `--xh-grid-bg-highlight` CSS var has been removed.
* New `.xh-cell--editable` CSS class applied to cells with inline editing enabled.
    * ⚠ Grid CSS class `.xh-invalid-cell` has been renamed to `.xh-cell--invalid` for consistency -
      any app style overrides should update to this new classname.

### 📚 Libraries

* core-js `3.15 → 3.16`

[Commit Log](https://github.com/xh/hoist-react/compare/v41.1.0...v41.2.0)

## v41.1.0 - 2021-07-23

### 🎁 New Features

* Button to expand / collapse all rows within a tree grid now added by default to the primary tree
  column header. (New `Column.headerHasExpandCollapse` property provided to disable.)
* New `@logWithDebug` annotation provides easy timed logging of method execution (via `withDebug`).
* New `AppSpec.disableXssProtection` config allows default disabling of Field-level XSS protection
  across the app. Intended for secure, internal apps with tight performance tolerances.
* `Constraint` callbacks are now provided with a `record` property when validating Store data and a
  `fieldModel` property when validating Form data.
* New `Badge` component allows a styled badge to be placed inline with text/title, e.g. to show a
  counter or status indicator within a tab title or menu item.
* Updated `TreeMap` color scheme, with a dedicated set of colors for dark mode.
* New XH convenience methods `successToast()`, `warningToast()`, and `dangerToast()` show toast
  alerts with matching intents and appropriate icons.
    * ⚠ Note that the default `XH.toast()` call now shows a toast with the primary (blue) intent and
      no icon. Previously toasts displayed by default with a success (green) intent and checkmark.
* GridModel provides a public API method `setColumnState` for taking a previously saved copy of
  gridModel.columnState and applying it back to a GridModel in one call.

### 🐞 Bug Fixes

* Fixed an issue preventing export of very large (>100k rows) grids.
* Fixed an issue where updating summary data in a Store without also updating other data would not
  update the bound grid.
* Intent styles now properly applied to minimal buttons within `Panel.headerItems`.
* Improved `GridModel` async selection methods to ensure they do not wait forever if grid does not
  mount.
* Fixed an issue preventing dragging the chart navigator range in a dialog.

### ⚙️ Technical

* New `Exception.timeout()` util to throw exceptions explicitly marked as timeouts, used by
  `Promise.timeout` extension.
* `withShortDebug` has been deprecated. Use `withDebug` instead, which has the identical behavior.
  This API simplification mirrors a recent change to `hoist-core`.

### ✨ Styles

* If the first child of a `Placeholder` component is a Hoist icon, it will not automatically be
  styled to 4x size with reduced opacity. (See new Toolbox example under the "Other" tab.)

### 📚 Libraries

* @blueprintjs/core `3.46 → 3.47`
* dompurify `2.2 → 2.3`

[Commit Log](https://github.com/xh/hoist-react/compare/v41.0.0...v41.1.0)

## v41.0.0 - 2021-07-01

### 🎁 New Features

* Inline editing of Grid/Record data is now officially supported:
    + New `Column.editor` config accepts an editor component to enable managed editing of the cells
      in that column. New `CheckboxEditor`, `DateEditor`, `NumberEditor`, `SelectEditor`
      , `TextAreaEditor`
      and `TextEditor` components wrap their corresponding HoistInputs with the required hook-based
      API and can be passed to this new config directly.
    + `Store` now contains built-in support for validation of its uncommitted records. To enable,
      specify the new `rules` property on the `Field`s in your `Store`. Note that these rules and
      constraints use the same API as the forms package, and rules and constraints may be shared
      between the `data` and `form` packages freely.
    + `GridModel` will automatically display editors and record validation messages as the user
      moves between cells and records. The new `GridModel.fullRowEditing` config controls whether
      editors are displayed for the focused cell only or for the entire row.
* All Hoist Components now support a `modelRef` prop. Supply a ref to this prop in order to gain a
  pointer to a Component's backing `HoistModel`.
* `DateInput` has been improved to allow more flexible parsing of user input with multiple formats.
  See the new prop `DateInput.parseStrings`.
* New `Column.sortValue` config takes an alternate field name (as a string) to sort the column by
  that field's value, or a function to produce a custom cell-level value for comparison. The values
  produced by this property will be also passed to any custom comparator, if one is defined.
* New `GridModel.hideEmptyTextBeforeLoad` config prevents showing the `emptyText` until the store
  has been loaded at least once. Apps that depend on showing `emptyText` before first load should
  set this property to `false`.
* `ExpandCollapseButton` now works for grouped grids in addition to tree grids.
* `FieldModel.initialValue` config now accepts functions, allowing for just-in-time initialization
  of Form data (e.g. to pre-populate a Date field with the current time).
* `TreeMapModel` and `SplitTreeMapModel` now support a `maxHeat` config, which can be used to
  provide a stable absolute maximum brightness (positive or negative) within the entire TreeMap.
* `ErrorMessage` will now automatically look for an `error` property on its primary context model.
* `fmtNumber()` supports new flags `withCommas` and `omitFourDigitComma` to customize the treatment
  of commas in number displays.
* `isValidJson` function added to form validation constraints.
* New `Select.enableFullscreen` prop added to the mobile component. Set to true (default on phones)
  to render the input in a full-screen modal when focused, ensuring there is enough room for the
  on-screen keyboard.

### 💥 Breaking Changes

* Removed support for class-based Hoist Components via the `@HoistComponent` decorator (deprecated
  in v38). Use functional components created via the `hoistCmp()` factory instead.
* Removed `DimensionChooser` (deprecated in v37). Use `GroupingChooser` instead.
* Changed the behavior of `FormModel.init()` to always re-initialize *all* fields. (Previously, it
  would only initialize fields explicitly passed via its single argument). We believe that this is
  more in line with developer expectations and will allow the removal of app workarounds to force a
  reset of all values. Most apps using FormModel should not need to change, but please review and
  test any usages of this particular method.
* Replaced the `Grid`, `DataView`, and `RestGrid` props below with new configurable fields on
  `GridModel`, `DataViewModel`, and `RestGridModel`, respectively. This further consolidates grid
  options into the model layer, allowing for more consistent application code and developer
  discovery.
    + `onKeyDown`
    + `onRowClicked`
    + `onRowDoubleClicked`
    + `onCellClicked`
    + `onCellDoubleClicked`
* Renamed the confusing and ambiguous property name `labelAlign` in several components:
    + `FormField`: `labelAlign` has been renamed to `labelTextAlign`
    + `SwitchInput`, `RadioInput`, and `Checkbox`: `labelAlign` has been renamed `labelSide`.
* Renamed all CSS variables beginning with `--navbar` to start with `--appbar`, matching the Hoist
  component name.
* Removed `TreeMapModel.colorMode` value 'balanced'. Use the new `maxHeat` config to prevent outlier
  values from dominating the color range of the TreeMap.
* The classes `Rule` and `ValidationState` and all constraint functions (e.g. `required`,
  `validEmail`, `numberIs`, etc.) have been moved from the `cmp\form` package to the `data` package.
* Hoist grids now require AG Grid v25.3.0 or higher - update your AG Grid dependency in your app's
  `package.json` file. See the [AG Grid Changelog](https://www.ag-grid.com/ag-grid-changelog/) for
  details.
* Hoist charts now require Highcharts v9.1.0 or higher - update your Highcharts dependency in your
  app's `package.json` file. See the
  [Highcharts Changelog](https://www.highcharts.com/changelog/#highcharts-stock) for details.

### 🐞 Bug Fixes

* Fixed disable behavior for Hoist-provided button components using popover.
* Fixed default disabling of autocomplete within `TextInput`.
* Squelched console warning re. precision/stepSize emitted by Blueprint-based `numberInput`.

### ⚙️ Technical

* Improved exception serialization to better handle `LocalDate` and similar custom JS classes.
* Re-exported Blueprint `EditableText` component (w/elemFactory wrapper) from `kit/blueprint`.

### 📚 Libraries

* @blueprintjs/core `3.44 → 3.46`
* codemirror `5.60 → 5.62`
* core-js `3.10 → 3.15`
* filesize `6.2 → 6.4`
* mobx `6.1 → 6.3`
* react-windowed-select `3.0 → 3.1`

[Commit Log](https://github.com/xh/hoist-react/compare/v40.0.0...v41.0.0)

## v40.0.0 - 2021-04-22

⚠ Please ensure your `@xh/hoist-dev-utils` dependency is >= v5.7.0. This is required to support the
new changelog feature described below. Even if you are not yet using the feature, you must update
your dev-utils dependency for your project to build.

### 🎁 New Features

* Added support for displaying an in-app changelog (release notes) to the user. See the new
  `ChangelogService` for details and instructions on how to enable.
* Added `XH.showBanner()` to display a configurable banner across the top of viewport, as another
  non-modal alternative for attention-getting application alerts.
* New method `XH.showException()` uses Hoist's built-in exception display to show exceptions that
  have already been handled directly by application code. Use as an alternative to
  `XH.handleException()`.
* `XH.track()` supports a new `oncePerSession` option. This flag can be set by applications to avoid
  duplicate tracking messages for certain types of activity.
* Mobile `NavigatorModel` now supports a `track` flag to automatically track user page views,
  equivalent to the existing `track` flag on `TabContainerModel`. Both implementations now use the
  new `oncePerSession` flag to avoid duplicate messages as a user browses within a session.
* New `Spinner` component returns a simple img-based spinner as an animated PNG, available in two
  sizes. Used for the platform-specific `Mask` and `LoadingIndicator` components. Replaces previous
  SVG-based implementations to mitigate rendering performance issues over remote connections.

### 💥 Breaking Changes

* `Store` now creates a shared object to hold the default values for every `Field` and uses this
  object as the prototype for the `data` property of every `Record` instance.
    * Only non-default values are explicitly written to `Record.data`, making for a more efficient
      representation of default values and improving the performance of `Record` change detection.
    * Note this means that `Record.data` *no longer* contains keys for *all* fields as
      `own-enumerable` properties.
    * Applications requiring a full enumeration of all values should call the
      new `Record.getValues()`
      method, which returns a new and fully populated object suitable for spreading or cloning.
    * This behavior was previously available via `Store.experimental.shareDefaults` but is now
      always enabled.
* For API consistency with the new `showBanner()` util, the `actionFn` prop for the recently-added
  `ErrorMessage` component has been deprecated. Specify as an `onClick` handler within the
  component's `actionButtonProps` prop instead.
* The `GridModel.experimental.externalSort` flag has been promoted from an experiment to a
  fully-supported config. Default remains `false`, but apps that were using this flag must now pass
  it directly: `new GridModel({externalSort: true, ...})`.
* Hoist re-exports and wrappers for the Blueprint `Spinner` and Onsen `ProgressCircular` components
  have been removed, in favor of the new Hoist `Spinner` component mentioned above.
* Min version for `@xh/hoist-dev-utils` is now v5.7.0, as per above.

### 🐞 Bug Fixes

* Formatters in the `@xh/hoist/format` package no longer modify their options argument.
* `TileFrame` edge-case bug fixed where the appearance of an internal scrollbar could thrash layout
  calculations.
* XSS protection (dompurify processing) disabled on selected REST editor grids within the Hoist
  Admin console. Avoids content within configs and JSON blobs being unintentionally mangled.

### ⚙️ Technical

* Improvements to exception serialization, especially for any raw javascript `Error` thrown by
  client-side code.

### ✨ Styles

* Buttons nested inline within desktop input components (e.g. clear buttons) tweaked to avoid
  odd-looking background highlight on hover.
* Background highlight color of minimal/outlined buttons tweaked for dark theme.
* `CodeInput` respects standard XH theme vars for its background-color and (monospace) font family.
  Its built-in toolbar has also been made compact and slightly re-organized.

### 📚 Libraries

* @blueprintjs/core `3.41 → 3.44`
* @blueprintjs/datetime `3.21 → 3.23`
* classnames `2.2 → 2.3`
* codemirror `5.59 → 5.60`
* core-js `3.9 → 3.10`
* filesize `6.1 → 6.2`
* qs `6.9 → 6.10`
* react-beautiful-dnd `13.0 → 13.1`
* react-select `4.2 → 4.3`

[Commit Log](https://github.com/xh/hoist-react/compare/v39.0.1...v40.0.0)

## v39.0.1 - 2021-03-24

### 🐞 Bug Fixes

* Fixes regression preventing the loading of the Activity Tab in the Hoist Admin console.
* Fixes icon alignment in `DateInput`.

[Commit Log](https://github.com/xh/hoist-react/compare/v39.0.0...v39.0.1)

## v39.0.0 - 2021-03-23

### 🎁 New Features

#### Components + Props

* New `TileFrame` layout component renders a collection of child items using a layout that balances
  filling the available space against maintaining tile width / height ratio.
* Desktop `Toolbar` accepts new `compact` prop. Set to `true` to render the toolbar with reduced
  height and font-size.
* New `StoreFilterField` prop `autoApply` allows developers to more easily use `StoreFilterField` in
  conjunction with other filters or custom logic. Set to `false` and specify an `onFilterChange`
  callback to take full control of filter application.
* New `RestGrid` prop `formClassName` allows custom CSS class to be applied to its managed
  `RestForm` dialog.

#### Models + Configs

* New property `selectedRecordId` on `StoreSelectionModel`, `GridModel`, and `DataViewModel`.
  Observe this instead of `selectedRecord` when you wish to track only the `id` of the selected
  record and not changes to its data.
* `TreeMapModel.colorMode` config supports new value `wash`, which retains the positive and negative
  color while ignoring the intensity of the heat value.
* New method `ChartModel.updateHighchartsConfig()` provides a more convenient API for changing a
  chart's configuration post-construction.
* New `Column.omit` config supports conditionally excluding a column from its `GridModel`.

#### Services + Utils

* New method `FetchService.setDefaultTimeout()`.
* New convenience getter `LocalDate.isToday`.
* `HoistBase.addReaction()` now accepts convenient string values for its `equals` flag.

### 💥 Breaking Changes

* The method `HoistAppModel.preAuthInitAsync()` has been renamed to `preAuthAsync()` and should now
  be defined as `static` within apps that implement it to run custom pre-authentication routines.
    * This change allows Hoist to defer construction of the `AppModel` until Hoist itself has been
      initialized, and also better reflects the special status of this function and when it is
      called in the Hoist lifecycle.
* Hoist grids now require AG Grid v25.1.0 or higher - update your AG Grid dependency in your app's
  `package.json` file. See the [AG Grid Changelog](https://www.ag-grid.com/ag-grid-changelog/) for
  details.

### ⚙️ Technical

* Improvements to behavior/performance of apps in hidden/inactive browser tabs. See the
  [page visibility API reference](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API)
  for details. Now, when the browser tab is hidden:
    * Auto-refresh is suspended.
    * The `forEachAsync()` and `whileAsync()` utils run synchronously, without inserting waits that
      would be overly throttled by the browser.
* Updates to support compatibility with agGrid 25.1.0.
* Improved serialization of `LoadSpec` instances within error report stacktraces.

### 📚 Libraries

* @blueprintjs/core `3.39 → 3.41`
* @blueprintjs/datetime `3.20 → 3.21`
* @popperjs/core `2.8 → 2.9`
* core-js `3.8 → 3.9`
* react-select `4.1 → 4.2`

[Commit Log](https://github.com/xh/hoist-react/compare/v38.3.0...v39.0.0)

## v38.3.0 - 2021-03-03

### 🎁 New Features

* New `Store.freezeData` and `Store.idEncodesTreePath` configs added as performance optimizations
  when loading very large data sets (50k+ rows).
* New `ColChooserModel.autosizeOnCommit` config triggers an autosize run whenever the chooser is
  closed. (Defaulted to true on mobile.)

[Commit Log](https://github.com/xh/hoist-react/compare/v38.2.0...v38.3.0)

## v38.2.0 - 2021-03-01

### 🐞 Bug Fixes

* Fix to edge-case where `Grid` would lose its selection if set on the model prior to the component
  mounting and AG Grid full rendering.
* Fix to prevent unintended triggering of app auto-refresh immediately after init.

### ⚙️ Technical

* New config `Cube.fieldDefaults` - matches same config added to `Store` in prior release.
* App auto-refresh interval keys off of last *completed* refresh cycle if there is one. Avoids
  over-eager refresh when cycle is fast relative to the time it takes to do the refresh.
* New experimental property `Store.experimental.shareDefaults`. If true, `Record.data` will be
  created with default values for all fields stored on a prototype, with only non-default values
  stored on `data` directly. This can yield major performance improvements for stores with sparsely
  populated records (i.e. many records with default values). Note that when set, the `data` property
  on `Record` will no longer contain keys for *all* fields as `own-enumerable` properties. This may
  be a breaking change for some applications.

[Commit Log](https://github.com/xh/hoist-react/compare/v38.1.1...v38.2.0)

## v38.1.1 - 2021-02-26

### ⚙️ Technical

* New config `Store.fieldDefaults` supports defaulting config options for all `Field` instances
  created by a `Store`.

[Commit Log](https://github.com/xh/hoist-react/compare/v38.1.0...v38.1.1)

## v38.1.0 - 2021-02-24

⚠ Please ensure your `@xh/hoist-dev-utils` dependency is >= v5.6.0. This is required to successfully
resolve and bundle transitive dependencies of the upgraded `react-select` library.

### 🐞 Bug Fixes

* A collapsible `Panel` will now restore its user specified-size when re-opened. Previously the
  panel would be reset to the default size.
* `Store.lastLoaded` property now initialized to `null`. Previously this property had been set to
  the construction time of the Store.
* Tweak to `Grid` style rules to ensure sufficient specificity of rules related to indenting child
  rows within tree grids.
* Improvements to parsing of `Field`s of type 'int': we now correctly parse values presented in
  exponential notation and coerce `NaN` values to `null`.

### 🎁 New Features

* `GridModel` has new async variants of existing methods: `selectFirstAsync`, `selectAsync`, and
  `ensureSelectionVisibleAsync`. These methods build-in the necessary waiting for the underlying
  grid implementation to be ready and fully rendered to ensure reliable selection. In addition, the
  first two methods will internally call the third. The existing non-async counterparts for these
  methods have been deprecated.
* GridModel has a new convenience method `preSelectFirstAsync` for initializing the selection in
  grids, without disturbing any existing selection.
* Added new `Store.loadTreeData` config (default `true`) to enable or disable building of nested
  Records when the raw data elements being loaded have a `children` property.
* Cube `View` now detects and properly handles streaming updates to source data that include changes
  to row dimensions as well as measures.*
* `DataViewModel.itemHeight` can now be a function that returns a pixel height.
* The `LoadSpec` object passed to `doLoadAsync()` is now a defined class with additional properties
  `isStale`, `isObsolete` and `loadNumber`. Use these properties to abandon out-of-order
  asynchronous returns from the server.
    * 💥 NOTE that calls to `loadAsync()` no longer accept a plain object for their `loadSpec`
      parameter. Application code such as `fooModel.loadAsync({isRefresh: true})` should be updated
      to use the wrapper APIs provided by `LoadSupport` - e.g. `fooModel.refreshAsync()`. (This was
      already the best practice, but is now enforced.)
* New `autoHeight` property on grid `Column`. When set the grid will increase the row height
  dynamically to accommodate cell content in this column.

### 📚 Libraries

* @blueprintjs/core `3.38 → 3.39`
* react-select `3.1 → 4.1`
* react-windowed-select `2.0 → 3.0`

[Commit Log](https://github.com/xh/hoist-react/compare/v38.0.0...v38.1.0)

## v38.0.0 - 2021-02-04

Hoist v38 includes major refactoring to streamline core classes, bring the toolkit into closer
alignment with the latest developments in Javascript, React, and MobX, and allow us to more easily
provide documentation and additional features. Most notably, we have removed the use of class based
decorators, in favor of a simpler inheritance-based approach to defining models and services.

* We are introducing a new root superclass `HoistBase` which provides many of the syntax
  enhancements and conventions used throughout Hoist for persistence, resource management, and
  reactivity.
* New base classes of `HoistModel` and `HoistService` replace the existing class decorators
  `@HoistModel` and `@HoistService`. Application models and services should now `extend` these base
  classes instead of applying the (now removed) decorators. For your application's `AppModel`,
  extend the new `HoistAppModel` superclass.
* We have also removed the need for the explicit `@LoadSupport` annotation on these classes. The
  presence of a defined `doLoadAsync()` method is now sufficient to allow classes extending
  `HoistModel` and `HoistService` to participate in the loading and refreshing lifecycle as before.
* We have deprecated support for class-based Components via the `@HoistComponent` class decorator.
  To continue to use this decorator, please import it from the `@xh\hoist\deprecated` package.
  Please note that we plan to remove `@HoistComponent` in a future version.
* Due to changes in MobX v6.0.1, all classes that host observable fields and actions will now also
  need to provide a constructor containing a call to `makeObservable(this)`. This change will
  require updates to most `HoistModel` and `HoistService` classes. See
  [this article from MobX](https://michel.codes/blogs/mobx6) for more on this change and the
  motivation behind it.

### 🎁 New Features

* New utility method `getOrCreate` for easy caching of properties on objects.
* The `Menu` system on mobile has been reworked to be more consistent with desktop. A new
  `MenuButton` component has been added to the mobile framework, which renders a `Menu` of
  `MenuItems` next to the `MenuButton`. This change also includes the removal of `AppMenuModel` (see
  Breaking Changes).
* Added `ExpandCollapseButton` to the mobile toolkit, to expand / collapse all rows in a tree grid.
* Added `Popover` to the mobile toolkit, a component to display floating content next to a target
  element. Its API is based on the Blueprint `Popover` component used on desktop.
* `StoreFilterField` now matches the rendered string values for `date` and `localDate` fields when
  linked to a properly configured `GridModel`.
* `GroupingChooser` gets several minor usability improvements + clearer support for an empty /
  ungrouped state, when so enabled.

### 💥 Breaking Changes

* All `HoistModel` and `HoistService` classes must be adjusted as described above.
* `@HoistComponent` has been deprecated and moved to `@xh\hoist\deprecated`
* Hoist grids now require AG Grid v25.0.1 or higher - if your app uses AG Grid, update your AG Grid
  dependency in your app's `package.json` file.
* The `uses()` function (called within `hoistComponent()` factory configs for model context lookups)
  and the `useContextModel()` function no longer accept class names as strings. Pass the class
  itself (or superclass) of the model you wish to select for your component. `Uses` will throw if
  given any string other than "*", making the need for any updates clear in that case.
* The `Ref` class, deprecated in v26, has now been removed. Use `createObservableRef` instead.
* `AppMenuModel` has been removed. The `AppMenuButton` is now configured via
  `AppBar.appMenuButtonProps`. As with desktop, menu items can be added with
  `AppBar.appMenuButtonProps.extraItems[]`

### ⚙️ Technical

* We have removed the experimental flags `useTransactions`, and `deltaSort` from `GridModel`. The
  former has been the default behavior for Hoist for several releases, and the latter is obsolete.

### 📚 Libraries

* @blueprintjs/core `3.36 → 3.38`
* codemirror `5.58 → 5.59`
* mobx `5.15 → 6.1`
* mobx-react `6.3 → 7.1`

[Commit Log](https://github.com/xh/hoist-react/compare/v37.2.0...v38.0.0)

## v37.2.0 - 2021-01-22

### 🎁 New Features

* New `ErrorMessage` component for standard "inline" rendering of Errors and Exceptions, with retry
  support.
* `Cube` now supports an `omitFn` to allow apps to remove unwanted, single-node children.

[Commit Log](https://github.com/xh/hoist-react/compare/v37.1.0...v37.2.0)

## v37.1.0 - 2021-01-20

### 🎁 New Features

* Columns in `ColChooser` can now be filtered by their `chooserGroup`.
* `Cube` now supports a `bucketSpecFn` config which allows dynamic bucketing and aggregation of
  rows.

### 🐞 Bug Fixes

* Fix issue where a `View` would create a root row even if there were no leaf rows.
* Fixed regression in `LeftRightChooser` not displaying description callout.

[Commit Log](https://github.com/xh/hoist-react/compare/v37.0.0...v37.1.0)

## v37.0.0 - 2020-12-15

### 🎁 New Features

* New `GroupingChooser` component provides a new interface for selecting a list of fields
  (dimensions) for grouping APIs, offering drag-and-drop reordering and persisted favorites.
    * This is intended as a complete replacement for the existing `DimensionChooser`. That component
      should be considered deprecated and will be removed in future releases.
* New props added to `TabSwitcher`:
    * `enableOverflow` shows tabs that would normally overflow their container in a drop down menu.
    * `tabWidth`, `tabMinWidth` & `tabMaxWidth` allow flexible configuration of tab sizes within the
      switcher.
* `TabModel` now supports a bindable `tooltip`, which can be used to render strings or elements
  while hovering over tabs.
* New `Placeholder` component provides a thin wrapper around `Box` with standardized, muted styling.
* New `StoreFilterField.matchMode` prop allows customizing match to `start`, `startWord`, or `any`.
* `Select` now implements enhanced typeahead filtering of options. The default filtering is now
  based on a case-insensitive match of word starts in the label. (Previously it was based on a match
  _anywhere_ in the label _or_ value.) To customize this behavior, applications should use the new
  `filterFn` prop.
* New Admin Console Monitor > Memory tab added to view snapshots of JVM memory usage. (Requires
  Hoist Core v8.7 or greater.)
* `FormModel` and `FieldModel` gain support for Focus Management.
* New `boundInput` getter on `FieldModel` to facilitate imperative access to controls, when needed.
  This getter will return the new `HoistInputModel` interface, which support basic DOM access as
  well as standard methods for `focus()`, `blur()`, and `select()`.
* New `GridModel` config `lockColumnGroups` to allow controlling whether child columns can be moved
  outside their parent group. Defaults to `true` to maintain existing behavior.

### 💥 Breaking Changes

* New `TabContainerModel` config `switcher` replaces `switcherPosition` to allow for more flexible
  configuration of the default `TabSwitcher`.
    * Use `switcher: true` to retain default behavior.
    * Use `switcher: false` to not include a TabSwitcher. (previously `switcherPosition: 'none'`)
    * Use `switcher: {...}` to provide customisation props for the `TabSwitcher`. See `TabSwitcher`
      documentation for more information.
* The `HoistInput` base class has been removed. This change marks the completion of our efforts to
  remove all internal uses of React class-based Components in Hoist. The following adjustments are
  required:
    * Application components extending `HoistInput` should use the `useHoistInputModel` hook
      instead.
    * Applications getting refs to `HoistInputs` should be aware that these refs now return a ref to
      a
      `HoistInputModel`. In order to get the DOM element associated with the component use the new
      `domEl` property of that model rather than the`HoistComponent.getDOMNode()` method.
* Hoist grids now require AG Grid v24.1.0 or higher - update your AG Grid dependency in your app's
  `package.json` file. AG Grid v24.1.0
  [lists 5 breaking changes](https://www.ag-grid.com/ag-grid-changelog/), including the two called
  out below. *Note that these cautions apply only to direct use of the AG Grid APIs* - if your app
  is using the Hoist `Grid` and `GridModel` exclusively, there should be no need to adjust code
  around columns or grid state, as the related Hoist classes have been updated to handle these
  changes.
    * AG-4291 - Reactive Columns - the state pattern for ag-grid wrapper has changed as a result of
      this change. If your app made heavy use of saving/loading grid state, please test carefully
      after upgrade.
    * AG-1959 - Aggregation - Add additional parameters to the Custom Aggregation methods. If your
      app implements custom aggregations, they might need to be updated.

### 🔒 Security

* The data package `Field` class now sanitizes all String values during parsing, using the DOMPurify
  library to defend against XSS attacks and other issues with malformed HTML or scripting content
  loaded into `Record`s and rendered by `Grid` or other data-driven components. Please contact XH if
  you find any reason to disable this protection, or observe any unintended side effects of this
  additional processing.

### 🐞 Bug Fixes

* Fix issue where grid row striping inadvertently disabled by default for non-tree grids.
* Fix issue where grid empty text cleared on autosize.

### ✨ Styles

* Default `Chart` themes reworked in both light and dark modes to better match overall Hoist theme.

### ⚙️ Technical

* Note that the included Onsen fork has been replaced with the latest Onsen release. Apps should not
  need to make any changes.
* `Cube.info` is now directly observable.
* `@managed` and `markManaged` have been enhanced to allow for the cleanup of arrays of objects as
  well as objects. This matches the existing array support in `XH.safeDestroy()`.

### 📚 Libraries

* @xh/onsenui `~0.1.2` → onsenui `~2.11.1`
* @xh/react-onsenui `~0.1.2` → react-onsenui `~1.11.3`
* @blueprintjs/core `3.35 → 3.36`
* @blueprintjs/datetime `3.19 → 3.20`
* clipboard-copy `3.1 → 4.0`
* core-js `3.6 → 3.8`
* dompurify `added @ 2.2`
* react `16.13 → 17.0`
* semver `added @ 7.3`

[Commit Log](https://github.com/xh/hoist-react/compare/v36.6.1...v37.0.0)

## v36.6.1 - 2020-11-06

### 🐞 Bug Fixes

* Fix issue where grid row striping would be turned off by default for non-tree grids

[Commit Log](https://github.com/xh/hoist-react/compare/v36.6.0...v36.6.1)

## v36.6.0 - 2020-10-28

### 🎁 New Features

* New `GridModel.treeStyle` config enables more distinctive styling of tree grids, with optional
  background highlighting and ledger-line style borders on group rows.
    * ⚠ By default, tree grids will now have highlighted group rows (but no group borders). Set
      `treeStyle: 'none'` on any `GridModel` instances where you do _not_ want the new default
      style.
* New `DashContainerModel.extraMenuItems` config supports custom app menu items in Dashboards
* An "About" item has been added to the default app menu.
* The default `TabSwitcher` now supports scrolling, and will show overflowing tabs in a drop down
  menu.

### 🐞 Bug Fixes

* Ensure that `Button`s with `active: true` set directly (outside of a `ButtonGroupInput`) get the
  correct active/pressed styling.
* Fixed regression in `Column.tooltip` function displaying escaped HTML characters.
* Fixed issue where the utility method `calcActionColWidth` was not correctly incorporating the
  padding in the returned value.

### ⚙️ Technical

* Includes technical updates to `JsonBlob` archiving. This change requires an update to `hoist-core`
  `v8.6.1` or later, and modifications to the `xh_json_blob` table. See the
  [hoist-core changelog](https://github.com/xh/hoist-core/blob/develop/CHANGELOG.md) for further
  details.

### 📚 Libraries

* @blueprintjs/core `3.33 → 3.35`

[Commit Log](https://github.com/xh/hoist-react/compare/v36.5.0...v36.6.0)

## v36.5.0 - 2020-10-16

### 🐞 Bug Fixes

* Fix text and hover+active background colors for header tool buttons in light theme.

### ⚙️ Technical

* Install a default simple string renderer on all columns. This provides consistency in column
  rendering, and fixes some additional issues with alignment and rendering of Grid columns
  introduced by the change to flexbox-based styling in grid cells.
* Support (optional) logout action in SSO applications.

### 📚 Libraries

* @blueprintjs/core `3.31 → 3.33`
* @blueprintjs/datetime `3.18 → 3.19`
* @fortawesome/fontawesome-pro `5.14 → 5.15`
* moment `2.24 → 2.29`
* numbro `2.2 → 2.3`

[Commit Log](https://github.com/xh/hoist-react/compare/v36.4.0...v36.5.0)

## v36.4.0 - 2020-10-09

### 🎁 New Features

* `TabContainerModel` supports dynamically adding and removing tabs via new public methods.
* `Select` supports a new `menuWidth` prop to control the width of the dropdown.

### 🐞 Bug Fixes

* Fixed v36.3.0 regression re. horizontal alignment of Grid columns.

[Commit Log](https://github.com/xh/hoist-react/compare/v36.3.0...v36.4.0)

## v36.3.0 - 2020-10-07

### 💥 Breaking Changes

* The following CSS variables are no longer in use:
    + `--xh-grid-line-height`
    + `--xh-grid-line-height-px`
    + `--xh-grid-large-line-height`
    + `--xh-grid-large-line-height-px`
    + `--xh-grid-compact-line-height`
    + `--xh-grid-compact-line-height-px`
    + `--xh-grid-tiny-line-height`
    + `--xh-grid-tiny-line-height-px`

### ⚙️ Technical

* We have improved and simplified the vertical centering of content within Grid cells using
  flexbox-based styling, rather than the CSS variables above.

### 🎁 New Features

* `Select` now supports `hideSelectedOptions` and `closeMenuOnSelect` props.
* `XH.message()` and its variants (`XH.prompt(), XH.confirm(), XH.alert()`) all support an optional
  new config `messageKey`. This key can be used by applications to prevent popping up the same
  dialog repeatedly. Hoist will only show the last message posted for any given key.
* Misc. Improvements to organization of admin client tabs.

### 🐞 Bug Fixes

* Fixed issue with sporadic failures reading grid state using `legacyStateKey`.
* Fixed regression to the display of `autoFocus` buttons; focus rectangle restored.

[Commit Log](https://github.com/xh/hoist-react/compare/v36.2.1...v36.3.0)

## v36.2.1 - 2020-10-01

### 🐞 Bug Fixes

* Fixed issue in `LocalDate.previousWeekday()` which did not correctly handle Sunday dates.
* Fixed regression in `Grid` column header rendering for non-string headerNames.

[Commit Log](https://github.com/xh/hoist-react/compare/v36.2.0...v36.2.1)

## v36.2.0 - 2020-09-25

### 💥 Breaking Changes

* New `GridModel` config `colChooserModel` replaces `enableColChooser` to allow for more flexible
  configuration of the grid `colChooser`
    * Use `colChooserModel: true` to retain default behavior.
    * See documentation on `GridModel.ColChooserModelConfig` for more information.
* The `Grid` `hideHeaders` prop has been converted to a field on `AgGridModel` and `GridModel`. All
  grid options of this type are now on the model hierarchy, allowing consistent application code and
  developer discovery.

### 🎁 New Features

* Provides new `CustomProvider` for applications that want to use the Persistence API, but need to
  provide their own storage implementation.
* Added `restoreDefaults` action to default context menu for `GridModel`.
* Added `restoreDefaultsWarning` config to `GridModel`.
* `FormModel` has a new convenience method `setValues` for putting data into one or more fields in
  the form.
* Admin Preference and Config panels now support bulk regrouping actions.

### 🐞 Bug Fixes

* Fixed an error in implementation of `@managed` preventing proper cleanup of resources.
* Fixed a regression introduced in v36.1.0 in `FilterChooser`: Restore support for `disabled` prop.

[Commit Log](https://github.com/xh/hoist-react/compare/v36.1.0...v36.2.0)

## v36.1.0 - 2020-09-22

⚠ NOTE - apps should update to `hoist-core >= 8.3.0` when taking this hoist-react update. This is
required to support both the new `JsonBlobService` and updates to the Admin Activity and Client
Error tracking tabs described below.

### 🎁 New Features

* Added new `JsonBlobService` for saving and updating named chunks of arbitrary JSON data.
* `GridModelPersistOptions` now supports a `legacyStateKey` property. This key will identify the
  pre-v35 location for grid state, and can be used by applications to provide a more flexible
  migration of user grid state after an upgrade to Hoist v35.0.0 or greater. The value of this
  property will continue to default to 'key', preserving the existing upgrade behavior of the
  initial v35 release.
* The Admin Config and Pref diff tools now support pasting in a config for comparison instead of
  loading one from a remote server (useful for deployments where the remote config cannot be
  accessed via an XHR call).
* The `ClipboardButton.getCopyText` prop now supports async functions.
* The `Select` input supports a new `leftIcon` prop.
* `RestGrid` now supports bulk delete when multiple rows are selected.
* `RestGrid`'s `actionWarning` messages may now be specified as functions.

### 🐞 Bug Fixes

* Fixed several cases where `selectOnFocus` prop on `Select` was not working.
* `FilterChooser` auto-suggest values sourced from the *unfiltered* records on `sourceStore`.
* `RestForm` editors will now source their default label from the corresponding `Field.displayName`
  property. Previously an undocumented `label` config could be provided with each editor object -
  this has been removed.
* Improved time zone handling in the Admin Console "Activity Tracking" and "Client Errors" tabs.
    * Users will now see consistent bucketing of activity into an "App Day" that corresponds to the
      LocalDate when the event occurred in the application's timezone.
    * This day will be reported consistently regardless of the time zones of the local browser or
      deployment server.
* Resetting Grid columns to their default state (e.g. via the Column Chooser) retains enhancements
  applied from matching Store fields.
* Desktop `DateInput` now handles out-of-bounds dates without throwing exception during rendering.
* Dragging a grid column with an element-based header no longer displays `[object Object]` in the
  draggable placeholder.

### 📚 Libraries

* codemirror `5.57 → 5.58`

[Commit Log](https://github.com/xh/hoist-react/compare/v36.0.0...v36.1.0)

## v36.0.0 - 2020-09-04

### 🎁 New Features

#### Data Filtering

We have enhanced support for filtering data in Hoist Grids, Stores, and Cubes with an upgraded
`Filter` API and a new `FilterChooser` component. This bundle of enhancements includes:

* A new `@xh/hoist/data/filter` package to support the creation of composable filters, including the
  following new classes:
    * `FieldFilter` - filters by comparing the value of a given field to one or more given candidate
      values using one of several supported operators.
    * `FunctionFilter` - filters via a custom function specified by the developer.
    * `CompoundFilter` - combines multiple filters (including other nested CompoundFilters) via an
      AND or OR operator.
* A new `FilterChooser` UI component that integrates tightly with these data package classes to
  provide a user and developer friendly autocomplete-enabled UI for filtering data based on
  dimensions (e.g. trader = jdoe, assetClass != Equities), metrics (e.g. P&L > 1m), or any
  combination thereof.
* Updates to `Store`, `StoreFilterField`, and `cube/Query` to use the new Filter API.
* A new `setFilter()` convenience method to `Grid` and `DataView`.

To get the most out of the new Filtering capabilities, developers are encouraged to add or expand
the configs for any relevant `Store.fields` to include both their `type` and a `displayName`. Many
applications might not have Field configs specified at all for their Stores, instead relying on
Store's ability to infer its Fields from Grid Column definitions.

We are looking to gradually invert this relationship, so that core information about an app's
business objects and their properties is configured once at the `data/Field` level and then made
available to related APIs and components such as grids, filters, and forms. See note in New Features
below regarding related updates to `GridModel.columns` config processing.

#### Grid

* Added new `GridModel.setColumnVisible()` method, along with `showColumn()` and `hideColumn()`
  convenience methods. Can replace calls to `applyColumnStateChanges()` when all you need to do is
  show or hide a single column.
* Elided Grid column headers now show the full `headerName` value in a tooltip.
* Grid column definitions now accept a new `displayName` config as the recommended entry point for
  defining a friendly user-facing label for a Column.
    * If the GridModel's Store has configured a `displayName` for the linked data field, the column
      will default to use that (if not otherwise specified).
    * If specified or sourced from a Field, `displayName` will be used as the default value for the
      pre-existing `headerName` and `chooserName` configs.
* Grid columns backed by a Store Field of type `number` or `int` will be right-aligned by default.
* Added new `GridModel.showGroupRowCounts` config to allow easy hiding of group row member counts
  within each full-width group row. Default is `true`, maintaining current behavior of showing the
  counts for each group.

#### Other

* Added new `AppSpec.showBrowserContextMenu` config to control whether the browser's default context
  menu will be shown if no app-specific context menu (e.g. from a grid) would be triggered.
    * ⚠ Note this new config defaults to `false`, meaning the browser context menu will *not* be
      available. Developers should set to true for apps that expect/depend on the built-in menu.
* `LocalDate` has gained several new static factories: `tomorrow()`, `yesterday()`,
  `[start/end]OfMonth()`, and `[start/end]OfYear()`.
* A new `@computeOnce` decorator allows for lazy computation and caching of the results of decorated
  class methods or getters. Used in `LocalDate` and intended for similar immutable, long-lived
  objects that can benefit from such caching.
* `CodeInput` and `JsonInput` get new `enableSearch` and `showToolbar` props. Enabling search
  provides an simple inline find feature for searching the input's contents.
* The Admin console's Monitor Status tab displays more clearly when there are no active monitors.

### 💥 Breaking Changes

* Renamed the `data/Field.label` property to `displayName`.
* Changed the `DimensionChooserModel.dimensions` config to require objects of the
  form `{name, displayName, isLeafDimension}` when provided as an `Object[]`.
    * Previously these objects were expected to be of the form `{value, label, isLeaf}`.
    * Note however that this same config can now be passed the `dimensions` directly from a
      configured
      `Cube` instead, which is the recommended approach and should DRY up dimension definitions for
      typical use cases.
* Changes required due to the new filter API:
    * The classes `StoreFilter` and `ValueFilter` have been removed and replaced by `FunctionFilter`
      and `FieldFilter`, respectively. In most cases apps will need to make minimal or no changes.
    * The `filters/setFilters` property on `Query` has been changed to `filter/setFilter`. In most
      case apps should not need to change anything other than the name of this property - the new
      property will continue to support array representations of multiple filters.
    * `Store` has gained a new property `filterIncludesChildren` to replace the functionality
      previously provided by `StoreFilter.includesChildren`.
    * `StoreFilterField.filterOptions` has been removed. Set `filterIncludesChildren` directly on
      the store instead.

### ✨ Styles

* CSS variables for "intents" - most commonly used on buttons - have been reworked to use HSL color
  values and support several standard variations of lightness and transparency.
    * Developers are encouraged to customize intents by setting the individual HSL vars provided for
      each intent (e.g. `--intent-primary-h` to adjust the primary hue) and/or the different levels
      of lightness (e.g. `--intent-primary-l3` to adjust the default lightness).
    * ⚠ Uses of the prior intent var overrides such as `--intent-primary` will no longer work. It is
      possible to set directly via `--xh-intent-primary`, but components such as buttons will still
      use the default intent shades for variations such as hover and pressed states. Again, review
      and customize the HSL vars if required.
* Desktop `Button` styles and classes have been rationalized and reworked to allow for more
  consistent and direct styling of buttons in all their many permutations (standard/minimal/outlined
  styles * default/hovered/pressed/disabled states * light/dark themes).
    * Customized intent colors will now also be applied to outlined and minimal buttons.
    * Dedicated classes are now applied to desktop buttons based on their style and state.
      Developers can key off of these classes directly if required.

### 🐞 Bug Fixes

* Fixed `Column.tooltipElement` so that it can work if a `headerTooltip` is also specified on the
  same column.
* Fixed issue where certain values (e.g. `%`) would break in `Column.tooltipElement`.
* Fixed issue where newly loaded records in `Store` were not being frozen as promised by the API.

### 📚 Libraries

* @blueprintjs/core `3.30 → 3.31`
* codemirror `5.56 → 5.57`
* http-status-codes `1.4 → 2.1`
* mobx-react `6.2 → 6.3`
* store2 `2.11 → 2.12`

[Commit Log](https://github.com/xh/hoist-react/compare/v35.2.1...v36.0.0)

## v35.2.1 - 2020-07-31

### 🐞 Bug Fixes

* A Grid's docked summary row is now properly cleared when its bound Store is cleared.
* Additional SVG paths added to `requiredBlueprintIcons.js` to bring back calendar scroll icons on
  the DatePicker component.
* Colors specified via the `--xh-intent-` CSS vars have been removed from minimal / outlined desktop
  `Button` components because of incompatibility with `ButtonGroupInput` component. Fix to address
  issue forthcoming. (This reverts the change made in 35.2.0 below.)

[Commit Log](https://github.com/xh/hoist-react/compare/v35.2.0...v35.2.1)

## v35.2.0 - 2020-07-21

### 🎁 New Features

* `TabContainerModel` now supports a `persistWith` config to persist the active tab.
* `TabContainerModel` now supports a `emptyText` config to display when TabContainer gets rendered
  with no children.

### ⚙️ Technical

* Supports smaller bundle sizes via a greatly reduced set of BlueprintJS icons. (Requires apps to be
  built with `@xh/hoist-dev-utils` v5.2 or greater to take advantage of this optimization.)

### 🐞 Bug Fixes

* Colors specified via the `--xh-intent-` CSS vars are now applied to minimal / outlined desktop
  `Button` components. Previously they fell through to use default Blueprint colors in these modes.
* Code input correctly handles dynamically toggling readonly/disabled state.

### 📚 Libraries

* @fortawesome/fontawesome-pro `5.13 → 5.14`
* codemirror `5.55 → 5.56`

[Commit Log](https://github.com/xh/hoist-react/compare/v35.1.1...v35.2.0)

## v35.1.1 - 2020-07-17

### 📚 Libraries

* @blueprintjs/core `3.29 → 3.30`

[Commit Log](https://github.com/xh/hoist-react/compare/v35.1.0...v35.1.1)

## v35.1.0 - 2020-07-16

### 🎁 New Features

* Extend existing environment diff tool to preferences. Now, both configs and preferences may be
  diffed across servers. This feature will require an update of hoist-core to a version 8.1.0 or
  greater.
* `ExportOptions.columns` provided to `GridModel` can now be specified as a function, allowing for
  full control of columns to export, including their sort order.

### 🐞 Bug Fixes

* `GridModel`s export feature was previously excluding summary rows. These are now included.
* Fixed problems with coloring and shading algorithm in `TreeMap`.
* Fixed problems with sort order of exports in `GridModel`.
* Ensure that preferences are written to server, even if set right before navigating away from page.
* Prevent situation where a spurious exception can be sent to server when application is unloaded
  while waiting on a fetch request.

[Commit Log](https://github.com/xh/hoist-react/compare/v35.0.1...v35.1.0)

## v35.0.1 - 2020-07-02

### 🐞 Bug Fixes

* Column headers no longer allocate space for a sort arrow icon when the column has an active
  `GridSorter` in the special state of `sort: null`.
* Grid auto-sizing better accounts for margins on sort arrow icons.

[Commit Log](https://github.com/xh/hoist-react/compare/v35.0.0...v35.0.1)

## v35.0.0 - 2020-06-29

### ⚖️ Licensing Change

As of this release, Hoist is [now licensed](LICENSE.md) under the popular and permissive
[Apache 2.0 open source license](https://www.apache.org/licenses/LICENSE-2.0). Previously, Hoist was
"source available" via our public GitHub repository but still covered by a proprietary license.

We are making this change to align Hoist's licensing with our ongoing commitment to openness,
transparency and ease-of-use, and to clarify and emphasize the suitability of Hoist for use within a
wide variety of enterprise software projects. For any questions regarding this change, please
[contact us](https://xh.io/contact/).

### 🎁 New Features

* Added a new Persistence API to provide a more flexible yet consistent approach to saving state for
  Components, Models, and Services to different persistent locations such as Hoist Preferences,
  browser local storage, and Hoist Dashboard views.
    * The primary entry points for this API are the new `@PersistSupport` and `@persist`
      annotations.
      `@persist` can be added to any observable property on a `@PersistSupport` to make it
      automatically synchronize with a `PersistenceProvider`. Both `HoistModel` and `HoistService`
      are decorated with `@PersistSupport`.
    * This is designed to replace any app-specific code previously added to synchronize fields and
      their values to Preferences via ad-hoc initializers and reactions.
    * This same API is now used to handle state persistence for `GridStateModel`, `PanelModel`,
      `DimensionChooserModel`, and `DashContainerModel` - configurable via the new `persistWith`
      option on those classes.
* `FetchService` now installs a default timeout of 30 seconds for all requests. This can be disabled
  by setting timeout to `null`. Fetch Timeout Exceptions have also been improved to include the same
  information as other standard exceptions thrown by this service.
    * 💥 Apps that were relying on the lack of a built-in timeout for long-running requests should
      ensure they configure such calls with a longer or null timeout.
* `Store` gets new `clearFilter()` and `recordIsFiltered()` helper functions.
* The Admin console's Activity Tracking tab has been significantly upgraded to allow admins to
  better analyze both built-in and custom tracking data generated by their application. Its sibling
  Client Errors tab has also been updated with a docked detail panel.
* `CodeInput` gets new `showCopyButton` prop - set to true to provide an inline action button to
  copy the editor contents to the clipboard.
* Hoist config `xhEnableMonitoring` can be used to enable/disable the Admin monitor tab and its
  associated server-side jobs

### 💥 Breaking Changes

* Applications should update to `hoist-core` v8.0.1 or above, required to support the upgraded Admin
  Activity Tracking tab. Contact XH for assistance with this update.
* The option `PanelModel.prefName` has been removed in favor of `persistWith`. Existing user state
  will be transferred to the new format, assuming a `PersistenceProvider` of type 'pref' referring
  to the same preference is used (e.g. `persistWith: {prefKey: 'my-panel-model-prefName'}`.
* The option `GridModel.stateModel` has been removed in favor of `persistWith`. Existing user state
  will be transferred to the new format, assuming a `PersistenceProvider` of type 'localStorage'
  referring to the same key is used (e.g. `persistWith: {localStorageKey: 'my-grid-state-id'}`.
    * Use the new `GridModel.persistOptions` config for finer control over what grid state is
      persisted (replacement for stateModel configs to disable persistence of column
      state/sorting/grouping).
* The options `DimensionChooserModel.preference` and `DimensionChooserModel.historyPreference` have
  been removed in favor of `persistWith`.
* `AppSpec.idleDetectionEnabled` has been removed. App-specific Idle detection is now enabled via
  the new `xhIdleConfig` config. The old `xhIdleTimeoutMins` has also been deprecated.
* `AppSpec.idleDialogClass` has been renamed `AppSpec.idlePanel`. If specified, it should be a
  full-screen component.
* `PinPad` and `PinPadModel` have been moved to `@xh/hoist/cmp/pinpad`, and is now available for use
  with both standard and mobile toolkits.
* Third-party dependencies updated to properly reflect application-level licensing requirements.
  Applications must now import and provide their licensed version of AG Grid, and Highcharts to
  Hoist. See file `Bootstrap.js` in Toolbox for an example.

### 🐞 Bug Fixes

* Sorting special columns generated by custom AG Grid configurations (e.g. auto-group columns) no
  longer throws with an error.
* The `deepFreeze()` util - used to freeze data in `Record` instances - now only attempts to freeze
  a whitelist of object types that are known to be safely freezable. Custom application classes and
  other potentially-problematic objects (such as `moment` instances) are no longer frozen when
  loaded into `Record` fields.

### 📚 Libraries

Note that certain licensed third-party dependencies have been removed as direct dependencies of this
project, as per note in Breaking Changes above.

* @xh/hoist-dev-utils `4.x → 5.x` - apps should also update to the latest 5.x release of dev-utils.
  Although license and dependency changes triggered a new major version of this dev dependency, no
  application-level changes should be required.
* @blueprintjs/core `3.28 → 3.29`
* codemirror `5.54 → 5.55`
* react-select `3.0 → 3.1`

### 📚 Optional Libraries

* AG Grid `23.0.2` > `23.2.0` (See Toolbox app for example on this upgrade)
* Highcharts `8.0.4 → 8.1.1`

[Commit Log](https://github.com/xh/hoist-react/compare/v34.0.0...v35.0.0)

## v34.0.0 - 2020-05-26

### 🎁 New Features

* Hoist's enhanced autosizing is now enabled on all grids by default. See `GridModel` and
  `GridAutosizeService` for more details.
* New flags `XH.isPhone`, `XH.isTablet`, and `XH.isDesktop` available for device-specific switching.
  Corresponding `.xh-phone`, `.xh-tablet`, and `.xh-desktop` CSS classes are added to the document
  `body`. These flags and classes are set based on the detected device, as per its user-agent.
    * One of the two higher-level CSS classes `.xh-standard` or `.xh-mobile` will also be applied
      based on an app's use of the primary (desktop-centric) components vs mobile components - as
      declared by its `AppSpec.isMobileApp` - regardless of the detected device.
    * These changes provide more natural support for use cases such as apps that are built with
      standard components yet target/support tablet users.
* New method `Record.get()` provides an alternative API for checked data access.
* The mobile `Select` component supports the `enableFilter` and `enableCreate` props.
* `DashContainerModel` supports new `layoutLocked`, `contentLocked` and `renameLocked` modes.
* `DimensionChooser` now has the ability to persist its value and history separately.
* Enhance Hoist Admin's Activity Tracking tab.
* Enhance Hoist Admin's Client Error tab.

### 💥 Breaking Changes

* `emptyFlexCol` has been removed from the Hoist API and should simply be removed from all client
  applications. Improvements to agGrid's default rendering of empty space have made it obsolete.
* `isMobile` property on `XH` and `AppSpec` has been renamed to `isMobileApp`. All apps will need to
  update their (required) use of this flag in the app specifications within their
  `/client-app/src/apps` directory.
* The `xh-desktop` class should no longer be used to indicate a non-mobile toolkit based app. For
  this purpose, use `xh-standard` instead.

### 🐞 Bug Fixes

* Fix to Average Aggregators when used with hierarchical data.
* Fixes to Context Menu handling on `Panel` to allow better handling of `[]` and `null`.

### 📚 Libraries

* @blueprintjs/core `3.26 → 3.28`
* @blueprintjs/datetime `3.16 → 3.18`
* codemirror `5.53 → 5.54`
* react-transition-group `4.3 → 4.4`

[Commit Log](https://github.com/xh/hoist-react/compare/v33.3.0...v34.0.0)

## v33.3.0 - 2020-05-08

### ⚙️ Technical

* Additional updates to experimental autosize feature: standardization of naming, better masking
  control, and API fixes. Added new property `autosizeOptions` on `GridModel` and main entry point
  is now named `GridModel.autosizeAsync()`.

### 🐞 Bug Fixes

* `Column.hideable` will now be respected by ag-grid column drag and drop
  [#1900](https://github.com/xh/hoist-react/issues/1900)
* Fixed an issue where dragging a column would cause it to be sorted unintentionally.

[Commit Log](https://github.com/xh/hoist-react/compare/v33.2.0...v33.3.0)

## v33.2.0 - 2020-05-07

### 🎁 New Features

* Virtual column rendering has been disabled by default, as it offered a minimal performance benefit
  for most grids while compromising autosizing. See new `GridModel.useVirtualColumns` config, which
  can be set to `true` to re-enable this behavior if required.
* Any `GridModel` can now be reset to its code-prescribed defaults via the column chooser reset
  button. Previously, resetting to defaults was only possible for grids that persisted their state
  with a `GridModel.stateModel` config.

### 🐞 Bug Fixes

* Fixed several issues with new grid auto-sizing feature.
* Fixed issues with and generally improved expand/collapse column alignment in tree grids.
    * 💥 Note that this improvement introduced a minor breaking change for apps that have customized
      tree indentation via the removed `--grid-tree-indent-px` CSS var. Use `--grid-tree-indent`
      instead. Note the new var is specified in em units to scale well across grid sizing modes.

### ⚙️ Technical

* Note that the included version of Onsen has been replaced with a fork that includes updates for
  react 16.13. Apps should not need to make any changes.

### 📚 Libraries

* react `~16.8 → ~16.13`
* onsenui `~16.8` → @xh/onsenui `~16.13`
* react-onsenui `~16.8` → @xh/react-onsenui `~16.13`

[Commit Log](https://github.com/xh/hoist-react/compare/v33.1.0...33.2.0)

## v33.1.0 - 2020-05-05

### 🎁 New Features

* Added smart auto-resizing of columns in `GridModel` Unlike AG Grid's native auto-resizing support,
  Hoist's auto-resizing will also take into account collapsed rows, off-screen cells that are not
  currently rendered in the DOM, and summary rows. See the new `GridAutosizeService` for details.
    * This feature is currently marked as 'experimental' and must be enabled by passing a special
      config to the `GridModel` constructor of the form `experimental: {useHoistAutosize: true}`. In
      future versions of Hoist, we expect to make it the default behavior.
* `GridModel.autoSizeColumns()` has been renamed `GridModel.autosizeColumns()`, with lowercase 's'.
  Similarly, the `autoSizeColumns` context menu token has been renamed `autosizeColumns`.

### 🐞 Bug Fixes

* Fixed a regression with `StoreFilterField` introduced in v33.0.1.

[Commit Log](https://github.com/xh/hoist-react/compare/v33.0.2...33.1.0)

## v33.0.2 - 2020-05-01

### 🎁 New Features

* Add Hoist Cube Aggregators: `AverageAggregator` and `AverageStrictAggregator`
* `ColAutosizeButton` has been added to desktop and mobile

### 🐞 Bug Fixes

* Fixed mobile menus to constrain to the bottom of the viewport, scrolling if necessary.
  [#1862](https://github.com/xh/hoist-react/issues/1862)
* Tightened up mobile tree grid, fixed issues in mobile column chooser.
* Fixed a bug with reloading hierarchical data in `Store`.
  [#1871](https://github.com/xh/hoist-react/issues/1871)

[Commit Log](https://github.com/xh/hoist-react/compare/v33.0.1...33.0.2)

## v33.0.1 - 2020-04-29

### 🎁 New Features

* `StoreFieldField` supports dot-separated field names in a bound `GridModel`, meaning it will now
  match on columns with fields such as `address.city`.

* `Toolbar.enableOverflowMenu` now defaults to `false`. This was determined safer and more
  appropriate due to issues with the underlying Blueprint implementation, and the need to configure
  it carefully.

### 🐞 Bug Fixes

* Fixed an important bug with state management in `StoreFilterField`. See
  https://github.com/xh/hoist-react/issues/1854

* Fixed the default sort order for grids. ABS DESC should be first when present.

### 📚 Libraries

* @blueprintjs/core `3.25 → 3.26`
* codemirror `5.52 → 5.53`

[Commit Log](https://github.com/xh/hoist-react/compare/v33.0.0...v33.0.1)

## v33.0.0 - 2020-04-22

### 🎁 New Features

* The object returned by the `data` property on `Record` now includes the record `id`. This will
  allow for convenient access of the id with the other field values on the record.
* The `Timer` class has been enhanced and further standardized with its Hoist Core counterpart:
    * Both the `interval` and `timeout` arguments may be specified as functions, or config keys
      allowing for dynamic lookup and reconfiguration.
    * Added `intervalUnits` and `timeoutUnits` arguments.
    * `delay` can now be specified as a boolean for greater convenience.

### 💥 Breaking Changes

* We have consolidated the import location for several packages, removing unintended nested index
  files and 'sub-packages'. In particular, the following locations now provide a single index file
  for import for all of their public contents: `@xh/hoist/core`, `@xh/hoist/data`,
  `@xh/hoist/cmp/grid`, and `@xh/hoist/desktop/cmp/grid`. Applications may need to update import
  statements that referred to index files nested within these directories.
* Removed the unnecessary and confusing `values` getter on `BaseFieldModel`. This getter was not
  intended for public use and was intended for the framework's internal implementation only.
* `ColumnGroup.align` has been renamed to `ColumnGroup.headerAlign`. This avoids confusion with the
  `Column` API, where `align` refers to the alignment of cell contents within the column.

### 🐞 Bug Fixes

* Exceptions will no longer overwrite the currently shown exception in the exception dialog if the
  currently shown exception requires reloading the application.
  [#1834](https://github.com/xh/hoist-react/issues/1834)

### ⚙️ Technical

* Note that the Mobx React bindings have been updated to 6.2, and we have enabled the recommended
  "observer batching" feature as per
  [the mobx-react docs](https://github.com/mobxjs/mobx-react-lite/#observer-batching).

### 📚 Libraries

* @blueprintjs/core `3.24 → 3.25`
* @blueprintjs/datetime `3.15 → 3.16`
* mobx-react `6.1 → 6.2`

[Commit Log](https://github.com/xh/hoist-react/compare/v32.0.4...v33.0.0)

## v32.0.5 - 2020-07-14

### 🐞 Bug Fixes

* Fixes a regression in which grid exports were no longer sorting rows properly.

[Commit Log](https://github.com/xh/hoist-react/compare/v32.0.4...v32.0.5)

## v32.0.4 - 2020-04-09

### 🐞 Bug Fixes

* Fixes a regression with the alignment of `ColumnGroup` headers.
* Fixes a bug with 'Copy Cell' context menu item for certain columns displaying the Record ID.
* Quiets console logging of 'routine' exceptions to 'debug' instead of 'log'.

[Commit Log](https://github.com/xh/hoist-react/compare/v32.0.3...v32.0.4)

## v32.0.3 - 2020-04-06

### 🐞 Bug Fixes

* Suppresses a console warning from AG Grid for `GridModel`s that do not specify an `emptyText`.

[Commit Log](https://github.com/xh/hoist-react/compare/v32.0.2...v32.0.3)

## v32.0.2 - 2020-04-03

⚠ Note that this release includes a *new major version of AG Grid*. Please consult the
[AG Grid Changelog](https://www.ag-grid.com/ag-grid-changelog/) for versions 22-23 to review
possible breaking changes to any direct/custom use of AG Grid APIs and props within applications.

### 🎁 New Features

* GridModel `groupSortFn` now accepts `null` to turn off sorting of group rows.
* `DockViewModel` now supports optional `width`, `height` and `collapsedWidth` configs.
* The `appMenuButton.extraItems` prop now accepts `MenuItem` configs (as before) but also React
  elements and the special string token '-' (shortcut to render a `MenuDivider`).
* Grid column `flex` param will now accept numbers, with available space divided between flex
  columns in proportion to their `flex` value.
* `Column` now supports a `sortingOrder` config to allow control of the sorting options that will be
  cycled through when the user clicks on the header.
* `PanelModel` now supports setting a `refreshMode` to control how collapsed panels respond to
  refresh requests.

### 💥 Breaking Changes

* The internal DOM structure of desktop `Panel` has changed to always include an inner frame with
  class `.xh-panel__content`. You may need to update styling that targets the inner structure of
  `Panel` via `.xh-panel`.
* The hooks `useOnResize()` and `useOnVisibleChange()` no longer take a `ref` argument. Use
  `composeRefs` to combine the ref that they return with any ref you wish to compose them with.
* The callback for `useOnResize()` will now receive an object representing the locations and
  dimensions of the element's content box. (Previously it incorrectly received an array of
  `ResizeObserver` entries that had to be de-referenced)
* `PanelModel.collapsedRenderMode` has been renamed to `PanelModel.renderMode`, to be more
  consistent with other Hoist APIs such as `TabContainer`, `DashContainer`, and `DockContainer`.

### 🐞 Bug Fixes

* Checkboxes in grid rows in Tiny sizing mode have been styled to fit correctly within the row.
* `GridStateModel` no longer saves/restores the width of non-resizable columns.
  [#1718](https://github.com/xh/hoist-react/issues/1718)
* Fixed an issue with the hooks useOnResize and useOnVisibleChange. In certain conditions these
  hooks would not be called. [#1808](https://github.com/xh/hoist-react/issues/1808)
* Inputs that accept a rightElement prop will now properly display an Icon passed as that element.
  [#1803](https://github.com/xh/hoist-react/issues/1803)

### ⚙️ Technical

* Flex columns now use the built-in AG Grid flex functionality.

### 📚 Libraries

* ag-grid-community `removed @ 21.2`
* ag-grid-enterprise `21.2` replaced with @ag-grid-enterprise/all-modules `23.0`
* ag-grid-react `21.2` replaced with @ag-grid-community/react `23.0`
* @fortawesome/* `5.12 → 5.13`
* codemirror `5.51 → 5.52`
* filesize `6.0 → 6.1`
* numbro `2.1 → 2.2`
* react-beautiful-dnd `12.0 → 13.0`
* store2 `2.10 → 2.11`
* compose-react-refs `NEW 1.0.4`

[Commit Log](https://github.com/xh/hoist-react/compare/v31.0.0...v32.0.2)

## v31.0.0 - 2020-03-16

### 🎁 New Features

* The mobile `Navigator` / `NavigatorModel` API has been improved and made consistent with other
  Hoist content container APIs such as `TabContainer`, `DashContainer`, and `DockContainer`.
    * `NavigatorModel` and `PageModel` now support setting a `RenderMode` and `RefreshMode` to
      control how inactive pages are mounted/unmounted and how they respond to refresh requests.
    * `Navigator` pages are no longer required to to return `Page` components - they can now return
      any suitable component.
* `DockContainerModel` and `DockViewModel` also now support `refreshMode` and `renderMode` configs.
* `Column` now auto-sizes when double-clicking / double-tapping its header.
* `Toolbar` will now collapse overflowing items into a drop down menu. (Supported for horizontal
  toolbars only at this time.)
* Added new `xhEnableLogViewer` config (default `true`) to enable or disable the Admin Log Viewer.

#### 🎨 Icons

* Added `Icon.icon()` factory method as a new common entry point for creating new FontAwesome based
  icons in Hoist. It should typically be used instead of using the `FontAwesomeIcon` component
  directly.
* Also added a new `Icon.fileIcon()` factory. This method take a filename and returns an appropriate
  icon based on its extension.
* All Icon factories can now accept an `asHtml` parameter, as an alternative to calling the helper
  function `convertIconToSVG()` on the element. Use this to render icons as raw html where needed
  (e.g. grid renderers).
* Icons rendered as html will now preserve their styling, tooltips, and size.

### 💥 Breaking Changes

* The application's primary `HoistApplicationModel` is now instantiated and installed as
  `XH.appModel` earlier within the application initialization sequence, with construction happening
  prior to the init of the XH identity, config, and preference services.
    * This allows for a new `preAuthInitAsync()` lifecycle method to be called on the model before
      auth has completed, but could be a breaking change for appModel code that relied on these
      services for field initialization or in its constructor.
    * Such code should be moved to the core `initAsync()` method instead, which continues to be
      called after all XH-level services are initialized and ready.
* Mobile apps may need to adjust to the following updates to `NavigatorModel` and related APIs:
    * `NavigatorModel`'s `routes` constructor parameter has been renamed `pages`.
    * `NavigatorModel`'s observable `pages[]` has been renamed `stack[]`.
    * `NavigatorPageModel` has been renamed `PageModel`. Apps do not usually create `PageModels`
      directly, so this change is unlikely to require code updates.
    * `Page` has been removed from the mobile toolkit. Components that previously returned a `Page`
      for inclusion in a `Navigator` or `TabContainer` can now return any component. It is
      recommended you replace `Page` with `Panel` where appropriate.
* Icon enhancements described above removed the following public methods:
    * The `fontAwesomeIcon()` factory function (used to render icons not already enumerated by
      Hoist)
      has been replaced by the improved `Icon.icon()` factory - e.g. `fontAwesomeIcon({icon: ['far',
      'alicorn']}) → Icon.icon({iconName: 'alicorn'})`.
    * The `convertIconToSvg()` utility method has been replaced by the new `asHtml` parameter on
      icon factory functions. If you need to convert an existing icon element,
      use `convertIconToHtml()`.
* `Toolbar` items should be provided as direct children. Wrapping Toolbar items in container
  components can result in unexpected item overflow.

### 🐞 Bug Fixes

* The `fmtDate()` utility now properly accepts, parses, and formats a string value input as
  documented.
* Mobile `PinPad` input responsiveness improved on certain browsers to avoid lag.

### ⚙️ Technical

* New lifecycle methods `preAuthInitAsync()` and `logoutAsync()` added to the `HoistAppModel`
  decorator (aka the primary `XH.appModel`).

[Commit Log](https://github.com/xh/hoist-react/compare/v30.1.0...v31.0.0)

## v30.1.0 - 2020-03-04

### 🐞 Bug Fixes

* Ensure `WebSocketService.connected` remains false until `channelKey` assigned and received from
  server.
* When empty, `DashContainer` now displays a user-friendly prompt to add an initial view.

### ⚙️ Technical

* Form validation enhanced to improve handling of asynchronous validation. Individual rules and
  constraints are now re-evaluated in parallel, allowing for improved asynchronous validation.
* `Select` will now default to selecting contents on focus if in filter or creatable mode.

[Commit Log](https://github.com/xh/hoist-react/compare/v30.0.0...30.1.0)

## v30.0.0 - 2020-02-29

### 🎁 New Features

* `GridModel` and `DataViewModel` now support `groupRowHeight`, `groupRowRenderer` and
  `groupRowElementRenderer` configs. Grouping is new in general to `DataViewModel`, which now takes
  a `groupBy` config.
    * `DataViewModel` allows for settable and multiple groupings and sorters.
    * `DataViewModel` also now supports additional configs from the underlying `GridModel` that make
      sense in a `DataView` context, such as `showHover` and `rowBorders`.
* `TabContainerModel` now accepts a `track` property (default false) for easily tracking tab views
  via Hoist's built-in activity tracking.
* The browser document title is now set to match `AppSpec.clientAppName` - helpful for projects with
  multiple javascript client apps.
* `StoreFilterField` accepts all other config options from `TextInput` (e.g. `disabled`).
* Clicking on a summary row in `Grid` now clears its record selection.
* The `@LoadSupport` decorator now provides an additional observable property `lastException`. The
  decorator also now logs load execution times and failures to `console.debug` automatically.
* Support for mobile `Panel.scrollable` prop made more robust with re-implementation of inner
  content element. Note this change included a tweak to some CSS class names for mobile `Panel`
  internals that could require adjustments if directly targeted by app stylesheets.
* Added new `useOnVisibleChange` hook.
* Columns now support a `headerAlign` config to allow headers to be aligned differently from column
  contents.

### 💥 Breaking Changes

* `Toolbar` items must be provided as direct children. Wrapping Toolbar items in container
  components can result in unexpected item overflow.
* `DataView.rowCls` prop removed, replaced by new `DataViewModel.rowClassFn` config for more
  flexibility and better symmetry with `GridModel`.
* `DataViewModel.itemRenderer` renamed to `DataViewModel.elementRenderer`
* `DataView` styling has been updated to avoid applying several unwanted styles from `Grid`. Note
  that apps might rely on these styles (intentionally or not) for their `itemRenderer` components
  and appearance and will need to adjust.
* Several CSS variables related to buttons have been renamed for consistency, and button style rules
  have been adjusted to ensure they take effect reliably across desktop and mobile buttons
  ([#1568](https://github.com/xh/hoist-react/pull/1568)).
* The optional `TreeMapModel.highchartsConfig` object will now be recursively merged with the
  top-level config generated by the Hoist model and component, where previously it was spread onto
  the generated config. This could cause a change in behavior for apps using this config to
  customize map instances, but provides more flexibility for e.g. customizing the `series`.
* The signature of `useOnResize` hook has been modified slightly for API consistency and clarity.
  Options are now passed in a configuration object.

### 🐞 Bug Fixes

* Fixed an issue where charts that are rendered while invisible would have the incorrect size.
  [#1703](https://github.com/xh/hoist-react/issues/1703)
* Fixed an issue where zeroes entered by the user in `PinPad` would be displayed as blanks.
* Fixed `fontAwesomeIcon` elem factory component to always include the default 'fa-fw' className.
  Previously, it was overridden if a `className` prop was provided.
* Fixed an issue where ConfigDiffer would always warn about deletions, even when there weren't any.
  [#1652](https://github.com/xh/hoist-react/issues/1652)
* `TextInput` will now set its value to `null` when all text is deleted and the clear icon will
  automatically hide.
* Fixed an issue where multiple buttons in a `ButtonGroupInput` could be shown as active
  simultaneously. [#1592](https://github.com/xh/hoist-react/issues/1592)
* `StoreFilterField` will again match on `Record.id` if bound to a Store or a GridModel with the
  `id` column visible. [#1697](https://github.com/xh/hoist-react/issues/1697)
* A number of fixes have been applied to `RelativeTimeStamp` and `getRelativeTimestamp`, especially
  around its handling of 'equal' or 'epsilon equal' times. Remove unintended leading whitespace from
  `getRelativeTimestamp`.

### ⚙️ Technical

* The `addReaction` and `addAutorun` methods (added to Hoist models, components, and services by the
  `ReactiveSupport` mixin) now support a configurable `debounce` argument. In many cases, this is
  preferable to the built-in MobX `delay` argument, which only provides throttling and not true
  debouncing.
* New `ChartModel.highchart` property provides a reference to the underlying HighChart component.

### 📚 Libraries

* @blueprintjs/core `3.23 → 3.24`
* react-dates `21.7 → 21.8`
* react-beautiful-dnd `11.0 → 12.2`

[Commit Log](https://github.com/xh/hoist-react/compare/v29.1.0...v30.0.0)

## v29.1.0 - 2020-02-07

### 🎁 New Features

#### Grid

* The `compact` config on `GridModel` has been deprecated in favor of the more powerful `sizingMode`
  which supports the values 'large', 'standard', 'compact', or 'tiny'.
    * Each new mode has its own set of CSS variables for applications to override as needed.
    * Header and row heights are configurable for each via the `HEADER_HEIGHTS` and `ROW_HEIGHTS`
      static properties of the `AgGrid` component. These objects can be modified on init by
      applications that wish to customize the default row heights globally.
    * 💥 Note that these height config objects were previously exported as constants from AgGrid.js.
      This would be a breaking change for any apps that imported the old objects directly (
      considered unlikely).
* `GridModel` now exposes an `autoSizeColumns` method, and the Grid context menu now contains an
  `Autosize Columns` option by default.
* `Column` and `ColumnGroup` now support React elements for `headerName`.

#### Data

* The `Store` constructor now accepts a `data` argument to load data at initialization.
* The `xh/hoist/data/cube` package has been modified substantially to better integrate with the core
  data package and support observable "Views". See documentation on `Cube` for more information.

#### Other

* Added a `PinPad` component for streamlined handling of PIN entry on mobile devices.
* `FormField` now takes `tooltipPosition` and `tooltipBoundary` props for customizing minimal
  validation tooltip.
* `RecordAction.actionFn` parameters now include a `buttonEl` property containing the button element
  when used in an action column.
* Mobile Navigator component now takes an `animation` prop which can be set to 'slide' (default),
  'lift', 'fade', or 'none'. These values are passed to the underlying onsenNavigator component.
  ([#1641](https://github.com/xh/hoist-react/pull/1641))
* `AppOption` configs now accept an `omit` property for conditionally excluding options.

### 🐞 Bug Fixes

* Unselectable grid rows are now skipped during up/down keyboard navigation.
* Fix local quick filtering in `LeftRightChooser` (v29 regression).
* Fix `SplitTreeMap` - the default filtering once again splits the map across positive and negative
  values as intended (v29 regression).

### ⚙️ Technical

* `FormFields` now check that they are contained in a Hoist `Form`.

### 📚 Libraries

* @blueprintjs/core `3.22 → 3.23`
* codemirror `5.50 → 5.51`
* react-dates `21.5 → 21.7`

[Commit Log](https://github.com/xh/hoist-react/compare/v29.0.0...v29.1.0)

## v29.0.0 - 2020-01-24

### 🗄️ Data Package Changes

Several changes have been made to data package (`Store` and `Record`) APIs for loading, updating,
and modifying data. They include some breaking changes, but pave the way for upcoming enhancements
to fully support inline grid editing and other new features.

Store now tracks the "committed" state of its records, which represents the data as it was loaded
(typically from the server) via `loadData()` or `updateData()`. Records are now immutable and
frozen, so they cannot be changed directly, but Store offers a new `modifyRecords()` API to apply
local modifications to data in a tracked and managed way. (Store creates new records internally to
hold both this modified data and the original, "committed" data.) This additional state tracking
allows developers to query Stores for modified or added records (e.g. to flush back to the server
and persist) as well as call new methods to revert changes (e.g. to undo a block of changes that the
user wishes to discard).

Note the following more specific changes to these related classes:

#### Record

* 💥 Record data properties are now nested within a `data` object on Record instances and are no
  longer available as top-level properties on the Record itself.
    * Calls to access data such as `rec.quantity` must be modified to `rec.data.quantity`.
    * When accessing multiple properties, destructuring provides an efficient syntax -
      e.g. `const {quantity, price} = rec.data;`.
* 💥 Records are now immutable and cannot be modified by applications directly.
    * This is a breaking change, but should only affect apps with custom inline grid editing
      implementations or similar code that modifies individual record values.
    * Calls to change data such as `rec.quantity = 100` must now be made through the Record's Store,
      e.g. `store.modifyData({id: 41, quantity: 100})`
* Record gains new getters for inspecting its state, including: `isAdd`, `isModified`, and
  `isCommitted`.

#### Store

* 💥 `noteDataUpdated()` has been removed, as out-of-band modifications to Store Records are no
  longer possible.
* 💥 Store's `idSpec` function is now called with the raw record data - previously it was passed
  source data after it had been run through the store's optional `processRawData` function. (This is
  unlikely to have a practical impact on most apps, but is included here for completeness.)
* `Store.updateData()` now accepts a flat list of raw data to process into Record additions and
  updates. Previously developers needed to call this method with an object containing add, update,
  and/or remove keys mapped to arrays. Now Store will produce an object of this shape automatically.
* `Store.refreshFilter()` method has been added to allow applications to rebuild the filtered data
  set if some application state has changed (apart from the store's data itself) which would affect
  the store filter.
* Store gains new methods for manipulating its Records and data, including `addRecords()`,
  `removeRecords()`, `modifyRecords()`, `revertRecords()`, and `revert()`. New getters have been
  added for `addedRecords`, `removedRecords`, `modifiedRecords`, and `isModified`.

#### Column

* Columns have been enhanced for provide basic support for inline-editing of record data. Further
  inline editing support enhancements are planned for upcoming Hoist releases.
* `Column.getValueFn` config added to retrieve the cell value for a Record field. The default
  implementation pulls the value from the Record's new `data` property (see above). Apps that
  specify custom `valueGetter` callbacks via `Column.agOptions` should now implement their custom
  logic in this new config.
* `Column.setValueFn` config added to support modifying the Column field's value on the underlying
  Record. The default implementation calls the new `Store.modifyRecords()` API and should be
  sufficient for the majority of cases.
* `Column.editable` config added to indicate if a column/cell should be inline-editable.

### 🎁 New Features

* Added keyboard support to AG Grid context menus.
* Added `GridModel.setEmptyText()` to allow updates to placeholder text after initial construction.
* Added `GridModel.ensureSelectionVisible()` to scroll the currently selected row into view.
* When a `TreeMap` is bound to a `GridModel`, the grid will now respond to map selection changes by
  scrolling to ensure the selected grid row is visible.
* Added a `Column.tooltipElement` config to support fully customizable tooltip components.
* Added a `useOnResize` hook, which runs a function when a component is resized.
* Exposed an `inputRef` prop on numberInput, textArea, and textInput
* `PanelModel` now accepts a `maxSize` config.
* `RelativeTimeStamp` now support a `relativeTo` option, allowing it to display the difference
  between a timestamp and another reference time other than now. Both the component and the
  `getRelativeTimestamp()` helper function now leverage moment.js for their underlying
  implementation.
* A new `Clock` component displays the time, either local to the browser or for a configurable
  timezone.
* `LeftRightChooser` gets a new `showCounts` option to print the number of items on each side.
* `Select` inputs support a new property `enableWindowed` (desktop platform only) to improve
  rendering performance with large lists of options.
* `Select` inputs support grouped options. To use, add an attribute `options` containing an array of
  sub-options.
* `FetchService` methods support a new `timeout` option. This config chains `Promise.timeout()` to
  the promises returned by the service.
* Added alpha version of `DashContainer` for building dynamic, draggable dashboard-style layouts.
  Please note: the API for this component is subject to change - use at your own risk!
* `Select` now allows the use of objects as values.
* Added a new `xhEnableImpersonation` config to enable or disable the ability of Hoist Admins to
  impersonate other users. Note that this defaults to `false`. Apps will need to set this config to
  continue using impersonation. (Note that an update to hoist-core 6.4+ is required for this config
  to be enforced on the server.)
* `FormField` now supports a `requiredIndicator` to customize how required fields are displayed.
* Application build tags are now included in version update checks, primarily to prompt dev/QA users
  to refresh when running SNAPSHOT versions. (Note that an update to hoist-core 6.4+ is required for
  the server to emit build tag for comparison.)
* `CodeInput` component added to provide general `HoistInput` support around the CodeMirror code
  editor. The pre-existing `JsonInput` has been converted to a wrapper around this class.
* `JsonInput` now supports an `autoFocus` prop.
* `Select` now supports a `hideDropdownIndicator` prop.
* `useOnResize` hook will now ignore visibility changes, i.e. a component resizing to a size of 0.
* `DimensionChooser` now supports a `popoverPosition` prop.
* `AppBar.appMenuButtonPosition` prop added to configure the App Menu on the left or the right, and
  `AppMenuButton` now accepts and applies any `Button` props to customize.
* New `--xh-grid-tree-indent-px` CSS variable added to allow control over the amount of indentation
  applied to tree grid child nodes.

### 💥 Breaking Changes

* `GridModel.contextMenuFn` config replaced with a `contextMenu` parameter. The new parameter will
  allow context menus to be specified with a simple array in addition to the function specification
  currently supported.
* `GridModel.defaultContextMenuTokens` config renamed to `defaultContextMenu`.
* `Chart` and `ChartModel` have been moved from `desktop/cmp/charts` to `cmp/charts`.
* `StoreFilterField` has been moved from `desktop/cmp/store` to `cmp/store`.
* The options `nowEpsilon` and `nowString` on `RelativeTimestamp` have been renamed to `epsilon` and
  `equalString`, respectively.
* `TabRenderMode` and `TabRefreshMode` have been renamed to `RenderMode` and `RefreshMode` and moved
  to the `core` package. These enumerations are now used in the APIs for `Panel`, `TabContainer`,
  and `DashContainer`.
* `DockViewModel` now requires a function, or a HoistComponent as its `content` param. It has always
  been documented this way, but a bug in the original implementation had it accepting an actual
  element rather than a function. As now implemented, the form of the `content` param is consistent
  across `TabModel`, `DockViewModel`, and `DashViewSpec`.
* `JsonInput.showActionButtons` prop replaced with more specific `showFormatButton` and
  `showFullscreenButton` props.
* The `DataView.itemHeight` prop has been moved to `DataViewModel` where it can now be changed
  dynamically by applications.
* Desktop `AppBar.appMenuButtonOptions` prop renamed to `appMenuButtonProps` for consistency.

### 🐞 Bug Fixes

* Fixed issue where JsonInput was not receiving its `model` from context
  ([#1456](https://github.com/xh/hoist-react/issues/1456))
* Fixed issue where TreeMap would not be initialized if the TreeMapModel was created after the
  GridModel data was loaded ([#1471](https://github.com/xh/hoist-react/issues/1471))
* Fixed issue where export would create malformed file with dynamic header names
* Fixed issue where exported tree grids would have incorrect aggregate data
  ([#1447](https://github.com/xh/hoist-react/issues/1447))
* Fixed issue where resizable Panels could grow larger than desired
  ([#1498](https://github.com/xh/hoist-react/issues/1498))
* Changed RestGrid to only display export button if export is enabled
  ([#1490](https://github.com/xh/hoist-react/issues/1490))
* Fixed errors when grouping rows in Grids with `groupUseEntireRow` turned off
  ([#1520](https://github.com/xh/hoist-react/issues/1520))
* Fixed problem where charts were resized when being hidden
  ([#1528](https://github.com/xh/hoist-react/issues/1528))
* Fixed problem where charts were needlessly re-rendered, hurting performance and losing some state
  ([#1505](https://github.com/xh/hoist-react/issues/1505))
* Removed padding from Select option wrapper elements which was making it difficult for custom
  option renderers to control the padding ([1571](https://github.com/xh/hoist-react/issues/1571))
* Fixed issues with inconsistent indentation for tree grid nodes under certain conditions
  ([#1546](https://github.com/xh/hoist-react/issues/1546))
* Fixed autoFocus on NumberInput.

### 📚 Libraries

* @blueprintjs/core `3.19 → 3.22`
* @blueprintjs/datetime `3.14 → 3.15`
* @fortawesome/fontawesome-pro `5.11 → 5.12`
* codemirror `5.49 → 5.50`
* core-js `3.3 → 3.6`
* fast-deep-equal `2.0 → 3.1`
* filesize `5.0 → 6.0`
* highcharts 7.2 → 8.0`
* mobx `5.14 → 5.15`
* react-dates `21.3 → 21.5`
* react-dropzone `10.1 → 10.2`
* react-windowed-select `added @ 2.0.1`

[Commit Log](https://github.com/xh/hoist-react/compare/v28.2.0...v29.0.0)

## v28.2.0 - 2019-11-08

### 🎁 New Features

* Added a `DateInput` component to the mobile toolkit. Its API supports many of the same options as
  its desktop analog with the exception of `timePrecision`, which is not yet supported.
* Added `minSize` to panelModel. A resizable panel can now be prevented from resizing to a size
  smaller than minSize. ([#1431](https://github.com/xh/hoist-react/issues/1431))

### 🐞 Bug Fixes

* Made `itemHeight` a required prop for `DataView`. This avoids an issue where agGrid went into an
  infinite loop if this value was not set.
* Fixed a problem with `RestStore` behavior when `dataRoot` changed from its default value.

[Commit Log](https://github.com/xh/hoist-react/compare/v28.1.1...v28.2.0)

## v28.1.1 - 2019-10-23

### 🐞 Bug Fixes

* Fixes a bug with default model context being set incorrectly within context inside of `Panel`.

[Commit Log](https://github.com/xh/hoist-react/compare/v28.1.0...v28.1.1)

## v28.1.0 - 2019-10-18

### 🎁 New Features

* `DateInput` supports a new `strictInputParsing` prop to enforce strict parsing of keyed-in entries
  by the underlying moment library. The default value is false, maintained the existing behavior
  where [moment will do its best](https://momentjs.com/guides/#/parsing/) to parse an entered date
  string that doesn't exactly match the specified format
* Any `DateInput` values entered that exceed any specified max/minDate will now be reset to null,
  instead of being set to the boundary date (which was surprising and potentially much less obvious
  to a user that their input had been adjusted automatically).
* `Column` and `ColumnGroup` now accept a function for `headerName`. The header will be
  automatically re-rendered when any observable properties referenced by the `headerName` function
  are modified.
* `ColumnGroup` now accepts an `align` config for setting the header text alignment
* The flag `toContext` for `uses` and `creates` has been replaced with a new flag `publishMode` that
  provides more granular control over how models are published and looked up via context. Components
  can specify `ModelPublishMode.LIMITED` to make their model available for contained components
  without it becoming the default model or exposing its sub-models.

### 🐞 Bug Fixes

* Tree columns can now specify `renderer` or `elementRenderer` configs without breaking the standard
  AG Grid group cell renderer auto-applied to tree columns (#1397).
* Use of a custom `Column.comparator` function will no longer break agGrid-provided column header
  filter menus (#1400).
* The MS Edge browser does not return a standard Promise from `async` functions, so the the return
  of those functions did not previously have the required Hoist extensions installed on its
  prototype. Edge "native" Promises are now also polyfilled / extended as required. (#1411).
* Async `Select` combobox queries are now properly debounced as per the `queryBuffer` prop (#1416).

### ⚙️ Technical

* Grid column group headers now use a custom React component instead of the default AG Grid column
  header, resulting in a different DOM structure and CSS classes. Existing CSS overrides of the
  AG Grid column group headers may need to be updated to work with the new structure/classes.
* We have configured `stylelint` to enforce greater consistency in our stylesheets within this
  project. The initial linting run resulted in a large number of updates to our SASS files, almost
  exclusively whitespace changes. No functional changes are intended/expected. We have also enabled
  hooks to run both JS and style linting on pre-commit. Neither of these updates directly affects
  applications, but the same tools could be configured for apps if desired.

### 📚 Libraries

* core-js `3.2 → 3.3`
* filesize `4.2 → 5.0`
* http-status-codes `added @ 1.3`

[Commit Log](https://github.com/xh/hoist-react/compare/v28.0.0...v28.1.0)

## v28.0.0 - 2019-10-07

_"The one with the hooks."_

**Hoist now fully supports React functional components and hooks.** The new `hoistComponent`
function is now the recommended method for defining new components and their corresponding element
factories. See that (within HoistComponentFunctional.js) and the new `useLocalModel()` and
`useContextModel()` hooks (within [core/model](core/model)) for more information.

Along with the performance benefits and the ability to use React hooks, Hoist functional components
are designed to read and write their models via context. This allows a much less verbose
specification of component element trees.

Note that **Class-based Components remain fully supported** (by both Hoist and React) using the
familiar `@HoistComponent` decorator, but transitioning to functional components within Hoist apps
is now strongly encouraged. In particular note that Class-based Components will *not* be able to
leverage the context for model support discussed above.

### 🎁 New Features

* Resizable panels now default to not redrawing their content when resized until the resize bar is
  dropped. This offers an improved user experience for most situations, especially when layouts are
  complex. To re-enable the previous dynamic behavior, set `PanelModel.resizeWhileDragging: true`.
* The default text input shown by `XH.prompt()` now has `selectOnFocus: true` and will confirm the
  user's entry on an `<enter>` keypress (same as clicking 'OK').
* `stringExcludes` function added to form validation constraints. This allows an input value to
  block specific characters or strings, e.g. no slash "/" in a textInput for a filename.
* `constrainAll` function added to form validation constraints. This takes another constraint as its
  only argument, and applies that constraint to an array of values, rather than just to one value.
  This is useful for applying a constraint to inputs that produce arrays, such as tag pickers.
* `DateInput` now accepts LocalDates as `value`, `minDate` and `maxDate` props.
* `RelativeTimestamp` now accepts a `bind` prop to specify a model field name from which it can pull
  its timestamp. The model itself can either be passed as a prop or (better) sourced automatically
  from the parent context. Developers are encouraged to take this change to minimize re-renders of
  parent components (which often contain grids and other intensive layouts).
* `Record` now has properties and methods for accessing and iterating over children, descendants,
  and ancestors
* `Store` now has methods for retrieving the descendants and ancestors of a given Record

### 💥 Breaking Changes

* **Apps must update their dev dependencies** to the latest `@xh/hoist-dev-utils` package: v4.0+.
  This updates the versions of Babel / Webpack used in builds to their latest / current versions and
  swaps to the updated Babel recommendation of `core-js` for polyfills.
* The `allSettled` function in `@xh/promise` has been removed. Applications using this method should
  use the ECMA standard (stage-2) `Promise.allSettled` instead. This method is now fully available
  in Hoist via bundled polyfills. Note that the standard method returns an array of objects of the
  form `{status: [rejected|fulfilled], ...}`, rather than `{state: [rejected|fulfilled], ...}`.
* The `containerRef` argument for `XH.toast()` should now be a DOM element. Component instances are
  no longer supported types for this value. This is required to support functional Components
  throughout the toolkit.
* Apps that need to prevent a `StoreFilterField` from binding to a `GridModel` in context, need to
  set the `store` or `gridModel` property explicitly to null.
* The Blueprint non-standard decorators `ContextMenuTarget` and `HotkeysTarget` are no longer
  supported. Use the new hooks `useContextMenu()` and `useHotkeys()` instead. For convenience, this
  functionality has also been made available directly on `Panel` via the `contextMenu` and `hotkeys`
  props.
* `DataView` and `DataViewModel` have been moved from `/desktop/cmp/dataview` to the cross-platform
  package `/cmp/dataview`.
* `isReactElement` has been removed. Applications should use the native React API method
  `React.isValidElement` instead.

### ⚙️ Technical

* `createObservableRef()` is now available in `@xh/hoist/utils/react` package. Use this function for
  creating refs that are functionally equivalent to refs created with `React.createRef()`, yet fully
  observable. With this change the `Ref` class in the same package is now obsolete.
* Hoist now establishes a proper react "error boundary" around all application code. This means that
  errors throw when rendering will be caught and displayed in the standard Hoist exception dialog,
  and stack traces for rendering errors should be significantly less verbose.
* Not a Hoist feature, exactly, but the latest version of `@xh/hoist-dev-utils` (see below) enables
  support for the `optional chaining` (aka null safe) and `nullish coalescing` operators via their
  Babel proposal plugins. Developers are encouraged to make good use of the new syntax below:
    * conditional-chaining: `let foo = bar?.baz?.qux;`
    * nullish coalescing: `let foo = bar ?? 'someDefaultValue';`

### 🐞 Bug Fixes

* Date picker month and year controls will now work properly in `localDate` mode. (Previously would
  reset to underlying value.)
* Individual `Buttons` within a `ButtonGroupInput` will accept a disabled prop while continuing to
  respect the overall `ButtonGroupInput`'s disabled prop.
* Raised z-index level of AG-Grid tooltip to ensure tooltips for AG-Grid context menu items appear
  above the context menu.

### 📚 Libraries

* @blueprintjs/core `3.18 → 3.19`
* @blueprintjs/datetime `3.12 → 3.14`
* @fortawesome/fontawesome-pro `5.10 → 5.11`
* @xh/hoist-dev-utils `3.8 → 4.3` (multiple transitive updates to build tooling)
* ag-grid `21.1 → 21.2`
* highcharts `7.1 → 7.2`
* mobx `5.13 → 5.14`
* react-transition-group `4.2 → 4.3`
* rsvp (removed)
* store2 `2.9 → 2.10`

[Commit Log](https://github.com/xh/hoist-react/compare/v27.1.0...v28.0.0)

## v27.1.0 - 2019-09-05

### 🎁 New Features

* `Column.exportFormat` can now be a function, which supports setting Excel formats on a per-cell
  (vs. entire column) basis by returning a conditional `exportFormat` based upon the value and / or
  record.
    * ⚠️ Note that per-cell formatting _requires_ that apps update their server to use hoist-core
      v6.3.0+ to work, although earlier versions of hoist-core _are_ backwards compatible with the
      pre-existing, column-level export formatting.
* `DataViewModel` now supports a `sortBy` config. Accepts the same inputs as `GridModel.sortBy`,
  with the caveat that only a single-level sort is supported at this time.

[Commit Log](https://github.com/xh/hoist-react/compare/v27.0.1...v27.1.0)

## v27.0.1 - 2019-08-26

### 🐞 Bug Fixes

* Fix to `Store.clear()` and `GridModel.clear()`, which delegates to the same (#1324).

[Commit Log](https://github.com/xh/hoist-react/compare/v27.0.0...v27.0.1)

## v27.0.0 - 2019-08-23

### 🎁 New Features

* A new `LocalDate` class has been added to the toolkit. This class provides client-side support for
  "business" or "calendar" days that do not have a time component. It is an immutable class that
  supports '==', '<' and '>', as well as a number of convenient manipulation functions. Support for
  the `LocalDate` class has also been added throughout the toolkit, including:
    * `Field.type` now supports an additional `localDate` option for automatic conversion of server
      data to this type when loading into a `Store`.
    * `fetchService` is aware of this class and will automatically serialize all instances of it for
      posting to the server. ⚠ NOTE that along with this change, `fetchService` and its methods such
      as `XH.fetchJson()` will now serialize regular JS Date objects as ms timestamps when provided
      in params. Previously Dates were serialized in their default `toString()` format. This would
      be a breaking change for an app that relied on that default Date serialization, but it was
      made for increased symmetry with how Hoist JSON-serializes Dates and LocalDates on the
      server-side.
    * `DateInput` can now be used to seamlessly bind to a `LocalDate` as well as a `Date`. See its
      new prop of `valueType` which can be set to `localDate` or `date` (default).
    * A new `localDateCol` config has been added to the `@xh/hoist/grid/columns` package with
      standardized rendering and formatting.
* New `TreeMap` and `SplitTreeMap` components added, to render hierarchical data in a configurable
  TreeMap visualization based on the Highcharts library. Supports optional binding to a GridModel,
  which syncs selection and expand / collapse state.
* `Column` gets a new `highlightOnChange` config. If true, the grid will highlight the cell on each
  change by flashing its background. (Currently this is a simple on/off config - future iterations
  could support a function variant or other options to customize the flash effect based on the
  old/new values.) A new CSS var `--xh-grid-cell-change-bg-highlight` can be used to customize the
  color used, app-wide or scoped to a particular grid selector. Note that columns must *not* specify
  `rendererIsComplex` (see below) if they wish to enable the new highlight flag.

### 💥 Breaking Changes

* The updating of `Store` data has been reworked to provide a simpler and more powerful API that
  allows for the applications of additions, deletions, and updates in a single transaction:
    * The signature of `Store.updateData()` has been substantially changed, and is now the main
      entry point for all updates.
    * `Store.removeRecords()` has been removed. Use `Store.updateData()` instead.
    * `Store.addData()` has been removed. Use `Store.updateData()` instead.
* `Column` takes an additional property `rendererIsComplex`. Application must set this flag to
  `true` to indicate if a column renderer uses values other than its own bound field. This change
  provides an efficiency boost by allowing AG Grid to use its default change detection instead of
  forcing a cell refresh on any change.

### ⚙️ Technical

* `Grid` will now update the underlying AG Grid using AG Grid transactions rather than relying on
  agGrid `deltaRowMode`. This is intended to provide the best possible grid performance and
  generally streamline the use of the AG Grid Api.

### 🐞 Bug Fixes

* Panel resize events are now properly throttled, avoiding extreme lagginess when resizing panels
  that contain complex components such as big grids.
* Workaround for issues with the mobile Onsen toolkit throwing errors while resetting page stack.
* Dialogs call `doCancel()` handler if cancelled via `<esc>` keypress.

### 📚 Libraries

* @xh/hoist-dev-utils `3.7 → 3.8`
* qs `6.7 → 6.8`
* store2 `2.8 → 2.9`

[Commit Log](https://github.com/xh/hoist-react/compare/v26.0.1...v27.0.0)

## v26.0.1 - 2019-08-07

### 🎁 New Features

* **WebSocket support** has been added in the form of `XH.webSocketService` to establish and
  maintain a managed websocket connection with the Hoist UI server. This is implemented on the
  client via the native `WebSocket` object supported by modern browsers and relies on the
  corresponding service and management endpoints added to Hoist Core v6.1.
    * Apps must declare `webSocketsEnabled: true` in their `AppSpec` configuration to enable this
      overall functionality on the client.
    * Apps can then subscribe via the new service to updates on a requested topic and will receive
      any inbound messages for that topic via a callback.
    * The service will monitor the socket connection with a regular heartbeat and attempt to
      re-establish if dropped.
    * A new admin console snap-in provides an overview of connected websocket clients.
* The `XH.message()` and related methods such as `XH.alert()` now support more flexible
  `confirmProps` and `cancelProps` configs, each of which will be passed to their respective button
  and merged with suitable defaults. Allows use of the new `autoFocus` prop with these preconfigured
  dialogs.
    * By default, `XH.alert()` and `XH.confirm()` will auto focus the confirm button for user
      convenience.
    * The previous text/intent configs have been deprecated and the message methods will log a
      console warning if they are used (although it will continue to respect them to aid
      transitioning to the new configs).
* `GridModel` now supports a `copyCell` context menu action. See `StoreContextMenu` for more
  details.
* New `GridCountLabel` component provides an alternative to existing `StoreCountLabel`, outputting
  both overall record count and current selection count in a configurable way.
* The `Button` component accepts an `autoFocus` prop to attempt to focus on render.
* The `Checkbox` component accepts an `autoFocus` prop to attempt to focus on render.

### 💥 Breaking Changes

* `StoreCountLabel` has been moved from `/desktop/cmp/store` to the cross-platform package
  `/cmp/store`. Its `gridModel` prop has also been removed - usages with grids should likely switch
  to the new `GridCountLabel` component, noted above and imported from `/cmp/grid`.
* The API for `ClipboardButton` and `ClipboardMenuItem` has been simplified, and made implementation
  independent. Specify a single `getCopyText` function rather than the `clipboardSpec`.
  (`clipboardSpec` is an artifact from the removed `clipboard` library).
* The `XH.prompt()` and `XH.message()` input config has been updated to work as documented, with any
  initial/default value for the input sourced from `input.initialValue`. Was previously sourced from
  `input.value` (#1298).
* ChartModel `config` has been deprecated. Please use `highchartsConfig` instead.

### 🐞 Bug Fixes

* The `Select.selectOnFocus` prop is now respected when used in tandem with `enableCreate` and/or
  `queryFn` props.
* `DateInput` popup _will_ now close when input is blurred but will _not_ immediately close when
  `enableTextInput` is `false` and a month or year is clicked (#1293).
* Buttons within a grid `actionCol` now render properly in compact mode, without clipping/overflow.

### ⚙️ Technical

* `AgGridModel` will now throw an exception if any of its methods which depend on AG Grid state are
  called before the grid has been fully initialized (AG Grid onGridReady event has fired).
  Applications can check the new `isReady` property on `AgGridModel` before calling such methods
  to️️ verify the grid is fully initialized.

### 📚 Libraries

* @blueprintjs/core `3.17 → 3.18`
* @blueprintjs/datetime `3.11 → 3.12`
* @fortawesome/fontawesome `5.9 → 5.10`
* ag-grid `21.0.1 → 21.1.1`
* store2 `2.7 → 2.8`
* The `clipboard` library has been replaced with the simpler `clipboard-copy` library.

[Commit Log](https://github.com/xh/hoist-react/compare/v25.2.0...v26.0.1)

## v25.2.0 - 2019-07-25

### 🎁 New Features

* `RecordAction` supports a new `secondaryText` property. When used for a Grid context menu item,
  this text appears on the right side of the menu item, usually used for displaying the shortcut key
  associated with an action.

### 🐞 Bug Fixes

* Fixed issue with loopy behavior when using `Select.selectOnFocus` and changing focus
  simultaneously with keyboard and mouse.

[Commit Log](https://github.com/xh/hoist-react/compare/v25.1.0...v25.2.0)

## v25.1.0 - 2019-07-23

### 🎁 New Features

* `JsonInput` includes buttons for toggling showing in a full-screen dialog window. Also added a
  convenience button to auto-format `JsonInput's` content.
* `DateInput` supports a new `enableTextInput` prop. When this property is set to false, `DateInput`
  will be entirely driven by the provided date picker. Additionally, `DateInput` styles have been
  improved for its various modes to more clearly convey its functionality.
* `ExportButton` will auto-disable itself if bound to an empty `GridModel`. This helper button will
  now also throw a console warning (to alert the developer) if `gridModel.enableExport != true`.

### ⚙️ Technical

* Classes decorated with `@LoadSupport` will now throw an exception out of their provided
  `loadAsync()` method if called with a parameter that's not a plain object (i.e. param is clearly
  not a `LoadSpec`). Note this might be a breaking change, in so far as it introduces additional
  validation around this pre-existing API requirement.
* Requirements for the `colorSpec` option passed to Hoist number formatters have been relaxed to
  allow partial definitions such that, for example, only negative values may receive the CSS class
  specified, without having to account for positive value styling.

### 🐞 Bug Fixes

* `RestFormModel` now submits dirty fields only when editing a record, as intended (#1245).
* `FormField` will no longer override the disabled prop of its child input if true (#1262).

### 📚 Libraries

* mobx `5.11 → 5.13`
* Misc. patch-level updates

[Commit Log](https://github.com/xh/hoist-react/compare/v25.0.0...v25.1.0)

## v25.0.0 - 2019-07-16

### 🎁 New Features

* `Column` accepts a new `comparator` callback to customize how column cell values are sorted by the
  grid.
* Added `XH.prompt()` to show a simple message popup with a built-in, configurable HoistInput. When
  submitted by the user, its callback or resolved promise will include the input's value.
* `Select` accepts a new `selectOnFocus` prop. The behaviour is analogous to the `selectOnFocus`
  prop already in `TextInput`, `TextArea` and `NumberInput`.

### 💥 Breaking Changes

* The `fmtPercent` and `percentRenderer` methods will now multiply provided value by 100. This is
  consistent with the behavior of Excel's percentage formatting and matches the expectations of
  `ExportFormat.PCT`. Columns that were previously using `exportValue: v => v/100` as a workaround
  to the previous renderer behavior should remove this line of code.
* `DimensionChooserModel`'s `historyPreference` config has been renamed `preference`. It now
  supports saving both value and history to the same preference (existing history preferences will
  be handled).

[Commit Log](https://github.com/xh/hoist-react/compare/v24.2.0...v25.0.0)

## v24.2.0 - 2019-07-08

### 🎁 New Features

* `GridModel` accepts a new `colDefaults` configuration. Defaults provided via this object will be
  merged (deeply) into all column configs as they are instantiated.
* New `Panel.compactHeader` and `DockContainer.compactHeaders` props added to enable more compact
  and space efficient styling for headers in these components.
    * ⚠️ Note that as part of this change, internal panel header CSS class names changed slightly -
      apps that were targeting these internal selectors would need to adjust. See
      desktop/cmp/panel/impl/PanelHeader.scss for the relevant updates.
* A new `exportOptions.columns` option on `GridModel` replaces `exportOptions.includeHiddenCols`.
  The updated and more flexible config supports special strings 'VISIBLE' (default), 'ALL', and/or a
  list of specific colIds to include in an export.
    * To avoid immediate breaking changes, GridModel will log a warning on any remaining usages of
      `includeHiddenCols` but auto-set to `columns: 'ALL'` to maintain the same behavior.
* Added new preference `xhShowVersionBar` to allow more fine-grained control of when the Hoist
  version bar is showing. It defaults to `auto`, preserving the current behavior of always showing
  the footer to Hoist Admins while including it for non-admins *only* in non-production
  environments. The pref can alternatively be set to 'always' or 'never' on a per-user basis.

### 📚 Libraries

* @blueprintjs/core `3.16 → 3.17`
* @blueprintjs/datetime `3.10 → 3.11`
* mobx `5.10 → 5.11`
* react-transition-group `2.8 → 4.2`

[Commit Log](https://github.com/xh/hoist-react/compare/v24.1.1...v24.2.0)

## v24.1.1 - 2019-07-01

### 🐞 Bug Fixes

* Mobile column chooser internal layout/sizing fixed when used in certain secure mobile browsers.

[Commit Log](https://github.com/xh/hoist-react/compare/v24.1.0...v24.1.1)

## v24.1.0 - 2019-07-01

### 🎁 New Features

* `DateInput.enableClear` prop added to support built-in button to null-out a date input's value.

### 🐞 Bug Fixes

* The `Select` component now properly shows all options when the pick-list is re-shown after a
  change without first blurring the control. (Previously this interaction edge case would only show
  the option matching the current input value.) #1198
* Mobile mask component `onClick` callback prop restored - required to dismiss mobile menus when not
  tapping a menu option.
* When checking for a possible expired session within `XH.handleException()`, prompt for app login
  only for Ajax requests made to relative URLs (not e.g. remote APIs accessed via CORS). #1189

### ✨ Styles

* Panel splitter collapse button more visible in dark theme. CSS vars to customize further fixed.
* The mobile app menu button has been moved to the right side of the top appBar, consistent with its
  placement in desktop apps.

### 📚 Libraries

* @blueprintjs/core `3.15 → 3.16`
* @blueprintjs/datetime `3.9 → 3.10`
* codemirror `5.47 → 5.48`
* mobx `6.0 → 6.1`

[Commit Log](https://github.com/xh/hoist-react/compare/v24.0.0...v24.1.0)

## v24.0.0 - 2019-06-24

### 🎁 New Features

#### Data

* A `StoreFilter` object has been introduced to the data API. This allows `Store` and
  `StoreFilterField` to support the ability to conditionally include all children when filtering
  hierarchical data stores, and could support additional filtering customizations in the future.
* `Store` now provides a `summaryRecord` property which can be used to expose aggregated data for
  the data it contains. The raw data for this record can be provided to `loadData()` and
  `updateData()` either via an explicit argument to these methods, or as the root node of the raw
  data provided (see `Store.loadRootAsSummary`).
* The `StoreFilterField` component accepts new optional `model` and `bind` props to allow control of
  its text value from an external model's observable.
* `pwd` is now a new supported type of `Field` in the `@xh/hoist/core/data` package.

#### Grid

* `GridModel` now supports a `showSummary` config which can be used to display its store's
  summaryRecord (see above) as either a pinned top or bottom row.
* `GridModel` also adds a `enableColumnPinning` config to enable/disable user-driven pinning. On
  desktop, if enabled, users can pin columns by dragging them to the left or right edges of the grid
  (the default AG Grid gesture). Column pinned state is now also captured and maintained by the
  overall grid state system.
* The desktop column chooser now options in a non-modal popover when triggered from the standard
  `ColChooserButton` component. This offers a quicker and less disruptive alternative to the modal
  dialog (which is still used when launched from the grid context menu). In this popover mode,
  updates to columns are immediately reflected in the underlying grid.
* The mobile `ColChooser` has been improved significantly. It now renders displayed and available
  columns as two lists, allowing drag and drop between to update the visibility and ordering. It
  also provides an easy option to toggle pinning the first column.
* `DimensionChooser` now supports an optional empty / ungrouped configuration with a value of `[]`.
  See `DimensionChooserModel.enableClear` and `DimensionChooser.emptyText`.

#### Other Features

* Core `AutoRefreshService` added to trigger an app-wide data refresh on a configurable interval, if
  so enabled via a combination of soft-config and user preference. Auto-refresh relies on the use of
  the root `RefreshContextModel` and model-level `LoadSupport`.
* A new `LoadingIndicator` component is available as a more minimal / unobtrusive alternative to a
  modal mask. Typically configured via a new `Panel.loadingIndicator` prop, the indicator can be
  bound to a `PendingTaskModel` and will automatically show/hide a spinner and/or custom message in
  an overlay docked to the corner of the parent Panel.
* `DateInput` adds support for new `enablePicker` and `showPickerOnFocus` props, offering greater
  control over when the calendar picker is shown. The new default behaviour is to not show the
  picker on focus, instead showing it via a built-in button.
* Transitions have been disabled by default on desktop Dialog and Popover components (both are from
  the Blueprint library) and on the Hoist Mask component. This should result in a snappier user
  experience, especially when working on remote / virtual workstations. Any in-app customizations to
  disable or remove transitions can now be removed in favor of this toolkit-wide change.
* Added new `@bindable.ref` variant of the `@bindable` decorator.

### 💥 Breaking Changes

* Apps that defined and initialized their own `AutoRefreshService` service or functionality should
  leverage the new Hoist service if possible. Apps with a pre-existing custom service of the same
  name must either remove in favor of the new service or - if they have special requirements not
  covered by the Hoist implementation - rename their own service to avoid a naming conflict.
* The `StoreFilterField.onFilterChange` callback will now be passed a `StoreFilter`, rather than a
  function.
* `DateInput` now has a calendar button on the right side of the input which is 22 pixels square.
  Applications explicitly setting width or height on this component should ensure that they are
  providing enough space for it to display its contents without clipping.

### 🐞 Bug Fixes

* Performance for bulk grid selections has been greatly improved (#1157)
* Toolbars now specify a minimum height (or width when vertical) to avoid shrinking unexpectedly
  when they contain only labels or are entirely empty (but still desired to e.g. align UIs across
  multiple panels). Customize if needed via the new `--xh-tbar-min-size` CSS var.
* All Hoist Components that accept a `model` prop now have that properly documented in their
  prop-types.
* Admin Log Viewer no longer reverses its lines when not in tail mode.

### ⚙️ Technical

* The `AppSpec` config passed to `XH.renderApp()` now supports a `clientAppCode` value to compliment
  the existing `clientAppName`. Both values are now optional and defaulted from the project-wide
  `appCode` and `appName` values set via the project's Webpack config. (Note that `clientAppCode` is
  referenced by the new `AutoRefreshService` to support configurable auto-refresh intervals on a
  per-app basis.)

### 📚 Libraries

* ag-grid `20.0 → 21.0`
* react-select `2.4 → 3.0`
* mobx-react `5.4 → 6.0.3`
* font-awesome `5.8 → 5.9`
* react-beautiful-dnd `10.1.1 → 11.0.4`

[Commit Log](https://github.com/xh/hoist-react/compare/v23.0.0...v24.0.0)

## v23.0.0 - 2019-05-30

### 🎁 New Features

* `GridModel` now accepts a config of `cellBorders`, similar to `rowBorders`
* `Panel.tbar` and `Panel.bbar` props now accept an array of Elements and will auto-generate a
  `Toolbar` to contain them, avoiding the need for the extra import of `toolbar()`.
* New functions `withDebug` and `withShortDebug` have been added to provide a terse syntax for
  adding debug messages that track the execution of specific blocks of code.
* `XH.toast()` now supports an optional `containerRef` argument that can be used for anchoring a
  toast within another component (desktop only). Can be used to display more targeted toasts within
  the relevant section of an application UI, as opposed to the edge of the screen.
* `ButtonGroupInput` accepts a new `enableClear` prop that allows the active / depressed button to
  be unselected by pressing it again - this sets the value of the input as a whole to `null`.
* Hoist Admins now always see the VersionBar in the footer.
* `Promise.track` now accepts an optional `omit` config that indicates when no tracking will be
  performed.
* `fmtNumber` now accepts an optional `prefix` config that prepends immediately before the number,
  but after the sign (`+`, `-`).
* New utility methods `forEachAsync()` and `whileAsync()` have been added to allow non-blocking
  execution of time-consuming loops.

### 💥 Breaking Changes

* The `AppOption.refreshRequired` config has been renamed to `reloadRequired` to better match the
  `XH.reloadApp()` method called to reload the entire app in the browser. Any options defined by an
  app that require it to be fully reloaded should have this renamed config set to `true`.
* The options dialog will now automatically trigger an app-wide data _refresh_ via
  `XH.refreshAppAsync()` if options have changed that don't require a _reload_.
* The `EventSupport` mixin has been removed. There are no known uses of it and it is in conflict
  with the overall reactive structure of the hoist-react API. If your app listens to the
  `appStateChanged`, `prefChange` or `prefsPushed` events you will need to adjust accordingly.

### 🐞 Bug Fixes

* `Select` will now let the user edit existing text in conditions where it is expected to be
  editable. #880
* The Admin "Config Differ" tool has been updated to reflect changes to `Record` made in v22. It is
  once again able to apply remote config values.
* A `Panel` with configs `resizable: true, collapsible: false` now renders with a splitter.
* A `Panel` with no `icon`, `title`, or `headerItems` will not render a blank header.
* `FileChooser.enableMulti` now behaves as one might expect -- true to allow multiple files in a
  single upload. Previous behavior (the ability to add multiple files to dropzone) is now controlled
  by `enableAddMulti`.

[Commit Log](https://github.com/xh/hoist-react/compare/v22.0.0...v23.0.0)

## v22.0.0 - 2019-04-29

### 🎁 New Features

* A new `DockContainer` component provides a user-friendly way to render multiple child components
  "docked" to its bottom edge. Each child view is rendered with a configurable header and controls
  to allow the user to expand it, collapse it, or optionally "pop it out" into a modal dialog.
* A new `AgGrid` component provides a much lighter Hoist wrapper around AG Grid while maintaining
  consistent styling and layout support. This allows apps to use any features supported by AG Grid
  without conflicting with functionality added by the core Hoist `Grid`.
    * Note that this lighter wrapper lacks a number of core Hoist features and integrations,
      including store support, grid state, enhanced column and renderer APIs, absolute value
      sorting, and more.
    * An associated `AgGridModel` provides access to to the AG Grid APIs, minimal styling configs,
      and several utility methods for managing Grid state.
* Added `GridModel.groupSortFn` config to support custom group sorting (replaces any use of
  `agOptions.defaultGroupSortComparator`).
* The `Column.cellClass` and `Column.headerClass` configs now accept functions to dynamically
  generate custom classes based on the Record and/or Column being rendered.
* The `Record` object now provides an additional getter `Record.allChildren` to return all children
  of the record, irrespective of the current filter in place on the record's store. This supplements
  the existing `Record.children` getter, which returns only the children meeting the filter.

### 💥 Breaking Changes

* The class `LocalStore` has been renamed `Store`, and is now the main implementation and base class
  for Store Data. The extraneous abstract superclass `BaseStore` has been removed.
* `Store.dataLastUpdated` had been renamed `Store.lastUpdated` on the new class and is now a simple
  timestamp (ms) rather than a Javascript Date object.
* The constructor argument `Store.processRawData` now expects a function that *returns* a modified
  object with the necessary edits. This allows implementations to safely *clone* the raw data rather
  than mutating it.
* The method `Store.removeRecord` has been replaced with the method `Store.removeRecords`. This will
  facilitate efficient bulk deletes.

### ⚙️ Technical

* `Grid` now performs an important performance workaround when loading a new dataset that would
  result in the removal of a significant amount of existing records/rows. The underlying AG Grid
  component has a serious bottleneck here (acknowledged as AG-2879 in their bug tracker). The Hoist
  grid wrapper will now detect when this is likely and proactively clear all data using a different
  API call before loading the new dataset.
* The implementations `Store`, `RecordSet`, and `Record` have been updated to more efficiently
  re-use existing record references when loading, updating, or filtering data in a store. This keeps
  the Record objects within a store as stable as possible, and allows additional optimizations by
  AG Grid and its `deltaRowDataMode`.
* When loading raw data into store `Record`s, Hoist will now perform additional conversions based on
  the declared `Field.type`. The unused `Field.nullable` has been removed.
* `LocalStorageService` now uses both the `appCode` and current username for its namespace key,
  ensuring that e.g. local prefs/grid state are not overwritten across multiple app users on one OS
  profile, or when admin impersonation is active. The service will automatically perform a one-time
  migration of existing local state from the old namespace to the new. #674
* `elem` no longer skips `null` children in its calls to `React.createElement()`. These children may
  play the role of placeholders when using conditional rendering, and skipping them was causing
  React to trigger extra re-renders. This change further simplifies Hoist's element factory and
  removes an unnecessary divergence with the behavior of JSX.

### 🐞 Bug Fixes

* `Grid` exports retain sorting, including support for absolute value sorting. #1068
* Ensure `FormField`s are keyed with their model ID, so that React can properly account for dynamic
  changes to fields within a form. #1031
* Prompt for app refresh in (rare) case of mismatch between client and server-side session user.
  (This can happen during impersonation and is defended against in server-side code.) #675

[Commit Log](https://github.com/xh/hoist-react/compare/v21.0.2...v22.0.0)

## v21.0.2 - 2019-04-05

### 📚 Libraries

* Rollback AG Grid to v20.0.0 after running into new performance issues with large datasets and
  `deltaRowDataMode`. Updates to tree filtering logic, also related to grid performance issues with
  filtered tree results returning much larger record counts.

## v21.0.0 - 2019-04-04

### 🎁 New Features

* `FetchService` fetch methods now accept a plain object as the `headers` argument. These headers
  will be merged with the default headers provided by FetchService.
* An app can also now specify default headers to be sent with every fetch request via
  `XH.fetchService.setDefaultHeaders()`. You can pass either a plain object, or a closure which
  returns one.
* `Grid` supports a new `onGridReady` prop, allowing apps to hook into the AG Grid event callback
  without inadvertently short-circuiting the Grid's own internal handler.

### 💥 Breaking Changes

* The shortcut getter `FormModel.isNotValid` was deemed confusing and has been removed from the API.
  In most cases applications should use `!FormModel.isValid` instead; this expression will return
  `false` for the `Unknown` as well as the `NotValid` state. Applications that wish to explicitly
  test for the `NotValid` state should use the `validationState` getter.
* Multiple HoistInputs have changed their `onKeyPress` props to `onKeyDown`, including TextInput,
  NumberInput, TextArea & SearchInput. The `onKeyPress` event has been deprecated in general and has
  limitations on which keys will trigger the event to fire (i.e. it would not fire on an arrow
  keypress).
* FetchService's fetch methods no longer support `contentType` parameter. Instead, specify a custom
  content-type by setting a 'Content-Type' header using the `headers` parameter.
* FetchService's fetch methods no longer support `acceptJson` parameter. Instead, pass an {"Accept":
  "application/json"} header using the `headers` parameter.

### ✨ Styles

* Black point + grid colors adjusted in dark theme to better blend with overall blue-gray tint.
* Mobile styles have been adjusted to increase the default font size and grid row height, in
  addition to a number of other smaller visual adjustments.

### 🐞 Bug Fixes

* Avoid throwing React error due to tab / routing interactions. Tab / routing / state support
  generally improved. (#1052)
* `GridModel.selectFirst()` improved to reliably select first visible record even when one or more
  groupBy levels active. (#1058)

### 📚 Libraries

* AG Grid `~20.1 → ~20.2` (fixes ag-grid sorting bug with treeMode)
* @blueprint/core `3.14 → 3.15`
* @blueprint/datetime `3.7 → 3.8`
* react-dropzone `10.0 → 10.1`
* react-transition-group `2.6 → 2.8`

[Commit Log](https://github.com/xh/hoist-react/compare/v20.2.1...v21.0.0)

## v20.2.1 - 2019-03-28

* Minor tweaks to grid styles - CSS var for pinned column borders, drop left/right padding on
  center-aligned grid cells.

[Commit Log](https://github.com/xh/hoist-react/compare/v20.2.0...v20.2.1)

## v20.2.0 - 2019-03-27

### 🎁 New Features

* `GridModel` exposes three new configs - `rowBorders`, `stripeRows`, and `showCellFocus` - to
  provide additional control over grid styling. The former `Grid` prop `showHover` has been
  converted to a `GridModel` config for symmetry with these other flags and more efficient
  re-rendering. Note that some grid-related CSS classes have also been modified to better conform to
  the BEM approach used elsewhere - this could be a breaking change for apps that keyed off of
  certain Hoist grid styles (not expected to be a common case).
* `Select` adds a `queryBuffer` prop to avoid over-eager calls to an async `queryFn`. This buffer is
  defaulted to 300ms to provide some out-of-the-box debouncing of keyboard input when an async query
  is provided. A longer value might be appropriate for slow / intensive queries to a remote API.

### 🐞 Bug Fixes

* A small `FormField.labelWidth` config value will now be respected, even if it is less than the
  default minWidth of 80px.
* Unnecessary re-renders of inactive tab panels now avoided.
* `Grid`'s filter will now be consistently applied to all tree grid records. Previously, the filter
  skipped deeply nested records under specific conditions.
* `Timer` no longer requires its `runFn` to be a promise, as it briefly (and unintentionally) did.
* Suppressed default browser resize handles on `textarea`.

[Commit Log](https://github.com/xh/hoist-react/compare/v20.1.1...v20.2.0)

## v20.1.1 - 2019-03-27

### 🐞 Bug Fixes

* Fix form field reset so that it will call computeValidationAsync even if revalidation is not
  triggered because the field's value did not change when reset.

[Commit Log](https://github.com/xh/hoist-react/compare/v20.1.0...v20.1.1)

## v20.1.0 - 2019-03-14

### 🎁 New Features

* Standard app options panel now includes a "Restore Defaults" button to clear all user preferences
  as well as any custom grid state, resetting the app to its default state for that user.

### 🐞 Bug Fixes

* Removed a delay from `HoistInput` blur handling, ensuring `noteBlurred()` is called as soon as the
  element loses focus. This should remove a class of bugs related to input values not flushing into
  their models quickly enough when `commitOnChange: false` and the user moves directly from an input
  to e.g. clicking a submit button. #1023
* Fix to Admin ConfigDiffer tool (missing decorator).

### ⚙️ Technical

* The `GridModel.store` config now accepts a plain object and will internally create a `LocalStore`.
  This store config can also be partially specified or even omitted entirely. GridModel will ensure
  that the store is auto-configured with all fields in configured grid columns, reducing the need
  for app code boilerplate (re)enumerating field names.
* `Timer` class reworked to allow its interval to be adjusted dynamically via `setInterval()`,
  without requiring the Timer to be re-created.

[Commit Log](https://github.com/xh/hoist-react/compare/v20.0.1...v20.1.0)

## v20.0.1 - 2019-03-08

### 🐞 Bug Fixes

* Ensure `RestStore` processes records in a standard way following a save/add operation (#1010).

[Commit Log](https://github.com/xh/hoist-react/compare/v20.0.0...v20.0.1)

## v20.0.0 - 2019-03-06

### 💥 Breaking Changes

* The `@LoadSupport` decorator has been substantially reworked and enhanced from its initial release
  in v19. It is no longer needed on the HoistComponent, but rather should be put directly on the
  owned HoistModel implementing the loading. IMPORTANT NOTE: all models should implement
  `doLoadAsync` rather than `loadAsync`. Please see `LoadSupport` for more information on this
  important change.
* `TabContainer` and `TabContainerModel` are now cross-platform. Apps should update their code to
  import both from `@xh/hoist/cmp/tab`.
* `TabContainer.switcherPosition` has been moved to `TabContainerModel`. Please note that changes to
  `switcherPosition` are not supported on mobile, where the switcher will always appear beneath the
  container.
* The `Label` component from `@xh/hoist/desktop/cmp/input` has been removed. Applications should
  consider using the basic html `label` element instead (or a `FormField` if applicable).
* The `LeftRightChooserModel` constructor no longer accepts a `leftSortBy` and `rightSortBy`
  property. The implementation of these properties was generally broken. Use `leftSorted` and
  `rightSorted` instead.

#### Mobile

* Mobile `Page` has changed - `Pages` are now wrappers around `Panels` that are designed to be used
  with a `NavigationModel` or `TabContainer`. `Page` accepts the same props as `Panel`, meaning uses
  of `loadModel` should be replaced with `mask`.
* The mobile `AppBar` title is static and defaults to the app name. If you want to display page
  titles, it is recommended to use the `title` prop on the `Page`.

### 🎁 New Features

* Enhancements to Model and Component data loading via `@LoadSupport` provides a stronger set of
  conventions and better support for distinguishing between initial loads / auto/background
  refreshes / user- driven refreshes. It also provides new patterns for ensuring application
  Services are refreshed as part of a reworked global refresh cycle.
* RestGridModel supports a new `cloneAction` to take an existing record and open the editor form in
  "add mode" with all editable fields pre-populated from the source record. The action calls
  `prepareCloneFn`, if defined on the RestGridModel, to perform any transform operations before
  rendering the form.
* Tabs in `TabContainerModel` now support an `icon` property on the desktop.
* Charts take a new optional `aspectRatio` prop.
* Added new `Column.headerTooltip` config.
* Added new method `markManaged` on `ManagedSupport`.
* Added new function decorator `debounced`.
* Added new function `applyMixin` providing support for structured creation of class decorators
  (mixins).

#### Mobile

* Column chooser support available for mobile Grids. Users can check/uncheck columns to add/remove
  them from a configurable grid and reorder the columns in the list via drag and drop. Pair
  `GridModel.enableColChooser` with a mobile `colChooserButton` to allow use.
* Added `DialogPage` to the mobile toolkit. These floating pages do not participate in navigation or
  routing, and are used for showing fullscreen views outside of the Navigator / TabContainer
  context.
* Added `Panel` to the mobile toolkit, which offers a header element with standardized styling,
  title, and icon, as well as support for top and bottom toolbars.
* The mobile `AppBar` has been updated to more closely match the desktop `AppBar`, adding `icon`,
  `leftItems`, `hideAppMenuButton` and `appMenuButtonProps` props.
* Added routing support to mobile.

### 🐞 Bug Fixes

* The HighCharts wrapper component properly resizes its chart.
* Mobile dimension chooser button properly handles overflow for longer labels.
* Sizing fixes for multi-line inputs such as textArea and jsonInput.
* NumberInput calls a `onKeyPress` prop if given.
* Layout fixes on several admin panels and detail popups.

### 📚 Libraries

* @blueprintjs/core `3.13 → 3.14`
* @xh/hoist-dev-utils `3.5 → 3.6`
* ag-grid `~20.0 → ~20.1`
* react-dropzone `~8.0 → ~9.0`
* react-select `~2.3 → ~2.4`
* router5 `~6.6 → ~7.0`
* react `~16.7 → ~16.8`

[Commit Log](https://github.com/xh/hoist-react/compare/v19.0.1...v20.0.0)

## v19.0.1 - 2019-02-12

### 🐞 Bug Fixes

* Additional updates and simplifications to `FormField` sizing of child `HoistInput` elements, for
  more reliable sizing and spacing filling behavior.

[Commit Log](https://github.com/xh/hoist-react/compare/v19.0.0...v19.0.1)

## v19.0.0 - 2019-02-08

### 🎁 New Features

* Added a new architecture for signaling the need to load / refresh new data across either the
  entire app or a section of the component hierarchy. This new system relies on React context to
  minimizes the need for explicit application wiring, and improves support for auto-refresh. See
  newly added decorator `@LoadSupport` and classes/components `RefreshContext`,
  `RefreshContextModel`, and `RefreshContextView` for more info.
* `TabContainerModel` and `TabModel` now support `refreshMode` and `renderMode` configs to allow
  better control over how inactive tabs are mounted/unmounted and how tabs handle refresh requests
  when hidden or (re)activated.
* Apps can implement `getAppOptions()` in their `AppModel` class to specify a set of app-wide
  options that should be editable via a new built-in Options dialog. This system includes built-in
  support for reading/writing options to preferences, or getting/setting their values via custom
  handlers. The toolkit handles the rendering of the dialog.
* Standard top-level app buttons - for actions such as launching the new Options dialog, switching
  themes, launching the admin client, and logging out - have been moved into a new menu accessible
  from the top-right corner of the app, leaving more space for app-specific controls in the AppBar.
* `RecordGridModel` now supports an enhanced `editors` configuration that exposes the full set of
  validation and display support from the Forms package.
* `HoistInput` sizing is now consistently implemented using `LayoutSupport`. All sizable
  `HoistInputs` now have default `width` to ensure a standard display out of the box. `JsonInput`
  and `TextArea` also have default `height`. These defaults can be overridden by declaring explicit
  `width` and `height` values, or unset by setting the prop to `null`.
* `HoistInputs` within `FormFields` will be automatically sized to fill the available space in the
  `FormField`. In these cases, it is advised to either give the `FormField` an explicit size or
  render it in a flex layout.

### 💥 Breaking Changes

* AG Grid has been updated to v20.0.0. Most apps shouldn't require any changes - however, if you are
  using `agOptions` to set sorting, filtering or resizing properties, these may need to change:

  For the `Grid`, `agOptions.enableColResize`, `agOptions.enableSorting`
  and `agOptions.enableFilter`
  have been removed. You can replicate their effects by using `agOptions.defaultColDef`. For
  `Columns`, `suppressFilter` has been removed, an should be replaced with `filter: false`.

* `HoistAppModel.requestRefresh` and `TabContainerModel.requestRefresh` have been removed.
  Applications should use the new Refresh architecture described above instead.
* `tabRefreshMode` on TabContainer has been renamed `renderMode`.
* `TabModel.reloadOnShow` has been removed. Set the `refreshMode` property on TabContainerModel or
  TabModel to `TabRefreshMode.ON_SHOW_ALWAYS` instead.
* The mobile APIs for `TabContainerModel`, `TabModel`, and `RefreshButton` have been rewritten to
  more closely mirror the desktop API.
* The API for `RecordGridModel` editors has changed -- `type` is no longer supported. Use
  `fieldModel` and `formField` instead.
* `LocalStore.loadRawData` requires that all records presented to store have unique IDs specified.
  See `LocalStore.idSpec` for more information.

### 🐞 Bug Fixes

* SwitchInput and RadioInput now properly highlight validation errors in `minimal` mode.

### 📚 Libraries

* @blueprintjs/core `3.12 → 3.13`
* ag-grid `~19.1.4 → ~20.0.0`

[Commit Log](https://github.com/xh/hoist-react/compare/v18.1.2...v19.0.0)

## v18.1.2 - 2019-01-30

### 🐞 Bug Fixes

* Grid integrations relying on column visibility (namely export, storeFilterField) now correctly
  consult updated column state from GridModel. #935
* Ensure `FieldModel.initialValue` is observable to ensure that computed dirty state (and any other
  derivations) are updated if it changes. #934
* Fixes to ensure Admin console log viewer more cleanly handles exceptions (e.g. attempting to
  auto-refresh on a log file that has been deleted).

[Commit Log](https://github.com/xh/hoist-react/compare/v18.1.1...v18.1.2)

## v18.1.1 - 2019-01-29

* Grid cell padding can be controlled via a new set of CSS vars and is reduced by default for grids
  in compact mode.
* The `addRecordAsync()` and `saveRecordAsync()` methods on `RestStore` return the updated record.

[Commit Log](https://github.com/xh/hoist-react/compare/v18.1.0...v18.1.1)

## v18.1.0 - 2019-01-28

### 🎁 New Features

* New `@managed` class field decorator can be used to mark a property as fully created/owned by its
  containing class (provided that class has installed the matching `@ManagedSupport` decorator).
    * The framework will automatically pass any `@managed` class members to `XH.safeDestroy()` on
      destroy/unmount to ensure their own `destroy()` lifecycle methods are called and any related
      resources are disposed of properly, notably MobX observables and reactions.
    * In practice, this should be used to decorate any properties on `HoistModel`, `HoistService`,
      or
      `HoistComponent` classes that hold a reference to a `HoistModel` created by that class. All of
      those core artifacts support the new decorator, `HoistModel` already provides a built-in
      `destroy()` method, and calling that method when an app is done with a Model is an important
      best practice that can now happen more reliably / easily.
* `FormModel.getData()` accepts a new single parameter `dirtyOnly` - pass true to get back only
  fields which have been modified.
* The mobile `Select` component indicates the current value with a ✅ in the drop-down list.
* Excel exports from tree grids now include the matching expand/collapse tree controls baked into
  generated Excel file.

### 🐞 Bug Fixes

* The `JsonInput` component now properly respects / indicates disabled state.

### 📚 Libraries

* Hoist-dev-utils `3.4.1 → 3.5.0` - updated webpack and other build tool dependencies, as well as
  an improved eslint configuration.
* @blueprintjs/core `3.10 → 3.12`
* @blueprintjs/datetime `3.5 → 3.7`
* fontawesome `5.6 → 5.7`
* mobx `5.8 → 5.9`
* react-select `2.2 → 2.3`
* Other patch updates

[Commit Log](https://github.com/xh/hoist-react/compare/v18.0.0...v18.1.0)

## v18.0.0 - 2019-01-15

### 🎁 New Features

* Form support has been substantially enhanced and restructured to provide both a cleaner API and
  new functionality:
    * `FormModel` and `FieldModel` are now concrete classes and provide the main entry point for
      specifying the contents of a form. The `Field` and `FieldSupport` decorators have been
      removed.
    * Fields and sub-forms may now be dynamically added to FormModel.
    * The validation state of a FormModel is now *immediately* available after construction and
      independent of the GUI. The triggering of the *display* of that state is now a separate
      process triggered by GUI actions such as blur.
    * `FormField` has been substantially reworked to support a read-only display and inherit common
      property settings from its containing `Form`.
    * `HoistInput` has been moved into the `input` package to clarify that these are lower level
      controls and independent of the Forms package.

* `RestGrid` now supports a `mask` prop. RestGrid loading is now masked by default.
* `Chart` component now supports a built-in zoom out gesture: click and drag from right-to-left on
  charts with x-axis zooming.
* `Select` now supports an `enableClear` prop to control the presence of an optional inline clear
  button.
* `Grid` components take `onCellClicked` and `onCellDoubleClicked` event handlers.
* A new desktop `FileChooser` wraps a preconfigured react-dropzone component to allow users to
  easily select files for upload or other client-side processing.

### 💥 Breaking Changes

* Major changes to Form (see above). `HoistInput` imports will also need to be adjusted to move from
  `form` to `input`.
* The name of the HoistInput `field` prop has been changed to `bind`. This change distinguishes the
  lower-level input package more clearly from the higher-level form package which uses it. It also
  more clearly relates the property to the associated `@bindable` annotation for models.
* A `Select` input with `enableMulti = true` will by default no longer show an inline x to clear the
  input value. Use the `enableClear` prop to re-enable.
* Column definitions are exported from the `grid` package. To ensure backwards compatibility,
  replace imports from `@xh/hoist/desktop/columns` with `@xh/hoist/desktop/cmp/grid`.

### 📚 Libraries

* React `~16.6.0 → ~16.7.0`
* Patch version updates to multiple other dependencies.

[Commit Log](https://github.com/xh/hoist-react/compare/v17.0.0...v18.0.0)

## v17.0.0 - 2018-12-21

### 💥 Breaking Changes

* The implementation of the `model` property on `HoistComponent` has been substantially enhanced:
    * "Local" Models should now be specified on the Component class declaration by simply setting
      the
      `model` property, rather than the confusing `localModel` property.
    * HoistComponent now supports a static `modelClass` class property. If set, this property will
      allow a HoistComponent to auto-create a model internally when presented with a plain
      javascript object as its `model` prop. This is especially useful in cases like `Panel`
      and `TabContainer`, where apps often need to specify a model but do not require a reference to
      the model. Those usages can now skip importing and instantiating an instance of the
      component's model class themselves.
    * Hoist will now throw an Exception if an application attempts to changes the model on an
      existing HoistComponent instance or presents the wrong type of model to a HoistComponent where
      `modelClass` has been specified.

* `PanelSizingModel` has been renamed `PanelModel`. The class now also has the following new
  optional properties, all of which are `true` by default:
    * `showSplitter` - controls visibility of the splitter bar on the outside edge of the component.
    * `showSplitterCollapseButton` - controls visibility of the collapse button on the splitter bar.
    * `showHeaderCollapseButton` - controls visibility of a (new) collapse button in the header.

* The API methods for exporting grid data have changed and gained new features:
    * Grids must opt-in to export with the `GridModel.enableExport` config.
    * Exporting a `GridModel` is handled by the new `GridExportService`, which takes a collection of
      `exportOptions`. See `GridExportService.exportAsync` for available `exportOptions`.
    * All export entry points (`GridModel.exportAsync()`, `ExportButton` and the export context menu
      items) support `exportOptions`. Additionally, `GridModel` can be configured with default
      `exportOptions` in its config.

* The `buttonPosition` prop on `NumberInput` has been removed due to problems with the underlying
  implementation. Support for incrementing buttons on NumberInputs will be re-considered for future
  versions of Hoist.

### 🎁 New Features

* `TextInput` on desktop now supports an `enableClear` property to allow easy addition of a clear
  button at the right edge of the component.
* `TabContainer` enhancements:
    * An `omit` property can now be passed in the tab configs passed to the `TabContainerModel`
      constructor to conditionally exclude a tab from the container
    * Each `TabModel` can now be retrieved by id via the new `getTabById` method on
      `TabContainerModel`.
    * `TabModel.title` can now be changed at runtime.
    * `TabModel` now supports the following properties, which can be changed at runtime or set via
      the config:
        * `disabled` - applies a disabled style in the switcher and blocks navigation to the tab via
          user click, routing, or the API.
        * `excludeFromSwitcher` - removes the tab from the switcher, but the tab can still be
          navigated to programmatically or via routing.
* `MultiFieldRenderer` `multiFieldConfig` now supports a `delimiter` property to separate
  consecutive SubFields.
* `MultiFieldRenderer` SubFields now support a `position` property, to allow rendering in either the
  top or bottom row.
* `StoreCountLabel` now supports a new 'includeChildren' prop to control whether or not children
  records are included in the count. By default this is `false`.
* `Checkbox` now supports a `displayUnsetState` prop which may be used to display a visually
  distinct state for null values.
* `Select` now renders with a checkbox next to the selected item in its dropdown menu, instead of
  relying on highlighting. A new `hideSelectedOptionCheck` prop is available to disable.
* `RestGridModel` supports a `readonly` property.
* `DimensionChooser`, various `HoistInput` components, `Toolbar` and `ToolbarSeparator` have been
  added to the mobile component library.
* Additional environment enums for UAT and BCP, added to Hoist Core 5.4.0, are supported in the
  application footer.

### 🐞 Bug Fixes

* `NumberInput` will no longer immediately convert its shorthand value (e.g. "3m") into numeric form
  while the user remains focused on the input.
* Grid `actionCol` columns no longer render Button components for each action, relying instead on
  plain HTML / CSS markup for a significant performance improvement when there are many rows and/or
  actions per row.
* Grid exports more reliably include the appropriate file extension.
* `Select` will prevent an `<esc>` keypress from bubbling up to parent components only when its menu
  is open. (In that case, the component assumes escape was pressed to close its menu and captures
  the keypress, otherwise it should leave it alone and let it e.g. close a parent popover).

[Commit Log](https://github.com/xh/hoist-react/compare/v16.0.1...v17.0.0)

## v16.0.1 - 2018-12-12

### 🐞 Bug Fixes

* Fix to FeedbackForm allowing attempted submission with an empty message.

[Commit Log](https://github.com/xh/hoist-react/compare/v16.0.0...v16.0.1)

## v16.0.0

### 🎁 New Features

* Support for ComboBoxes and Dropdowns have been improved dramatically, via a new `Select` component
  based on react-select.
* The AG Grid based `Grid` and `GridModel` are now available on both mobile and desktop. We have
  also added new support for multi-row/multi-field columns via the new `multiFieldRenderer` renderer
  function.
* The app initialization lifecycle has been restructured so that no App classes are constructed
  until Hoist is fully initialized.
* `Column` now supports an optional `rowHeight` property.
* `Button` now defaults to 'minimal' mode, providing a much lighter-weight visual look-and-feel to
  HoistApps. `Button` also implements `@LayoutSupport`.
* Grouping state is now saved by the grid state support on `GridModel`.
* The Hoist `DimChooser` component has been ported to hoist-react.
* `fetchService` now supports an `autoAbortKey` in its fetch methods. This can be used to
  automatically cancel obsolete requests that have been superseded by more recent variants.
* Support for new `clickableLabel` property on `FormField`.
* `RestForm` now supports a read-only view.
* Hoist now supports automatic tracking of app/page load times.

### 💥 Breaking Changes

* The new location for the cross-platform grid component is `@xh/hoist/cmp/grid`. The `columns`
  package has also moved under a new sub-package in this location.
* Hoist top-level App Structure has changed in order to improve consistency of the Model-View
  conventions, to improve the accessibility of services, and to support the improvements in app
  initialization mentioned above:
    - `XH.renderApp` now takes a new `AppSpec` configuration.
    - `XH.app` is now `XH.appModel`.
    - All services are installed directly on `XH`.
    - `@HoistApp` is now `@HoistAppModel`
* `RecordAction` has been substantially refactored and improved. These are now typically immutable
  and may be shared.
    - `prepareFn` has been replaced with a `displayFn`.
    - `actionFn` and `displayFn` now take a single object as their parameter.
* The `hide` property on `Column` has been changed to `hidden`.
* The `ColChooserButton` has been moved from the incorrect location `@xh/hoist/cmp/grid` to
  `@xh/hoist/desktop/cmp/button`. This is a desktop-only component. Apps will have to adjust these
  imports.
* `withDefaultTrue` and `withDefaultFalse` in `@xh/hoist/utils/js` have been removed. Use
  `withDefault` instead.
* `CheckBox` has been renamed `Checkbox`

### ⚙️ Technical

* AG Grid has been upgraded to v19.1
* mobx has been upgraded to v5.6
* React has been upgraded to v16.6
* Allow browsers with proper support for Proxy (e.g Edge) to access Hoist Applications.

### 🐞 Bug Fixes

* Extensive. See full change list below.

[Commit Log](https://github.com/xh/hoist-react/compare/v15.1.2...v16.0.0)

## v15.1.2

🛠 Hotfix release to MultiSelect to cap the maximum number of options rendered by the drop-down
list. Note, this component is being replaced in Hoist v16 by the react-select library.

[Commit Log](https://github.com/xh/hoist-react/compare/v15.1.1...v15.1.2)

## v15.1.1

### 🐞 Bug Fixes

* Fix to minimal validation mode for FormField disrupting input focus.
* Fix to JsonInput disrupting input focus.

### ⚙️ Technical

* Support added for TLBR-style notation when specifying margin/padding via layoutSupport - e.g. box(
  {margin: '10 20 5 5'}).
* Tweak to lockout panel message when the user has no roles.

[Commit Log](https://github.com/xh/hoist-react/compare/v15.1.0...v15.1.1)

## v15.1.0

### 🎁 New Features

* The FormField component takes a new minimal prop to display validation errors with a tooltip only
  as opposed to an inline message string. This can be used to help reduce shifting / jumping form
  layouts as required.
* The admin-only user impersonation toolbar will now accept new/unknown users, to support certain
  SSO application implementations that can create users on the fly.

### ⚙️ Technical

* Error reporting to server w/ custom user messages is disabled if the user is not known to the
  client (edge case with errors early in app lifecycle, prior to successful authentication).

[Commit Log](https://github.com/xh/hoist-react/compare/v15.0.0...v15.1.0)

## v15.0.0

### 💥 Breaking Changes

* This update does not require any application client code changes, but does require updating the
  Hoist Core Grails plugin to >= 5.0. Hoist Core changes to how application roles are loaded and
  users are authenticated required minor changes to how JS clients bootstrap themselves and load
  user data.
* The Hoist Core HoistImplController has also been renamed to XhController, again requiring Hoist
  React adjustments to call the updated /xh/ paths for these (implementation) endpoints. Again, no
  app updates required beyond taking the latest Hoist Core plugin.

[Commit Log](https://github.com/xh/hoist-react/compare/v14.2.0...v15.0.0)

## v14.2.0

### 🎁 New Features

* Upgraded hoist-dev-utils to 3.0.3. Client builds now use the latest Webpack 4 and Babel 7 for
  noticeably faster builds and recompiles during CI and at development time.
* GridModel now has a top-level agColumnApi property to provide a direct handle on the AG Grid
  Column API object.

### ⚙️ Technical

* Support for column groups strengthened with the addition of a dedicated ColumnGroup sibling class
  to Column. This includes additional internal refactoring to reduce unnecessary cloning of Column
  configurations and provide a more managed path for Column updates. Public APIs did not change.
  (#694)

### 📚 Libraries

* Blueprint Core `3.6.1 → 3.7.0`
* Blueprint Datetime `3.2.0 → 3.3.0`
* Fontawesome `5.3.x → 5.4.x`
* MobX `5.1.2 → 5.5.0`
* Router5 `6.5.0 → 6.6.0`

[Commit Log](https://github.com/xh/hoist-react/compare/v14.1.3...v14.2.0)

## v14.1.3

### 🐞 Bug Fixes

* Ensure JsonInput reacts properly to value changes.

### ⚙️ Technical

* Block user pinning/unpinning in Grid via drag-and-drop - pending further work via #687.
* Support "now" as special token for dateIs min/max validation rules.
* Tweak grouped grid row background color.

[Commit Log](https://github.com/xh/hoist-react/compare/v14.1.1...v14.1.3)

## v14.1.1

### 🐞 Bug Fixes

* Fixes GridModel support for row-level grouping at same time as column grouping.

[Commit Log](https://github.com/xh/hoist-react/compare/v14.1.0...v14.1.1)

## v14.1.0

### 🎁 New Features

* GridModel now supports multiple levels of row grouping. Pass the public setGroupBy() method an
  array of string column IDs, or a falsey value / empty array to ungroup. Note that the public and
  observable groupBy property on GridModel will now always be an array, even if the grid is not
  grouped or has only a single level of grouping.
* GridModel exposes public expandAll() and collapseAll() methods for grouped / tree grids, and
  StoreContextMenu supports a new "expandCollapseAll" string token to insert context menu items.
  These are added to the default menu, but auto-hide when the grid is not in a grouped state.
* The Grid component provides a new onKeyDown prop, which takes a callback and will fire on any
  keypress targeted within the Grid. Note such a handler is not provided directly by AG Grid.
* The Column class supports pinned as a top-level config. Supports passing true to pin to the left.

### 🐞 Bug Fixes

* Updates to Grid column widths made via AG Grid's "autosize to fit" API are properly persisted to
  grid state.

[Commit Log](https://github.com/xh/hoist-react/compare/v14.0.0...v14.1.0)

## v14.0.0

* Along with numerous bug fixes, v14 brings with it a number of important enhancements for grids,
  including support for tree display, 'action' columns, and absolute value sorting. It also includes
  some new controls and improvement to focus display.

### 💥 Breaking Changes

* The signatures of the Column.elementRenderer and Column.renderer have been changed to be
  consistent with each other, and more extensible. Each takes two arguments -- the value to be
  rendered, and a single bundle of metadata.
* StoreContextMenuAction has been renamed to RecordAction. Its action property has been renamed to
  actionFn for consistency and clarity.
* LocalStore : The method LocalStore.processRawData no longer takes an array of all records, but
  instead takes just a single record. Applications that need to operate on all raw records in bulk
  should do so before presenting them to LocalStore. Also, LocalStores template methods for override
  have also changed substantially, and sub-classes that rely on these methods will need to be
  adjusted accordingly.

### 🎁 New Features

#### Grid

* The Store API now supports hierarchical datasets. Applications need to simply provide raw data for
  records with a "children" property containing the raw data for their children.
* Grid supports a 'TreeGrid' mode. To show a tree grid, bind the GridModel to a store containing
  hierarchical data (as above), set treeMode: true on the GridModel, and specify a column to display
  the tree controls (isTreeColumn: true)
* Grid supports absolute sorting for numerical columns. Specify absSort: true on your column config
  to enable. Clicking the grid header will now cycle through ASC > DESC > DESC (abs) sort modes.
* Grid supports an 'Actions' column for one-click record actions. See cmp/desktop/columns/actionCol.
* A new showHover prop on the desktop Grid component will highlight the hovered row with default
  styling. A new GridModel.rowClassFn callback was added to support per-row custom classes based on
  record data.
* A new ExportFormat.LONG_TEXT format has been added, along with a new Column.exportWidth config.
  This supports exporting columns that contain long text (e.g. notes) as multi-line cells within
  Excel.

#### Other Components

* RadioInput and ButtonGroupInput have been added to the desktop/cmp/form package.
* DateInput now has support for entering and displaying time values.
* NumberInput displays its unformatted value when focused.
* Focused components are now better highlighted, with additional CSS vars provided to customize as
  needed.

### 🐞 Bug Fixes

* Calls to GridModel.setGroupBy() work properly not only on the first, but also all subsequent calls
  (#644).
* Background / style issues resolved on several input components in dark theme (#657).
* Grid context menus appear properly over other floating components.

### 📚 Libraries

* React `16.5.1 → 16.5.2`
* router5 `6.4.2 → 6.5.0`
* CodeMirror, Highcharts, and MobX patch updates

[Commit Log](https://github.com/xh/hoist-react/compare/v13.0.0...v14.0.0)

## v13.0.0

🍀Lucky v13 brings with it a number of enhancements for forms and validation, grouped column support
in the core Grid API, a fully wrapped MultiSelect component, decorator syntax adjustments, and a
number of other fixes and enhancements.

It also includes contributions from new ExHI team members Arjun and Brendan. 🎉

### 💥 Breaking Changes

* The core `@HoistComponent`, `@HoistService`, and `@HoistModel` decorators are **no longer
  parameterized**, meaning that trailing `()` should be removed after each usage. (#586)
* The little-used `hoistComponentFactory()` method was also removed as a further simplification
  (#587).
* The `HoistField` superclass has been renamed to `HoistInput` and the various **desktop form
  control components have been renamed** to match (55afb8f). Apps using these components (which will
  likely be most apps) will need to adapt to the new names.
    * This was done to better distinguish between the input components and the upgraded Field
      concept on model classes (see below).

### 🎁 New Features

⭐️ **Forms and Fields** have been a major focus of attention, with support for structured data
fields added to Models via the `@FieldSupport` and `@field()` decorators.

* Models annotated with `@FieldSupport` can decorate member properties with `@field()`, making those
  properties observable and settable (with a generated `setXXX()` method).
* The `@field()` decorators themselves can be passed an optional display label string as well as
  zero or more *validation rules* to define required constraints on the value of the field.
* A set of predefined constraints is provided within the toolkit within the `/field/` package.
* Models using `FieldSupport` should be sure to call the `initFields()` method installed by the
  decorator within their constructor. This method can be called without arguments to generally
  initialize the field system, or it can be passed an object of field names to initial/default
  values, which will set those values on the model class properties and provide change/dirty
  detection and the ability to "reset" a form.
* A new `FormField` UI component can be used to wrap input components within a form. The `FormField`
  wrapper can accept the source model and field name, and will apply those to its child input. It
  leverages the Field model to automatically display a label, indicate required fields, and print
  validation error messages. This new component should be the building-block for most non-trivial
  forms within an application.

Other enhancements include:

* **Grid columns can be grouped**, with support for grouping added to the grid state management
  system, column chooser, and export manager (#565). To define a column group, nest column
  definitions passed to `GridModel.columns` within a wrapper object of the
  form `{headerName: 'My group', children: [...]}`.

(Note these release notes are incomplete for this version.)

[Commit Log](https://github.com/xh/hoist-react/compare/v12.1.2...v13.0.0)

## v12.1.2

### 🐞 Bug Fixes

* Fix casing on functions generated by `@settable` decorator
  (35c7daa209a4205cb011583ebf8372319716deba).

[Commit Log](https://github.com/xh/hoist-react/compare/v12.1.1...v12.1.2)

## v12.1.1

### 🐞 Bug Fixes

* Avoid passing unknown HoistField component props down to Blueprint select/checkbox controls.

### 📚 Libraries

* Rollback update of `@blueprintjs/select` package `3.1.0 → 3.0.0` - this included breaking API
  changes and will be revisited in #558.

[Commit Log](https://github.com/xh/hoist-react/compare/v12.1.0...v12.1.1)

## v12.1.0

### 🎁 New Features

* New `@bindable` and `@settable` decorators added for MobX support. Decorating a class member
  property with `@bindable` makes it a MobX `@observable` and auto-generates a setter method on the
  class wrapped in a MobX `@action`.
* A `fontAwesomeIcon` element factory is exported for use with other FA icons not enumerated by the
  `Icon` class.
* CSS variables added to control desktop Blueprint form control margins. These remain defaulted to
  zero, but now within CSS with support for variable overrides. A Blueprint library update also
  brought some changes to certain field-related alignment and style properties. Review any form
  controls within apps to ensure they remain aligned as desired
  (8275719e66b4677ec5c68a56ccc6aa3055283457 and df667b75d41d12dba96cbd206f5736886cb2ac20).

### 🐞 Bug Fixes

* Grid cells are fully refreshed on a data update, ensuring cell renderers that rely on data other
  than their primary display field are updated (#550).
* Grid auto-sizing is run after a data update, ensuring flex columns resize to adjust for possible
  scrollbar visibility changes (#553).
* Dropdown fields can be instantiated with fewer required properties set (#541).

### 📚 Libraries

* Blueprint `3.0.1 → 3.4.0`
* FontAwesome `5.2.0 → 5.3.0`
* CodeMirror `5.39.2 → 5.40.0`
* MobX `5.0.3 → 5.1.0`
* router5 `6.3.0 → 6.4.2`
* React `16.4.1 → 16.4.2`

[Commit Log](https://github.com/xh/hoist-react/compare/v12.0.0...v12.1.0)

## v12.0.0

Hoist React v12 is a relatively large release, with multiple refactorings around grid columns,
`elemFactory` support, classNames, and a re-organization of classes and exports within `utils`.

### 💥 Breaking Changes

#### ⭐️ Grid Columns

**A new `Column` class describes a top-level API for columns and their supported options** and is
intended to be a cross-platform layer on top of AG Grid and TBD mobile grid implementations.

* The desktop `GridModel` class now accepts a collection of `Column` configuration objects to define
  its available columns.
* Columns may be configured with `flex: true` to cause them to stretch all available horizontal
  space within a grid, sharing it equally with any other flex columns. However note that this should
  be used sparingly, as flex columns have some deliberate limitations to ensure stable and
  consistent behavior. Most noticeably, they cannot be resized directly by users. Often, a best
  practice will be to insert an `emptyFlexCol` configuration as the last column in a grid - this
  will avoid messy-looking gaps in the layout while not requiring a data-driven column be flexed.
* User customizations to column widths are now saved if the GridModel has been configured with a
  `stateModel` key or model instance - see `GridStateModel`.
* Columns accept a `renderer` config to format text or HTML-based output. This is a callback that is
  provided the value, the row-level record, and a metadata object with the column's `colId`. An
  `elementRenderer` config is also available for cells that should render a Component.
* An `agOptions` config key continues to provide a way to pass arbitrary options to the underlying
  AG Grid instance (for desktop implementations). This is considered an "escape hatch" and should be
  used with care, but can provide a bridge to required AG Grid features as the Hoist-level API
  continues to develop.
* The "factory pattern" for Column templates / defaults has been removed, replaced by a simpler
  approach that recommends exporting simple configuration partials and spreading them into
  instance-specific column configs.
* See 0798f6bb20092c59659cf888aeaf9ecb01db52a6 for primary commit.

#### ⭐️ Element Factory, LayoutSupport, BaseClassName

Hoist provides core support for creating components via a factory pattern, powered by the `elem()`
and `elemFactory()` methods. This approach remains the recommended way to instantiate component
elements, but was **simplified and streamlined**.

* The rarely used `itemSpec` argument was removed (this previously applied defaults to child items).
* Developers can now also use JSX to instantiate all Hoist-provided components while still taking
  advantage of auto-handling for layout-related properties provided by the `LayoutSupport` mixin.
    * HoistComponents should now spread **`...this.getLayoutProps()`** into their outermost rendered
      child to enable promotion of layout properties.
* All HoistComponents can now specify a **baseClassName** on their component class and should pass
  `className: this.getClassName()` down to their outermost rendered child. This allows components to
  cleanly layer on a base CSS class name with any instance-specific classes.
* See 8342d3870102ee9bda4d11774019c4928866f256 for primary commit.

#### ⭐️ Panel resizing / collapsing

**The `Panel` component now takes a `sizingModel` prop to control and encapsulate newly built-in
resizing and collapsing behavior** (#534).

* See the `PanelSizingModel` class for configurable details, including continued support for saving
  sizing / collapsed state as a user preference.
* **The standalone `Resizable` component was removed** in favor of the improved support built into
  Panel directly.

#### Other

* Two promise-related models have been combined into **a new, more powerful `PendingTaskModel`**,
  and the `LoadMask` component has been removed and consolidated into `Mask`
  (d00a5c6e8fc1e0e89c2ce3eef5f3e14cb842f3c8).
    * `Panel` now exposes a single `mask` prop that can take either a configured `mask` element or a
      simple boolean to display/remove a default mask.
* **Classes within the `utils` package have been re-organized** into more standardized and scalable
  namespaces. Imports of these classes will need to be adjusted.

### 🎁 New Features

* **The desktop Grid component now offers a `compact` mode** with configurable styling to display
  significantly more data with reduced padding and font sizes.
* The top-level `AppBar` refresh button now provides a default implementation, calling a new
  abstract `requestRefresh()` method on `HoistApp`.
* The grid column chooser can now be configured to display its column groups as initially collapsed,
  for especially large collections of columns.
* A new `XH.restoreDefaultsAsync()` method provides a centralized way to wipe out user-specific
  preferences or customizations (#508).
* Additional Blueprint `MultiSelect`, `Tag`, and `FormGroup` controls re-exported.

### 🐞 Bug Fixes

* Some components were unintentionally not exporting their Component class directly, blocking JSX
  usage. All components now export their class.
* Multiple fixes to `DayField` (#531).
* JsonField now responds properly when switching from light to dark theme (#507).
* Context menus properly filter out duplicated separators (#518).

[Commit Log](https://github.com/xh/hoist-react/compare/v11.0.0...v12.0.0)

## v11.0.0

### 💥 Breaking Changes

* **Blueprint has been upgraded to the latest 3.x release.** The primary breaking change here is the
  renaming of all `pt-` CSS classes to use a new `bp3-` prefix. Any in-app usages of the BP
  selectors will need to be updated. See the
  [Blueprint "What's New" page](http://blueprintjs.com/docs/#blueprint/whats-new-3.0).
* **FontAwesome has been upgraded to the latest 5.2 release.** Only the icons enumerated in the
  Hoist `Icon` class are now registered via the FA `library.add()` method for inclusion in bundled
  code, resulting in a significant reduction in bundle size. Apps wishing to use other FA icons not
  included by Hoist must import and register them - see the
  [FA React Readme](https://github.com/FortAwesome/react-fontawesome/blob/master/README.md) for
  details.
* **The `mobx-decorators` dependency has been removed** due to lack of official support for the
  latest MobX update, as well as limited usage within the toolkit. This package was primarily
  providing the optional `@setter` decorator, which should now be replaced as needed by dedicated
  `@action` setter methods (19cbf86138499bda959303e602a6d58f6e95cb40).

### 🎁 Enhancements

* `HoistComponent` now provides a `getClassNames()` method that will merge any `baseCls` CSS class
  names specified on the component with any instance-specific classes passed in via props (#252).
    * Components that wish to declare and support a `baseCls` should use this method to generate and
      apply a combined list of classes to their outermost rendered elements (see `Grid`).
    * Base class names have been added for relevant Hoist-provided components - e.g. `.xh-panel` and
      `.xh-grid`. These will be appended to any instance class names specified within applications
      and be available as public CSS selectors.
* Relevant `HoistField` components support inline `leftIcon` and `rightElement` props. `DayField`
  adds support for `minDay / maxDay` props.
* Styling for the built-in AG Grid loading overlay has been simplified and improved (#401).
* Grid column definitions can now specify an `excludeFromExport` config to drop them from
  server-generated Excel/CSV exports (#485).

### 🐞 Bug Fixes

* Grid data loading and selection reactions have been hardened and better coordinated to prevent
  throwing when attempting to set a selection before data has been loaded (#484).

### 📚 Libraries

* Blueprint `2.x → 3.x`
* FontAwesome `5.0.x → 5.2.x`
* CodeMirror `5.37.0 → 5.39.2`
* router5 `6.2.4 → 6.3.0`

[Commit Log](https://github.com/xh/hoist-react/compare/v10.0.1...v11.0.0)

## v10.0.1

### 🐞 Bug Fixes

* Grid `export` context menu token now defaults to server-side 'exportExcel' export.
    * Specify the `exportLocal` token to return a menu item for local AG Grid export.
* Columns with `field === null` skipped for server-side export (considered spacer / structural
  columns).

## v10.0.0

### 💥 Breaking Changes

* **Access to the router API has changed** with the `XH` global now exposing `router` and
  `routerState` properties and a `navigate()` method directly.
* `ToastManager` has been deprecated. Use `XH.toast` instead.
* `Message` is no longer a public class (and its API has changed). Use `XH.message/confirm/alert`
  instead.
* Export API has changed. The Built-in grid export now uses more powerful server-side support. To
  continue to use local AG based export, call method `GridModel.localExport()`. Built-in export
  needs to be enabled with the new property on `GridModel.enableExport`. See `GridModel` for more
  details.

### 🎁 Enhancements

* New Mobile controls and `AppContainer` provided services (impersonation, about, and version bars).
* Full-featured server-side Excel export for grids.

### 🐞 Bug Fixes

* Prevent automatic zooming upon input focus on mobile devices (#476).
* Clear the selection when showing the context menu for a record which is not already selected
  (#469).
* Fix to make lockout script readable by Compatibility Mode down to IE5.

### 📚 Libraries

* MobX `4.2.x → 5.0.x`

[Commit Log](https://github.com/xh/hoist-react/compare/v9.0.0...v10.0.0)

## v9.0.0

### 💥 Breaking Changes

* **Hoist-provided mixins (decorators) have been refactored to be more granular and have been broken
  out of `HoistComponent`.**
    * New discrete mixins now exist for `LayoutSupport` and `ContextMenuSupport` - these should be
      added directly to components that require the functionality they add for auto-handling of
      layout-related props and support for showing right-click menus. The corresponding options on
      `HoistComponent` that used to enable them have been removed.
    * For consistency, we have also renamed `EventTarget → EventSupport` and `Reactive →
      ReactiveSupport` mixins. These both continue to be auto-applied to HoistModel and HoistService
      classes, and ReactiveSupport enabled by default in HoistComponent.
* **The Context menu API has changed.** The `ContextMenuSupport` mixin now specifies an abstract
  `getContextMenuItems()` method for component implementation (replacing the previous
  `renderContextMenu()` method). See the new [`ContextMenuItem` class for what these items support,
  as well as several static default items that can be used.
    * The top-level `AppContainer` no longer provides a default context menu, instead allowing the
      browser's own context menu to show unless an app / component author has implemented custom
      context-menu handling at any level of their component hierarchy.

### 🐞 Bug Fixes

* TabContainer active tab can become out of sync with the router state (#451)
    * ⚠️ Note this also involved a change to the `TabContainerModel` API - `activateTab()` is now
      the public method to set the active tab and ensure both the tab and the route land in the
      correct state.
* Remove unintended focused cell borders that came back with the prior AG Grid upgrade.

[Commit Log](https://github.com/xh/hoist-react/compare/v8.0.0...v9.0.0)

## v8.0.0

Hoist React v8 brings a big set of improvements and fixes, some API and package re-organizations,
and AG Grid upgrade, and more. 🚀

### 💥 Breaking Changes

* **Component package directories have been re-organized** to provide better symmetry between
  pre-existing "desktop" components and a new set of mobile-first component. Current desktop
  applications should replace imports from `@xh/hoist/cmp/xxx` with `@xh/hoist/desktop/cmp/xxx`.
    * Important exceptions include several classes within `@xh/hoist/cmp/layout/`, which remain
      cross-platform.
    * `Panel` and `Resizable` components have moved to their own packages in
      `@xh/hoist/desktop/cmp/panel` and `@xh/hoist/desktop/cmp/resizable`.
* **Multiple changes and improvements made to tab-related APIs and components.**
    * The `TabContainerModel` constructor API has changed, notably `children` → `tabs`, `useRoutes`
      →
      `route` (to specify a starting route as a string) and `switcherPosition` has moved from a
      model config to a prop on the `TabContainer` component.
    * `TabPane` and `TabPaneModel` have been renamed `Tab` and `TabModel`, respectively, with
      several related renames.
* **Application entry-point classes decorated with `@HoistApp` must implement the new getter method
  `containerClass()`** to specify the platform specific component used to wrap the app's
  `componentClass`.
    * This will typically be `@xh/hoist/[desktop|mobile]/AppContainer` depending on platform.

### 🎁 New Features

* **Tab-related APIs re-worked and improved**, including streamlined support for routing, a new
  `tabRenderMode` config on `TabContainerModel`, and better naming throughout.
* **Ag-grid updated to latest v18.x** - now using native flex for overall grid layout and sizing
  controls, along with multiple other vendor improvements.
* Additional `XH` API methods exposed for control of / integration with Router5.
* The core `@HoistComponent` decorated now installs a new `isDisplayed` getter to report on
  component visibility, taking into account the visibility of its ancestors in the component tree.
* Mobile and Desktop app package / component structure made more symmetrical (#444).
* Initial versions of multiple new mobile components added to the toolkit.
* Support added for **`IdleService` - automatic app suspension on inactivity** (#427).
* Hoist wrapper added for the low-level Blueprint **button component** - provides future hooks into
  button customizations and avoids direct BP import (#406).
* Built-in support for collecting user feedback via a dedicated dialog, convenient XH methods and
  default appBar button (#379).
* New `XH.isDevelopmentMode` constant added, true when running in local Webpack dev-server mode.
* CSS variables have been added to customize and standardize the Blueprint "intent" based styling,
  with defaults adjusted to be less distracting (#420).

### 🐞 Bug Fixes

* Preference-related events have been standardized and bugs resolved related to pushAsync() and the
  `prefChange` event (ee93290).
* Admin log viewer auto-refreshes in tail-mode (#330).
* Distracting grid "loading" overlay removed (#401).
* Clipboard button ("click-to-copy" functionality) restored (#442).

[Commit Log](https://github.com/xh/hoist-react/compare/v7.2.0...v8.0.0)

## v7.2.0

### 🎁 New Features

+ Admin console grids now outfitted with column choosers and grid state. #375
+ Additional components for Onsen UI mobile development.

### 🐞 Bug Fixes

+ Multiple improvements to the Admin console config differ. #380 #381 #392

[Commit Log](https://github.com/xh/hoist-react/compare/v7.1.0...v7.2.0)

## v7.1.0

### 🎁 New Features

* Additional kit components added for Onsen UI mobile development.

### 🐞 Bug Fixes

* Dropdown fields no longer default to `commitOnChange: true` - avoiding unexpected commits of
  type-ahead query values for the comboboxes.
* Exceptions thrown from FetchService more accurately report the remote host when unreachable, along
  with some additional enhancements to fetch exception reporting for clarity.

[Commit Log](https://github.com/xh/hoist-react/compare/v7.0.0...v7.1.0)

## v7.0.0

### 💥 Breaking Changes

* **Restructuring of core `App` concept** with change to new `@HoistApp` decorator and conventions
  around defining `App.js` and `AppComponent.js` files as core app entry points. `XH.app` now
  installed to provide access to singleton instance of primary app class. See #387.

### 🎁 New Features

* **Added `AppBar` component** to help further standardize a pattern for top-level application
  headers.
* **Added `SwitchField` and `SliderField`** form field components.
* **Kit package added for Onsen UI** - base component library for mobile development.
* **Preferences get a group field for better organization**, parity with AppConfigs. (Requires
  hoist-core 3.1.x.)

### 🐞 Bug Fixes

* Improvements to `Grid` component's interaction with underlying AG Grid instance, avoiding extra
  renderings and unwanted loss of state. 03de0ae7

[Commit Log](https://github.com/xh/hoist-react/compare/v6.0.0...v7.0.0)

## v6.0.0

### 💥 Breaking Changes

* API for `MessageModel` has changed as part of the feature addition noted below, with `alert()` and
  `confirm()` replaced by `show()` and new `XH` convenience methods making the need for direct calls
  rare.
* `TabContainerModel` no longer takes an `orientation` prop, replaced by the more flexible
  `switcherPosition` as noted below.

### 🎁 New Features

* **Initial version of grid state** now available, supporting easy persistence of user grid column
  selections and sorting. The `GridModel` constructor now takes a `stateModel` argument, which in
  its simplest form is a string `xhStateId` used to persist grid state to local storage. See the
  `GridStateModel` class for implementation details. #331
* The **Message API** has been improved and simplified, with new `XH.confirm()` and `XH.alert()`
  methods providing an easy way to show pop-up alerts without needing to manually construct or
  maintain a `MessageModel`. #349
* **`TabContainer` components can now be controlled with a remote `TabSwitcher`** that does not need
  to be directly docked to the container itself. Specify `switcherPosition:none` on the
  `TabContainerModel` to suppress showing the switching affordance on the tabs themselves and
  instantiate a `TabSwitcher` bound to the same model to control a tabset from elsewhere in the
  component hierarchy. In particular, this enabled top-level application tab navigation to move up
  into the top toolbar, saving vertical space in the layout. #368
* `DataViewModel` supports an `emptyText` config.

### 🐞 Bugfixes

* Dropdown fields no longer fire multiple commit messages, and no longer commit partial entries
  under some circumstances. #353 and #354
* Grids resizing fixed when shrinking the containing component. #357

[Commit Log](https://github.com/xh/hoist-react/compare/v5.0.0...v6.0.0)

## v5.0.0

### 💥 Breaking Changes

* **Multi environment configs have been unwound** See these release notes/instructions for how to
  migrate: https://github.com/xh/hoist-core/releases/tag/release-3.0.0
* **Breaking change to context menus in dataviews and grids not using the default context menu:**
  StoreContextMenu no longer takes an array of items as an argument to its constructor. Instead it
  takes a configuration object with an ‘items’ key that will point to any current implementation’s
  array of items. This object can also contain an optional gridModel argument which is intended to
  support StoreContextMenuItems that may now be specified as known ‘hoist tokens’, currently limited
  to a ‘colChooser’ token.

### 🎁 New Features

* Config differ presents inline view, easier to read diffs now.
* Print Icon added!

### 🐞 Bugfixes

* Update processFailedLoad to loadData into gridModel store, Fixes #337
* Fix regression to ErrorTracking. Make errorTrackingService safer/simpler to call at any point in
  life-cycle.
* Fix broken LocalStore state.
* Tweak flex prop for charts. Side by side charts in a flexbox now auto-size themselves! Fixes #342
* Provide token parsing for storeContextMenus. Context menus are all grown up! Fixes #300

## v4.0.1

### 🐞 Bugfixes

* DataView now properly re-renders its items when properties on their records change (and the ID
  does not)

## v4.0.0

### 💥 Breaking Changes

* **The `GridModel` selection API has been reworked for clarity.** These models formerly exposed
  their selectionModel as `grid.selection` - now that getter returns the selected records. A new
  `selectedRecord` getter is also available to return a single selection, and new string shortcut
  options are available when configuring GridModel selection behavior.
* **Grid components can now take an `agOptions` prop** to pass directly to the underlying ag-grid
  component, as well as an `onRowDoubleClicked` handler function.
  16be2bfa10e5aab4ce8e7e2e20f8569979dd70d1

### 🎁 New Features

* Additional core components have been updated with built-in `layoutSupport`, allowing developers to
  set width/height/flex and other layout properties directly as top-level props for key comps such
  as Grid, DataView, and Chart. These special props are processed via `elemFactory` into a
  `layoutConfig` prop that is now passed down to the underlying wrapper div for these components.
  081fb1f3a2246a4ff624ab123c6df36c1474ed4b

### 🐞 Bugfixes

* Log viewer tail mode now working properly for long log files - #325

## v3.0.1

### 🐞 Bugfixes

* FetchService throws a dedicated exception when the server is unreachable, fixes a confusing
  failure case detailed in #315

## v3.0.0

### 💥 Breaking Changes

* **An application's `AppModel` class must now implement a new `checkAccess()` method.** This method
  is passed the current user, and the appModel should determine if that user should see the UI and
  return an object with a `hasAccess` boolean and an optional `message` string. For a return with
  `hasAccess: false`, the framework will render a lockout panel instead of the primary UI.
  974c1def99059f11528c476f04e0d8c8a0811804
    * Note that this is only a secondary level of "security" designed to avoid showing an
      unauthorized user a confusing / non-functional UI. The server or any other third-party data
      sources must always be the actual enforcer of access to data or other operations.
* **We updated the APIs for core MobX helper methods added to component/model/service classes.** In
  particular, `addReaction()` was updated to take a more declarative / clear config object.
  8169123a4a8be6940b747e816cba40bd10fa164e
    * See Reactive.js - the mixin that provides this functionality.

### 🎁 New Features

* Built-in client-side lockout support, as per above.

### 🐞 Bugfixes

* None

------------------------------------------

📫☎️🌎 info@xh.io | https://xh.io/contact
Copyright © 2025 Extremely Heavy Industries Inc. - all rights reserved
