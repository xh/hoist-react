# Kickoff Brief - Codebase Validation

**Date:** 2026-06-27
**Purpose:** The `KICKOFF-PROMPT.md` brief was authored from memory during a voice conversation
without repository access. This document records the result of grounding its §2 architectural
claims against actual `hoist-react` source and real production usage in `jobsite` and
`veracity-webapp`. Per the brief's own instruction ("verify against source ... the inaccuracies
are themselves findings"), deltas are captured here and folded into `PROJECT.md`.

**Detailed backing notes:**
- [`validation/A-store-cube-view.md`](validation/A-store-cube-view.md) - Store / Cube / View / Field / Aggregator API
- [`validation/B-grid-mobx.md`](validation/B-grid-mobx.md) - GridModel / AG Grid integration / MobX reactivity
- [`validation/C-real-usage.md`](validation/C-real-usage.md) - real production usage in `jobsite` + `veracity-webapp`

This is a focused **terminology + architecture** validation, not the full current-state inventory
(that remains Phase 1, including the copy-vs-reuse heap map and exhaustive MobX path tracing).

---

## Material corrections (change the mental model)

### 1. Update transport varies by app - the layer is transport-agnostic (WebSocket push is first-class)
The brief (§2.6, §3.3) describes "a WebSocket listener feeds incremental updates into the cube" as
*the* mechanism. The reality is **multiple patterns**, and the two local sample apps happen not to use
WebSocket push:
- **WebSocket data push IS a first-class Hoist capability** - `XH.webSocketService` with
  `WebSocketSubscription` / `WebSocketMessage` (`@xh/hoist/svc`). Toolbox demonstrates it in a
  portfolio example (`core/svc/PortfolioService.ts` + `core/positions/PositionSession.ts`, which
  `subscribe`s to live position updates). It is used heavily in client apps **not checked out
  locally**, and is strategically important - do not write it out of the story.
- The **local samples** use HTTP **poll-then-diff** instead: the server returns a full snapshot or a
  partial diff (`isPartial` flag), driving `cube.loadDataAsync()` vs. `cube.updateDataAsync()`.
  `veracity-webapp` additionally uses WebSocket as a **notification** channel ("data ready" -> HTTP
  fetch); `jobsite` has no WebSocket on the cube.

**Correction to the correction:** an earlier draft of this doc overstated the finding as "poll-then-diff,
NOT WebSocket push." That was an over-read of two sample apps. The accurate finding: **transport is
pluggable and varies by client; Hoist supports HTTP snapshot/diff, WebSocket push, WebSocket
notification, SignalR, polling - and must remain adaptive to whatever a client presents.**

**Implication:** The "real-time" question for EMC is about *throughput/latency under load* across these
transports, not about whether push exists. Per the adaptability principle, broadly-adopted solutions
must work across transports; transport-specific optimizations are fine but must be labeled conditional.

### 2. Cube -> View propagation is imperative push; MobX enters only at the result boundary
The brief implies a reactive chain ("the cube observes its data; ... the view observes the cube").
Reality (`Cube.ts`, `View.ts`):
- `Cube.loadDataAsync()` / `updateDataAsync()` explicitly iterate `_connectedViews` and call
  `view.noteCubeLoaded()` / `view.noteCubeUpdated()` - an **imperative fan-out**.
- MobX observability begins at `View.result` (`@observable.ref`, type `ViewResult {rows, leafMap}`);
  downstream components react to *that*.

**Implication:** Any reactivity-bridge analysis must target the **View.result boundary** as the
MobX seam, not an imagined cube-level observable. This aligns with the architecture research
finding that the integration seam belongs at View -> Store.

### 3. Weighted-average is not a built-in aggregator
Built-in `AggregatorToken`s: `SUM, AVG, MIN, MAX, UNIQUE, LEAF_COUNT, CHILD_COUNT, NULL, SINGLE,
SUM_STRICT, AVG_STRICT`. There is **no** weighted-average built in. Weighted-average requires a
custom subclass of the abstract `Aggregator` class - and both production apps ship their own
`WeightedAverageAggregator` (veracity adds a `BAL_WA` shorthand defaulting the weight field, plus
`ProportionAggregator`, `DedupedSumAggregator`, `FieldAverageAggregator`).

**Implication:** The §4.1 CC-2 ("aggregation variants, incl. weighted-average-by-another-field")
feature analysis must treat weighted-average as a custom-aggregator extension point, not a built-in
to expose at runtime. Runtime user-chosen weighted aggregation is genuinely new work.

### 4. GridModel drives AG Grid synchronously; the reactions live in the grid component
- Updates use **synchronous** `agApi.applyTransaction()` (`Grid.ts:693`), **not**
  `applyTransactionAsync`. There is no explicit batching layer - only implicit MobX action
  coalescing.
- The AG-Grid-driving reactions (`dataReaction`, `sortReaction`, `groupReaction`, ...) are
  registered in `GridLocalModel.onLinked()` inside `Grid.ts` - they run **only while the grid
  component is mounted**. `GridModel` itself holds essentially one reaction (an editing debounce).

**Implication:** "Real-time" throughput is bounded by synchronous transaction application on the
main thread inside a mounted component. This is a concrete baseline-measurement target for Phase 2.

---

## Refinements (correct but nuanced)

| Brief claim | Refinement |
|---|---|
| Cube "is not for editable data" | Too strong - `Cube.modifyRecordsAsync()` exists for inline-edit scenarios; delegates to `Store.modifyRecords()` and fans out to views. |
| View is a bridge to *a* Store | A View can feed **multiple** stores: `ViewConfig.stores?: Store[] \| Store`. |
| Column chooser operates "on the store" | The chooser (`ColChooserModel`) operates on **column state** (`gridModel.columnState`), not the store. Store-level operation applies to **filters** (`GridFilterModel`, `StoreFilterField`). |
| Filtering is store-level | Confirmed, and `GridFilterModel.bind` (`GridFilterBindTarget`) can target a **Store or a Cube View** - the explicit shared-dataset mechanism. |
| One cube feeds many widgets | Confirmed (10+ widget types per cube in both apps). Also: **multiple cubes per app** is real (veracity has a separate validation cube alongside the loan cube). |
| View wiring | **Two** production patterns exist: (a) declarative - `cube.createView({connect: true})` + `view.setStores([...])`; (b) manual - a MobX reaction on `cube.records` calls `cube.executeQuery()` and feeds `gridModel.loadData()`. The brief described only (a). |

## Confirmed accurate

- `Store` contains `StoreRecord`s shaped by `Field`s; add/update, dirty tracking, editing model,
  filtering; **no sorting** (the grid sorts).
- Single inbound transform hook is named **`processRawData`** (an arbitrary function, not a
  structured pipeline).
- `Cube` is a distinct class that **wraps a `Store` internally**.
- The `connect` option exists on `createView`; result type is `ViewResult {rows: ViewRowData[],
  leafMap: Map}`; results load into stores via `store.loadData()`.
- Both Store-binding paths on `GridModel` (pass a `Store` instance, or a `StoreConfig` and it
  creates + `markManaged`s its own).
- `StoreFilterField` is the correct freetext toolbar filter component name; binds to a Store (or
  discovers the nearest GridModel's store from context).
- The Store is a shared, AG-Grid-independent substrate; charts/toolbars/filters consume it
  independently of the grid.
- `gridModel.agApi` is the public AG Grid API handle (proxies `agGridModel.agApi`).

## Correct terminology glossary (for all downstream docs)

`Store`, `StoreRecord`, `Field`, `StoreConfig` · `Cube`, `CubeConfig`, `Aggregator` (abstract;
`AggregatorToken` for built-ins) · `View`, `ViewConfig`, `Query`, `ViewResult` · `GridModel`,
`AgGridModel`, `gridModel.agApi`, `ColChooserModel`, `GridFilterModel`, `StoreFilterField` ·
`processRawData` · `cube.executeQuery()`, `cube.createView()`, `view.setStores()`,
`view.noteCubeUpdated()` · groupings are "dimensions"; selected outputs are aggregated fields.

## Open questions carried into Phase 1 (deep inventory)

- Exact MobX reaction **granularity** in the View.result -> Store -> GridModel -> AG Grid path
  (record-level vs. batch-level) - determines real-time recompute cost.
- The precise **copy-vs-reuse** map across raw object -> StoreRecord (raw ref + inner data) ->
  ViewResult rows -> grid store records -> AG Grid nodes (a Phase 1/2 heap deliverable).
- The full range of update transports/patterns across XH's client base (the local samples show only a
  slice) and how `Cube`/`Store` ingest adapts to each - to keep the harness and any Data 2.0 path
  transport-agnostic rather than tuned to one pattern.
