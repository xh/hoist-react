### 🎁 New Features

* Added a default tooltip to grid column headers with no `headerTooltip`. It shows the full
  `displayName` in bold, with the `description` below. Without a description, it shows only when
  the header label hides the full name - an abbreviated, icon, or truncated label. A blank header
  shows none. Set `headerTooltip: null` to turn it off. `ColumnGroup` headers do the same with their
  `chooserName`.

### 🐞 Bug Fixes

* Fixed a truncated grid header with a `description` not showing its full name on hover. Truncated
  headers now use the grid tooltip, not the browser `title` tooltip.

### ⚙️ Technical

* `Column.headerTooltip` no longer defaults from `description` - it holds only the value an app
  sets. Read `Column.description` directly.
* A column with no `tooltip` or `editor` now sets ag-Grid's `tooltip: false`, so
  `agOptions.tooltipField` and `agOptions.tooltipValueGetter` no longer apply on their own. Use
  `Column.tooltip` instead.
