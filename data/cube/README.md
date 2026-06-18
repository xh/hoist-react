# Cube Package

| Section | Description |
|---------|-------------|
| [Overview](#overview) | Architecture, dimensions vs. measures, CubeField configuration |
| [Creating a Cube](#creating-a-cube) | Field definitions, data loading |
| [Built-in Aggregators](#built-in-aggregators) | SUM, AVG, MIN, MAX, and counting aggregators |
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
// ViewRowData.cubeLeaves rather than rendered as tree children.
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

Provide one or more stores via `ViewConfig.stores`. The View auto-loads hierarchical data
into them whenever the query results change:

```typescript
const store = new Store({fields: [...]});

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

**Update triggers:** View data updates when either:
- The underlying Cube data changes (requires `connect: true`)
- The `view.query` is modified via `view.updateQuery()`

## Related Packages

- [`/data/`](../README.md) - Store, Field, Filter, Validation - the core data layer
- [`/cmp/grid/`](../../cmp/grid/README.md) - GridModel consumes Store for data display
- `/cmp/grouping/` - GroupingChooser for specifying multi-level dimension groupings
