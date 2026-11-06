# CubeGrid Package

## Overview

The `/cmp/cubegrid/` package renders a Cube View as a grid: group rows down a tree column, the
app's own columns beside it, and - when the View's query pivots - one column group per pivot path
appended to the right, with a column per measure inside each group. It is a specialized
presentation of the standard `Grid`, in the same way `ZoneGrid` and `DataView` are -
`CubeGridModel` owns a `GridModel` and keeps its store and columns in step with the View.

**Key features:**
- One model for any cube-backed grid - the store, tree mode, label column and summary row are
  wired for you, with or without pivoting
- Columns derived from the data when pivoting - a new pivot value becomes a new column group,
  appended after the app's columns
- Nested column groups for two or more pivot dimensions, with a summary column per group
- Docked row totals and a docked totals row, each optional and placeable
- Display sort per pivot level, and column config per measure applied across every path
- Live updates: ticks reach the cells in place, and column state survives a structural rebuild
- Ordinary Store fields behind every cell, so column filters, export and selection work as usual

All query configuration - row dimensions, pivot dimensions, measures, filters - lives on the
View's `Query`. `CubeGridModel` holds only presentation config, and apps reconfigure by calling
`view.updateQuery()`. See the [Cube README](../../data/cube/README.md#pivoting-with-pivot) for the
data layer, including how cells are named and how they stay current.

This guide covers how the pieces fit together. For every configuration key and prop with its
defaults, see the JSDoc on `CubeGridConfig`, `CubeGridPivotConfig` and `CubeGridProps`.

## Architecture

```
Cube                                   # Source records
└── View                               # Supplied by the app, or created from `cube` + `query`
    └── result.paths, result.cellFields  # Structural-change signals, when pivoted

CubeGridModel
├── view: View                         # Bound for life - not swappable
├── store: Store                       # Minted from the view; fields track the cell fields
├── gridModel: GridModel               # The grid rendered; treeMode, managed columns
├── selectedRecord, selectAsync, ...   # Selection and `empty` delegated, as on ZoneGridModel
├── columns                            # The app's fixed columns, label column first by default
├── pivotModel: CubeGridPivotModel     # Builds, sizes and expands the pivot region
│   ├── columns                        # ColumnSpec per measure, applied across every path
│   ├── columnSpecFn                   # Overrides per column, by path, measure and kind
│   ├── columnGroupSpecFn              # Overrides per column group, by path and kind
│   ├── sortBy: PivotSort[]            # Display order per pivot level
│   ├── showSummaries                  # Total columns per group while expanded: false|true|HSide
│   ├── groupsCollapsible              # Let pivot groups collapse from their headers (default)
│   ├── collapsedTotalHeader           # Total header over a collapsed group's summary (default)
│   ├── columnSizing                   # One width per measure: true|false|{headerFitMaxWidth}
│   ├── expandLevel                    # Pivot header level, as expandLevel for rows
│   └── expandToLevel(), expandAll(), collapseAll()
├── showSummary                        # The grid's totals row, delegated - needs includeRoot
└── rebuildColumns()                   # Runs when result.paths, `columns` or a pivot option changes

CubeGrid                               # Renders gridModel; layout props and agOptions
```

## CubeGridModel

### Basic Usage

Give the model a Cube and a query, and it creates and owns a connected View. The grid can be built
before the Cube has data - columns for pivot paths appear as the data arrives.

```typescript
import {cubeGrid, CubeGridModel} from '@xh/hoist/cmp/cubegrid';
import {Cube} from '@xh/hoist/data';

class PositionsModel extends HoistModel {
    @managed cube = new Cube({
        idSpec: 'id',
        fields: [
            {name: 'fund', type: 'string', isDimension: true},
            {name: 'trader', type: 'string', isDimension: true},
            {name: 'region', type: 'string', isDimension: true},
            {name: 'mktVal', type: 'number', aggregator: 'SUM'},
            {name: 'pnl', type: 'number', aggregator: 'SUM'}
        ]
    });

    @managed cubeGridModel = new CubeGridModel({
        cube: this.cube,
        query: {
            dimensions: ['fund', 'trader'],
            includeRoot: true,
            pivot: {dimensions: ['region'], valueFields: ['mktVal', 'pnl']}
        },
        gridConfig: {showSummary: 'top', sizingMode: 'compact', autosizeOptions: {mode: 'managed'}},
        pivotConfig: {
            showSummaries: true,
            columns: [
                {field: 'mktVal', width: 120, renderer: millionsRenderer({precision: 2})},
                {field: 'pnl', width: 110, renderer: numberRenderer({colorSpec: true})}
            ]
        }
    });

    override async doLoadAsync(loadSpec) {
        await this.cube.loadDataAsync(await this.fetchPositionsAsync(loadSpec));
    }
}

// In the component:
cubeGrid({model: model.cubeGridModel})
```

Pass `view` instead of `cube` and `query` to bind a View the app already holds, such as one shared
with a chart. The app then owns the View's lifecycle, and two models may bind to one View.

### A Grid Without Pivoting

Leave `pivot` off the query and the model is a plain cube grid: tree-mode, summary row following
`includeRoot`, and the columns the app lists. This replaces the `GridModel` + `createView({stores})`
wiring that cube-backed grids used to need.

```typescript
new CubeGridModel({
    cube,
    query: {dimensions: ['fund', 'trader'], includeRoot: true},
    columns: [
        {field: 'mktVal', renderer: millionsRenderer({precision: 2, label: true})},
        {field: 'pnl', renderer: numberRenderer({precision: 0, colorSpec: true})}
    ]
});
```

### Fixed Columns and Pivot Columns

The grid has two regions, always in this order:

1. **Fixed columns** - `columns`, written by the app exactly as for a `GridModel`, in the order
   given. Unless one of them sets `isTreeColumn`, a label column for the row dimensions is placed
   first, pinned left. Bind these to the View's fields: a row attribute carried by a `UNIQUE` or
   `SINGLE` aggregator, a leaf field, or a measure. A measure's bare field name is its row total,
   so `{field: 'mktVal'}` shows market value once even when the query pivots P&L by region.
2. **Pivot columns** - derived from `result.paths` when the query pivots, one group per path with
   a column per `pivot.valueFields` entry, configured through `pivotConfig.columns`, with
   `columnSpecFn` overriding single columns by path, measure and kind (`cell` or `total`) -
   a width on the `Total` columns, say. `columnGroupSpecFn` does the same for the
   column groups, by path and kind (`path` or `total`), for header names, classes and alignment.
   Both receive the spec they override as `spec`, to derive from rather than replace.
   One group spans
   the region, titled by the pivot dimensions (`Region › Sector`), with the row summary column on
   the side `showSummaries` names.

Column groups in the pivot region expand and collapse from their headers. The region collapses to
the row summary, one column per value field holding each row's total, under a `Total` header. With
two or more pivot dimensions, each parent path group collapses to its own summary the same way.
`showSummaries` keeps every summary visible while expanded too, on the side it names - the
left by default, so the summary keeps its collapsed position and the group opens to its right.
The `Total` header stays in place either way, so collapsing never changes the header depth. Summary cells and headers carry the
`xh-cube-grid__total-cell` and `xh-cube-grid__total-header` classes, unstyled by default, for apps
that want to set them apart. `pivotConfig.expandLevel` sets the initial level, as `expandLevel`
does for rows: 0 collapses the region, 1 shows the top-level groups collapsed, -1 (the default)
expands everything. `pivotModel.expandToLevel()` resets it later, with `expandAll()` and
`collapseAll()` as shortcuts. Set `groupsCollapsible: false` to fix every group
open with summary columns only where asked. The state is the grid's own `columnGroupState`, keyed
on the path and on `PIVOT_GROUP_ID` for the region, so it survives a rebuild and persists with
`persistWith`.

Every pivot column of a measure shares one width, so the region reads as a regular grid. That
width is the measure's widest data. Where a displayed group label needs more room than the data
of the columns it spans - a leaf path label over its measures, or a collapsed group's label over
its summary - the shortfall is shared evenly among those columns, so a narrow measure is not
ballooned. Labels claim at most `columnSizing.headerFitMaxWidth` (default 140px) and
truncate past it, with a tooltip. Data can go wider. The width follows as groups expand and
collapse. A manual resize moves all of the measure's columns together and holds until the next
autosize. Set `headerFitMaxWidth: 0` to size for data alone, or `columnSizing: false` to
size each column on its own, as in any grid. Set `headerName` in `columnGroupSpecFn` to
shorten labels.

Users reorder the fixed columns and the grid persists that through its normal column state. Pivot
columns are not movable: their order is the view's, set through `sortBy`, in the same way row
order is set through the query rather than dragged. The regions never interleave. A header drag
cannot drop a fixed column inside the pivot block, a drop made through the column chooser is moved
back as soon as it lands, and a rebuild keeps each pivot column's width while taking its position
from the build.

### Reconfiguring

Change what is pivoted through the query, and the grid follows:

```typescript
const {view} = cubeGridModel;

// Pivot on two dimensions instead of one - nested column groups.
view.updateQuery({pivot: {...view.query.pivot, dimensions: ['region', 'sector']}});

// Swap the measures.
view.updateQuery({pivot: {...view.query.pivot, valueFields: ['pnl']}});

// Switch pivoting off without rebuilding the grid - back to the fixed columns alone.
view.updateQuery({pivot: null});
```

`updateQuery` replaces the whole `pivot` block, so spread the current one to change a single
member. Presentation settings change on the models - `columns` on the CubeGridModel and every
pivot option on its `pivotModel` are bindable, as are the grid's own on `gridModel`. `showSummary`
delegates to the grid.

```typescript
switchInput({bind: 'showSummaries', model: cubeGridModel.pivotModel, label: 'Totals'})
```

### Pivot Columns and Cell Fields

Each cell the View publishes becomes one column, bound to its synthetic field name:

| Column | Field on the row | Header |
|--------|------------------|--------|
| Row total for `pnl` | `pnl` | `Region › Sector` › `Total` › `Pnl` |
| Cell for region `US`, measure `pnl` | `US>>pnl` | `US` › `Pnl` |
| Subtotal for `US` with a second pivot dimension | `US>>pnl` | `US` › `Total` › `Pnl` |
| Cell for `US` › `Tech` | `US>>Tech>>pnl` | `US` › `Tech` › `Pnl` |

The field name is also the column's `colId`, so column state persists across rebuilds for paths that
remain in the data, and a path that leaves and returns comes back at its default width. A summary
column binds the same cell under a `total>>` colId, so a fixed column can show the row total for a
measure as well. With `collapsedTotalHeader: false`, a collapsed group's summary has no `Total`
header and its own `collapsed>>` colIds. Every path is a group headed by its value with a column per
measure beneath, even with a single measure, so the measure name stays visible beside the fixed
columns.

`pivotConfig.columns` holds one spec per measure, its `field` naming the value field, applied to
every pivot column generated for that measure - so the same array can serve as the fixed `columns`
too. Keys that identify, place or name a column - `colId`, `pinned`, `hidden`, `exportName` and the
rest of `RESERVED_PIVOT_COLUMN_KEYS` - are stripped, so a spec shared with the fixed columns still
applies cleanly. Pivot columns are not hideable and stay out of the column chooser, as they cannot
be moved or pinned: the region is the query's. Drop a measure from `pivot.valueFields` or filter the
query to remove columns.

### Sorting the Pivot Axis

`sortBy` takes one entry per pivot level: `'asc'`, `'desc'`, an explicit array of dimension
values with anything unlisted following in view order, a comparator of two `PivotPath`s, or `null`
to keep the View's own ascending order. It is display-only; the View's `result.paths` is never
reordered.

```typescript
const {pivotModel} = cubeGridModel;
pivotModel.sortBy = [['US', 'EU'], 'asc'];  // Regions in a fixed order, sectors A-Z
pivotModel.sortBy = [(a, b) => tenorDays(a.value) - tenorDays(b.value)];  // 1W, 3M, 1Y
```

A comparator runs on each rebuild, not on data changes, so set a new `sortBy` to re-sort when
what it reads changes.

## Filtering and Export

A `gridConfig.filterModel` binds to the View by default - `{bind: 'view'}` - so a column filter
on a dimension or measure filters the **source records** through the query and re-aggregates
every row, total and pivot cell, as a pivot table's label filter does. Pivot columns are never filterable: a cell is an
aggregate, and no query filter can express a condition on it.

Bind to the store instead - `filterModel: {bind: 'store'}` - to filter the **group
rows by their aggregates** with no re-aggregation, as a pivot table's value filter does. A row
then passes on its own total, and a failing parent stays visible while a child passes. The two
are different operations and both are useful.

Export is leaf-columns-only, and a pivot column's header repeats under every path, so each pivot
column exports under its path labels and header joined - `US › Tech › P&L`, `Total › P&L`. The
header is the column's `headerName`, or the field's display name when the header is an element.
`exportName` is reserved on pivot columns, since one shared with the fixed columns would repeat.

## Related Packages

- [`/data/cube/`](../../data/cube/README.md) - Cube, Query and View, including the `pivot` option
- [`/cmp/grid/`](../grid/README.md) - GridModel and Column, which this package builds on
- `/cmp/zoneGrid/` - another specialized presentation of a GridModel
