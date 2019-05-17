# Changelog

## Upcoming Release - under development

### 🎁 New Features

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

### 💥 Breaking Changes

* The `AppOption.refreshRequired` config has been renamed to `reloadRequired` to better match the
  `XH.reloadApp()` method called to reload the entire app in the browser. Any options defined by an
  app that require to to be fully reloaded should have this renamed config set to `true`.
* The options dialog will now automatically trigger an app-wide data _refresh_ via
  `XH.refreshAppAsync()` if options have changed that don't require a _reload_.     
* The `EventSupport` mixin has been removed. There are no known uses of it and it is in conflict with
  the overall reactive structure of the hoist-react API. If your app listens to the `appStateChanged`,
  `prefChange` or `prefsPushed` events you will need to adjust accordingly.

### 🐞 Bug Fixes

* `Select` will now let the user edit existing text in conditions where it is expected to be
  editable. #880
* The Admin "Config Differ" tool has been updated to reflect changes to `Record` made in v22. It is
  once again able to apply remote config values.

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
* The low-level `Box` component no longer applies default flex-related styles. Previously `Box` and
  `HBox` were functionally identical, given that `Box` declared `display: 'flex'` and the default
  for flex boxes is `flex-direction: 'row'`. Now `Box` makes no assumptions about flexing its
  children and acts as a simpler replacement for `div` with the convenience of `@LayoutSupport`.
  * Apps which relied on the default flexing of `Box` should replace those usages with `HBox`.
  * Additionally, all box and frame related styles are applied via pre-existing `.xh-` CSS classes,
    and are no longer applied directly to the rendered DOM element. (This change is not expected to
    require app-level adjustments.)

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

[Commit Log](https://github.com/exhi/hoist-react/compare/v21.0.2...v22.0.0)

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

[Commit Log](https://github.com/exhi/hoist-react/compare/v20.2.1...v21.0.0)

## v20.2.1 - 2019-03-28

* Minor tweaks to grid styles - CSS var for pinned column borders, drop left/right padding on
  center-aligned grid cells.

[Commit Log](https://github.com/exhi/hoist-react/compare/v20.2.0...v20.2.1)

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

[Commit Log](https://github.com/exhi/hoist-react/compare/v20.1.1...v20.2.0)

## v20.1.1 - 2019-03-27

### 🐞 Bug Fixes

* Fix form field reset so that it will call computeValidationAsync even if revalidation is not
  triggered because the field's value did not change when reset.

[Commit Log](https://github.com/exhi/hoist-react/compare/v20.1.0...v20.1.1)


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

[Commit Log](https://github.com/exhi/hoist-react/compare/v20.0.1...v20.1.0)


## v20.0.1 - 2019-03-08

### 🐞 Bug Fixes

* Ensure `RestStore` processes records in a standard way following a save/add operation (#1010).

[Commit Log](https://github.com/exhi/hoist-react/compare/v20.0.0...v20.0.1)


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

[Commit Log](https://github.com/exhi/hoist-react/compare/v19.0.1...v20.0.0)


## v19.0.1 - 2019-02-12

### 🐞 Bug Fixes

* Additional updates and simplifications to `FormField` sizing of child `HoistInput` elements, for
  more reliable sizing and spacing filling behavior.

[Commit Log](https://github.com/exhi/hoist-react/compare/v19.0.0...v19.0.1)


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

  For the `Grid`, `agOptions.enableColResize`, `agOptions.enableSorting` and
  `agOptions.enableFilter` have been removed. You can replicate their effects by using
  `agOptions.defaultColDef`. For `Columns`, `suppressFilter` has been removed, an should be replaced
  with `filter: false`.

* `HoistAppModel.requestRefresh` and `TabContainerModel.requestRefresh` have been removed.
  Applications should use the new Refresh architecture described above instead.
* `tabRefreshMode` on TabContainer has been renamed `renderMode`.
* `TabModel.reloadOnShow` has been removed. Set the `refreshMode` property on TabContainerModel or
  TabModel to `TabRefreshMode.ON_SHOW_ALWAYS` instead.
* The mobile APIs for `TabContainerModel`, `TabModel`, and `RefreshButton` have been rewritten to
  more closely mirror the desktop API.
* The API for `RecordGridModel` editors has changed -- `type` is no longer supported. Use
  `fieldModel` and `formField` intead.
* `LocalStore.loadRawData` requires that all records presented to store have unique IDs specified.
  See `LocalStore.idSpec` for more information.

### 🐞 Bug Fixes

* SwitchInput and RadioInput now properly highlight validation errors in `minimal` mode.

### 📚 Libraries

* @blueprintjs/core `3.12 -> 3.13`
* ag-Grid `~19.1.4 -> ~20.0.0`

[Commit Log](https://github.com/exhi/hoist-react/compare/v18.1.2...v19.0.0)


## v18.1.2 - 2019-01-30

### 🐞 Bug Fixes

* Grid integrations relying on column visibility (namely export, storeFilterField) now correctly
  consult updated column state from GridModel. #935
* Ensure `FieldModel.initialValue` is observable to ensure that computed dirty state (and any other
  derivations) are updated if it changes. #934
* Fixes to ensure Admin console log viewer more cleanly handles exceptions (e.g. attempting to
  auto-refresh on a log file that has been deleted).

[Commit Log](https://github.com/exhi/hoist-react/compare/v18.1.1...v18.1.2)

## v18.1.1 - 2019-01-29

* Grid cell padding can be controlled via a new set of CSS vars and is reduced by default for grids
  in compact mode.
* The `addRecordAsync()` and `saveRecordAsync()` methods on `RestStore` return the updated record.

[Commit Log](https://github.com/exhi/hoist-react/compare/v18.1.0...v18.1.1)


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

[Commit Log](https://github.com/exhi/hoist-react/compare/v18.0.0...v18.1.0)

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

[Commit Log](https://github.com/exhi/hoist-react/compare/v17.0.0...v18.0.0)

## v17.0.0 - 2018-12-21

### 💥 Breaking Changes

* The implementation of the `model` property on `HoistComponent` has been substantially enhanced:
  *  "Local" Models should now be specified on the Component class declaration by simply setting the
     `model` property, rather than the confusing `localModel` property.
  *  HoistComponent now supports a static `modelClass` class property. If set, this property will
     allow a HoistComponent to auto-create a model internally when presented with a plain javascript
     object as its `model` prop. This is especially useful in cases like `Panel` and `TabContainer`,
     where apps often need to specify a model but do not require a reference to the model. Those
     usages can now skip importing and instantiating an instance of the component's model class
     themselves.
  *  Hoist will now throw an Exception if an application attempts to changes the model on an
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
* `Select` now renders with a checkbox next to the selected item in its drowndown menu, instead of
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

[Commit Log](https://github.com/exhi/hoist-react/compare/v16.0.1...v17.0.0)

## v16.0.1 - 2018-12-12

### 🐞 Bug Fixes

* Fix to FeedbackForm allowing attempted submission with an empty message.

[Commit Log](https://github.com/exhi/hoist-react/compare/v16.0.0...v16.0.1)


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
  automatically cancel obsolete requests that have been superceded by more recent variants.
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

[Commit Log](https://github.com/exhi/hoist-react/compare/v15.1.2...v16.0.0)


## v15.1.2

🛠 Hotfix release to MultiSelect to cap the maximum number of options rendered by the drop-down
list. Note, this component is being replaced in Hoist v16 by the react-select library.

[Commit Log](https://github.com/exhi/hoist-react/compare/v15.1.1...v15.1.2)

## v15.1.1

### 🐞 Bug Fixes

* Fix to minimal validation mode for FormField disrupting input focus.
* Fix to JsonInput disrupting input focus.

### ⚙️ Technical

* Support added for TLBR-style notation when specifying margin/padding via layoutSupport - e.g.
  box({margin: '10 20 5 5'}).
* Tweak to lockout panel message when the user has no roles.

[Commit Log](https://github.com/exhi/hoist-react/compare/v15.1.0...v15.1.1)


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

[Commit Log](https://github.com/exhi/hoist-react/compare/v15.0.0...v15.1.0)


## v15.0.0

### 💥 Breaking Changes

* This update does not require any application client code changes, but does require updating the
  Hoist Core Grails plugin to >= 5.0. Hoist Core changes to how application roles are loaded and
  users are authenticated required minor changes to how JS clients bootstrap themselves and load
  user data.
* The Hoist Core HoistImplController has also been renamed to XhController, again requiring Hoist
  React adjustments to call the updated /xh/ paths for these (implementation) endpoints. Again, no
  app updates required beyond taking the latest Hoist Core plugin.

[Commit Log](https://github.com/exhi/hoist-react/compare/v14.2.0...v15.0.0)


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

[Commit Log](https://github.com/exhi/hoist-react/compare/v14.1.3...v14.2.0)


## v14.1.3

### 🐞 Bug Fixes

* Ensure JsonInput reacts properly to value changes.

### ⚙️ Technical

* Block user pinning/unpinning in Grid via drag-and-drop - pending further work via #687.
* Support "now" as special token for dateIs min/max validation rules.
* Tweak grouped grid row background color.

[Commit Log](https://github.com/exhi/hoist-react/compare/v14.1.1...v14.1.3)


## v14.1.1

### 🐞 Bug Fixes

* Fixes GridModel support for row-level grouping at same time as column grouping.

[Commit Log](https://github.com/exhi/hoist-react/compare/v14.1.0...v14.1.1)


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

[Commit Log](https://github.com/exhi/hoist-react/compare/v14.0.0...v14.1.0)


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

* RadioInput and ButtonGroupInputhave been added to the desktop/cmp/form package.
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

[Commit Log](https://github.com/exhi/hoist-react/compare/v13.0.0...v14.0.0)


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

[Commit Log](https://github.com/exhi/hoist-react/compare/v12.1.2...v13.0.0)


## v12.1.2

### 🐞 Bug Fixes

* Fix casing on functions generated by `@settable` decorator
  (35c7daa209a4205cb011583ebf8372319716deba).

[Commit Log](https://github.com/exhi/hoist-react/compare/v12.1.1...v12.1.2)


## v12.1.1

### 🐞 Bug Fixes

* Avoid passing unknown HoistField component props down to Blueprint select/checkbox controls.

### 📚 Libraries

* Rollback update of `@blueprintjs/select` package `3.1.0 -> 3.0.0` - this included breaking API
  changes and will be revisited in #558.

[Commit Log](https://github.com/exhi/hoist-react/compare/v12.1.0...v12.1.1)


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

[Commit Log](https://github.com/exhi/hoist-react/compare/v12.0.0...v12.1.0)


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
  [See the Admin app for some examples](https://github.com/exhi/hoist-react/blob/a1b14ac6d41aa8f8108a518218ce889fe5596780/admin/tabs/activity/tracking/ActivityGridModel.js#L42)
  of this pattern.
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

[Commit Log](https://github.com/exhi/hoist-react/compare/v11.0.0...v12.0.0)


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

[Commit Log](https://github.com/exhi/hoist-react/compare/v10.0.1...v11.0.0)


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
*  Export API has changed. The Built-in grid export now uses more powerful server-side support. To
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

[Commit Log](https://github.com/exhi/hoist-react/compare/v9.0.0...v10.0.0)


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
* **The Context menu API has changed.** The
  [`ContextMenuSupport` mixin](https://github.com/exhi/hoist-react/blob/develop/desktop/cmp/contextmenu/ContextMenuSupport.js)
  now specifies an abstract `getContextMenuItems()` method for component implementation (replacing
  the previous `renderContextMenu()` method). See the new
  [`ContextMenuItem` class](https://github.com/exhi/hoist-react/blob/develop/desktop/cmp/contextmenu/ContextMenuItem.js)
  for what these items support, as well as several static default items that can be used.
  * The top-level `AppContainer` no longer provides a default context menu, instead allowing the
    browser's own context menu to show unless an app / component author has implemented custom
    context-menu handling at any level of their component hierarchy.

### 🐞 Bug Fixes

* TabContainer active tab can become out of sync with the router state (#451)
  * ⚠️ Note this also involved a change to the `TabContainerModel` API - `activateTab()` is now the
    public method to set the active tab and ensure both the tab and the route land in the correct
    state.
* Remove unintended focused cell borders that came back with the prior ag-Grid upgrade.

[Commit Log](https://github.com/exhi/hoist-react/compare/v8.0.0...v9.0.0)


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
  * The `TabContainerModel` constructor API has changed, notably `children` -> `tabs`, `useRoutes`
    -> `route` (to specify a starting route as a string) and `switcherPosition` has moved from a
    model config to a prop on the `TabContainer` component.
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

[Commit Log](https://github.com/exhi/hoist-react/compare/v7.2.0...v8.0.0)

## v7.2.0

### 🎁 New Features

+ Admin console grids now outfitted with column choosers and grid state. #375
+ Additional components for Onsen UI mobile development.

### 🐞 Bug Fixes

+ Multiple improvements to the Admin console config differ. #380 #381 #392

[Commit Log](https://github.com/exhi/hoist-react/compare/v7.1.0...v7.2.0)

## v7.1.0

### 🎁 New Features

* Additional kit components added for Onsen UI mobile development.

### 🐞 Bug Fixes

* Dropdown fields no longer default to `commitOnChange: true` - avoiding unexpected commits of
  type-ahead query values for the comboboxes.
* Exceptions thrown from FetchService more accurately report the remote host when unreachable, along
  with some additional enhancements to fetch exception reporting for clarity.

[Commit Log](https://github.com/exhi/hoist-react/compare/v7.0.0...v7.1.0)

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

[Commit Log](https://github.com/exhi/hoist-react/compare/v6.0.0...v7.0.0)


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
  [`GridStateModel` class](https://github.com/exhi/hoist-react/blob/develop/cmp/grid/GridStateModel.js)
  for implementation details. #331
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

[Commit Log](https://github.com/exhi/hoist-react/compare/v5.0.0...v6.0.0)


## v5.0.0

### 💥 Breaking Changes

* **Multi environment configs have been unwound** See these release notes/instructions for how to
  migrate: https://github.com/exhi/hoist-core/releases/tag/release-3.0.0
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
*  Fix broken LocalStore state.
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
