# Current-State Data Architecture (INV-01)

**Requirement:** INV-01
**Date:** 2026-06-28
**Source revision:** `develop` (commit `3e8d6ea`, dated 2026-06-27).
**Status:** Authoritative. This is the single current-state architecture document for the `hoist-react`
data layer. A reader needs only this document - plus the three linked companion deep-dives - to
understand how data flows from the server to a rendered grid cell today, where memory accumulates,
where MobX observes, and which boundaries the Phase 2 harness will instrument.

## What this document supersedes

This document **absorbs and supersedes** the earlier validation notes, which now stand as historical
backing only:

- [`KICKOFF-VALIDATION.md`](./KICKOFF-VALIDATION.md) - the terminology + architecture grounding pass
  that corrected the kickoff brief against source.
- [`validation/A-store-cube-view.md`](./validation/A-store-cube-view.md) - Store / Cube / View / Field /
  Aggregator API validation.
- [`validation/B-grid-mobx.md`](./validation/B-grid-mobx.md) - GridModel / AG Grid integration and MobX
  reactivity validation.
- [`validation/C-real-usage.md`](./validation/C-real-usage.md) - real production usage patterns.

The corrected facts those notes established are folded in below. The notes remain in the repository as
the source-cited record behind each correction, but no later phase needs to read them - this document
is the reference.

It also **integrates by reference and summary** the three Wave 1 deep-dives, rather than leaving them as
orphans:

- [`COPY-VS-REUSE.md`](./COPY-VS-REUSE.md) (INV-02) - object identity across the pipeline.
- [`MOBX-GRANULARITY.md`](./MOBX-GRANULARITY.md) (INV-03) - the reaction-granularity trace.
- [`TRANSPORT-INVENTORY.md`](./TRANSPORT-INVENTORY.md) (INV-04) - the transport / pattern inventory.

## Terminology

The canonical names, used consistently throughout (per the validated glossary):

`Store`, `StoreRecord`, `Field`, `StoreConfig`, `StoreTransaction`, `StoreChangeLog`, `processRawData` ·
`Cube`, `CubeConfig`, `CubeField`, `Aggregator` (abstract base; `AggregatorToken` for the built-in
shorthands) · `View`, `ViewConfig`, `Query`, `ViewResult`, `ViewRowData` · `GridModel`, `AgGridModel`,
`gridModel.agApi`, `ColChooserModel`, `GridFilterModel`, `StoreFilterField`. Groupings are
**dimensions**; selected outputs are **aggregated fields** (informally "measures"). Apps that are not
public are referred to generically; the only named applications are Hoist, Toolbox, and JobSite.

---

## Core artifacts

Hoist's data layer is built from four cooperating classes. Each is summarized below by responsibility,
key API, what it observes/exposes, and the validated corrections that change the naive mental model.

### Store

**Responsibility.** A `Store` is a container for `StoreRecord`s whose shape is defined by typed `Field`s
(`data/Store.ts:244`). It is the framework's AG-Grid-independent data substrate: it holds records, parses
raw inbound data, tracks local edits/dirty state, and applies a filter. It does **not** sort - sorting is
the grid's job (`validation/A-store-cube-view.md` §2.1; no sort API exists anywhere in `Store.ts`).

**Key API.**
- Ingest: `loadData(rawData)` (full replacement, `data/Store.ts:387-407`) and
  `updateData(rawData | StoreTransaction)` (incremental add/update/remove, `data/Store.ts:433`).
- Editing: `addRecords()`, `modifyRecords()`, `removeRecords()`, `revertRecords()`, with
  `isDirty` / `dirtyRecords` tracking (`data/Store.ts:560-714`).
- Filtering: `setFilter()` / `clearFilter()` / `refreshFilter()` with composable `Filter` types
  (`data/Store.ts:853-873`).
- Single inbound transform hook: `processRawData(raw)` - one arbitrary function, not a structured
  pipeline (`data/Store.ts:1146-1154`).

**What it observes / exposes.** The Store's observable data surface is the **filtered `RecordSet`**,
`_filtered`, an `@observable.ref` that is swapped wholesale (`data/Store.ts:307-308`). It is rebuilt by
`rebuildFiltered()` (`this._filtered = this._current.withFilter(this.filter)`, `data/Store.ts:1123-1126`).
Crucially, `rebuildFiltered()` is **not** driven by a MobX reaction on the filter - it is called
imperatively from every mutation and filter path (`loadData`, `updateData`, `setFilter`, etc.); there is
no `addReaction` on `this.filter` in the constructor (INV-03 §3, resolving validation open question #2).

**Validated corrections.** There is no `commitRecords()` method - commit semantics are achieved through
`updateData()`, and the Store's own term is `committedData` (`validation/A-store-cube-view.md` §2.1). Each
record retains a reference to the original `raw` object **and** owns a separately-parsed `data` object
(see Copy-vs-reuse below). A general Store defaults to `freezeData: true`; the Cube's internal store
deliberately sets it `false` (`data/cube/Cube.ts:150-151`).

### Cube

**Responsibility.** A `Cube` is the aggregation engine. It is a **distinct class** from `Store`
(`data/cube/Cube.ts:120`) that **wraps a `Store` internally** to hold flat, leaf-level records
(`@managed store: Store`, constructed in the Cube constructor, `data/cube/Cube.ts:123,146-153`). It runs
queries - filter + grouping (dimensions) + selected aggregated fields - and recomputes aggregates
incrementally as data changes.

**Key API.**
- Ingest: `loadDataAsync(rawData, info?)` (full snapshot) and `updateDataAsync(rawData | StoreTransaction,
  infoUpdates?)` (incremental diff) - thin wrappers over the internal `Store` primitives
  (`data/cube/Cube.ts:282-286, 299-314`).
- Querying: `executeQuery(query)` for a one-shot result and `createView({query, stores, connect})` for a
  durable, optionally-connected View (`data/cube/Cube.ts:207-245`).
- Local edits: `modifyRecordsAsync()` for inline-edit scenarios against cube-backed data
  (`data/cube/Cube.ts:328-334`).
- Metadata: an observable `info` blob carried alongside each load.

**What it observes / exposes.** The Cube does **not** observe its internal store via MobX. Its connected
views live in a plain `Set<View>` (`Cube._connectedViews`, `data/cube/Cube.ts:131`). On every ingest it
**imperatively fans out** to each connected view - `loadDataAsync` calls `view.noteCubeLoaded()` and
`updateDataAsync` calls `view.noteCubeUpdated(changeLog)`, both via `forEachAsync` to avoid locking the
browser when many expensive views are attached (`data/cube/Cube.ts:285, 312`; INV-03 §1).

**Validated corrections.**
- **No built-in weighted-average aggregator.** The built-in `AggregatorToken`s are `SUM, AVG, MIN, MAX,
  UNIQUE, LEAF_COUNT, CHILD_COUNT, NULL, SINGLE, SUM_STRICT, AVG_STRICT`. Weighted-average-by-another-field
  requires a custom subclass of the abstract `Aggregator` class - it is an extension point, not a runtime
  config option (`validation/A-store-cube-view.md` §3.1). This matters for any later feature analysis:
  runtime user-chosen weighted aggregation is genuinely new work.
- **The Cube wraps a Store** rather than being one (`data/cube/Cube.ts:123`).
- **The Cube is slightly editable**: `modifyRecordsAsync()` supports in-place field edits, so
  "read/aggregate-only" is an oversimplification (`validation/A-store-cube-view.md` §3.2).

### View

**Responsibility.** A `View` is the durable bridge between a `Query` and one or more connected `Store`s. It
holds the query, recomputes a result when its parent Cube notifies it, and pushes that result into its
connected stores.

**Key API.**
- Construction: via `Cube.createView({query, stores?, connect?})`. When `connect: true`, the View is added
  to the Cube's `_connectedViews` set and recomputes on every cube change (`data/cube/Cube.ts:231-244`).
- Store wiring: `setStores([...])` to (re)point the View at its downstream stores.
- Notification entry points: `noteCubeLoaded()` (full) and `noteCubeUpdated(changeLog)` (incremental),
  both `@action`s that funnel to `fullUpdate()` or the `dataOnlyUpdate()` fast path
  (`data/cube/View.ts:263-282`).

**What it observes / exposes.** `View.result` is the **first MobX observable in the entire path** - an
`@observable.ref` of type `ViewResult {rows: ViewRowData[], leafMap: Map<...>}` (`data/cube/View.ts:62-65,
109-110`). It is reassigned to a brand-new object on every update inside `updateResults()`
(`data/cube/View.ts:335-341`). This is the integration seam any reactivity bridge must target (INV-03 §2,
resolving the kickoff brief's imagined cube-level observable).

**Validated corrections.**
- **A View feeds one OR MORE stores.** `ViewConfig.stores?: Store[] | Store` - one query result can fan
  out to multiple downstream grids/stores simultaneously (`validation/A-store-cube-view.md` §3.4).
- **The View loads its stores imperatively, not by observing its own result.** Connected stores are loaded
  inside the same update via `loadStores()` -> `store.loadData(rows)` (full path) or
  `store.updateData({update})` (data-only path), running in parallel with the `@observable.ref result` swap
  (`data/cube/View.ts:316-333`; INV-03 §2). A grid backed by a cube reaches AG Grid through the store-load
  path, not by observing `view.result`.
- **A connected store may not use `reuseRecords: true`** - the View mutates the `ViewRowData` objects it
  feeds downstream in place during `dataOnlyUpdate()`, so reference-identity-based reuse would silently
  skip real data changes (`data/cube/View.ts:554-558`; COPY-VS-REUSE §3).
- A View also implements the filter-bind-target interfaces, so it can serve as the source for grid header
  filter dropdowns, not just a Store (`validation/A-store-cube-view.md` §4.6).

### GridModel

**Responsibility.** `GridModel` is the model behind a Hoist grid. It owns the grid's `Store`, column
definitions, sort/group/selection state, and exposes the AG Grid API handle. It proxies the live AG Grid
API as `gridModel.agApi` (which proxies `agGridModel.agApi`).

**Key API.**
- Store binding: pass a `Store` instance, or a `StoreConfig` and the GridModel creates and `markManaged`s
  its own (`validation/A-store-cube-view.md` §confirmed). `GridModel.loadData()` / `updateData()` proxy to
  the grid's own Store.
- Column state: managed via `columnState`; the `ColChooserModel` operates on **column state**, not the
  store (`validation/B-grid-mobx.md`).
- Filtering: `GridFilterModel` / `StoreFilterField` operate at the **store** level, and
  `GridFilterModel.bind` can target a Store **or** a Cube View - the explicit shared-dataset mechanism.

**What it observes / exposes.** Critically, the AG-Grid-driving reactions do **not** live on `GridModel`.
They live in `GridLocalModel`, the component-internal model defined inside `Grid.ts` and created via
`useLocalModel(GridLocalModel)` in the `Grid` render function (`cmp/grid/Grid.ts:109`). All of them are
registered in `GridLocalModel.onLinked()` (`cmp/grid/Grid.ts:186-203`), so they are **mounted-only**: they
exist while the grid component is mounted and are disposed on unmount. `GridModel` itself holds essentially
one always-on reaction (an editing-mode debounce) (INV-03 §4, §6).

**Validated corrections.**
- **Updates are synchronous.** The data path drives `agApi.applyTransaction(transaction)` synchronously
  (`cmp/grid/Grid.ts:693`); there is **no** `applyTransactionAsync` and **no explicit batching layer** -
  the only coalescing is implicit MobX action batching (INV-03 §5).
- **The chooser is column-state; the filter is store-level** (`validation/B-grid-mobx.md`).
- Stable row identity is `getRowId: ({data}) => data.agId` (`cmp/grid/Grid.ts:213`), where `agId` is a
  stable per-`StoreRecord` id.

---

## The shared-store contract

The single most important architectural property of this layer - and the seam later phases must protect -
is that **the `Store` is an AG-Grid-independent substrate**. A `Store` (or a Cube `View` feeding one) holds
records that any number of consumers read independently of the grid: charts read the same records,
toolbars and summary tiles read them, `StoreFilterField` filters them, and a `GridFilterModel` can bind its
header filters to the Store or directly to a Cube View. Confirmed in practice at 10+ widget types per cube
in real applications, and multiple cubes per app (`validation/A-store-cube-view.md` §refinements,
`validation/C-real-usage.md`).

This is central to Hoist's value: the data layer is a reactive, framework-owned model that many UI surfaces
share, rather than data bound to a single grid widget. It is also the source of a real tension this project
must weigh - "just use AG Grid's own features" (server-side row model, AG Grid's own aggregation, AG Grid
filters) would collapse the substrate into the grid and forfeit the shared-store contract. Any Data 2.0
candidate must preserve a framework-owned, grid-independent data surface that non-grid consumers read, or it
breaks the contract that makes Hoist's data layer valuable.

---

## Two production wiring patterns

There are two real patterns for connecting a Cube to a grid (`validation/C-real-usage.md` §5.1;
`KICKOFF-VALIDATION.md` refinements). Both are in production use; the choice is about how much the app wants
the framework to manage.

### (a) Declarative connected View - `createView({connect: true})` + `setStores`

The app creates a connected View whose result is pushed automatically into one or more grid stores. The
framework owns the recompute-and-load lifecycle: every `cube.updateDataAsync()` fans out to the View, which
recomputes and loads its connected stores with no app code in the loop.

```typescript
// declarative: the framework keeps the grid's store in sync with the cube
const view = cube.createView({
    query: {dimensions: ['region', 'desk'], fields: ['pnl', 'qty'], includeRoot: true},
    stores: [gridModel.store],
    connect: true            // View joins cube._connectedViews; recomputes on every cube change
});
// later, to re-point the same View at different stores:
view.setStores([otherGridModel.store]);
```

**Preferred when** the app wants the standard, framework-managed flow: a stable query whose results should
always track the cube, feeding one or more grids/charts. This is the default recommendation.

### (b) Manual MobX reaction - `cube.records` -> `executeQuery()` -> `gridModel.loadData()`

The app drives the recompute itself: a MobX reaction observes the cube's records (or another trigger), runs
a one-shot `cube.executeQuery()`, and feeds the result into a grid store via `gridModel.loadData()`. The
View is not connected; the app owns the loop.

```typescript
// manual: the app decides when to re-query and reload
this.addReaction({
    track: () => cube.records,
    run: () => {
        const result = cube.executeQuery({
            dimensions: ['region'],
            fields: ['pnl'],
            includeRoot: true
        });
        gridModel.loadData(result.rows);
    }
});
```

**Preferred when** the app needs custom control over *when* and *what* it re-queries - e.g. debouncing,
deriving the query from other observable state, post-processing rows before load, or driving multiple grids
from one cube with per-grid query variation. It trades framework convenience for explicit control.

Both patterns land at the same downstream contract: a store load (`loadData` / `updateData`) that a mounted
grid translates into a synchronous AG Grid transaction. The wiring choice changes who triggers the recompute,
not where data lands.

---
