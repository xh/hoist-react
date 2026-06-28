# Copy-vs-Reuse Map - Object Identity Across the Data Pipeline

**Requirement:** INV-02
**Date:** 2026-06-27
**Scope:** A source-cited accounting of where the *same* datum is shared by reference vs. copied into
a new allocation, at every transition in the current `hoist-react` data pipeline. This is reasoning
about JavaScript object identity from source, not measurement - heap measurement is Phase 2/3. The
verdicts here tell the Phase 2 heap-attribution work which layers genuinely hold distinct allocations
and which merely re-point at existing ones.

## The memory-multiplication problem

A single field value loaded from the server can end up represented several times concurrently in the
browser: once in the raw transport payload, again in a parsed record, again in a per-query row object,
again in a downstream grid record, and again inside the grid library's own row nodes. Whether each of
these is a genuinely new allocation or just another reference to one shared object determines the real
memory cost of the current architecture. This document resolves that question transition by transition,
so the heap attribution in Phase 2 can be reasoned about rather than guessed.

The pipeline has five transitions:

```
raw JSON object
  -> (1) StoreRecord (in a Store; for the Cube path, the Cube's internal store)
  -> (2) leaf ViewRowData (View query result, leaf rows)
  -> (3) aggregate ViewRowData (View query result, group/total rows)
  -> (4) StoreRecord in a connected (grid) Store
  -> (5) AG Grid internal row node
```

Transitions 2 and 3 are two faces of the same step (leaf rows vs. aggregate rows produced by the same
`View.generateRows()` pass); they are documented separately because their copy verdicts differ.

---

## Summary table

| # | Transition | Copied or referenced? | What is newly allocated | Source cite |
|---|------------|-----------------------|-------------------------|-------------|
| 1 | raw JSON object -> `StoreRecord` | **Copied** (raw kept by ref; `data` is new) | New parsed `data` object per record; `raw` reference retained alongside | `Store.ts:1156-1165`, `Store.ts:1203-1220`, `StoreRecord.ts:242-243` |
| 2 | leaf `StoreRecord` -> leaf `ViewRowData` | **Copied** (shallow, field-by-field) | New `ViewRowData` per leaf; field values copied in (primitives shared, object values shared by ref) | `LeafRow.ts:34-44`, `BaseRow.ts:41-45` |
| 3 | leaf rows -> aggregate / group `ViewRowData` | **New** (genuinely computed) | New `AggregateRow` + `ViewRowData` per group/total; aggregated values freshly computed | `AggregateRow.ts:27-46`, `BaseRow.ts:194-202`, `View.ts:344-374` |
| 4 | `ViewRowData` -> connected-Store `StoreRecord` | **Copied** (re-parsed into new `data`) | New `StoreRecord` + new `data` object; original `ViewRowData` kept as `raw` | `View.ts:326-333`, `Store.ts:387-407`, `Store.ts:1156-1165`, `Store.ts:1203-1220` |
| 5 | grid-Store `StoreRecord` -> AG Grid row node | **Referenced** (record passed by ref) | AG Grid's own node object per row, referencing the `StoreRecord` as `node.data`; keyed by `agId` | `Grid.ts:213`, `Grid.ts:693`, `Grid.ts:696`, `Grid.ts:338`, `StoreRecord.ts:240` |

Net: a single leaf datum loaded into a Cube and surfaced through a connected grid exists as at least
**four** distinct in-memory parsed/record representations (raw, cube `StoreRecord.data`, leaf
`ViewRowData`, grid `StoreRecord.data`), plus the AG Grid node that references the last of those, plus
the retained `raw` references at the Store boundaries. Aggregate rows add further genuinely-new
allocations that have no leaf counterpart.

---

## Transition 1: raw JSON object -> StoreRecord

**Verdict: copied. The Store keeps a reference to the raw object AND allocates a new inner `data` object.**

`Store.createRecord()` is the single funnel for record creation (called by `loadData()`,
`updateData()`, and summary loading). It does three things to the inbound `raw` object
(`Store.ts:1146-1165`):

1. Optionally runs `processRawData(raw)` to a (by-convention new) object - `data = processRawData(raw)`
   (`Store.ts:1148-1149`). The doc comment explicitly tells writers that an editing `processRawData`
   "be sure to return a clone" (`Store.ts:1152`).
2. Calls `this.parseRaw(data)` (`Store.ts:1156`), which **always allocates a new object**:
   `const ret = Object.create(this._dataDefaults)` and then copies parsed, non-default field values
   onto it (`Store.ts:1203-1217`). Defaults live on the prototype, not as own properties - this is the
   "only own properties for non-default fields" behavior documented on `StoreRecord.data`
   (`StoreRecord.ts:42-50`).
3. Constructs the `StoreRecord` with both objects: `raw` (the original) and `data` (the freshly parsed
   one), and sets `committedData` to the same `data` object (`Store.ts:1157-1165`,
   `StoreRecord.ts:242-244`).

So each record retains a **reference** to the original raw object (`this.raw = raw`,
`StoreRecord.ts:243`) while also owning a **new** parsed `data` object (`StoreRecord.ts:242`). The
`raw` field exists for reference/round-tripping and is never mutated by the record
(`StoreRecord.ts:39-40`, config doc `StoreRecord.ts:329-333`). On a fresh, unmodified record
`committedData === data` (same object); they diverge only once the record is locally modified
(`StoreRecord.ts:77-90`).

Primitive field values are duplicated onto `data` (each is its own slot); any field value that is
itself an object is copied **by reference** - `parseRaw` assigns `field.parseVal(raw)` without deep
cloning (`Store.ts:1212-1215`).

**Freeze behavior.** Whether `data` is frozen depends on the Store's `freezeData` config. A general
Store defaults to `freezeData: true` (`Store.ts:250`), so non-summary records have their `data`
`Object.freeze`d in `StoreRecord.finalize()` (`StoreRecord.ts:301-305`). The **Cube's internal store
sets `freezeData: false`** (`Cube.ts:146-152`). This is deliberate: an unfrozen `data` lets the Cube
mutate leaf record data **in place** during incremental updates rather than reallocating records (the
fast path documented at A-store-cube-view.md 3.6). That in-place mutability is what transitions 2-4
rely on for their `dataOnlyUpdate()` path below.

---

## Transition 2: leaf StoreRecord (Cube internal store) -> leaf ViewRowData

**Verdict: copied - a new `ViewRowData` per leaf, with field values shallow-copied from the cube
record's `data`.** This resolves open question A-1 / A-2 from A-store-cube-view.md for the leaf case.

When a query has run its grouping down to the leaves, `View.groupAndInsertRecords()` creates one
`LeafRow` per source `StoreRecord` (`View.ts:387-394`). Each `LeafRow` extends `BaseRow`, whose
constructor allocates a brand-new `ViewRowData`: `this.data = new ViewRowData(id)`
(`BaseRow.ts:41-45`). The `LeafRow` constructor then copies the requested field values **one by one**
out of the source record's `data` into that new `ViewRowData` (`LeafRow.ts:41-43`):

```
view.fields.forEach(({name}) => {
    this.data[name] = rawRecord.data[name];
});
```

So the leaf `ViewRowData` does **not** share the same object as `StoreRecord.data` - it is a separate
allocation. The values written into it are a **shallow copy**: primitive fields are independent slots;
object-valued fields point at the same nested objects as the cube record's `data`. The class doc states
this directly - leaf rows "are not computed aggregates, although the data they contain is a shallow copy
of the original and limited to the fields requested by the View / Query" (`LeafRow.ts:18-21`).

Note the leaf `ViewRowData` is limited to the View's requested fields, so it is generally a *narrower*
object than the full cube `StoreRecord.data`.

**In-place leaf updates.** On the incremental fast path, `LeafRow.applyLeafDataUpdate()` mutates the
existing leaf `ViewRowData` in place - it compares each field against the new cube record's `data` and
writes changed values back onto the same `data` object, recording `RowUpdate`s (`LeafRow.ts:46-65`).
This is why the leaf `ViewRowData` must be a Cube-owned, mutable object and not a frozen share of the
record.

---

## Transition 3: leaf rows -> aggregate / group rows

**Verdict: genuinely new allocations. Aggregate and total rows are not shared from any leaf - their
values are freshly computed.**

For each grouping level, `View.groupAndInsertRecords()` buckets records with `groupBy` and creates an
`AggregateRow` per group (`View.ts:396-421`); a root/total `AggregateRow` is created when
`includeRoot` is set (`View.ts:356-363`). Each `AggregateRow` (via `BaseRow`) allocates its own new
`ViewRowData` (`BaseRow.ts:41-45`, `AggregateRow.ts:27-46`).

The aggregate's field values are **computed, not copied**: `BaseRow.initAggregate()` first nulls every
field on the new `data`, applies the dimension values, then calls `computeAggregates()`, which sets
`data[name] = aggregator.aggregate(children, name, ctx)` for each aggregatable field
(`BaseRow.ts:134-168`, `BaseRow.ts:194-202`). So an aggregate row holds freshly produced values
(sums, averages, etc.) that exist nowhere else - they are new allocations by definition.

**Row caching.** Aggregate rows are cached and reused across query re-runs when their children are
unchanged: `View.cachedRow()` returns the previously built `BaseRow` if `shallowEqualArrays` finds the
same children (`View.ts:521-529`). This means an aggregate `ViewRowData` object can **persist by
reference** across updates rather than being reallocated each time - relevant to Phase 2 because stable
aggregate identity is a deliberate reuse, not a leak.

**`dataOnlyUpdate()` in-place mutation.** When all aggregators are "simple"
(`aggregator.dependsOnChildrenOnly`, `View.ts:547-549`) and an update changes only field values - not
which records pass the filter, nor any dimension/bucket membership (`View.ts:470-519`) - the View skips
full row regeneration. `dataOnlyUpdate()` applies the leaf change in place and propagates it up the
existing row tree via `BaseRow.applyDataUpdate()`, mutating each ancestor aggregate's `data` object
in place and collecting the touched row datas into a set (`View.ts:303-324`, `BaseRow.ts:171-192`).

This in-place mutation of `ViewRowData` objects is precisely **why a connected Store may not use
`reuseRecords: true`**: `View.parseStores()` throws if any connected store has `reuseRecords` set
(`View.ts:554-558`). `reuseRecords` reuses a `StoreRecord` when the inbound raw object is
reference-identical to the prior load (`Store.ts:1139-1144`); but the View mutates the very
`ViewRowData` objects it feeds downstream, so reference-identity-based reuse would silently skip real
data changes.

---

## Transition 4: ViewRowData -> connected-Store StoreRecord

**Verdict: copied. The connected Store re-parses each `ViewRowData` into a new `StoreRecord` with a new
`data` object; the `ViewRowData` itself is retained only as that record's `raw`.** This resolves the
primary aggregated-row copy question (open question A-1 from A-store-cube-view.md).

`View.loadStores()` passes the row-data array straight into each connected store:
`this.stores.forEach(s => s.loadData(storeRows))`, where `storeRows` is `this._rowDatas` - the array of
`ViewRowData` objects (`View.ts:326-333`). On the `dataOnlyUpdate()` path it instead calls
`store.updateData({update: recordUpdates})` with the same `ViewRowData` objects (`View.ts:316-322`).

Both `loadData()` and `updateData()` route every inbound object through `Store.createRecord()`
(`Store.ts:402` -> `Store.ts:1182`; `Store.ts:476`, `Store.ts:485-487`). As established in Transition 1,
`createRecord()` runs `parseRaw()`, which **allocates a fresh `data` object** via
`Object.create(this._dataDefaults)` and copies parsed field values into it
(`Store.ts:1156`, `Store.ts:1203-1217`). The `StoreRecord` then stores the incoming `ViewRowData` as its
`raw` and the freshly parsed object as its `data` (`Store.ts:1157-1165`, `StoreRecord.ts:242-243`).

So the `ViewRowData` objects in `view.result.rows` are **not** the same objects as the connected store's
`StoreRecord.data`. They are referenced (as `raw`) but the field values are copied once more into a new
parsed `data` object. This is a real third parsed representation of each leaf datum (after the cube
record's `data` and the leaf `ViewRowData`), and a second representation of each aggregate value.

Two consequences worth flagging for Phase 2:

- A connected general-purpose grid store defaults to `freezeData: true` (`Store.ts:250`), so these
  grid-side `data` objects are frozen copies - distinct allocations from the unfrozen cube-side data.
- `view.result` (`@observable.ref`, `View.ts:109-110`) holds the `ViewRowData` array directly, so an
  app reading `view.result.rows` consumes the *same* `ViewRowData` objects the connected store wrapped
  as `raw`. Apps that both connect a store and read `view.result` therefore hold two references to the
  `ViewRowData` set plus the store's separately-parsed records.

---

## Transition 5: grid-Store StoreRecord -> AG Grid row node

**Verdict: referenced. AG Grid builds its own internal row-node objects, each holding the `StoreRecord`
as `node.data` and keyed by `agId`. The grid library does not copy the record's field data into a
separate object - but its node structure is its own opaque allocation.**

The Hoist grid feeds AG Grid `StoreRecord` instances, not plain field objects. On first population it
calls `agApi.updateGridOptions({rowData: newRs.list})`, where `newRs.list` is the array of
`StoreRecord`s from the filtered RecordSet (`Grid.ts:696`, `Grid.ts:684`). On subsequent changes it
builds a transaction whose `add`/`update`/`remove` arrays contain `StoreRecord` instances and applies
it **synchronously** via `agApi.applyTransaction(transaction)` (`Grid.ts:656-677`, `Grid.ts:693`).
There is no `applyTransactionAsync` and no explicit batching layer (A-store-cube-view.md / the grid
validation note).

AG Grid identifies each row by `getRowId: ({data}) => data.agId` (`Grid.ts:213`). `agId` is a stable
`'ag_' + id` string allocated once per record in the `StoreRecord` constructor (`StoreRecord.ts:240`).
That AG Grid stores the `StoreRecord` itself as the node's `data` is visible wherever Hoist reads back a
node: e.g. `params.node?.data` is treated as a Hoist `record` (`Grid.ts:338`), and
`node.data` is passed straight into Hoist callbacks (`Grid.ts:468-470`).

So this transition adds **no new copy of the field values** - AG Grid's node references the existing
`StoreRecord`. However, AG Grid allocates and maintains its **own** row-node objects (and, for grouped
grids, its own group-node structures and various internal indexes) keyed by `agId`. That internal node
memory is real but **opaque** - it lives inside the third-party library and is not introspectable from
Hoist source.

**Phase 2 heap-attribution boundary.** This transition crosses into AG Grid. The grid-side `StoreRecord`
and its `data` are Hoist allocations we can reason about; the AG Grid row/group node graph is a
library-owned allocation that must be measured rather than read from source. Flag the
`StoreRecord -> AG Grid node` edge as the heap-attribution boundary between "Hoist data layer" and
"grid library" in Phase 2.

---

## One datum, many representations - a walkthrough

Follow a single leaf field value - say the string `"ACME"` for a field `counterparty` - from the
server payload to a rendered grid cell, in a Cube-backed, connected-grid app:

1. **Raw transport payload.** `"ACME"` arrives as a property on a raw JSON object inside the fetch
   response array. (Representation 1: raw object property.)

2. **Cube internal store record.** `Cube.store.loadData()` -> `createRecord()` -> `parseRaw()` allocates
   a new `data` object and copies `counterparty: "ACME"` onto it; the original raw object is retained as
   `StoreRecord.raw` (`Store.ts:1156-1165`, `Cube.ts:146-153`). `freezeData: false` means this `data` is
   mutable. (Representation 2: cube record `data`; raw object still alive via `raw`.)

3. **Leaf ViewRowData.** A `View` query produces a `LeafRow`, allocating a new `ViewRowData` and copying
   `counterparty: "ACME"` into it field-by-field (`LeafRow.ts:41-43`). (Representation 3: leaf
   `ViewRowData`.)

4. **Aggregate rows.** If `counterparty` is a dimension, the value also appears as the
   `appliedDimensions` value written onto each owning `AggregateRow`'s `ViewRowData`
   (`BaseRow.ts:145-146`) and as `cubeLabel` (`AggregateRow.ts:43`). (Additional representations on each
   ancestor group row.)

5. **Connected grid store record.** `View.loadStores()` feeds the `ViewRowData` into the grid's Store,
   which re-parses it into a new `StoreRecord` with a new frozen `data` object holding
   `counterparty: "ACME"`; the `ViewRowData` is retained as that record's `raw`
   (`View.ts:326-333`, `Store.ts:387-407`, `Store.ts:1203-1217`). (Representation 4: grid record `data`;
   `ViewRowData` still alive via `raw` and via `view.result.rows`.)

6. **AG Grid row node.** The grid record is handed to AG Grid via `applyTransaction` / `rowData`; AG Grid
   creates a row node that references the `StoreRecord` as `node.data`, keyed by `agId`
   (`Grid.ts:213`, `Grid.ts:693`, `Grid.ts:696`). No new copy of `"ACME"` - the node points at the grid
   record - but the node object itself is a new library allocation. (Representation 5: AG Grid node,
   referencing representation 4.)

7. **Rendered cell.** AG Grid reads `counterparty` off `node.data` to render the cell; the rendered DOM
   text is a further browser-side representation outside the JS object graph.

Concurrent JS-object representations of that one `"ACME"` datum: the raw object property (1), the cube
record `data` (2), the leaf `ViewRowData` (3), per-ancestor dimension/label values on aggregate rows
(4), and the grid record `data` (5) - with the AG Grid node (6) referencing (5) rather than copying it.
For string and number values these are largely independent slots; for object-valued fields, slots 2-5
share the same nested object by reference (no transition deep-clones field values).

---

## Open / could-not-determine-from-source (Phase 2 measurement targets)

These could not be settled by reading alone and become measurement targets:

1. **AG Grid internal node footprint.** The per-row node object, plus grouped-grid group nodes and AG
   Grid's internal indexes, are library-owned and opaque. Size and growth-with-rows must be measured
   (Transition 5 boundary).

2. **Shared-vs-distinct object-valued fields, in aggregate.** Source shows object-valued fields are
   copied by reference at each transition (no deep clone), so they should be shared - but the *net* heap
   impact (how many fields are object-valued in real datasets, and whether any consumer mutation forces
   divergence) is an empirical question.

3. **`reuseRecords` populations.** General (non-Cube) stores may set `reuseRecords: true`
   (`Store.ts:1139-1144`), reusing records when the raw object is reference-identical. How often real
   apps exercise this - and thus how much Transition-1 copying is actually avoided in practice - is a
   usage question for Phase 2/3.

4. **Row-cache retention.** `View._rowCache` retains `BaseRow`/`ViewRowData` objects across query runs
   (`View.ts:521-529`). The steady-state size of this cache for a live connected view, and whether it
   meaningfully adds to resident memory, is a measurement target.

5. **`committedData` divergence under editing.** On unmodified records `committedData === data` (one
   object); on locally edited records they diverge into two objects (`StoreRecord.ts:77-90`,
   `Store.ts:669-672`). The prevalence and heap impact of dirty/edited records is workload-dependent and
   must be measured.
