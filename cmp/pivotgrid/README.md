# PivotGrid Package

## Overview

The `/cmp/pivotgrid/` package renders a pivoted Cube View as a grid: group rows down the side, one
column group per pivot path across the top, and a column per measure inside each group. It is a
specialized presentation of the standard `Grid`, in the same way `ZoneGrid` and `DataView` are -
`PivotGridModel` owns a `GridModel` and generates its columns from the View's results.

**Key features:**
- Columns derived from the data - a new pivot value in the data becomes a new column group
- Nested column groups for two or more pivot dimensions, with per-group subtotals
- Docked row totals and a docked totals row, each optional and placeable
- Display sort per pivot level, and column config per measure applied across every path
- Live updates: ticks reach the cells in place, and column state survives a structural rebuild
- Ordinary Store fields behind every cell, so column filters, export and selection work as usual

All query configuration - row dimensions, pivot dimensions, measures, filters - lives on the
View's `Query`. `PivotGridModel` holds only presentation config, and apps reconfigure a pivot by
calling `view.updateQuery()`. See the [Cube README](../../data/cube/README.md#pivoting-with-pivot)
for the data layer, including how cells are named and how they stay current.

This guide covers how the pieces fit together. For every configuration key and prop with its
defaults, see the JSDoc on `PivotGridConfig` and `PivotGridProps`.

## Architecture

```
View (query.pivot set)                 # Application-owned, supplies the data
└── result.paths, result.cellFields    # Structural-change signals

PivotGridModel
├── view: View                         # Bound for life - not swappable
├── store: Store                       # From view.createStore(); disconnected on destroy
├── gridModel: GridModel               # The grid rendered; treeMode, generated columns
├── rowSummary, pivotSummary           # Total columns, docked / per group: false|true|HSide
├── valueSummary                       # Totals row: false|true|VSide - needs includeRoot
├── pivotSortBy: PivotSort[]           # Display order per pivot level
├── valueColumnSpecs                   # ColumnSpec per measure, applied across every path
└── rebuildColumns()                   # Runs when result.paths changes identity

PivotGrid                              # Renders gridModel; layout props and agOptions
```

## PivotGridModel

### Basic Usage

Create a Cube and a View with `pivot` on its query, then bind a `PivotGridModel` to the View. The
app owns both the Cube and the View; the model owns everything downstream.

```typescript
import {pivotGrid, PivotGridModel} from '@xh/hoist/cmp/pivotgrid';
import {Cube, View} from '@xh/hoist/data';

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

    @managed view: View;
    @managed pivotGridModel: PivotGridModel;

    override async doLoadAsync(loadSpec) {
        await this.cube.loadDataAsync(await this.fetchPositionsAsync(loadSpec));
        if (this.pivotGridModel) return;

        this.view = this.cube.createView({
            query: {
                dimensions: ['fund', 'trader'],
                includeRoot: true,
                pivot: {dimensions: ['region'], valueFields: ['mktVal', 'pnl']}
            },
            connect: true
        });

        this.pivotGridModel = new PivotGridModel({
            view: this.view,
            rowSummary: 'right',
            valueSummary: 'top',
            valueColumnSpecs: {
                mktVal: {width: 120, renderer: millionsRenderer({precision: 2, label: true})},
                pnl: {width: 110, renderer: numberRenderer({precision: 0, colorSpec: true})}
            },
            gridConfig: {sizingMode: 'compact', autosizeOptions: {mode: 'managed'}}
        });
    }
}

// In the component:
pivotGrid({model: model.pivotGridModel})
```

Construct the model after the first load. A View discovers its pivot paths from data, so the grid
needs data before it can lay out its columns, and the model binds to one View for its lifetime.

### Reconfiguring

Change what is pivoted through the query, and the grid follows:

```typescript
// Pivot on two dimensions instead of one - nested column groups.
view.updateQuery({pivot: {...view.query.pivot, dimensions: ['region', 'sector']}});

// Swap the measures.
view.updateQuery({pivot: {...view.query.pivot, valueFields: ['pnl']}});

// Switch pivoting off without rebuilding the grid - a plain tree of group rows with the measures.
view.updateQuery({pivot: {...view.query.pivot, dimensions: []}});
```

`updateQuery` replaces the whole `pivot` block, so spread the current one to change a single
member. Presentation settings change on the model itself - `rowSummary`, `pivotSummary`,
`valueSummary`, `pivotSortBy` and `valueColumnSpecs` are all bindable.

### Columns and Cell Fields

Each cell the View publishes becomes one column, bound to its synthetic field name:

| Column | Field on the row | Header |
|--------|------------------|--------|
| Row total for `pnl` | `pnl` | `Total` |
| Cell for region `US`, measure `pnl` | `US>>pnl` | `US` › `Pnl` |
| Subtotal for `US` with a second pivot dimension | `US>>pnl` | `US` › `Total` |
| Cell for `US` › `Tech` | `US>>Tech>>pnl` | `US` › `Tech` › `Pnl` |

The field name is also the column's `colId`, so column state persists across rebuilds for paths
that remain in the data, and a path that leaves and returns comes back at its default width. With
one measure, a leaf path renders as a single column headed by the path label rather than a group
of one.

`valueColumnSpecs` applies to every column generated for a measure. Keys that identify or place a
column - `colId`, `field`, `pinned`, `hidden`, `editable` and the rest of
`RESERVED_VALUE_COLUMN_KEYS` - are stripped, so a spec shared with an ordinary grid still applies
cleanly. Drop a measure from the query to remove its columns; value columns are never hidden.

### Sorting the Pivot Axis

`pivotSortBy` takes one entry per pivot level: `'asc'`, `'desc'`, an explicit array of dimension
values with anything unlisted following in view order, or `null` to keep the View's own ascending
order. It is display-only; the View's `result.paths` is never reordered.

```typescript
pivotGridModel.pivotSortBy = [['US', 'EU'], 'asc'];  // Regions in a fixed order, sectors A-Z
```

## Filtering and Export

A grid column filter on a cell field filters **group rows by their aggregate**, after pivoting,
with no re-aggregation - the same caveat AG Grid documents for its own pivot mode. To filter the
source records and re-aggregate everything, filter the query with `view.setFilter()` or
`updateQuery({filter})`. The two are different operations and both are useful.

Export is leaf-columns-only, so every value column exports under its own short header. Set a
qualified `exportName` per measure in `valueColumnSpecs` if a pivot with several paths needs
distinct column names in the exported sheet.

## Related Packages

- [`/data/cube/`](../../data/cube/README.md) - Cube, Query and View, including the `pivot` option
- [`/cmp/grid/`](../grid/README.md) - GridModel and Column, which this package builds on
- `/cmp/zoneGrid/` - another specialized presentation of a GridModel
