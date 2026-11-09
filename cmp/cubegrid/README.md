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
- Docked row summaries and a docked summary row, each optional and placeable
- Settings per pivot dimension - sort, collapsing, summaries, labels and classes - and column
  config per measure applied across every path
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
│   ├── dimensions, dimensionDefaults  # Per dimension: sort, collapsing, summaries, labels, classes
│   ├── measures, measureDefaults      # Per measure: column config applied across every path
│   ├── availableDimensions, availableMeasures  # What a pivot picker offers
│   ├── measuresOutermost              # Measures outermost, paths beneath (default false; 2+ measures)
│   ├── linkedSizing                   # One width per measure: true|false|{headerFitMaxWidth}
│   ├── expandLevel                    # Pivot header level, as expandLevel for rows
│   └── expandToLevel(), expandAll(), collapseAll()
├── showSummary                        # The grid's summary row, delegated - needs includeRoot
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
            pivot: {dimensions: ['region'], measures: ['mktVal', 'pnl']}
        },
        gridConfig: {showSummary: 'top', sizingMode: 'compact', autosizeOptions: {mode: 'managed'}},
        pivotConfig: {
            measures: [
                {field: 'mktVal', column: {width: 120, renderer: millionsRenderer({precision: 2})}},
                {field: 'pnl', column: {width: 110, renderer: numberRenderer({colorSpec: true})}}
            ],
            dimensionDefaults: {showSummary: true}
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
   `SINGLE` aggregator, a leaf field, or a measure. A measure's bare field name is its row summary,
   so `{field: 'mktVal'}` shows market value once even when the query pivots P&L by region.
2. **Pivot columns** - derived from `result.paths` when the query pivots, one group per path with a
   column per `pivot.measures` entry, configured through `pivotConfig.measures`. One group spans the
   region, titled by the first pivot dimension (`By Region`), with every dimension and measure in its
   tooltip (`Mkt Val, Pnl by Region › Sector`). Both name fields by their `shortDisplayName`.

Column groups in the pivot region expand and collapse from their headers. Each pivot dimension has a
summary that aggregates its values: the first dimension's is the row summary, which the region
collapses to, and each later dimension's is the summary its parent groups collapse to - one column
per measure, under a header labelled `Total` by default. A summary takes each measure's own
aggregator, so it is an average for an `AVG` measure. Each dimension's `collapsible`,
`showSummary` and `summaryLabel` govern its own summary: whether groups can collapse to it,
whether it shows while expanded too, on the side named - the left by default, so the summary keeps
its collapsed position and the group opens to its right - and its label. The label stays in place
either way, so collapsing never changes the header depth, unless `showCollapsedLabel: false` drops
it while collapsed and the summary's column headers stretch up to the group's.
`pivotConfig.expandLevel` sets the initial level, as `expandLevel` does for rows: 0 collapses the
region, 1 shows the top-level groups collapsed, -1 (the default) expands everything.
`pivotModel.expandToLevel()` resets it later, with `expandAll()` and `collapseAll()` as shortcuts.
The header menu offers the same over pivot columns, via its `expandCollapse` token. Its "Expand
to..." lists the pivot dimensions, as the row menu lists the row dimensions, which the model
supplies as `levelLabels` unless the app sets its own.
The state is the grid's own `columnGroupState`, keyed on the path and on `PIVOT_GROUP_ID` for the
region, so it survives a rebuild and persists with `persistWith`.

```typescript
pivotConfig: {
    dimensions: [
        {field: 'region', sortBy: ['US', 'EU'], summaryLabel: 'All Regions'},
        {field: 'sector', collapsible: false}           // Regions fixed open to their sectors
    ],
    dimensionDefaults: {showSummary: true}            // Every summary shown while expanded
}
```

Settings apply in order: built-in defaults, then `dimensionDefaults`, then the dimension's own
entry. A dimension's entry follows it to whatever level the query pivots it at, and an entry for a
dimension the query does not pivot on is ignored.

A dimension also sets how its values look. `valueRenderer` formats a value's header text, which
export headers and width fitting use too - a date as `Nov 2026`, say - and `emptyLabel` heads a
null or blank value, `(empty)` by default. `valueClass` puts a class on a
value's header and on every header and cell beneath it, and as a function picks one per value, to
set one apart. `summaryClass` marks the dimension's summary columns. Every summary column and header
also carries the built-in `xh-cube-grid__summary-cell` and `xh-cube-grid__summary-header` classes,
unstyled, so a stylesheet can treat all summaries alike or one dimension's apart:

```typescript
dimensions: [
    {field: 'region', summaryClass: 'row-summary'},
    {
        field: 'month',
        valueRenderer: v => fmtDate(v, 'MMM YYYY'),
        valueClass: v => (v === currentMonth ? 'current-month' : null)
    }
]
```

`dimensions` and `measures` also declare what the grid offers, as `columns` do for a column
chooser. A picker for the pivot reads `pivotModel.availableDimensions` and `availableMeasures`:
the listed fields in their listed order, or every one of the cube's `dimensions` and `measures`
when none are listed. A query may still pivot on a field that is not listed, with the defaults.

With `linkedSizing` (the default), every pivot column of a measure shares one width, so the
region reads as a regular grid. That width is the measure's widest data. Where a displayed pivot
label needs more room than the data of the columns it spans - a leaf path label over its measures,
a collapsed group's label over its summary, or with `measuresOutermost` a column's own header - the
shortfall is shared evenly among those columns, so a narrow measure is not ballooned. Labels claim
at most `headerFitMaxWidth` (default 140px) and truncate past it, with a tooltip. Data can go
wider. The width follows as groups expand and collapse. A manual resize moves all of the measure's
columns together and holds until the next autosize. Set `headerFitMaxWidth: 0` to size for data
alone, or `linkedSizing: false` to size each column on its own, as in any grid. Set
`valueRenderer` to shorten labels.

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
view.updateQuery({pivot: {...view.query.pivot, measures: ['pnl']}});

// Switch pivoting off without rebuilding the grid - back to the fixed columns alone.
view.updateQuery({pivot: null});
```

`updateQuery` replaces the whole `pivot` block, so spread the current one to change a single member.
Presentation settings change on the models - `columns` on the CubeGridModel and every pivot option
on its `pivotModel` are bindable, as are the grid's own on `gridModel`. Dimension and measure
settings are objects, replaced whole. `showSummary` delegates to the grid.

```typescript
switchInput({bind: 'measuresOutermost', model: cubeGridModel.pivotModel, label: 'Measures first'})

const {pivotModel} = cubeGridModel;
pivotModel.dimensionDefaults = {...pivotModel.dimensionDefaults, showSummary: 'left'};
```

### Pivot Columns and Cell Fields

Each cell the View publishes becomes one column, bound to its synthetic field name:

| Column | Field on the row | Header |
|--------|------------------|--------|
| Row summary for `pnl` | `pnl` | `By Region` › `Total` › `Pnl` |
| Cell for region `US`, measure `pnl` | `US>>pnl` | `US` › `Pnl` |
| Summary for `US` with a second pivot dimension | `US>>pnl` | `US` › `Total` › `Pnl` |
| Cell for `US` › `Tech` | `US>>Tech>>pnl` | `US` › `Tech` › `Pnl` |

The field name is also the column's `colId`, so column state persists across rebuilds for paths that
remain in the data, and a path that leaves and returns comes back at its default width. A summary
column binds the same cell under a `summary>>` colId, so a fixed column can show the row summary
for a measure as well. With a dimension's `showCollapsedLabel: false`, a collapsed group's summary
has no label over it and its own `collapsed>>` colIds. Every path is a group headed by its value
with a column per measure beneath, even with a single measure, so the measure name stays visible
beside the fixed columns.

`pivotConfig.measures` holds one entry per measure, its `field` naming the measure and its `column`
the column config applied to every pivot column generated for it, over any in
`measureDefaults.column` - so the same column specs can serve as the fixed `columns` too. Keys the
grid sets itself - `colId`, `pinned`, `hidden`, `exportName`, editing and the like - are ignored, so
a spec shared with the fixed columns still applies cleanly. Pivot columns are not hideable and stay out of the column chooser, as they cannot be moved
or pinned: the region is the query's. Drop a measure from `pivot.measures` or filter the query to
remove columns.

### Measures Outermost

`measuresOutermost: true` puts each measure outermost, with the paths beneath it, to compare one
measure across paths. It applies only with multiple measures: a single measure is always laid out
this way, since nesting it would repeat its name under every path. Its groups keep the default
layout's ids unless the option is set, so their expand state carries over as measures are added.

```
Default                             measuresOutermost: true
By Region                           Pnl by Region
├── US                              ├── US: Tech | Energy | Total
│   ├── Tech: Pnl | MktVal          ├── EU: ...
│   └── ...                         └── Total
└── Total: Pnl | MktVal             MktVal ...
```

Each measure is a root group, headed by its column's `headerName` and the first pivot dimension
(`Pnl by Region`), that collapses to its own row summary - there is no group over the whole region,
so `PIVOT_GROUP_ID` is not present and the header is one level shallower. Every pivot dimension
shows in the measure's tooltip. Group ids carry the
measure, as `pnl::pivot` and `pnl::US`, so each measure expands on its own. Summaries still belong
to their dimensions, so the first dimension's settings govern each measure's row summary. Leaf paths
head their columns directly, and each summary is a single column under its own `measureSummary>>`
colId, so `showCollapsedLabel` has no effect. Cell colIds are the same either way, so their state
carries over when the option changes.

### Sorting the Pivot Axis

Each dimension's `sortBy` orders its values: `'asc'`, `'desc'`, an explicit array of dimension
values with anything unlisted following in view order, a comparator of two `PivotPath`s, or `null`
to keep the View's own ascending order. It is display-only; the View's `result.paths` is never
reordered.

```typescript
pivotConfig: {
    dimensions: [
        {field: 'region', sortBy: ['US', 'EU']},                                  // Fixed order
        {field: 'tenor', sortBy: (a, b) => tenorDays(a.value) - tenorDays(b.value)}  // 1W, 3M, 1Y
    ]
}
```

A comparator runs on each rebuild, not on data changes, so set new `dimensions` to re-sort when what
it reads changes.

## Filtering and Export

A `gridConfig.filterModel` binds to the View by default - `{bind: 'view'}` - so a column filter
on a dimension or measure filters the **source records** through the query and re-aggregates
every row, summary and pivot cell, as a pivot table's label filter does. Pivot columns are never
filterable: a cell is an aggregate, and no query filter can express a condition on it.

Bind to the store instead - `filterModel: {bind: 'store'}` - to filter the **group
rows by their aggregates** with no re-aggregation, as a pivot table's value filter does. A row
then passes on its own aggregates, and a failing parent stays visible while a child passes. The two
are different operations and both are useful.

Export is leaf-columns-only, and a pivot column's header repeats under every path, so each pivot
column exports under its path labels and header joined - `US › Tech › P&L`, `Total › P&L`. The
header is the column's `headerName`, or the field's display name when the header is an element.
`exportName` is reserved on pivot columns, since one shared with the fixed columns would repeat.

## Related Packages

- [`/data/cube/`](../../data/cube/README.md) - Cube, Query and View, including the `pivot` option
- [`/cmp/grid/`](../grid/README.md) - GridModel and Column, which this package builds on
- `/cmp/zoneGrid/` - another specialized presentation of a GridModel
