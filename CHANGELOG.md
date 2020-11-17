# Changelog

## v37.0.0-SNAPSHOT - unreleased

### 🎁 New Features

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

### 💥 Breaking Changes

* New `TabContainerModel` config `switcher` replaces `switcherPosition` to allow for more flexible
  configuration of the default `TabSwitcher`.
  * Use `switcher: true` to retain default behavior.
  * Use `switcher: false` to not include a TabSwitcher. (previously `switcherPosition: 'none'`)
  * Use `switcher: {...}` to provide customisation props for the `TabSwitcher`. See `TabSwitcher`
    documentation for more information.

### 🐞 Bug Fixes

* Fix issue where grid row striping inadvertently disabled by default for non-tree grids.

### ⚙️ Technical

* `Cube.info` is now directly observable.

### 📚 Libraries

* @blueprintjs/core `3.35 -> 3.36`
* @blueprintjs/datetime `3.19 -> 3.20`
* clipboard-copy `3.1 -> 3.2`
* core-js `3.6 -> 3.7`

[Commit Log](https://github.com/xh/hoist-react/compare/v36.6.1...develop)

## v36.6.1 - 2020-11-06

### 🐞 Bug Fixes

* Fix issue where grid row striping would be turned off by default for non-tree grids

[Commit Log](https://github.com/xh/hoist-react/compare/v36.6.0...v36.6.1)

## v36.6.0 - 2020-10-28

### 🎁 New Features

* New `GridModel.treeStyle` config enables more distinctive styling of tree grids, with optional
  background highlighting and ledger-line style borders on group rows.
  * ⚠ By default, tree grids will now have highlighted group rows (but no group borders). Set
    `treeStyle: 'none'` on any `GridModel` instances where you do _not_ want the new default style.
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

* @blueprintjs/core `3.33 -> 3.35`

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

* @blueprintjs/core `3.31 -> 3.33`
* @blueprintjs/datetime `3.18 -> 3.19`
* @fortawesome/fontawesome-pro `5.14 -> 5.15`
* moment `2.24 -> 2.29`
* numbro `2.2 -> 2.3`

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

* codemirror `5.57 -> 5.58`

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
  * `CompoundFilter` - combines multiple filters (including other nested CompoundFilters) via an AND
    or OR operator.
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
* Changed the `DimensionChooserModel.dimensions` config to require objects of the form `{name,
  displayName, isLeafDimension}` when provided as an `Object[]`.
  * Previously these objects were expected to be of the form `{value, label, isLeaf}`.
  * Note however that this same config can now be passed the `dimensions` directly from a configured
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
  * `StoreFilterField.filterOptions` has been removed. Set `filterIncludesChildren` directly on the
    store instead.

### ✨ Style

* CSS variables for "intents" - most commonly used on buttons - have been reworked to use HSL color
  values and support several standard variations of lightness and transparency.
  * Developers are encouraged to customize intents by setting the individual HSL vars provided for
    each intent (e.g. `--intent-primary-h` to adjust the primary hue) and/or the different levels of
    lightness (e.g. `--intent-primary-l3` to adjust the default lightness).
  * ⚠ Uses of the prior intent var overrides such as `--intent-primary` will no longer work. It is
    possible to set directly via `--xh-intent-primary`, but components such as buttons will still
    use the default intent shades for variations such as hover and pressed states. Again, review and
    customize the HSL vars if required.
* Desktop `Button` styles and classes have been rationalized and reworked to allow for more
  consistent and direct styling of buttons in all their many permutations (standard/minimal/outlined
  styles * default/hovered/pressed/disabled states * light/dark themes).
  * Customized intent colors will now also be applied to outlined and minimal buttons.
  * Dedicated classes are now applied to desktop buttons based on their style and state. Developers
    can key off of these classes directly if required.

### 🐞 Bug Fixes

* Fixed `Column.tooltipElement` so that it can work if a `headerTooltip` is also specified on the
  same column.
* Fixed issue where certain values (e.g. `%`) would break in `Column.tooltipElement`.
* Fixed issue where newly loaded records in `Store` were not being frozen as promised by the API.

### 📚 Libraries

* @blueprintjs/core `3.30 -> 3.31`
* codemirror `5.56 -> 5.57`
* http-status-codes `1.4 -> 2.1`
* mobx-react `6.2 -> 6.3`
* store2 `2.11 -> 2.12`

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

* @fortawesome/fontawesome-pro `5.13 -> 5.14`
* codemirror `5.55 -> 5.56`

[Commit Log](https://github.com/xh/hoist-react/compare/v35.1.1...v35.2.0)


## v35.1.1 - 2020-07-17

### 📚 Libraries

* @blueprintjs/core `3.29 -> 3.30`

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
  * The primary entry points for this API are the new `@PersistSupport` and `@persist` annotations.
    `@persist` can be added to any observable property on a `@PersistSupport` to make it
    automatically synchronize with a `PersistenceProvider`. Both `HoistModel` and `HoistService` are
    decorated with `@PersistSupport`.
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
  Applications must now import and provide their licensed version of ag-Grid, and Highcharts to
  Hoist. See file `Bootstrap.js` in Toolbox for an example.

### 🐞 Bug Fixes

* Sorting special columns generated by custom ag-Grid configurations (e.g. auto-group columns) no
  longer throws with an error.
* The `deepFreeze()` util - used to freeze data in `Record` instances - now only attempts to freeze
  a whitelist of object types that are known to be safely freezable. Custom application classes and
  other potentially-problematic objects (such as `moment` instances) are no longer frozen when
  loaded into `Record` fields.

### 📚 Libraries

Note that certain licensed third-party dependencies have been removed as direct dependencies of this
project, as per note in Breaking Changes above.

* @xh/hoist-dev-utils `4.x -> 5.x` - apps should also update to the latest 5.x release of dev-utils.
  Although license and dependency changes triggered a new major version of this dev dependency, no
  application-level changes should be required.
* @blueprintjs/core `3.28 -> 3.29`
* codemirror `5.54 -> 5.55`
* react-select `3.0 -> 3.1`

### 📚 Optional Libraries

* ag-Grid `23.0.2` > `23.2.0` (See Toolbox app for example on this upgrade)
* Highcharts `8.0.4 -> 8.1.1`

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

* @blueprintjs/core `3.26 -> 3.28`
* @blueprintjs/datetime `3.16 -> 3.18`
* codemirror `5.53 -> 5.54`
* react-transition-group `4.3 -> 4.4`

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

* react `~16.8 -> ~16.13`
* onsenui `~16.8` -> @xh/onsenui `~16.13`
* react-onsenui `~16.8` -> @xh/react-onsenui `~16.13`

[Commit Log](https://github.com/xh/hoist-react/compare/v33.1.0...33.2.0)


## v33.1.0 - 2020-05-05

### 🎁 New Features

* Added smart auto-resizing of columns in `GridModel` Unlike ag-Grid's native auto-resizing support,
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

* @blueprintjs/core `3.25 -> 3.26`
* codemirror `5.52 -> 5.53`

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

* @blueprintjs/core `3.24 -> 3.25`
* @blueprintjs/datetime `3.15 -> 3.16`
* mobx-react `6.1 -> 6.2`

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

* Suppresses a console warning from ag-Grid for `GridModel`s that do not specify an `emptyText`.

[Commit Log](https://github.com/xh/hoist-react/compare/v32.0.2...v32.0.3)

## v32.0.2 - 2020-04-03

⚠ Note that this release includes a *new major version of ag-Grid*. Please consult the
[ag-Grid Changelog](https://www.ag-grid.com/ag-grid-changelog/) for versions 22-23 to review
possible breaking changes to any direct/custom use of ag-Grid APIs and props within applications.

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

* Flex columns now use the built-in ag-Grid flex functionality.

### 📚 Libraries

* ag-grid-community `removed @ 21.2`
* ag-grid-enterprise `21.2` replaced with @ag-grid-enterprise/all-modules `23.0`
* ag-grid-react `21.2` replaced with @ag-grid-community/react `23.0`
* @fortawesome/* `5.12 -> 5.13`
* codemirror `5.51 -> 5.52`
* filesize `6.0 -> 6.1`
* numbro `2.1 -> 2.2`
* react-beautiful-dnd `12.0 -> 13.0`
* store2 `2.10 -> 2.11`
* compose-react-refs `NEW 1.0.4`

[Commit Log](https://github.com/xh/hoist-react/compare/v31.0.0...v32.0.2)

## v31.0.0 - 2020-03-16

### 🎁 New Features

* The mobile `Navigator` / `NavigatorModel` API has been improved and made consistent with other
  Hoist content container APIs such as `TabContainer`, `DashContainer`, and `DockContainer`.
  * `NavigatorModel` and `PageModel` now support setting a `RenderMode` and `RefreshMode` to control
    how inactive pages are mounted/unmounted and how they respond to refresh requests.
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
  * Such code should be moved to the core `initAsync()` method instead, which continues to be called
    after all XH-level services are initialized and ready.
* Mobile apps may need to adjust to the following updates to `NavigatorModel` and related APIs:
  * `NavigatorModel`'s `routes` constructor parameter has been renamed `pages`.
  * `NavigatorModel`'s observable `pages[]` has been renamed `stack[]`.
  * `NavigatorPageModel` has been renamed `PageModel`. Apps do not usually create `PageModels`
    directly, so this change is unlikely to require code updates.
  * `Page` has been removed from the mobile toolkit. Components that previously returned a `Page`
    for inclusion in a `Navigator` or `TabContainer` can now return any component. It is recommended
    you replace `Page` with `Panel` where appropriate.
* Icon enhancements described above removed the following public methods:
  * The `fontAwesomeIcon()` factory function (used to render icons not already enumerated by Hoist)
    has been replaced by the improved `Icon.icon()` factory - e.g. `fontAwesomeIcon({icon: ['far',
    'alicorn']}) -> Icon.icon({iconName: 'alicorn'})`.
  * The `convertIconToSvg()` utility method has been replaced by the new `asHtml` parameter on icon
    factory functions. If you need to convert an existing icon element, use `convertIconToHtml()`.
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

* @blueprintjs/core `3.23 -> 3.24`
* react-dates `21.7 -> 21.8`
* react-beautiful-dnd `11.0 -> 12.2`

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
    This would be a breaking change for any apps that imported the old objects directly (considered
    unlikely).
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

* @blueprintjs/core `3.22 -> 3.23`
* codemirror `5.50 -> 5.51`
* react-dates `21.5 -> 21.7`

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
  * When accessing multiple properties, destructuring provides an efficient syntax - e.g. `const
    {quantity, price} = rec.data;`.
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

* Added keyboard support to ag-Grid context menus.
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

* @blueprintjs/core `3.19 -> 3.22`
* @blueprintjs/datetime `3.14 -> 3.15`
* @fortawesome/fontawesome-pro `5.11 -> 5.12`
* codemirror `5.49 -> 5.50`
* core-js `3.3 -> 3.6`
* fast-deep-equal `2.0 -> 3.1`
* filesize `5.0 -> 6.0`
* highcharts 7.2 -> 8.0`
* mobx `5.14 -> 5.15`
* react-dates `21.3 -> 21.5`
* react-dropzone `10.1 -> 10.2`
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
  ag-Grid group cell renderer auto-applied to tree columns (#1397).
* Use of a custom `Column.comparator` function will no longer break agGrid-provided column header
  filter menus (#1400).
* The MS Edge browser does not return a standard Promise from `async` functions, so the the return
  of those functions did not previously have the required Hoist extensions installed on its
  prototype. Edge "native" Promises are now also polyfilled / extended as required. (#1411).
* Async `Select` combobox queries are now properly debounced as per the `queryBuffer` prop (#1416).

### ⚙️ Technical

* Grid column group headers now use a custom React component instead of the default ag-Grid column
  header, resulting in a different DOM structure and CSS classes. Existing CSS overrides of the
  ag-Grid column group headers may need to be updated to work with the new structure/classes.
* We have configured `stylelint` to enforce greater consistency in our stylesheets within this
  project. The initial linting run resulted in a large number of updates to our SASS files, almost
  exclusively whitespace changes. No functional changes are intended/expected. We have also enabled
  hooks to run both JS and style linting on pre-commit. Neither of these updates directly affects
  applications, but the same tools could be configured for apps if desired.

### 📚 Libraries

* core-js `3.2 -> 3.3`
* filesize `4.2 -> 5.0`
* http-status-codes `added @ 1.3`

[Commit Log](https://github.com/xh/hoist-react/compare/v28.0.0...v28.1.0)

## v28.0.0 - 2019-10-07

_"The one with the hooks."_

**Hoist now fully supports React functional components and hooks.** The new `hoistComponent`
function is now the recommended method for defining new components and their corresponding element
factories. See that (within [HoistComponentFunctional.js](core/HoistComponentFunctional.js)) and the
new `useLocalModel()` and `useContextModel()` hooks (within [core/hooks](core/hooks)) for more
information.

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

* @blueprintjs/core `3.18 -> 3.19`
* @blueprintjs/datetime `3.12 -> 3.14`
* @fortawesome/fontawesome-pro `5.10 -> 5.11`
* @xh/hoist-dev-utils `3.8 -> 4.3` (multiple transitive updates to build tooling)
* ag-grid `21.1 -> 21.2`
* highcharts `7.1 -> 7.2`
* mobx `5.13 -> 5.14`
* react-transition-group `4.2 -> 4.3`
* rsvp (removed)
* store2 `2.9 -> 2.10`

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
    as `XH.fetchJson()` will now serialize regular JS Date objects as ms timestamps when provided in
    params. Previously Dates were serialized in their default `toString()` format. This would be a
    breaking change for an app that relied on that default Date serialization, but it was made for
    increased symmetry with how Hoist JSON-serializes Dates and LocalDates on the server-side.
  * `DateInput` can now be used to seamlessly bind to a `LocalDate` as well as a `Date`. See its new
    prop of `valueType` which can be set to `localDate` or `date` (default).
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
  * The signature of `Store.updateData()` has been substantially changed, and is now the main entry
    point for all updates.
  * `Store.removeRecords()` has been removed. Use `Store.updateData()` instead.
  * `Store.addData()` has been removed. Use `Store.updateData()` instead.
* `Column` takes an additional property `rendererIsComplex`. Application must set this flag to
  `true` to indicate if a column renderer uses values other than its own bound field. This change
  provides an efficiency boost by allowing ag-Grid to use its default change detection instead of
  forcing a cell refresh on any change.

### ⚙️ Technical

* `Grid` will now update the underlying ag-Grid using ag-Grid transactions rather than relying on
  agGrid `deltaRowMode`. This is intended to provide the best possible grid performance and
  generally streamline the use of the ag-Grid Api.

### 🐞 Bug Fixes

* Panel resize events are now properly throttled, avoiding extreme lagginess when resizing panels
  that contain complex components such as big grids.
* Workaround for issues with the mobile Onsen toolkit throwing errors while resetting page stack.
* Dialogs call `doCancel()` handler if cancelled via `<esc>` keypress.

### 📚 Libraries

* @xh/hoist-dev-utils `3.7 -> 3.8`
* qs `6.7 -> 6.8`
* store2 `2.8 -> 2.9`

[Commit Log](https://github.com/xh/hoist-react/compare/v26.0.1...v27.0.0)

## v26.0.1 - 2019-08-07

### 🎁 New Features

* **WebSocket support** has been added in the form of `XH.webSocketService` to establish and
  maintain a managed websocket connection with the Hoist UI server. This is implemented on the
  client via the native `WebSocket` object supported by modern browsers and relies on the
  corresponding service and management endpoints added to Hoist Core v6.1.
  * Apps must declare `webSocketsEnabled: true` in their `AppSpec` configuration to enable this
    overall functionality on the client.
  * Apps can then subscribe via the new service to updates on a requested topic and will receive any
    inbound messages for that topic via a callback.
  * The service will monitor the socket connection with a regular heartbeat and attempt to
    re-establish if dropped.
  * A new admin console snap-in provides an overview of connected websocket clients.
* The `XH.message()` and related methods such as `XH.alert()` now support more flexible
  `confirmProps` and `cancelProps` configs, each of which will be passed to their respective button
  and merged with suitable defaults. Allows use of the new `autoFocus` prop with these preconfigured
  dialogs.
  * By default, `XH.alert()` and `XH.confirm()` will auto focus the confirm button for user
    convenience.
  * The previous text/intent configs have been deprecated and the message methods will log a console
    warning if they are used (although it will continue to respect them to aid transitioning to the
    new configs).
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

* `AgGridModel` will now throw an exception if any of its methods which depend on ag-Grid state are
  called before the grid has been fully initialized (ag-Grid onGridReady event has fired).
  Applications can check the new `isReady` property on `AgGridModel` before calling such methods to️️
  verify the grid is fully initialized.

### 📚 Libraries

* @blueprintjs/core `3.17 -> 3.18`
* @blueprintjs/datetime `3.11 -> 3.12`
* @fortawesome/fontawesome `5.9 -> 5.10`
* ag-grid `21.0.1 -> 21.1.1`
* store2 `2.7 -> 2.8`
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

* mobx `5.11 -> 5.13`
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

* @blueprintjs/core `3.16 -> 3.17`
* @blueprintjs/datetime `3.10 -> 3.11`
* mobx `5.10 -> 5.11`
* react-transition-group `2.8 -> 4.2`

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

### ✨ Style

* Panel splitter collapse button more visible in dark theme. CSS vars to customize further fixed.
* The mobile app menu button has been moved to the right side of the top appBar, consistent with its
  placement in desktop apps.

### 📚 Libraries

* @blueprintjs/core `3.15 -> 3.16`
* @blueprintjs/datetime `3.9 -> 3.10`
* codemirror `5.47 -> 5.48`
* mobx `6.0 -> 6.1`

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
  (the default ag-Grid gesture). Column pinned state is now also captured and maintained by the
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

* ag-grid `20.0 -> 21.0`
* react-select `2.4 -> 3.0`
* mobx-react `5.4 -> 6.0.3`
* font-awesome `5.8 -> 5.9`
* react-beautiful-dnd `10.1.1 -> 11.0.4`

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
* A new `AgGrid` component provides a much lighter Hoist wrapper around ag-Grid while maintaining
  consistent styling and layout support. This allows apps to use any features supported by ag-Grid
  without conflicting with functionality added by the core Hoist `Grid`.
  * Note that this lighter wrapper lacks a number of core Hoist features and integrations, including
    store support, grid state, enhanced column and renderer APIs, absolute value sorting, and more.
  * An associated `AgGridModel` provides access to to the ag-Grid APIs, minimal styling configs, and
    several utility methods for managing Grid state.
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
  result in the removal of a significant amount of existing records/rows. The underlying ag-Grid
  component has a serious bottleneck here (acknowledged as AG-2879 in their bug tracker). The Hoist
  grid wrapper will now detect when this is likely and proactively clear all data using a different
  API call before loading the new dataset.
* The implementations `Store`, `RecordSet`, and `Record` have been updated to more efficiently
  re-use existing record references when loading, updating, or filtering data in a store. This keeps
  the Record objects within a store as stable as possible, and allows additional optimizations by
  ag-Grid and its `deltaRowDataMode`.
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

* Rollback ag-Grid to v20.0.0 after running into new performance issues with large datasets and
  `deltaRowDataMode`. Updates to tree filtering logic, also related to grid performance issues with
  filtered tree results returning much larger record counts.

## v21.0.0 - 2019-04-04

### 🎁 New Features

* `FetchService` fetch methods now accept a plain object as the `headers` argument. These headers
  will be merged with the default headers provided by FetchService.
* An app can also now specify default headers to be sent with every fetch request via
  `XH.fetchService.setDefaultHeaders()`. You can pass either a plain object, or a closure which
  returns one.
* `Grid` supports a new `onGridReady` prop, allowing apps to hook into the ag-Grid event callback
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

### ✨ Style

* Black point + grid colors adjusted in dark theme to better blend with overall blue-gray tint.
* Mobile styles have been adjusted to increase the default font size and grid row height, in
  addition to a number of other smaller visual adjustments.

### 🐞 Bug Fixes

* Avoid throwing React error due to tab / routing interactions. Tab / routing / state support
  generally improved. (#1052)
* `GridModel.selectFirst()` improved to reliably select first visible record even when one or more
  groupBy levels active. (#1058)

### 📚 Libraries

* ag-Grid `~20.1 -> ~20.2` (fixes ag-grid sorting bug with treeMode)
* @blueprint/core `3.14 -> 3.15`
* @blueprint/datetime `3.7 -> 3.8`
* react-dropzone `10.0 -> 10.1`
* react-transition-group `2.6 -> 2.8`

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

* @blueprintjs/core `3.13 -> 3.14`
* @xh/hoist-dev-utils `3.5 -> 3.6`
* ag-Grid `~20.0 -> ~20.1`
* react-dropzone `~8.0 -> ~9.0`
* react-select `~2.3 -> ~2.4`
* router5 `~6.6 -> ~7.0`
* react `~16.7 -> ~16.8`

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

* ag-Grid has been updated to v20.0.0. Most apps shouldn't require any changes - however, if you are
  using `agOptions` to set sorting, filtering or resizing properties, these may need to change:

  For the `Grid`, `agOptions.enableColResize`, `agOptions.enableSorting` and `agOptions.enableFilter`
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

* @blueprintjs/core `3.12 -> 3.13`
* ag-Grid `~19.1.4 -> ~20.0.0`

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
  * In practice, this should be used to decorate any properties on `HoistModel`, `HoistService`, or
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

* Hoist-dev-utils `3.4.1 -> 3.5.0` - updated webpack and other build tool dependencies, as well as
  an improved eslint configuration.
* @blueprintjs/core `3.10 -> 3.12`
* @blueprintjs/datetime `3.5 -> 3.7`
* fontawesome `5.6 -> 5.7`
* mobx `5.8 -> 5.9`
* react-select `2.2 -> 2.3`
* Other patch updates

[Commit Log](https://github.com/xh/hoist-react/compare/v18.0.0...v18.1.0)

## v18.0.0 - 2019-01-15

### 🎁 New Features

* Form support has been substantially enhanced and restructured to provide both a cleaner API and
  new functionality:
  * `FormModel` and `FieldModel` are now concrete classes and provide the main entry point for
    specifying the contents of a form. The `Field` and `FieldSupport` decorators have been removed.
  * Fields and sub-forms may now be dynamically added to FormModel.
  * The validation state of a FormModel is now *immediately* available after construction and
    independent of the GUI. The triggering of the *display* of that state is now a separate process
    triggered by GUI actions such as blur.
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

* React `~16.6.0 -> ~16.7.0`
* Patch version updates to multiple other dependencies.

[Commit Log](https://github.com/xh/hoist-react/compare/v17.0.0...v18.0.0)

## v17.0.0 - 2018-12-21

### 💥 Breaking Changes

* The implementation of the `model` property on `HoistComponent` has been substantially enhanced:
  * "Local" Models should now be specified on the Component class declaration by simply setting the
    `model` property, rather than the confusing `localModel` property.
  * HoistComponent now supports a static `modelClass` class property. If set, this property will
    allow a HoistComponent to auto-create a model internally when presented with a plain javascript
    object as its `model` prop. This is especially useful in cases like `Panel` and `TabContainer`,
    where apps often need to specify a model but do not require a reference to the model. Those
    usages can now skip importing and instantiating an instance of the component's model class
    themselves.
  * Hoist will now throw an Exception if an application attempts to changes the model on an existing
    HoistComponent instance or presents the wrong type of model to a HoistComponent where
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
  * `TabModel` now supports the following properties, which can be changed at runtime or set via the
    config:
    * `disabled` - applies a disabled style in the switcher and blocks navigation to the tab via
      user click, routing, or the API.
    * `excludeFromSwitcher` - removes the tab from the switcher, but the tab can still be navigated
      to programmatically or via routing.
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
* The ag-Grid based `Grid` and `GridModel` are now available on both mobile and desktop. We have
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

* ag-Grid has been upgraded to v19.1
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

* Support added for TLBR-style notation when specifying margin/padding via layoutSupport - e.g.
  box({margin: '10 20 5 5'}).
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
* GridModel now has a top-level agColumnApi property to provide a direct handle on the ag-Grid
  Column API object.

### ⚙️ Technical

* Support for column groups strengthened with the addition of a dedicated ColumnGroup sibling class
  to Column. This includes additional internal refactoring to reduce unnecessary cloning of Column
  configurations and provide a more managed path for Column updates. Public APIs did not change.
  (#694)

### 📚 Libraries

* Blueprint Core `3.6.1 -> 3.7.0`
* Blueprint Datetime `3.2.0 -> 3.3.0`
* Fontawesome `5.3.x -> 5.4.x`
* MobX `5.1.2 -> 5.5.0`
* Router5 `6.5.0 -> 6.6.0`

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
  keypress targeted within the Grid. Note such a handler is not provided directly by ag-Grid.
* The Column class supports pinned as a top-level config. Supports passing true to pin to the left.

### 🐞 Bug Fixes

* Updates to Grid column widths made via ag-Grid's "autosize to fit" API are properly persisted to
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

* React `16.5.1 -> 16.5.2`
* router5 `6.4.2 -> 6.5.0`
* CodeMirror, Highcharts, and MobX patch updates

[Commit Log](https://github.com/xh/hoist-react/compare/v13.0.0...v14.0.0)


## v13.0.0

🍀Lucky v13 brings with it a number of enhancements for forms and validation, grouped column
support in the core Grid API, a fully wrapped MultiSelect component, decorator syntax adjustments,
and a number of other fixes and enhancements.

It also includes contributions from new ExHI team members Arjun and Brendan. 🎉

### 💥 Breaking Changes

* The core `@HoistComponent`, `@HoistService`, and `@HoistModel` decorators are **no longer
  parameterized**, meaning that trailing `()` should be removed after each usage. (#586)
* The little-used `hoistComponentFactory()` method was also removed as a further simplification
  (#587).
* The `HoistField` superclass has been renamed to `HoistInput` and the various **desktop form
  control components have been renamed** to match (55afb8f). Apps using these components (which will
  likely be most apps) will need to adapt to the new names.
  * This was done to better distinguish between the input components and the upgraded Field concept
    on model classes (see below).

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
  definitions passed to `GridModel.columns` within a wrapper object of the form `{headerName: 'My
  group', children: [...]}`.

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

* Rollback update of `@blueprintjs/select` package `3.1.0 -> 3.0.0` - this included breaking API
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

* Blueprint `3.0.1 -> 3.4.0`
* FontAwesome `5.2.0 -> 5.3.0`
* CodeMirror `5.39.2 -> 5.40.0`
* MobX `5.0.3 -> 5.1.0`
* router5 `6.3.0 -> 6.4.2`
* React `16.4.1 -> 16.4.2`

[Commit Log](https://github.com/xh/hoist-react/compare/v12.0.0...v12.1.0)


## v12.0.0

Hoist React v12 is a relatively large release, with multiple refactorings around grid columns,
`elemFactory` support, classNames, and a re-organization of classes and exports within `utils`.

### 💥 Breaking Changes

#### ⭐️ Grid Columns

**A new `Column` class describes a top-level API for columns and their supported options** and is
intended to be a cross-platform layer on top of ag-Grid and TBD mobile grid implementations.
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
  ag-Grid instance (for desktop implementations). This is considered an "escape hatch" and should be
  used with care, but can provide a bridge to required ag-Grid features as the Hoist-level API
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
    `.xh-grid`. These will be appended to any instance class names specified within applications and
    be available as public CSS selectors.
* Relevant `HoistField` components support inline `leftIcon` and `rightElement` props. `DayField`
  adds support for `minDay / maxDay` props.
* Styling for the built-in ag-Grid loading overlay has been simplified and improved (#401).
* Grid column definitions can now specify an `excludeFromExport` config to drop them from
  server-generated Excel/CSV exports (#485).

### 🐞 Bug Fixes

* Grid data loading and selection reactions have been hardened and better coordinated to prevent
  throwing when attempting to set a selection before data has been loaded (#484).

### 📚 Libraries

* Blueprint `2.x -> 3.x`
* FontAwesome `5.0.x -> 5.2.x`
* CodeMirror `5.37.0 -> 5.39.2`
* router5 `6.2.4 -> 6.3.0`

[Commit Log](https://github.com/xh/hoist-react/compare/v10.0.1...v11.0.0)


## v10.0.1

### 🐞 Bug Fixes

* Grid `export` context menu token now defaults to server-side 'exportExcel' export.
  * Specify the `exportLocal` token to return a menu item for local ag-Grid export.
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

* MobX `4.2.x -> 5.0.x`

[Commit Log](https://github.com/xh/hoist-react/compare/v9.0.0...v10.0.0)


## v9.0.0

### 💥 Breaking Changes

* **Hoist-provided mixins (decorators) have been refactored to be more granular and have been broken
  out of `HoistComponent`.**
  * New discrete mixins now exist for `LayoutSupport` and `ContextMenuSupport` - these should be
    added directly to components that require the functionality they add for auto-handling of
    layout-related props and support for showing right-click menus. The corresponding options on
    `HoistComponent` that used to enable them have been removed.
  * For consistency, we have also renamed `EventTarget -> EventSupport` and `Reactive ->
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
  * ⚠️ Note this also involved a change to the `TabContainerModel` API - `activateTab()` is now the
    public method to set the active tab and ensure both the tab and the route land in the correct
    state.
* Remove unintended focused cell borders that came back with the prior ag-Grid upgrade.

[Commit Log](https://github.com/xh/hoist-react/compare/v8.0.0...v9.0.0)


## v8.0.0

Hoist React v8 brings a big set of improvements and fixes, some API and package re-organizations,
and ag-Grid upgrade, and more. 🚀

### 💥 Breaking Changes

* **Component package directories have been re-organized** to provide better symmetry between
  pre-existing "desktop" components and a new set of mobile-first component. Current desktop
  applications should replace imports from `@xh/hoist/cmp/xxx` with `@xh/hoist/desktop/cmp/xxx`.
  * Important exceptions include several classes within `@xh/hoist/cmp/layout/`, which remain
    cross-platform.
  * `Panel` and `Resizable` components have moved to their own packages in
    `@xh/hoist/desktop/cmp/panel` and `@xh/hoist/desktop/cmp/resizable`.
* **Multiple changes and improvements made to tab-related APIs and components.**
  * The `TabContainerModel` constructor API has changed, notably `children` -> `tabs`, `useRoutes` ->
    `route` (to specify a starting route as a string) and `switcherPosition` has moved from a model
    config to a prop on the `TabContainer` component.
  * `TabPane` and `TabPaneModel` have been renamed `Tab` and `TabModel`, respectively, with several
    related renames.
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

* Improvements to `Grid` component's interaction with underlying ag-Grid instance, avoiding extra
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
  * Note that this is only a secondary level of "security" designed to avoid showing an unauthorized
    user a confusing / non-functional UI. The server or any other third-party data sources must
    always be the actual enforcer of access to data or other operations.
* **We updated the APIs for core MobX helper methods added to component/model/service classes.** In
  particular, `addReaction()` was updated to take a more declarative / clear config object.
  8169123a4a8be6940b747e816cba40bd10fa164e
  * See Reactive.js - the mixin that provides this functionality.

### 🎁 New Features

* Built-in client-side lockout support, as per above.

### 🐞 Bugfixes

* None

------------------------------------------

Copyright © 2020 Extremely Heavy Industries Inc. - all rights reserved

------------------------------------------

📫☎️🌎 info@xh.io | https://xh.io/contact
