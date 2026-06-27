# Store / Cube / View — Architecture Validation

Validates §2.1, §2.2, and §2.3 of the KICKOFF-PROMPT.md brief against actual hoist-react source.
Sources: `data/Store.ts`, `data/cube/Cube.ts`, `data/cube/View.ts`, `data/cube/CubeField.ts`,
`data/cube/Query.ts`, `data/cube/aggregate/Aggregator.ts`, `data/cube/aggregate/AverageAggregator.ts`,
`data/README.md`, `data/cube/README.md`.

---

## 1. Corrections & Confirmations

### §2.1 Store

| Claim | Verdict | Reality + Citation |
|-------|---------|-------------------|
| `Store` is a container for `StoreRecord`s; record shape defined by typed `Field`s | **Confirmed** | `class Store extends HoistBase` with `fields: Field[]` and `records: StoreRecord[]`. `Store.ts:244` |
| Provides add/update, dirty tracking, and an editing model | **Confirmed - with nuance** | `addRecords()`, `modifyRecords()`, `removeRecords()` for local uncommitted edits; `updateData()` for server-sourced commits; `isDirty`, `dirtyRecords`, `addedRecords`, `modifiedRecords`, `removedRecords`, `commitRecords()`, `revertRecords()`. However: there is no `commitRecords()` method - commit semantics are achieved by `updateData()` (marks changes as committed). The brief's word "commit" is an abstraction; the Store's own term is `committedData`. `Store.ts:560-714` |
| Field-level type coercions and field metadata (e.g. display names) | **Confirmed** | `Field` class has `type: FieldType`, `displayName`, `description`, `defaultValue`, `rules`. `Field.ts` (not read directly, but documented in `data/README.md` Field section) |
| Supports filtering (filter expressions, field filters) | **Confirmed** | `filter: Filter`, `setFilter()`, `clearFilter()`, `refreshFilter()`; composable `FieldFilter`, `CompoundFilter`, `FunctionFilter`. `Store.ts:853-873` |
| Does NOT support sorting | **Confirmed** | No sort-related properties, methods, or imports anywhere in `Store.ts`. Sorting is entirely absent from Store's API surface. `Store.ts` (entire file) |
| Supports processing inbound data via a SINGLE custom function (not a structured pipeline) | **Confirmed** | `processRawData?: (data: PlainObject) => PlainObject` - a single function; called on each raw object in `createRecord()`. `StoreConfig:94`, `Store.ts:1146-1154` |
| The hook name is `processRawData` | **Confirmed** | Both in `StoreConfig` interface and in constructor signature. `Store.ts:94,319` |

### §2.2 Cube

| Claim | Verdict | Reality + Citation |
|-------|---------|-------------------|
| `Cube` is a DIFFERENT class from `Store` | **Confirmed** | `class Cube extends HoistBase` - distinct class, not Store. `Cube.ts:120` |
| Cube CONTAINS/uses a `Store` internally to hold data | **Confirmed - directly** | `@managed store: Store` is a public property. Constructor does `this.store = new Store({...})`. `Cube.ts:123,146-153` |
| Configured with typed fields that carry aggregators | **Confirmed** | `CubeField extends Field`, adding `aggregator: Aggregator`. `CubeField.ts:80-81` |
| Aggregators include sum, average, weighted average by another field | **Corrected - partially** | SUM and AVG exist. The `AverageAggregator` is a simple unweighted average across leaf rows (`total / count`). **No built-in weighted-average-by-another-field aggregator exists.** The `AggregatorToken` union is: `'AVG' | 'AVG_STRICT' | 'CHILD_COUNT' | 'LEAF_COUNT' | 'MAX' | 'MIN' | 'NULL' | 'SINGLE' | 'SUM' | 'SUM_STRICT' | 'UNIQUE'`. A weighted average would require a custom `Aggregator` subclass. `CubeField.ts:47-58`, `AverageAggregator.ts:12-26` |
| How weighted-average-by-another-field is expressed | **Corrected** | It is NOT a built-in token. You must subclass the abstract `Aggregator` class and implement `aggregate(rows, fieldName, context)`. The abstract base class provides `forEachLeaf()` to traverse leaf rows. `Aggregator.ts:26-79` |
| Cube runs queries: filter + grouping (dimensions) + selected fields/metrics | **Confirmed** | `executeQuery(query: QueryConfig)` and `createView({query, stores, connect})`. `QueryConfig` has `dimensions`, `filter`, `fields`. `Cube.ts:207-245`, `Query.ts:36-131` |
| Applies filtering and aggregation | **Confirmed** | View `filterRecords()` then `generateRows()` with grouping and aggregation. `View.ts:531-545, 343-373` |
| Accepts updates and efficiently recalculates aggregations | **Confirmed** | `updateDataAsync()` calls `store.updateData()` then fans out to connected views via `noteCubeUpdated()`. Views implement a `dataOnlyUpdate()` fast path for simple aggregator changes. `Cube.ts:299-314`, `View.ts:270-282, 303-324` |
| NOT for editable data; NOT itself a Store | **Confirmed - with nuance** | Cube is not a Store. However, `modifyRecordsAsync()` exists on Cube for uncommitted in-place field edits (e.g. inline grid editing). So "not for editable data" is slightly too strong - it supports local field edits. `Cube.ts:328-334` |

### §2.3 View

| Claim | Verdict | Reality + Citation |
|-------|---------|-------------------|
| A `View` is a stable bridge between a query and a `Store` | **Confirmed - with precision** | `class View extends HoistBase`. It holds a `query: Query` and `stores: Store[]` (plural). Results flow into connected stores. `View.ts:91-113` |
| Cube holds internal store of leaf-level records | **Confirmed** | `Cube.store` is a `Store` holding leaf-level `StoreRecord`s (flat, no hierarchy). `Cube.ts:123,146-153` |
| View specifies a query | **Confirmed** | `@observable.ref query: Query` on View. `View.ts:103` |
| Cube observes data, recomputes, View produces results | **Corrected - mechanism** | Cube does NOT observe its store via MobX reactions. Instead, `loadDataAsync()` and `updateDataAsync()` on Cube explicitly call `v.noteCubeLoaded()` / `v.noteCubeUpdated()` on each connected view. It is push/imperative notification, not reactive observation. `Cube.ts:282-314` |
| View connects to a consuming Store; results applied into that store | **Confirmed** | `stores: Store[]` on View. `loadStores()` calls `s.loadData(storeRows)` on each. `View.ts:113,326-333` |
| The `connect` option | **Confirmed** | `connect?: boolean` in `createView({query, stores, connect})`. When true, the View is added to `Cube._connectedViews`. `Cube.ts:231-244`, `ViewConfig:59` |
| Result type is `ViewResult` | **Confirmed** | `interface ViewResult { rows: ViewRowData[]; leafMap: Map<StoreRecordId, LeafRow>; }`. Observable as `view.result`. `View.ts:62-65,109-110` |
| Results applied to consuming store via `loadData` | **Confirmed** | `loadStores()` calls `s.loadData(storeRows)` - full hierarchical replacement on each query run. `View.ts:326-333` |

---

## 2. Terminology Glossary

Correct names from source, with common mis-terms the brief used or might use:

| Correct Term | Type | Notes |
|---|---|---|
| `Store` | Class | Container for `StoreRecord`s. Not a Cube. |
| `StoreConfig` | Interface | Configuration object for `Store` constructor. |
| `StoreRecord` | Class | Individual record wrapper. |
| `StoreRecordId` | Type alias | `string | number` |
| `StoreTransaction` | Interface | Used by `updateData()` for structured `{update, add, remove}` |
| `StoreChangeLog` | Interface | Returned by `updateData()` / `modifyRecords()` describing what changed |
| `processRawData` | Config key | Single raw-data transform hook on `StoreConfig` (and `CubeConfig`) |
| `Field` | Class | Metadata for a Store field (type, displayName, defaultValue, rules) |
| `FieldSpec` | Interface | Plain-object config for constructing a Field |
| `Cube` | Class | Aggregation engine. Holds a `store: Store` internally. |
| `CubeConfig` | Interface | Config for Cube constructor. |
| `CubeField` | Class | `extends Field` - adds `aggregator`, `canAggregateFn`, `isLeafDimension`, `parentDimension` |
| `CubeFieldSpec` | Interface | Plain-object config for CubeField |
| `Aggregator` | Abstract class | Base for all aggregators. Implement `aggregate(rows, fieldName, context)`. |
| `AggregatorToken` | Type alias | String shorthand: `'SUM' | 'AVG' | 'MIN' | 'MAX' | 'UNIQUE' | 'LEAF_COUNT' | 'CHILD_COUNT' | 'SINGLE' | 'NULL' | 'SUM_STRICT' | 'AVG_STRICT'` |
| `Query` | Class | Immutable query spec: `dimensions`, `filter`, `fields`, `includeRoot`, `includeLeaves`, `provideLeaves` |
| `QueryConfig` | Interface | Plain-object config for Query |
| `View` | Class | Query result + store bridge. Created via `Cube.createView()`. |
| `ViewConfig` | Interface | `{query, stores?, connect?}` |
| `ViewResult` | Interface | `{rows: ViewRowData[], leafMap: Map<StoreRecordId, LeafRow>}` - the observable `view.result` |
| `ViewRowData` | Class | Row data object loaded into connected stores and returned in `ViewResult.rows` |
| `dimensions` | Field in QueryConfig | Ordered grouping levels. NOT "groupBy". |
| "measures" / "metrics" | Informal only | The correct term in source is simply "fields with aggregators". Neither "measure" nor "metric" appears in the public API. Use "measure" informally; it is understood, but `aggregator`/`CubeField.aggregator` is the code-level term. |
| `isDimension` | Boolean flag | On both `Field` and `CubeField`. A field can be a dimension without being in a Cube (used by `GroupingChooserModel`). |

---

## 3. Notable Deltas / Surprises

**3.1 No built-in weighted-average aggregator.**
The brief treats "weighted average by another field" as an example of a built-in aggregation type alongside sum and average. It is not. The 11 built-in `AggregatorToken` values do not include weighted average. Implementing one requires subclassing `Aggregator`. This is consequential for §4.1 (aggregation variants): weighted avg by notional is a common portfolio request and it requires custom code today, not a config option.

**3.2 Cube exposes `modifyRecordsAsync()` - it is slightly editable.**
The brief states "a Cube is not for editable data." While broadly true (no inline validation, no commit/revert model), `Cube.modifyRecordsAsync(modifications)` exists specifically for inline grid editing against cube-backed data. The Cube delegates to `Store.modifyRecords()` and fans out to connected views. So "read/aggregate-only" is an oversimplification.

**3.3 View-to-cube update mechanism is imperative, not reactive.**
The brief implies the cube "observes its data" and the view "observes the cube" in a MobX reactive sense. The actual mechanism: `Cube.loadDataAsync()` and `updateDataAsync()` imperatively iterate over `_connectedViews` and call notification methods. This is important for the Data 2.0 reactivity analysis - the current system is not MobX-driven at the cube-to-view level; it is explicit push notification.

**3.4 View holds an array of stores, not a single store.**
`ViewConfig.stores?: Store[] | Store` - multiple stores can be connected to one view. The diagram in the brief implies one store. In practice this means one query result can fan out to multiple downstream stores/grids simultaneously.

**3.5 View's `result` is an observable ref - this IS MobX-reactive.**
While the cube-to-view notification is imperative, the `view.result` is `@observable.ref`. So downstream MobX reactions (e.g. in a `GridModel`) that track `view.result` will fire automatically when the view updates it. The MobX layer is at the view-result boundary, not at the cube-to-view boundary.

**3.6 Cube's internal store has `freezeData: false` and `idEncodesTreePath: true`.**
These are performance-optimizing options set explicitly in the Cube constructor. `freezeData: false` allows the Cube to mutate leaf record data in-place during incremental updates. `idEncodesTreePath: true` allows the Store to skip certain ancestry checks. These are invisible to users but matter for the memory and copy/reuse analysis in Phase 2. `Cube.ts:146-153`

**3.7 `StoreChangeLog` is the structured delta type, not just an internal concept.**
The brief does not name this. `StoreChangeLog` is the return type of `updateData()` and `modifyRecords()`, containing `{update?, add?, remove?, summaryRecords?}` arrays of actual `StoreRecord` instances. This is the bridge from Store mutation to View re-aggregation. `Store.ts:199-204`

**3.8 Fast path for simple aggregator updates: `dataOnlyUpdate()`.**
When aggregators are "simple" (all `dependsOnChildrenOnly: true`) and a cube update touches only field values without changing which records pass the filter or their dimension memberships, the View skips full row regeneration and calls `dataOnlyUpdate()` - updating leaf data in-place and propagating up through the row tree. This is the incremental efficiency claim in the brief, and it is real. `View.ts:270-282, 303-324`, `Aggregator.ts:34-36`

---

## 4. Open Questions for Phase 1 Deep Inventory

These were not blocking for this terminology-and-architecture pass but are important for the full Phase 1 current-state doc:

1. **Exact copy/reuse boundary at View-to-Store load.** `loadStores()` calls `s.loadData(storeRows)` with `_rowDatas` (an array of `ViewRowData` plain objects). Are these the same JS objects loaded into both `view.result.rows` AND the connected store's records? Or does `Store.loadData()` copy them into `StoreRecord.data`? This is the primary copy-vs-reuse question for aggregated rows. Read `Store.createRecord()` and `StoreRecord` constructor in detail.

2. **Leaf-level copy/reuse in View.** `ViewRowData` for leaf rows - does the leaf's `ViewRowData` share field values with the original `StoreRecord.data` in the Cube's internal store, or copy them? Read `LeafRow.ts` and `ViewRowData.ts`.

3. **`AggregationContext` role.** Referenced in `Aggregator.aggregate(rows, fieldName, context)` but not read in this pass. What data does it carry, and does it hold references to the global leaf set (enabling "% of total" style aggregations via `dependsOnChildrenOnly: false`)?

4. **`BucketSpec` / `BucketSpecFn` pattern.** Dynamic sub-groupings within a dimension. This is an advanced feature not mentioned in the brief at all. Relevant for the Phase 1 architecture doc and for the calculated-columns taxonomy in Phase 3.

5. **`omitFn` / `omitRedundantNodes`.** Single-child node collapsing. The brief doesn't mention this. May matter for the calculated-columns / dynamic-grouping feature spec.

6. **View implements `FilterBindTarget`, `FilterValueSource`, `GridFilterBindTarget`.** This means a View can serve as the source for column header filter dropdowns in a grid, not just a Store. This is a non-obvious part of the View API surface.

7. **`Cube.info` / `infoUpdates`.** An observable metadata blob associated with a dataset load. Not mentioned in the brief. Used by `loadDataAsync()` and `updateDataAsync()`. Relevant to the data flow doc.

8. **`reuseRecords` interaction with cube-connected stores.** View explicitly throws if a connected store has `reuseRecords: true` (`View.ts:554-558`). Document why - Views mutate `ViewRowData` objects in place during `dataOnlyUpdate()`, which conflicts with reference-identity-based record reuse.
