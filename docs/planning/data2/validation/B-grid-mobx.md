# Validation: §2.4 Grid/GridModel, §2.5 AG Grid Wrapping, §2.8 MobX Reactivity

Source revision: `develop` branch, validated 2026-06-27.
Primary sources: `cmp/grid/GridModel.ts`, `cmp/grid/Grid.ts`, `data/Store.ts`,
`desktop/cmp/grid/impl/colchooser/ColChooserModel.ts`, `cmp/store/StoreFilterField.ts`,
MCP doc `cmp/grid/README.md`, `data/cube/README.md`.

---

## 1. Corrections & Confirmations

| # | Claim (from brief) | Verdict | Reality + citation |
|---|--------------------|---------|--------------------|
| 1 | GridModel is bound to a Store; you can pass a Store instance OR a store config | **Confirmed** | `GridConfig.store?: Store \| StoreConfig`. Branch in `parseAndSetColumnsAndStore()`: if `storeOrConfig instanceof Store` use it directly; otherwise call `new Store(storeOrConfig)` and `markManaged(store)`. `GridModel.ts:1753-1774` |
| 2 | Filtering is applied at the Store level, not AG Grid's built-in filter | **Confirmed** | `Store._filtered: RecordSet` (`@observable.ref`, `Store.ts:308`) is recomputed by `rebuildFiltered()` (`@action`, `Store.ts:1123-1126`): `this._filtered = this._current.withFilter(this.filter)`. GridModel's `dataReaction` tracks `store._filtered` directly. AG Grid's own filter mechanism is not used for data filtering. |
| 3 | Hoist has replaced AG Grid's column chooser with its own, operating on GridModel column state | **Confirmed (with nuance)** | `ColChooserModel` (`desktop/cmp/grid/impl/colchooser/ColChooserModel.ts`) operates entirely on `gridModel.columnState` and calls `gridModel.updateColumnState()`. It does NOT touch the Store. The chooser manages column visibility/ordering, not data. |
| 4 | Hoist has replaced AG Grid's column header filters, operating on the Store | **Confirmed (partially nuanced)** | `GridFilterModel` (`cmp/grid/filter/GridFilterModel.ts`) manages column-level filters. Its `bind` target is a `GridFilterBindTarget` - by default `gridModel.store`, but can be set to a Cube `View`. Writes filters to the Store's `filter` observable. `GridConfig.filterModel?: GridFilterModelConfig \| boolean`. Desktop only. The actual filter values UI is driven from the bound target (Store or View) via `FilterValueSource`/`FilterBindTarget` interfaces. |
| 5 | GridModel observes store changes and translates them into AG Grid transactions | **Confirmed** | `Grid.ts:357-365`: `dataReaction()` tracks `[model.isReady, store._filtered, model.showSummary, store.summaryRecords]` via `addReaction`. When triggered, calls `syncData()` (`Grid.ts:681-734`), which calls `agApi.applyTransaction(transaction)` for incremental updates or `agApi.updateGridOptions({rowData: newRs.list})` for full replacement when `prevCount === 0`. |
| 6 | AG Grid API is driven from inside GridModel | **Confirmed (nuanced)** | The sync logic actually lives in `GridLocalModel` (the internal component model in `Grid.ts`), not directly in `GridModel`. `GridModel` exposes a convenience `get agApi()` accessor (`GridModel.ts:1034`) that delegates to `this.agGridModel.agApi`. The actual reactions and `applyTransaction` calls are in `Grid.ts` (the component's local model). |
| 7 | Transaction batching / async transactions | **Corrected** | Brief implied async transaction batching. The implementation uses **synchronous** `agApi.applyTransaction()` (not the async variant). Debouncing/batching is not present at this layer - MobX reaction batching at the action level is the only implicit coalescing. `Grid.ts:693`. |
| 8 | Store is a shared, AG-Grid-independent data substrate so charts/filters work against one common filtered dataset | **Confirmed** | `StoreFilterField` (in `cmp/store/StoreFilterField.ts`) binds to a Store directly, applying a `FunctionFilter` to `store.filter`. `GridFilterModel.bind` can be set to a Store or Cube `View`. The Cube `View` pattern explicitly pushes results into connected Stores that are then consumed by one or more GridModels independently. |
| 9 | `colChooserModel` property name | **Confirmed** | `GridModel.colChooserModel: IColChooserModel` - correct name, confirmed by members listing and `GridModel.ts:502,738`. Type is the interface `IColChooserModel`; concrete desktop impl is `ColChooserModel`. |
| 10 | Store records / record set are MobX-observable | **Confirmed** | `Store._filtered: RecordSet` is `@observable.ref` (`Store.ts:308`). `store.filter: Filter` is `@observable.ref` (`Store.ts:274-275`). When `setFilter()` is called, MobX triggers `rebuildFiltered()` via a reaction internally, producing a new `_filtered` value that cascades to any observer (including `Grid.ts`'s `dataReaction`). |

---

## 2. How GridModel Drives AG Grid - the Real Mechanism

**Reactive chain (source to pixels):**

```
User calls store.setFilter(f)  OR  store.loadData(data)
  → Store.rebuildFiltered() (@action)  → store._filtered = new RecordSet(...)   [observable.ref]
    → Grid.ts GridLocalModel.dataReaction fires                                  [MobX reaction]
        track: () => [model.isReady, store._filtered, model.showSummary, store.summaryRecords]
      → syncData() called
          if (prevCount > 0)  → genTransaction(newRs, prevRs)
                              → agApi.applyTransaction(transaction)              [AG Grid API]
          else                → agApi.updateGridOptions({rowData: newRs.list})   [AG Grid API]
```

**Key implementation details:**

- The reaction lives in `GridLocalModel` (the component's internal model, defined in `Grid.ts`),
  registered via `this.addReaction(this.dataReaction(), ...)` in `onLinked()` (`Grid.ts:186-200`).
- All reactions are registered in `onLinked()` - they activate on first render, not at
  GridModel construction.
- `agApi` is accessed as `model.agGridModel.agApi` (via GridModel's convenience accessor at
  `GridModel.ts:1034`). `agGridModel: AgGridModel` is a `@managed` property on GridModel.
- Transaction generation (`genTransaction`) does a three-way diff: comparing `newRs.list`
  against `prevRs` by record identity to produce `add`, `update`, `remove` arrays.
  (`Grid.ts:652-678`)
- Transactions are **synchronous** (`applyTransaction`, not `applyTransactionAsync`).
- Full `rowData` replacement is used only when `prevCount === 0` (initial load).
- Sort and grouping reactions also fire via `addReaction` and call `agApi.setRowGroupColumns()`
  and `agGridModel.applySortBy()` respectively. (`Grid.ts:378-398`)
- AG Grid's `getRowId` is set to `({data}) => data.agId` (`Grid.ts:213`), where `agId` is
  a stable identifier on each `StoreRecord` - enabling efficient delta transactions.

---

## 3. MobX Reactivity Paths

### Store - what is observable

| Observable | Decorator | Location | Notes |
|-----------|-----------|----------|-------|
| `store._filtered` | `@observable.ref` | `Store.ts:308` | Whole RecordSet reference; changes when filter or data changes |
| `store.filter` | `@observable.ref` | `Store.ts:274` | The applied Filter object |
| `store.summaryRecords` | `@observable.ref` | `Store.ts:290` | Summary row data |
| `store.lastUpdated` | `@observable` | `Store.ts:278` | Timestamp, changed on every mutation |
| `store.lastLoaded` | `@observable` | `Store.ts:282` | Timestamp, changed on full load |
| `store.filterIncludesChildren` | `@observable` | `Store.ts:263` | Tree filter behavior flag |
| `store.xhFilterText` | `@observable` | `Store.ts:294` | Used internally by `StoreFilterField` |

**Granularity:** observation is at the **RecordSet reference level** (whole dataset), not
per-record. When any record changes (load, update, filter), `_filtered` gets a new `RecordSet`
reference, triggering all observers. Individual record mutations are not individually observable.

### GridModel - what is observable

| Observable | Decorator | Location |
|-----------|-----------|----------|
| `sortBy` | `@observable.ref` | `GridModel.ts:547` |
| `groupBy` | `@observable.ref` | `GridModel.ts:548` |
| `columns` | `@observable.ref` | `GridModel.ts:544` |
| `columnState` | `@observable.ref` | `GridModel.ts:545` |
| `expandState` | `@observable.ref` | `GridModel.ts:546` |
| `expandLevel` | `@observable` | `GridModel.ts:549` |
| `showSummary` | `@bindable` | `GridModel.ts:556` |
| `isInEditingMode` | `@observable` | `GridModel.ts:574` |
| `persistableColumnState` | `@computed.struct` | `GridModel.ts:551-554` |

### Reactions registered by Grid.ts (GridLocalModel.onLinked)

All registered via `addReaction()` in `onLinked()` (`Grid.ts:188-200`):

| Reaction | Tracks | Effect |
|---------|--------|--------|
| `dataReaction` | `[isReady, store._filtered, showSummary, summaryRecords]` | `syncData()` - applies AG Grid transactions |
| `selectionReaction` | `[isReady, selectedRecords]` | `syncSelection()` - syncs AG Grid row selection |
| `sortReaction` | `[agApi, sortBy]` | `agGridModel.applySortBy(sortBy)` |
| `groupReaction` | `[agApi, groupBy]` | `agApi.setRowGroupColumns(groupBy)` |
| `columnsReaction` | `[agApi, columns]` | Rebuilds AG Grid column defs |
| `columnStateReaction` | `[agApi, columnState]` | Syncs hidden/width/pinned state |
| `rowHeightReaction` | `calculatedRowHeight` | `agApi.resetRowHeights()` |
| `validationDisplayReaction` | `[isReady, validator.errors]` | `agApi.refreshCells()` |

### Cube View MobX path

`View.result` is observable (`data/cube/README.md`). When `connect: true`, a View writes
its aggregated result into connected `Store` instances via `loadData()`, which triggers
`store._filtered` to update - completing the chain to AG Grid.

---

## 4. Notable Deltas

1. **No async transaction batching.** The brief implies async or batched transactions.
   Reality: `agApi.applyTransaction()` (synchronous) is used. No `applyTransactionAsync`.
   Coalescing only happens implicitly via MobX's own batching of actions.

2. **Reactions live in Grid.ts, not GridModel.ts.** All AG Grid-driving reactions are in
   `GridLocalModel` (internal component model in `Grid.ts`), registered during component
   lifecycle (`onLinked`). `GridModel` itself has only a single reaction (editing debounce,
   `GridModel.ts:752-756`). This matters architecturally: the reactions only run while the
   component is mounted.

3. **AG Grid API handle.** `GridModel.agApi` is a convenience accessor that proxies to
   `this.agGridModel.agApi`. The underlying handle lives on `AgGridModel`. The correct
   call chain is: `gridModel.agApi` → `gridModel.agGridModel.agApi`. `agGridModel` itself
   is a first-class `@managed` property of `GridModel`.

4. **Column chooser operates on GridModel column state, NOT the Store.** The col chooser
   manages column visibility/ordering - it has nothing to do with the Store or data filtering.
   The brief's framing ("operating on the store") applies to filters/filter UI, not the chooser.

5. **`GridFilterModel.bind` can target a Cube View, not just a Store.** The `GridFilterBindTarget`
   type is satisfied by both `Store` and Cube `View` (`cmp/grid/Types.ts`). This is the explicit
   mechanism for charts/cube-backed grids to share one filtered dataset.

6. **`StoreFilterField` is the correct name** for the freetext toolbar filter component.
   It is in `cmp/store/StoreFilterField.ts` (not `desktop/`), making it cross-platform.
   It binds to a `Store` (or derives one from the nearest `GridModel` in context) and writes
   a `FunctionFilter` to `store.filter`.

---

## 5. Open Questions for Phase 1

1. **`View.result` observability internals** - the Cube `README.md` shows `view.result` as
   observable, but the mechanism (MobX `@observable`, `computed`, or reaction?) is not confirmed
   from the sources checked. Dig into `data/cube/impl/View.ts` to see the exact decorator and
   whether `result` changes fire at the whole-result level or can be granular.

2. **`refreshFilter()` trigger** - `Store.ts:554` has a `refreshFilter()` method, but it's not
   clear what triggers a re-run of `rebuildFiltered()` in response to `filter` changes. Likely
   an `addReaction` inside the Store constructor on `this.filter`. Confirm by reading
   `Store.ts:333-400` (constructor area).

3. **`AgGridModel` role** - `AgGridModel` (`cmp/ag-grid/AgGridModel.ts`) was not deeply examined.
   It presumably holds the AG Grid `GridApi` reference and owns `sizingMode`/visual properties.
   Confirm the exact lifecycle of `agApi` (when it becomes available, how `model.isReady` is set).

4. **`GridFilterModel` store-writing mechanism** - how exactly does `GridFilterModel` write back
   to `store.filter` (via `store.setFilter()`?) and what triggers that write (user interaction
   with the column header filter UI). The `commit`/`commitOnChange` config suggests there may
   be a staged vs. immediate apply distinction worth documenting.

5. **Immutable data row path** - `GridModel` has an `experimental` field and the constructor
   extracts an `experimental` config. Brief mentioned an "immutable-data path." Check
   `GridExperimentalFlags` type to see if there is an immutable/delta-sort experimental flag
   and whether it changes the transaction strategy.
