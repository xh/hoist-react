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

A field is never aggregated at or below the level at which it is applied as a dimension - rows
there publish the dimension value, and rows above aggregate over those values, one per grouped row.
`MIN`, `MAX` and `UNIQUE` remain meaningful for such a field; `SUM` and `AVG` do not. To average a
field you also group by, add a second measure field over the same value.

## Custom Aggregators

Extend `Aggregator` and implement `aggregate()` to add application-specific aggregations. Values
arrive as the row's direct children - a mix of leaf rows and already-aggregated parent rows, typed
as `ViewRow` - so most aggregations compose naturally from `row.data[fieldName]`.

Aggregations that cannot be derived from their children's published values alone (a weighted
average, a standard deviation) can keep the extra terms they need as **aggregator state**, via
`AggregationContext.setAggState()` / `getAggState()`. This keeps each row's work proportional to
its child count rather than to its entire subtree of leaves:

```typescript
export class WeightedAverageAggregator extends Aggregator {
    readonly weightField: string;

    constructor(weightField: string) {
        super();
        this.weightField = weightField;
    }

    // Reads a second field, so a change to the weight alone must recompute this aggregate - see
    // below. This forgoes incremental updates, but not the compositional win of the state below.
    override get dependsOnChildrenOnly() {
        return false;
    }

    override aggregate(rows, fieldName, context) {
        let weighted = 0,
            weight = 0;

        for (const row of rows) {
            // Parents publish an average - compose from their state instead. A parent without
            // state did not aggregate this field, so read its published values as for a leaf.
            const state = row.isLeaf ? null : context.getAggState(row);
            if (state) {
                weighted += state.weighted;
                weight += state.weight;
            } else {
                const val = row.data[fieldName],
                    w = row.data[this.weightField];
                if (val != null && w != null) {
                    weighted += val * w;
                    weight += w;
                }
            }
        }

        context.setAggState({weighted, weight});
        return weight ? weighted / weight : null;
    }
}
```

Then reference it from a field: `{name: 'price', aggregator: new WeightedAverageAggregator('qty')}`.

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
  to read instead - null in the first case, the dimension value in the second - so treat it as the
  example does, exactly like a leaf.
* **Override `replace()` only if you can keep state consistent** with the value you return. The
  inherited implementation re-aggregates from direct children, which is correct and already cheap;
  see `AverageAggregator` for an override that adjusts state from a single leaf's change instead.
* **Override `dependsOnChildrenOnly` to return false if the aggregate reads any field other than
  its own**, as the weighted average above reads `qty`. A View whose aggregators all depend on
  their children only applies a record update incrementally, re-aggregating a field up the
  ancestor chain only when that field's own value changed on the leaf - a change to `qty` alone
  would leave the weighted `price` stale until the next full rebuild. Returning false routes every
  update through a full rebuild, on which reused rows recompute the aggregate afresh. Aggregators
  that depend on values beyond their own children (e.g. percent-of-total) must return false for the
  same reason, and doing so also gives them access to `AggregationContext.filteredRecords`. Where
  the aggregate is a ratio of sums, prefer restating it with a [calculated field](#calculated-fields)
  - that keeps the View on the incremental path.

## Calculated Fields

Declare a `CubeField` with a `calculatedFn` to compute its value at read time on every View row,
from the row's other values and the View's `AggregationContext` - the Cube-layer form of
`FieldSpec.calculatedFn` (see `data/README.md`), with a widened signature:

```typescript
{
    name: 'pctCommission',
    calculatedFn: (row, ctx) => {
        // Memoize per-update intermediates in ctx.appData - the context is replaced whenever
        // the record set changes in any way.
        const total = (ctx.appData.totalCommission ??= sumBy(
            ctx.filteredRecords,
            r => r.data.commission
        ));
        return total ? (row.commission / total) * 100 : null;
    }
}
```

Calculated values are read through lazy prototype getters on the `ViewRowData` objects a View
publishes and are never stored or aggregated. Because they carry no aggregator, they never
disqualify a View from its incremental data-only update path - making them the recommended way to
express globally-dependent values like percent-of-total, in place of an eagerly-computed
aggregator reading beyond its own children. `ctx.filteredRecords` stays readable and fresh on
those incremental updates, rebuilt lazily from the View's leaves (at most one O(n) pass per
update, and only if read). As at the Store layer, values are read by name - never own-property
enumeration - and fns should return primitives or stable references so grid change detection can
skip unchanged cells.

Note when the needed global is already published as a row - e.g. a View with `includeRoot`
loading a store with `loadRootAsSummary` - prefer a Store-layer `calculatedFn` reading
`store.summaryRecords`, with no Cube API needed at all.

**Ratios over aggregates - e.g. a weighted average.** An aggregate that reads a second field, such
as a price weighted by quantity, cannot use the incremental update path as a custom aggregator
(see [Custom Aggregators](#custom-aggregators)). Restate it instead as built-in `SUM`s over
leaf-level terms, with a calculated field taking the ratio on every row:

```typescript
// Leaf records supply `qty` and a precomputed `priceQty` (price * qty) - from the server, or via
// the Cube's `processRawData`. Calculated fields never feed aggregators, so the product must be
// a stored leaf value.
fields: [
    {name: 'qty', aggregator: 'SUM'},
    {name: 'priceQty', aggregator: 'SUM'},
    {name: 'price', calculatedFn: row => (row.qty ? row.priceQty / row.qty : null)}
]
```

Both sums update incrementally in O(depth) per changed leaf, whether `price` or `qty` changed, and
the ratio is always current on aggregate and leaf rows alike - no aggregator state, no
`dependsOnChildrenOnly: false`. The same decomposition covers other ratios, conditional sums, and
variance (via sum, sum of squares and `LEAF_COUNT`). Note `Cube.modifyRecordsAsync()` does not
re-run `processRawData`, so a product derived there goes stale on local edits until the next load
or update - supply it from the server if leaf-level editing matters.

Constraints: `calculatedFn` is mutually exclusive with `aggregator`, `canAggregateFn` and
`isDimension`; calculated fields may not feed other aggregators or appear in a `BucketSpec`'s
`dependentFields`.

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
    connect: true
});

// The connected GridModel can then show the root as a summary row:
const gridModel = new GridModel({store: {view, loadRootAsSummary: true}, showSummary: true, ...});
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

## Accessing View Data

There are two ways to consume View results:

**Option 1: Connected stores (recommended for grids)**

Construct stores against the View via `StoreConfig.view` - each registers with the View at
construction and is auto-loaded whenever the query results change. Connected stores are always `projectionOnly`
projections - the View sets this itself - adopting View rows as record data without re-parsing.
Record reuse is
automatic - the View installs its own row-based digest on each connected store, so rows
republished without change skip record rebuilds.

Field metadata flows from the View as well: at construction (and on query changes), the store's
`fields` are reconciled to the query's own `CubeField`s - types, `displayName`s, and calculated
status carry through to everything reading field metadata off the store (filter fields, choosers,
editability). There is no need to redeclare view-published fields on the store - declare only
extras, such as store-layer calculated fields composed over view rows. An app field sharing a
view field's name is superseded by the view's; customize display metadata for view-published
fields on the `CubeField` itself.

```typescript
const view = cube.createView({
    query: {dimensions: ['region', 'product']},
    connect: true
});

const store = new Store({
    view,
    fields: [
        // View-published fields adopted automatically - declare only store-layer extras, e.g.:
        {name: 'pctOfTotal', calculatedFn: (data, store) => ...}
    ]
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
- `/cmp/grouping/` - GroupingChooser for specifying multi-level dimension groupings
