Latest release
## v15.1.2

🛠 Hotfix release to MultiSelect to cap the maximum number of options rendered by the drop-down list. Note, this component is being replaced in Hoist v16 by the react-select library.

## v15.1.1

🐞 Bug Fixes
Fix to minimal validation mode for FormField disrupting input focus.
Fix to JsonInput disrupting input focus.
⚙️ Technical
Support added for TLBR-style notation when specifying margin/padding via layoutSupport - e.g. box({margin: '10 20 5 5'}).
Tweak to lockout panel message when the user has no roles.
:octocat: Commit Log


## v15.1.0

🎁 New Features
The FormField component takes a new minimal prop to display validation errors with a tooltip only as opposed to an inline message string. This can be used to help reduce shifting / jumping form layouts as required.
The admin-only user impersonation toolbar will now accept new/unknown users, to support certain SSO application implementations that can create users on the fly.
⚙️ Technical
Error reporting to server w/ custom user messages is disabled if the user is not known to the client (edge case with errors early in app lifecycle, prior to successful authentication).
:octocat: Commit Log


## v15.0.0

💥 Breaking Changes
This update does not require any application client code changes, but does require updating the Hoist Core Grails plugin to >= 5.0. Hoist Core changes to how application roles are loaded and users are authenticated required minor changes to how JS clients bootstrap themselves and load user data.
The Hoist Core HoistImplController has also been renamed to XhController, again requiring Hoist React adjustments to call the updated /xh/ paths for these (implementation) endpoints. Again, no app updates required beyond taking the latest Hoist Core plugin.
:octocat: Commit Log


## v14.2.0

🎁 New Features
Upgraded hoist-dev-utils to 3.0.3. Client builds now use the latest Webpack 4 and Babel 7 for noticeably faster builds and recompiles during CI and at development time.
GridModel now has a top-level agColumnApi property to provide a direct handle on the ag-Grid Column API object.
⚙️ Technical
Support for column groups strengthened with the addition of a dedicated ColumnGroup sibling class to Column. This includes additional internal refactoring to reduce unnecessary cloning of Column configurations and provide a more managed path for Column updates. Public APIs did not change. (#694)
📚 Libraries
Blueprint Core 3.6.1 -> 3.7.0
Blueprint Datetime 3.2.0 -> 3.3.0
Fontawesome 5.3.x -> 5.4.x
MobX 5.1.2 -> 5.5.0
Router5 6.5.0 -> 6.6.0
:octocat: Commit Log


## v14.1.3

🐞 Bug Fixes
Ensure JsonInput reacts properly to value changes.
⚙️ Technical
Block user pinning/unpinning in Grid via drag-and-drop - pending further work via #687.
Support "now" as special token for dateIs min/max validation rules.
Tweak grouped grid row background color.
:octocat: Commit Log


## v14.1.1

🐞 Bug Fixes
Fixes GridModel support for row-level grouping at same time as column grouping.
:octocat: Commit Log


## v14.1.0

🎁 New Features
GridModel now supports multiple levels of row grouping. Pass the public setGroupBy() method an array of string column IDs, or a falsey value / empty array to ungroup. Note that the public and observable groupBy property on GridModel will now always be an array, even if the grid is not grouped or has only a single level of grouping.
GridModel exposes public expandAll() and collapseAll() methods for grouped / tree grids, and StoreContextMenu supports a new "expandCollapseAll" string token to insert context menu items. These are added to the default menu, but auto-hide when the grid is not in a grouped state.
The Grid component provides a new onKeyDown prop, which takes a callback and will fire on any keypress targeted within the Grid. Note such a handler is not provided directly by ag-Grid.
The Column class supports pinned as a top-level config. Supports passing true to pin to the left.
🐞 Bug Fixes
Updates to Grid column widths made via ag-Grid's "autosize to fit" API are properly persisted to grid state.
:octocat: Commit Log


## v14.0.0

Along with numerous bug fixes, v14 brings with it a number of important enhancements for grids, including support for tree display, 'action' columns, and absolute value sorting. It also includes some new controls and improvement to focus display.

💥 Breaking Changes
The signatures of the Column.elementRenderer and Column.renderer have been changed to be consistent with each other, and more extensible. Each takes two arguments -- the value to be rendered, and a single bundle of metadata.
StoreContextMenuAction has been renamed to RecordAction. Its action property has been renamed to actionFn for consistency and clarity.
LocalStore : The method LocalStore.processRawData no longer takes an array of all records, but instead takes just a single record. Applications that need to operate on all raw records in bulk should do so before presenting them to LocalStore. Also, LocalStores template methods for override have also changed substantially, and sub-classes that rely on these methods will need to be adjusted accordingly.
🎁 New Features
Grid
The Store API now supports hierarchical datasets. Applications need to simply provide raw data for records with a "children" property containing the raw data for their children.
Grid supports a 'TreeGrid' mode. To show a tree grid, bind the GridModel to a store containing hierarchical data (as above), set treeMode: true on the GridModel, and specify a column to display the tree controls (isTreeColumn: true)
Grid supports absolute sorting for numerical columns. Specify absSort: true on your column config to enable. Clicking the grid header will now cycle through ASC > DESC > DESC (abs) sort modes.
Grid supports an 'Actions' column for one-click record actions. See cmp/desktop/columns/actionCol.
A new showHover prop on the desktop Grid component will highlight the hovered row with default styling. A new GridModel.rowClassFn callback was added to support per-row custom classes based on record data.
A new ExportFormat.LONG_TEXT format has been added, along with a new Column.exportWidth config. This supports exporting columns that contain long text (e.g. notes) as multi-line cells within Excel.
Other Components
RadioInput and ButtonGroupInputhave been added to the desktop/cmp/form package.
DateInput now has support for entering and displaying time values.
NumberInput displays its unformatted value when focused.
Focused components are now better highlighted, with additional CSS vars provided to customize as needed.
🐞 Bug Fixes
Calls to GridModel.setGroupBy() work properly not only on the first, but also all subsequent calls (#644).
Background / style issues resolved on several input components in dark theme (#657).
Grid context menus appear properly over other floating components.
📚 Libraries
React 16.5.1 -> 16.5.2
router5 6.4.2 -> 6.5.0
CodeMirror, Highcharts, and MobX patch updates

## v13.0.0

🍀Lucky v13 brings with it a number of enhancements for forms and validation, grouped column support in the core Grid API, a fully wrapped MultiSelect component, decorator syntax adjustments, and a number of other fixes and enhancements. 

It also includes contributions from new ExHI team members Arjun and Brendan.  🎉 

## 💥 Breaking Changes
* The core `@HoistComponent`, `@HoistService`, and `@HoistModel` decorators are **no longer parameterized**, meaning that trailing `()` should be removed after each usage. (#586)
* The little-used `hoistComponentFactory()` method was also removed as a further simplification (#587).
* The `HoistField` superclass has been renamed to `HoistInput` and the various **desktop form control components have been renamed** to match (55afb8f). Apps using these components (which will likely be most apps) will need to adapt to the new names.
  * This was done to better distinguish between the input components and the upgraded Field concept on model classes (see below).

# 🎁 New Features
⭐️ **Forms and Fields** have been a major focus of attention, with support for structured data fields added to Models via the `@FieldSupport` and `@field()` decorators. 
* Models annotated with `@FieldSupport` can decorate member properties with `@field()`, making those properties observable and settable (with a generated `setXXX()` method). 
* The `@field()` decorators themselves can be passed an optional display label string as well as zero or more *validation rules* to define required constraints on the value of the field. 
* A set of predefined constraints is provided within the toolkit within the `/field/` package. 
* Models using `FieldSupport` should be sure to call the `initFields()` method installed by the decorator within their constructor. This method can be called without arguments to generally initialize the field system, or it can be passed an object of field names to initial/default values, which will set those values on the model class properties and provide change/dirty detection and the ability to "reset" a form. 
* A new `FormField` UI component can be used to wrap input components within a form. The `FormField` wrapper can accept the source model and field name, and will apply those to its child input. It leverages the Field model to automatically display a label, indicate required fields, and print validation error messages. This new component should be the building-block for most non-trivial forms within an application.

Other enhancements include:
* **Grid columns can be grouped**, with support for grouping added to the grid state management system, column chooser, and export manager (#565). To define a column group, nest column definitions passed to `GridModel.columns` within a wrapper object of the form `{headerName: 'My group', children: [...]}`.


# 🐞 Bug Fixes

## 📚 Libraries

## v12.1.2

## 🐞 Bug Fixes

* Fix casing on functions generated by `@settable` decorator (35c7daa209a4205cb011583ebf8372319716deba).

:octocat: [Commit Log](https://github.com/exhi/hoist-react/compare/v12.1.1...v12.1.2)

## v12.1.1

## 🐞 Bug Fixes
* Avoid passing unknown HoistField component props down to Blueprint select/checkbox controls.

## 📚 Libraries
* Rollback update of `@blueprintjs/select` package `3.1.0 -> 3.0.0` - this included breaking API changes and will be revisited in #558.

:octocat: [Commit Log](https://github.com/exhi/hoist-react/compare/v12.1.0...v12.1.1)