# Cube Package

| Section | Description |
|---------|-------------|
| [Overview](#overview) | Architecture, dimensions vs. measures, CubeField configuration |
| [Creating a Cube](#creating-a-cube) | Field definitions, data loading |
| [Built-in Aggregators](#built-in-aggregators) | SUM, AVG, MIN, MAX, and counting aggregators |
| [Custom Aggregators](#custom-aggregators) | Extending `Aggregator`, weighted averages via aggregator state |
| [Querying with Views](#querying-with-views) | Grouped queries, grand totals, leaf drill-down, dynamic updates |
| [Accessing View Data](#accessing-view-data) | Connected stores vs. direct result access |

## Overview

The `/data/cube/` package provides a client-side OLAP-style aggregation engine. A `Cube` wraps
a flat collection of leaf-level records and supports creating `View`s via structured `Query`
objects that filter, group, and aggregate the source data into hierarchical results.

| Class | Purpose |
|-------|---------|
| **Cube** | Aggregation engine holding source data and creating Views |
| **CubeField** | Field metadata extending `Field` with dimension/aggregator config |
| **Query** | Immutable specification of dimensions, filters, and output options |
| **View** | Observable query result, optionally auto-updating connected Stores |

Fields are defined as `CubeField`s — each marked as either a **dimension** (groupable category)
or a **measure** with an `Aggregator` (e.g. SUM, AVG). Views produce hierarchical results ready
for use in tree grids, treemaps, and other visualizations.

For the core data layer (Store, Field, Filter, Validation), see the
[data package README](../README.md).

## Creating a Cube

```typescript
import {Cube} from '@xh/hoist/data';

const cube = new Cube({
    fields: [
        // Dimensions - can be grouped on
        {name: 'region', isDimension: true},
        {name: 'product', isDimension: true},
        {name: 'year', isDimension: true},

        // Measures - aggregated values
        {name: 'revenue', aggregator: 'SUM'},
        {name: 'quantity', aggregator: 'SUM'},
        {name: 'avgPrice', aggregator: 'AVG'}
    ]
});

await cube.loadDataAsync(salesData);
```

A Cube maintains an internal `Store` of the leaf-level records loaded into it. Tune that Store via
`CubeConfig.store` - notably with `digestSpec`, recommended whenever the source can supply a cheap
per-row digest, as it preserves record identity for unchanged rows across loads and updates and so
allows connected Views to reuse their generated rows:

```typescript
const cube = new Cube({
    fields: [...],
    idSpec: 'orderId',
    store: {digestSpec: 'rev'}
});
```

## Built-in Aggregators

| Aggregator | Description |
|------------|-------------|
| `'SUM'` | Total of non-null values |
| `'SUM_STRICT'` | Total only if all non-null |
| `'AVG'` | Average of non-null values |
| `'AVG_STRICT'` | Average only if all non-null |
| `'MIN'` | Minimum value |
| `'MAX'` | Maximum value |
| `'UNIQUE'` | Count of unique values |
| `'LEAF_COUNT'` | Count of leaf records |
| `'CHILD_COUNT'` | Count of immediate children |
| `WeightedAverageAggregator` | Average weighted by a second field, e.g. price by quantity |

`WeightedAverageAggregator` takes the name of its weight field, so is instantiated per field rather
than aliased by token: `{name: 'price', aggregator: new WeightedAverageAggregator('qty')}`. It
reads the weight from each leaf's source record, so the weight field need not be queried, and
updates incrementally on a change to either field.

A field is never aggregated at or below the level at which it is applied as a dimension - rows
there publish the dimension value, and rows above aggregate over those values, one per grouped row.
`MIN`, `MAX` and `UNIQUE` remain meaningful for such a field; `SUM` and `AVG` do not. To average a
field you also group by, add a second measure field over the same value.

## Custom Aggregators

Extend `Aggregator` and implement `aggregate()` to add application-specific aggregations. Values
arrive as the row's direct children - a mix of leaf rows and already-aggregated parent rows, typed
as `ViewRow` - so most aggregations compose naturally from `row.data[fieldName]`.

Aggregations that cannot be derived from their children's published values alone (an average, a
standard deviation) can keep the extra terms they need as **aggregator state**, via
`AggregationContext.setAggState()` / `getAggState()`. This keeps each row's work proportional to
its child count rather than to its entire subtree of leaves. See `AverageAggregator` and
`WeightedAverageAggregator` for compact examples - the latter also reads a second field from each
leaf's `cubeRecord`.

The rows handed to an aggregator are typed as `ViewRow` - the row-level API shared by aggregators
and the `lockFn` / `omitFn` / `bucketSpecFn` hooks. Leaf rows additionally carry their source
`cubeRecord`, typed as `ViewLeafRow` - the type passed to the `forEachLeaf()` callback, and the one
to narrow to when a row's `isLeaf` is true. Note the distinction from `ViewRowData`, which is a
row's *data* as published to a View's result and its connected stores.

Rules to observe:

* **Write state on every `aggregate()` call.** Rows are recomputed in place when reused across
  query results, so a state value left over from a prior result would be read as current.
* **Expect non-leaf children without state.** `getAggState()` returns null for a child that did not
  aggregate the field - because its `canAggregateFn` returned false, or because the field is a
  dimension at that child's level and so is never aggregated there. Such a child publishes a value
  to read instead - null in the first case, the dimension value in the second - so treat it
  exactly like a leaf.
* **Override `replace()` only if you can keep state consistent** with the value you return. The
  inherited implementation re-aggregates from direct children, which is correct and already cheap;
  see `AverageAggregator` for an override that adjusts state from a single leaf's change instead.
  The `RowUpdate` it receives carries the leaf's full source data before and after the change.
* **Override `dependsOn` to name any other leaf fields the aggregate reads**, as
  `WeightedAverageAggregator` names its weight field. A View applies a record update incrementally,
  re-aggregating a field up the ancestor chain only when that field's own leaf value changed - so
  without the declaration, a change to the weight alone would leave the average stale until the
  next full rebuild. Note that a `replace()` triggered this way may see the field's own leaf value
  unchanged.
* **Override `dependsOnChildrenOnly` to return false if the aggregate depends on values beyond its
  own children** (e.g. percent-of-total). This routes every update through a full rebuild, on which
  reused rows recompute the aggregate afresh, and gives the aggregator access to
  `AggregationContext.filteredRecords`.

## Querying with Views

Views are the primary interface for consuming Cube data. Create them via `Cube.createView()`
with a `QueryConfig` specifying dimensions, filters, and output options.

**Basic grouped query:**

```typescript
const view = cube.createView({
    query: {
        dimensions: ['region', 'product'],
        filter: {field: 'year', op: '=', value: 2024}
    },
    stores: store,
    connect: true  // Auto-update when cube data changes
});
```

This produces a hierarchy of aggregated rows: Region → Product, with measures (revenue,
quantity) summed at each level. Only aggregate rows are returned — leaf-level source records
are excluded by default.

**Grand totals with `includeRoot`:**

```typescript
// Include a synthetic root node with grand totals across all data.
// Pairs with GridConfig.showSummary and StoreConfig.loadRootAsSummary
// to display a docked total row in grids.
const view = cube.createView({
    query: {
        dimensions: ['region', 'product'],
        includeRoot: true
    },
    stores: new Store({loadRootAsSummary: true}),
    connect: true
});

// The connected GridModel can then show the root as a summary row:
const gridModel = new GridModel({store, showSummary: true, ...});
```

**Leaf-level drill-down with `includeLeaves`:**

```typescript
// Include the original source records as children of the lowest
// aggregation level — users can expand groups to see underlying facts.
const view = cube.createView({
    query: {
        dimensions: ['region'],
        includeLeaves: true
    },
    stores: store,
    connect: true
});
// In a tree grid, expanding "North America" shows its aggregated children,
// and expanding those shows the individual source records.
```

**Programmatic leaf access with `provideLeaves`:**

```typescript
// Like includeLeaves, but leaves are accessible programmatically via
// the getCubeLeaves() helper rather than rendered as tree children.
// Useful for showing detail in a separate panel on selection.
const view = cube.createView({
    query: {
        dimensions: ['region', 'product'],
        provideLeaves: true
    },
    stores: store,
    connect: true
});
```

**Flat aggregation (no dimensions):**

```typescript
// No dimensions — just filter and aggregate. Must specify includeRoot
// or includeLeaves, otherwise no data will be returned.
const view = cube.createView({
    query: {
        includeRoot: true,   // Single row with grand totals
        filter: {field: 'region', op: '=', value: 'EMEA'}
    },
    stores: store,
    connect: true
});
```

**Updating queries dynamically:**

```typescript
// Change dimensions, filters, or options on an existing View.
// Connected stores are automatically refreshed.
view.updateQuery({
    dimensions: ['product', 'region'],  // Swap grouping order
    filter: {field: 'year', op: '=', value: 2025}
});

// Shorthand for filter-only updates:
view.setFilter({field: 'year', op: '=', value: 2025});
```

Query updates are highly incremental - the View caches its generated rows and republishes
unchanged rows (and their record-reuse digests) across regrouping, refiltering, and field
changes, so connected stores and grids only process rows that actually changed.

**One-shot queries with `executeQuery`:**

For cases where you need aggregated data once without retaining a View — e.g. computing a
summary for a tooltip or populating a one-time report — use `Cube.executeQuery()` directly.
This creates a transient View internally, extracts the results, and destroys it immediately:

```typescript
// Returns ViewRowData[] directly — no View to manage or destroy.
const rows = cube.executeQuery({
    dimensions: ['region'],
    includeRoot: true,
    filter: {field: 'year', op: '=', value: 2024}
});

// Use the rows directly — e.g. extract the root for a grand total
const grandTotal = rows.find(r => r.isRoot);
```

Use `createView()` when you need connected auto-updates or store integration;
use `executeQuery()` for lightweight, fire-and-forget queries.

## Pivoting with `pivot`

A query can slice its aggregates across a second axis of dimensions, so a measure appears once per
value of a *pivot* dimension - the classic region-by-sector table. Set `QueryConfig.pivot`:

```typescript
const view = cube.createView({
    query: {
        dimensions: ['fund', 'trader'],              // Row hierarchy, as usual
        includeRoot: true,
        pivot: {
            dimensions: ['region'],                  // Columns - 1 is typical, 3 the ceiling
            valueFields: ['mktVal', 'pnl']           // Measures aggregated per cell
        }
    },
    connect: true
});
```

`dimensions` keeps its meaning as the row hierarchy; the two axes are orthogonal. See `PivotSpec`
for the remaining options - a label for blank pivot values, excluding such records entirely, and a
cap on the number of paths.

**What the result carries.** Every group row still holds its normal aggregates. In addition, each
cell is written onto the row as a synthetic field named `{path}>>{valueField}`:

```typescript
view.result.rows[0].children[0];
// {cubeLabel: 'Fund A', mktVal: 42, pnl: 7,          <- ordinary row totals
//  'US>>mktVal': 30, 'US>>pnl': 5,                     <- cells for the US path
//  'EU>>mktVal': 12, 'EU>>pnl': 2}                     <- cells for the EU path

view.result.paths;       // PivotPath tree - US, EU, each with `children` for deeper dimensions
view.result.cellFields;  // One {name, path, valueField} per cell field, including the row totals
```

A row's total always equals the sum of its top-level cells. Cells are sparse: a (row, path) pair
with no records beneath it has no field at all, and a blank pivot value forms its own `(empty)`
path unless `excludeEmptyPivotValues` drops those records - from the row totals too. `paths` and
`cellFields` keep their identity while the pivot structure is unchanged, so a consumer can track
them to decide when to rebuild columns, which is what `PivotGridModel` does.

**Loading a store.** Cell fields are discovered from the data, so a connected Store has to learn
them. `View.createStore()` mints a Store with every current cell field declared and keeps the
declarations current as paths come and go:

```typescript
const store = view.createStore({connect: true});   // Caller owns it - disconnectStore() when done
```

**Updates.** A pivoted View ticks like any other: a value change adjusts the affected cells and
totals in place, while a record moving between pivot paths rebuilds, the same as a change to a row
dimension. `updateQuery` with a different `pivot.dimensions` or `valueFields` reshapes the columns;
an empty `pivot.dimensions` degenerates to an ordinary View so an app can toggle pivoting without
swapping objects.

**How it works, briefly.** Each group row carries a hidden subtree of cell rows, one per populated
pivot path. They are real rows in the aggregation network, so every aggregator - built-in or
custom - works on them unchanged, and a leaf propagates each tick up both its group parent and its
cell. Cost scales with populated cells, not rows times paths. The planner behind this is
`PivotStructure` in `data/cube/pivot/impl`, with its correctness properties pinned by its spec.

**Limits.** Pivoting is not supported together with `bucketSpecFn` and `includeLeaves`, and a
dimension cannot appear on both axes. `maxPivotPaths` (default 1000) throws when a pivot dimension
is wider than intended; pick a lower-cardinality dimension or raise the cap deliberately.

To render a pivoted View, see [`/cmp/pivotgrid/`](../../cmp/pivotgrid/README.md).

## Accessing View Data

There are two ways to consume View results:

**Option 1: Connected stores (recommended for grids)**

Provide one or more stores via `ViewConfig.stores`. The View auto-loads hierarchical data
into them whenever the query results change. Configure connected stores with
`projectionOnly: true` (adopt View rows as record data without re-parsing). Record reuse is
automatic - the View installs its own row-based digest on each connected store, so rows
republished without change skip record rebuilds:

```typescript
const store = new Store({
    fields: [...],
    projectionOnly: true
});

const view = cube.createView({
    query: {dimensions: ['region', 'product']},
    stores: store,
    connect: true
});

// Use the store with a GridModel
const gridModel = new GridModel({store, treeMode: true, columns: [...]});
```

**Option 2: Read `view.result` directly**

The observable `ViewResult` contains hierarchical `ViewRowData` objects:

```typescript
addReaction({
    track: () => view.result,
    run: (result) => {
        const {rows, leafMap} = result;
        // rows: ViewRowData[] - hierarchical aggregated data
        // leafMap: Map<id, LeafRow> - direct access to leaf-level rows
    }
});
```

Note that `leafMap` is populated only when the query sets `includeLeaves` or `provideLeaves`. Views
that expose no leaves hold them as zero-copy references to the source `Cube` record data - a
significant memory and build-time win on large datasets, but not safe to publish. Read source
records from `cube.store` directly if you need them.

**Update triggers:** View data updates when either:
- The underlying Cube data changes (requires `connect: true`)
- The `view.query` is modified via `view.updateQuery()`

## Related Packages

- [`/data/`](../README.md) - Store, Field, Filter, Validation - the core data layer
- [`/cmp/grid/`](../../cmp/grid/README.md) - GridModel consumes Store for data display
- [`/cmp/pivotgrid/`](../../cmp/pivotgrid/README.md) - PivotGrid renders a pivoted View
- `/cmp/grouping/` - GroupingChooser for specifying multi-level dimension groupings
