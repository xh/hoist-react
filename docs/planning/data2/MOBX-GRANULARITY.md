# MobX Reaction-Granularity Trace (INV-03)

**Date:** 2026-06-27
**Source revision:** `develop` branch.
**Scope:** A precise, source-cited account of how a data update propagates along
`View.result -> Store -> GridModel -> AG Grid`, classifying each hop as record-level vs.
batch/reference-level, pinpointing where the synchronous `applyTransaction` is driven, and
documenting the mounted-component reaction lifecycle.

**Primary sources read:** `data/cube/Cube.ts`, `data/cube/View.ts`, `data/Store.ts`,
`cmp/grid/Grid.ts`, `cmp/grid/GridModel.ts`, `cmp/ag-grid/AgGridModel.ts`, `cmp/ag-grid/AgGrid.ts`.

This resolves the second of the two explicit empirical unknowns carried into Phase 1: the exact
MobX reaction granularity of the full update path (the first being the copy-vs-reuse heap map). It
also closes two open questions left open in the validation notes:
`View.result` observability internals and what actually triggers `Store.rebuildFiltered()`.

---

## 0. The path at a glance

```
Cube data change
  |                          [IMPERATIVE PUSH - no MobX observable at this boundary]
  v
Cube.loadDataAsync / updateDataAsync  -- iterates _connectedViews, calls view.noteCubeLoaded()/noteCubeUpdated()
  |
  v
View.fullUpdate() or View.dataOnlyUpdate()
  |  -- loadStores(): store.loadData(rows)   [WHOLE dataset]   (full path)
  |  -- store.updateData({update})           [PER-record txn]  (data-only path)
  |  -- updateResults(): this.result = {rows, leafMap}   [@observable.ref - WHOLE ViewResult ref]
  v
Store._filtered = _current.withFilter(filter)   [@observable.ref - WHOLE RecordSet ref]
  |                          [MobX SEAM - whole-reference granularity]
  v
GridLocalModel.dataReaction (in Grid.ts, registered in onLinked, mounted-only)
  |  track: [isReady, store._filtered, showSummary, summaryRecords]
  v
syncData() -> genTransaction() three-way diff by record id
  |
  v
agApi.applyTransaction(transaction)            [SYNCHRONOUS, per-record add/update/remove]
  or agApi.updateGridOptions({rowData})         [full replacement, only when prevCount === 0]
```

The headline finding: **observation is at whole-RecordSet / whole-ViewResult reference
granularity, while the AG Grid transaction itself is a per-record diff applied synchronously in
a single call.** The per-record character of the work appears only inside `genTransaction()` /
`applyTransaction()`, not in the reaction-tracking layer.

---

## 1. Hop 1 - Cube to View: imperative push, NOT a MobX observable

There is **no MobX observable at the cube-to-view boundary.** The cube fans out to its connected
views by directly calling methods on each - an imperative push, not reactive observation.

- `Cube._connectedViews` is a plain `Set<View>` (`Cube.ts:131`), not an observable collection.
- `Cube.loadDataAsync()` loads the internal store, then iterates connected views and calls
  `view.noteCubeLoaded()` on each: `await forEachAsync(this._connectedViews, v => v.noteCubeLoaded())`
  (`Cube.ts:282-286`).
- `Cube.updateDataAsync()` processes the change into a `changeLog`, then iterates connected views
  calling `view.noteCubeUpdated(changeLog)`: `await forEachAsync(this._connectedViews, v =>
  v.noteCubeUpdated(changeLog))` (`Cube.ts:299-314`).
- `Cube.modifyRecordsAsync()` and `Cube.updateInfo()` push the same way (`Cube.ts:328-334`,
  `Cube.ts:345-348`).

**Granularity / mechanism:** The fan-out is iterated per connected View, and it is deliberately
**asynchronous** (`forEachAsync`) "in order to avoid locking up the browser when attached to
multiple expensive views" (`Cube.ts:276-277`). The cube does not expose a per-record observable;
the unit of propagation here is "the cube changed, recompute each view."

**Implication for a Data 2.0 engine:** This boundary is a clean imperative API
(`noteCubeLoaded`/`noteCubeUpdated`), not a reactive contract. An alternative engine could replace
the cube's internals without touching MobX, provided it preserves this push protocol into the View.

---

## 2. Hop 2 - View.result: the MobX seam, at whole-result reference granularity

`View.result` is the first MobX observable in the path and is the integration seam for any Data 2.0
engine.

- `View.result` is declared `@observable.ref` of type `ViewResult` (`View.ts:109-110`). This
  resolves validation open question #1: it is a plain `@observable.ref`, not a `computed` and not a
  reaction-derived value. `ViewResult` is `{rows: ViewRowData[], leafMap: Map<...>}` (`View.ts:62-65`).
- It is set, as a brand-new object, in `updateResults()`:
  `this.result = {rows: _rowDatas, leafMap: _leafMap}` (`View.ts:335-341`).
- Both entry points run inside `@action` methods (`noteCubeLoaded`, `noteCubeUpdated` at
  `View.ts:263-282`), and both funnel to `updateResults()` (via `fullUpdate()` at `View.ts:294-301`
  or `dataOnlyUpdate()` at `View.ts:303-324`).

**Granularity / mechanism:** Because `result` is `@observable.ref` and is **reassigned to a new
object** on every update, any observer of `view.result` fires at the **whole-ViewResult reference
level** - a new `{rows, leafMap}` object - never per-row. There is no observable for an individual
`ViewRowData`. The View mutates `LeafRow`/row-data internals in place during `dataOnlyUpdate()`
(`View.ts:303-324`), but the only thing MobX sees is the single `result` ref swap in
`updateResults()`.

**Important nuance - the View feeds Stores by a separate, imperative path.** Connected Stores are
not loaded by observing `view.result`. They are loaded imperatively inside the same update:
- Full path: `loadStores()` calls `s.loadData(storeRows)` for each store - **whole dataset**
  (`View.ts:326-333`, invoked from `fullUpdate()` at `View.ts:299`).
- Data-only path: `dataOnlyUpdate()` calls `store.updateData({update: recordUpdates})` per store -
  a **per-record transaction** of just the changed rows (`View.ts:316-323`).

So the View has two distinct downstream mechanisms operating in parallel: (a) the
`@observable.ref result` MobX seam for direct `view.result` consumers, and (b) imperative
`store.loadData()` / `store.updateData()` calls into connected Stores, which is what drives a grid.
A grid backed by a cube reaches AG Grid through path (b), not by observing `view.result`.

---

## 3. Hop 3 - View to Store: RecordSet reference granularity

The Store's observable data surface is the filtered `RecordSet`, swapped wholesale.

- `Store._filtered` is `@observable.ref` of type `RecordSet` (`Store.ts:307-308`). Related
  observables: `_current` and `_committed` are also `@observable.ref` RecordSets (`Store.ts:303-306`);
  `filter` is `@observable.ref` (`Store.ts:274`); `summaryRecords` is `@observable.ref`
  (`Store.ts:290`).
- `_filtered` is rebuilt by `rebuildFiltered()`, an `@action` that assigns a brand-new RecordSet:
  `this._filtered = this._current.withFilter(this.filter)` (`Store.ts:1123-1126`).

**What triggers `rebuildFiltered()`?** This resolves validation open question #2 - and the answer
is **not** a MobX reaction. `rebuildFiltered()` is called **imperatively** from every mutation and
filter path:
- `loadData()` (whole replacement) -> `rebuildFiltered()` (`Store.ts:403-404`).
- `updateData()` (transactional add/update/remove) -> `rebuildFiltered()` (`Store.ts:538`).
- `setFilter()`, guarded by an equality check, sets `this.filter` then calls `rebuildFiltered()`
  (`Store.ts:853-859`).
- `setFilterIncludesChildren()`, `addRecords()`, `removeRecords()`, `modifyRecords()`,
  `revertRecords()`, `revert()`, and `refreshFilter()` all call `rebuildFiltered()` directly
  (`Store.ts:867`, `598`, `620`, `710`, `741`, `756`, `554-555`).

There is **no `addReaction` on `this.filter` in the Store constructor** (`Store.ts:315-357`); the
constructor only calls `makeObservable(this)` and wires plain config. The earlier hypothesis that a
constructor reaction recomputes the filter is incorrect - the recompute is always an explicit,
synchronous call inside an `@action`.

**Granularity / mechanism:** Store observability is at the **RecordSet reference level** (the whole
filtered dataset). Whenever data loads, a transaction is applied, or the filter changes,
`_filtered` becomes a new `RecordSet` reference, and all observers of `store._filtered` re-run.
Individual `StoreRecord` mutations are not individually observable - the unit is the whole RecordSet.

---

## 4. Hop 4 - Store to GridModel / AG Grid: the reaction set in GridLocalModel

The reactions that drive AG Grid do **not** live on `GridModel`. They live in `GridLocalModel`, the
component's internal model defined inside `Grid.ts`, and are all registered in `onLinked()`
(`Grid.ts:186-203`). `GridLocalModel` is created via `useLocalModel(GridLocalModel)` in the `Grid`
render function (`Grid.ts:109`), so it is constructed when the component mounts and destroyed when
it unmounts (see Section 6).

The full reaction set registered in `onLinked()` (`Grid.ts:188-200`):

| Reaction | Tracks | Effect | Cite |
|---|---|---|---|
| `dataReaction` | `[isReady, store._filtered, showSummary, summaryRecords]` | `syncData()` - applies AG Grid transactions | `Grid.ts:357-366` |
| `selectionReaction` | `[isReady, selectedRecords]` | `syncSelection()` - syncs AG Grid row selection | `Grid.ts:368-376` |
| `sortReaction` | `[agApi, sortBy]` | `agGridModel.applySortBy(sortBy)` (unless `externalSort`) | `Grid.ts:378-388` |
| `groupReaction` | `[agApi, groupBy]` | `agApi.setRowGroupColumns(groupBy)` | `Grid.ts:390-398` |
| `columnsReaction` | `[agApi, columns]` | `api.updateGridOptions({columnDefs})` (preserving state) | `Grid.ts:476-488` |
| `columnStateReaction` | `[agApi, columnState]` | `api.applyColumnState(...)` (width/hide/pin/order diff) | `Grid.ts:490-553` |
| `sizingModeReaction` | `sizingMode` | `autosizeAsync()` when autosize mode is managed | `Grid.ts:555-567` |
| `rowHeightReaction` | `[useScrollOptimization, calculatedRowHeight, calculatedGroupRowHeight]` | `agApi.resetRowHeights()` (debounced 1ms) | `Grid.ts:430-444` |
| `validationDisplayReaction` | `[isReady, store.validator.errors]` | `agApi.refreshCells({force})` for editor/complex cols | `Grid.ts:569-585` |
| `modalReaction` | (modal support) | modal sync | `Grid.ts:591` |
| `dashContainerReaction` | (dash container) | dash container sync | `Grid.ts:603` |

**Granularity / mechanism:** Every reaction's `track` is a small array of `@observable.ref` values
or computeds. The data-bearing one, `dataReaction`, tracks `store._filtered` - i.e. it fires at the
**whole-RecordSet reference level**, once per `_filtered` swap, regardless of how many records
changed. The per-record breakdown happens only inside the reaction's `run`, in `genTransaction()`.

Note that `sortReaction`, `groupReaction`, `columnsReaction`, and `columnStateReaction` track
`model.agApi` directly. Because `agApi` is `@observable.ref` (Section 6), these reactions re-fire
when the grid mounts and `agApi` becomes non-null - this is how the grid's column/sort/group state
gets (re)applied on mount.

---

## 5. The applyTransaction hop - synchronous, per-record, no async/batching layer

This is the pivotal cost site. When `dataReaction` fires and the grid is ready, it calls
`syncData()` (`Grid.ts:363`).

`syncData()` (`Grid.ts:680-734`):

```
newRs = store._filtered            // the new whole filtered RecordSet
prevRs = this.prevRs               // GridLocalModel field caching the last applied RecordSet
prevCount = prevRs ? prevRs.count : 0

if (prevCount !== 0) {
    transaction = genTransaction(newRs, prevRs)
    if (!transactionIsEmpty(transaction)) agApi.applyTransaction(transaction)   // Grid.ts:693
} else {
    agApi.updateGridOptions({rowData: newRs.list})                              // Grid.ts:696 (full replace)
}
...
this.prevRs = newRs                                                             // Grid.ts:732
```

- **Per-record diff:** `genTransaction(newRs, prevRs)` (`Grid.ts:649-678`) builds the transaction by
  iterating `newRs.list` and comparing each record against `prevRs.getById(rec.id)` by record
  identity: a record not present is an `add`; a present-but-different reference (`existing !== rec`)
  is an `update`; missing records are collected as `remove` when the count math indicates removals
  (`Grid.ts:659-670`). Empty add/update/remove arrays are omitted because "ag-grid is not internally
  optimized" for them (`Grid.ts:672-677`). Stable identity comes from `getRowId: ({data}) =>
  data.agId` (`Grid.ts:213`), where `agId` is a stable per-`StoreRecord` id.
- **Synchronous application:** `agApi.applyTransaction(transaction)` is the **synchronous** AG Grid
  call (`Grid.ts:693`). There is **no** use of `applyTransactionAsync`, and **no explicit batching
  or debouncing layer** around it. The data-driving reaction `dataReaction` carries no `debounce`
  (`Grid.ts:357-366`) - contrast `rowHeightReaction`, which sets `debounce: 1` (`Grid.ts:443`).
- **Full replacement only on initial load:** `agApi.updateGridOptions({rowData: newRs.list})` is used
  only when `prevCount === 0` (`Grid.ts:695-696`), i.e. the first non-empty load. Thereafter every
  update goes through the incremental transaction path.
- **The only coalescing is implicit MobX action batching.** Because the upstream mutations
  (`loadData`, `updateData`, `setFilter`, `rebuildFiltered`) are `@action`s, multiple observable
  writes inside a single action are batched by MobX into one reaction run. There is no
  application-level queue, throttle, or transaction buffer at the grid layer.

---

## 6. Mounted-component reaction lifecycle

The AG-Grid-driving reactions are active **only while the grid component is mounted.**

- The reactions live in `GridLocalModel`, instantiated via `useLocalModel(GridLocalModel)` inside
  the `Grid` render function (`Grid.ts:109`). A Hoist local model is created on mount and destroyed
  on unmount, which disposes all its managed reactions (`HoistBase` auto-disposes `addReaction`
  subscriptions on `destroy()`).
- All eleven reactions are registered in `GridLocalModel.onLinked()` (`Grid.ts:186-203`) - the
  lifecycle hook that runs after the local model is linked to its lookup model on first render, not
  at `GridModel` construction.
- The reactions are gated on the grid being live. `dataReaction`/`selectionReaction`/
  `validationDisplayReaction` track and check `model.isReady` (`Grid.ts:361-363`, `371-373`,
  `574-577`); `sortReaction`/`groupReaction`/`columnsReaction`/`columnStateReaction` track
  `model.agApi` and early-out when it is null.
- `model.isReady` is `agGridModel.isReady` (`GridModel.ts:1030-1032`), which is
  `!isNil(this.agApi)` (`AgGridModel.ts:160-162`). `agApi` is `@observable.ref` (`AgGridModel.ts:116`),
  set in `handleGridReady()` on mount (`AgGridModel.ts:561-570`, invoked from
  `AgGrid.noteGridReady` -> `onGridReady`, `AgGrid.ts:94`, `171-173`) and nulled in
  `handleGridUnmount()` (`AgGridModel.ts:572-576`). Both are `@action`s, so flipping `agApi`
  observably (re)triggers the agApi-tracking reactions.
- `GridModel` itself holds essentially no grid-driving reactions. It registers one always-on
  reaction - an editing-mode debounce that maps `isEditing` to `isInEditingMode` with a 500ms
  debounce (`GridModel.ts:752-756`) - and one conditional reaction binding the model's sizing mode
  to the global `XH.sizingMode`, added only when no explicit sizing mode was supplied
  (`GridModel.ts:1943-1949`). Neither applies data transactions.

**Implications:**
- An **unmounted grid does not apply transactions.** While the grid is unmounted, `agApi` is null,
  `isReady` is false, and the `GridLocalModel` reactions are disposed. Upstream `store._filtered`
  keeps changing (the Store is mount-independent), but nothing pushes those changes into AG Grid.
- On (re)mount, `agApi` flips to non-null and `syncData()` runs from scratch - with `prevRs`
  reset on the freshly-constructed `GridLocalModel`, so `prevCount === 0` drives a **full
  `updateGridOptions({rowData})` replacement** rather than a delta. Re-registration of reactions
  happens on mount, in `onLinked()`.
- The cost model is therefore: real-time throughput is bounded by **synchronous, per-record
  transaction application on the main thread, inside a mounted component.** A Data 2.0 engine that
  wants to offload work (web worker, async transactions) must contend with this synchronous,
  mounted-only seam, not just the cube internals.

---

## 7. Granularity verdict

| # | Hop | Record-level or Batch/Reference-level | Mechanism | Cite |
|---|---|---|---|---|
| 1 | Cube -> View | Per-view batch (imperative, async fan-out) | `forEachAsync(_connectedViews, v => v.noteCubeLoaded()/noteCubeUpdated())` - no MobX observable | `Cube.ts:131`, `282-286`, `299-314` |
| 2 | View.result (MobX seam) | Whole-result reference | `@observable.ref result` reassigned to new `{rows, leafMap}` in `updateResults()` | `View.ts:109-110`, `335-341` |
| 2b | View -> Store (full) | Whole dataset | `loadStores()` -> `store.loadData(storeRows)` | `View.ts:326-333`, `299` |
| 2c | View -> Store (data-only) | Per-record transaction (changed rows only) | `dataOnlyUpdate()` -> `store.updateData({update})` | `View.ts:303-324` |
| 3 | Store._filtered | Whole-RecordSet reference | `@observable.ref _filtered` reassigned in `rebuildFiltered()` (`@action`); triggered imperatively, no filter reaction | `Store.ts:307-308`, `1123-1126`, `853-859` |
| 4 | Store -> GridLocalModel.dataReaction | Whole-RecordSet reference | `addReaction` tracking `store._filtered`; no debounce; mounted-only | `Grid.ts:357-366`, `188-200` |
| 5 | genTransaction diff | Per-record (add/update/remove by `agId`) | three-way diff of `newRs.list` vs `prevRs` by record identity | `Grid.ts:649-678`, `213` |
| 5 | applyTransaction | Per-record, applied synchronously in one call | `agApi.applyTransaction(transaction)` (sync; no async/batch layer) | `Grid.ts:680-734`, `693` |
| 5 | initial-load replacement | Whole dataset | `agApi.updateGridOptions({rowData})` when `prevCount === 0` | `Grid.ts:695-696` |

**Net:** Reaction *tracking* is uniformly at whole-reference granularity (a new ViewResult, a new
RecordSet). The only place per-record work appears is inside the AG Grid transaction
(`genTransaction` -> `applyTransaction`) and on the View's data-only Store update path
(`store.updateData({update})`). The whole chain from `_filtered` swap to applied AG Grid
transaction is synchronous; the only coalescing is implicit MobX action batching.

---

## 8. Source-inconclusive points (carry to Phase 2 as measurement targets)

These cannot be settled from source reading alone and become baseline-measurement targets for
Phase 2 (BASE) on the harness:

1. **Does MobX action batching actually coalesce rapid sequential updates in practice?** The code
   has no explicit queue, so coalescing depends entirely on whether successive updates land inside a
   single MobX action/transaction. Whether a burst of `cube.updateDataAsync()` calls or repeated
   `store.updateData()` calls collapse into one `syncData()` run, or fire `dataReaction` N times, is
   an empirical question - and `Cube` deliberately fans out to views with `forEachAsync` (async), so
   per-view runs may not share a batch.
2. **Cost of `genTransaction` at scale.** The three-way diff iterates `newRs.list` and does a
   `prevRs.getById` lookup per record (`Grid.ts:659-670`). Its main-thread cost as a function of
   row count and churn rate is unmeasured.
3. **Cost of synchronous `applyTransaction` vs. async.** Whether switching to `applyTransactionAsync`
   (or chunking) would meaningfully reduce main-thread blocking under high update frequency is a
   measurement/experiment target, not a source fact.
4. **Remount full-replacement cost.** Because remount resets `prevRs` and forces a full
   `updateGridOptions({rowData})`, the cost of remounting a large grid (dashboards, tab switches) is
   a distinct target separate from steady-state delta cost.
5. **`reuseRecords` / `freezeData` / `experimental` flags' effect on identity diffing.** The
   `update` branch keys off `existing !== rec` (reference inequality). Whether record-reuse settings
   change how often records are reference-equal across loads - and thus the size of the `update`
   array - needs the copy-vs-reuse heap map (the companion Phase 1 deliverable) plus measurement.
