### 🎁 New Features

* Added `DashCanvasModel.setViewSpecs()` to replace a canvas's view specs at any time. It removes
  views whose spec is gone. Call `loadState()` next to place views of new specs.
* Added the `SUPPLIED` Cube aggregator, for measures only the data source can roll up, such as VaR.
  Its group rows read values passed to `Cube.loadDataAsync()`, `updateDataAsync()` or the new
  `updateAggregatesAsync()`, keyed by the group's dimension values. `View.suppliedGroupingSets`
  lists the groupings a View needs values for.
* Added the observable `GridModel.isRestoringDefaults`, true while `restoreDefaultsAsync()` runs,
  through any `restoreDefaultsFn`. Code that reacts to user changes to grid state can skip those
  the restore makes.
* Added `CubeGridConfig.labelColumn`, also settable on `CubeGridModel`, to merge overrides such as a
  `renderer` into the default label column - for example to format a typed dimension value.
* Added `fmtCompact`, with `compactRenderer` and `compactTextRenderer`, to show a number in the
  largest unit it fills - K, M, B or T - with three significant digits, such as `48.5B`. Its
  `compactPrecision` sets the places of a compacted value, and `precision` those of a whole one.
* Added `dateRangeContext()` to `@xh/hoist/cmp/daterange`, to resolve date range selections without
  a `DateRangePickerModel`, and `businessDayOnOrAfter()` beside `businessDayOnOrBefore()`.
* Added `parsePeriod()` and `shiftByPeriod()` to `@xh/hoist/cmp/daterange`, to step a date by a
  period such as `3M` or `+5D`, counting business days and landing on one by default.
* Added `LastAggregator` and `FirstAggregator` to `@xh/hoist/data`, to roll a group up to the value
  of its latest or earliest leaf by an `orderField`, such as the latest price of each symbol.
* Added `KeyedAggregator` to `@xh/hoist/data`, to roll up a value copied onto leaves from a coarser
  key, such as a fund's NAV on each position: shown where a row pins the key, and counted once per
  key at the root, or on rows grouped by its `keyAttributes`, such as a fund's style.
* Added `SeriesSumAggregator` to `@xh/hoist/data`, as the `SERIES_SUM` token, to sum series
  values such as daily P&L point by point, aligned from the end.
* Added `ColumnSpec.cellStyle` and `GridConfig.rowStyle`: inline styles for each cell or row, fixed
  or from a function of the value or record. A property a later call leaves out, or sets to null,
  is cleared.

### 🐞 Bug Fixes

* Fixed the column chooser listing `CubeGridModel`'s default label column as "Cube Label". It now
  takes the names of the row dimensions, as the header does, or "Group" when there are none.
