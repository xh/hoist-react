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
defaults, see the JSDoc on `CubeGridConfig` and `CubeGridProps`.

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
├── pivotValueSummary, pivotGroupSummary      # Total columns, docked / per group: false|true|HSide
├── showSummary                        # The grid's totals row, delegated - needs includeRoot
├── pivotSortBy: PivotSort[]           # Display order per pivot level
├── pivotValueSpecs                   # ColumnSpec per measure, applied across every path
└── rebuildColumns()                   # Runs when result.paths or `columns` changes

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
        pivotValueSummary: 'right',
        pivotValueSpecs: {
            mktVal: {width: 120, renderer: millionsRenderer({precision: 2, label: true})},
            pnl: {width: 110, renderer: numberRenderer({precision: 0, colorSpec: true})}
        },
        gridConfig: {showSummary: 'top', sizingMode: 'compact', autosizeOptions: {mode: 'managed'}}
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
   a column per `pivot.valueFields` entry, configured through `pivotValueSpecs`. The summary
   column joins this region on the side `pivotValueSummary` names.

Users reorder the fixed columns and the grid persists that through its normal column state. Pivot
columns are not movable: their order is the view's, set through `pivotSortBy`, in the same way row
order is set through the query rather than dragged. The regions never interleave, and a rebuild
keeps each pivot column's width and hidden flag while taking its position from the build.

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
member. Presentation settings change on the model itself - `columns`, `pivotValueSummary`,
`pivotGroupSummary`, `pivotSortBy` and `pivotValueSpecs` are all bindable, and `showSummary`
delegates to the grid.

### Pivot Columns and Cell Fields

Each cell the View publishes becomes one column, bound to its synthetic field name:

| Column | Field on the row | Header |
|--------|------------------|--------|
| Row total for `pnl` | `pnl` | `Total` |
| Cell for region `US`, measure `pnl` | `US>>pnl` | `US` › `Pnl` |
| Subtotal for `US` with a second pivot dimension | `US>>pnl` | `US` › `Total` |
| Cell for `US` › `Tech` | `US>>Tech>>pnl` | `US` › `Tech` › `Pnl` |

The field name is also the column's `colId`, so column state persists across rebuilds for paths that
remain in the data, and a path that leaves and returns comes back at its default width. A summary
column binds the same cell under a `total>>` colId, so a fixed column can show the row total for a
measure as well. Every path is a group headed by its value with a column per measure beneath, even
with a single measure, so the measure name stays visible beside the fixed columns.

`pivotValueSpecs` applies to every pivot column generated for a measure. Keys that identify or
place a column - `colId`, `field`, `pinned`, `hidden`, `editable` and the rest of
`RESERVED_PIVOT_VALUE_KEYS` - are stripped, so a spec shared with the fixed columns still applies
cleanly. Pivot columns are hideable through the column chooser like any other, and the hidden state
persists by cell field name. Set `hideable: false` on a measure's spec to lock its columns, and drop
the measure from `pivot.valueFields` to remove them.

### Sorting the Pivot Axis

`pivotSortBy` takes one entry per pivot level: `'asc'`, `'desc'`, an explicit array of dimension
values with anything unlisted following in view order, or `null` to keep the View's own ascending
order. It is display-only; the View's `result.paths` is never reordered.

```typescript
cubeGridModel.pivotSortBy = [['US', 'EU'], 'asc'];  // Regions in a fixed order, sectors A-Z
```

## Filtering and Export

A grid column filter on a cell field filters **group rows by their aggregate**, after pivoting,
with no re-aggregation - the same caveat AG Grid documents for its own pivot mode. To filter the
source records and re-aggregate everything, filter the query with `view.setFilter()` or
`updateQuery({filter})`. The two are different operations and both are useful.

Export is leaf-columns-only, so every pivot column exports under its own short header. Set a
qualified `exportName` per measure in `pivotValueSpecs` if a pivot with several paths needs
distinct column names in the exported sheet.

## Related Packages

- [`/data/cube/`](../../data/cube/README.md) - Cube, Query and View, including the `pivot` option
- [`/cmp/grid/`](../grid/README.md) - GridModel and Column, which this package builds on
- `/cmp/zoneGrid/` - another specialized presentation of a GridModel
