# Architecture Research

**Domain:** High-performance in-browser analytical/dashboard data layers for real-time financial SPAs (Hoist Data Layer 2.0)
**Researched:** 2026-06-27
**Confidence:** MEDIUM-HIGH (Perspective and Arrow architecture HIGH via Context7/official; serialization-tax and MobX-bridge framing MEDIUM, verified across multiple sources; specific bridge-cost numbers for *our* result shapes are NOT yet measured and must come from the Phase 2 harness)

> **Scope note.** This document researches **external** architectural patterns and how candidate
> engines would integrate with the *existing* Hoist data layer. It deliberately does **not**
> re-derive the current Store / Cube / View / GridModel / MobX architecture - that is documented in
> `.planning/PROJECT.md` and the kickoff (§2). The single most important external finding is that
> **Hoist's Cube -> View -> Store fan-out is structurally the same pattern as Perspective's
> Table -> View -> on_update(delta) pipeline.** That correspondence frames almost every integration
> decision below.

---

## Standard Architecture

The 2026 reference architecture for a data-dense, real-time browser analytics layer separates
**five concerns** that Hoist today collapses into the Store/Cube complex plus AG Grid. Naming them
explicitly is what lets a "Data 2.0" engine slot in at one seam without owning the others.

### System Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                         RENDER / VIEW LAYER                            │
│   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────────────┐    │
│   │ AG Grid  │   │ Charts   │   │ Toolbars │   │ other non-grid   │    │
│   │ (one     │   │(Highchts)│   │ /filters │   │ consumers        │    │
│   │ consumer)│   │          │   │          │   │                  │    │
│   └────┬─────┘   └────┬─────┘   └────┬─────┘   └────────┬─────────┘    │
│        │              │              │                  │              │
├────────┴──────────────┴──────────────┴──────────────────┴─────────────┤
│              REACTIVITY / OBSERVATION LAYER  (MobX today)              │
│   Fine-grained: each consumer observes only the slice it reads.       │
│   << THE BRIDGE SEAM lives here for any cross-thread/WASM engine >>    │
├───────────────────────────────────────────────────────────────────────┤
│              QUERY / VIEW LAYER  (filter + group-by + metrics)         │
│   A "View" = a stable, named subscription to a query on the engine.    │
│   Emits result sets AND incremental deltas. (Hoist View == Persp View) │
├───────────────────────────────────────────────────────────────────────┤
│              COMPUTE / STORAGE ENGINE  (the "Data 2.0" candidate)      │
│   Holds leaf facts; applies filter/group/agg; recomputes incrementally.│
│   Row-record (current Store/Cube) OR columnar (Arrow/Perspective/Duck).│
│   Main-thread JS | Web Worker | WASM | server-resident.               │
├───────────────────────────────────────────────────────────────────────┤
│              INGEST / TRANSPORT LAYER  (asymmetric control)            │
│   Ours-to-shape: Grails -> delta protocol, binary/columnar wire.      │
│   Fixed: client WebSocket / SignalR / HTTP.                           │
└───────────────────────────────────────────────────────────────────────┘
```

**The decisive design question is which of these layers a Data 2.0 engine *owns*, and therefore
where the engine boundary (and its serialization tax) falls.** Everything downstream of this
research - phase order, pilot selection, the own-it-vs-AG-Grid call - reduces to "where does the
seam go, and what crosses it per update."

### Component Responsibilities

| Component | Responsibility | Typical 2026 Implementation |
|-----------|----------------|------------------------------|
| Compute/Storage engine | Hold leaf facts; filter, group, aggregate; recompute on update | Row: in-JS store (today). Columnar: Arrow JS typed arrays; Perspective C++/WASM; DuckDB-WASM |
| Query/View | Named, stable subscription = a query; emits result + delta | Hoist `View`; Perspective `View` w/ `on_update`; SQL re-query (DuckDB/SQLite) |
| Reactivity | Notify exactly the consumers whose slice changed | MobX atoms/observables (today); engine-native callbacks bridged to MobX |
| Render consumers | Project a filtered/aggregated slice into a UI | AG Grid (transactions), Highcharts, toolbars - all read the **shared** result |
| Ingest/Transport | Get deltas from server to engine cheaply | WebSocket + JSON (today); Arrow IPC; protobuf delta; SSRM datasource |

---

## The Columnar-vs-Row Tradeoff, Mapped onto Record + MobX

This is the crux of "would a columnar engine fit," so it is treated first and in depth.

### What each model *is*

- **Row-record (current Hoist).** Each `StoreRecord` is an object; a field read is a property
  access. MobX observes per-record (and effectively per-field via the record's data object). This
  is the model AG Grid, Highcharts, and toolbars already consume, and it is the model MobX's
  fine-grained reactivity was built for - one observable boundary per logical row/field.

- **Columnar (Arrow / Perspective / DuckDB).** Data is stored as one contiguous typed array *per
  column* (`Float64Array`, dictionary-encoded strings, etc.). A "row" is a coordinated index across
  N column buffers. This is dramatically more memory-efficient (no per-object/per-key overhead,
  cache-friendly scans, SIMD-friendly aggregation) and is the format that crosses thread/WASM/network
  boundaries near-zero-copy (Arrow IPC). **Confidence: HIGH** - Arrow is "a universal columnar format
  ... for fast data interchange and in-memory analytics" (Apache Arrow, Context7); Perspective's
  engine is "written in C++ and compiled for WebAssembly ... with support for Apache Arrow for
  efficient data interchange" (FINOS, verified).

### Where the two models collide with the record + MobX mental model

| Concern | Row-record (today) | Columnar engine |
|---------|--------------------|-----------------|
| Memory for leaf facts | High (per-object + per-key overhead; the documented multiplication problem) | **Much lower** - the headline win, directly attacks the §2.7 concern |
| Single-row read for a renderer | Cheap (property access) | Requires a **gather** across column buffers (materialize a row object) |
| Per-field MobX observability | Natural - one observable per record/field | **Unnatural** - a typed array is one opaque buffer; MobX cannot see into index `i` of a `Float64Array` |
| Aggregation / filter / scan | Slow-ish, single-thread JS | **Fast** - vectorized, the engine's whole reason to exist |
| Editing / dirty tracking | First-class in Store | Columnar buffers are append/replace-oriented; per-cell edit is awkward |

### The load-bearing conclusion

**A columnar engine is an excellent *compute and storage* layer and a poor *reactivity granularity*
layer.** You do not get to keep "MobX observes each field" if the data lives in column buffers - the
buffer is opaque to MobX. The viable pattern is therefore **not** "make Arrow buffers observable."
It is:

> **Columnar engine holds the truth; the reactivity layer observes *the query result*, not the raw
> columns.** A View subscribes to the engine, receives a result set (and deltas), and *materializes a
> thin row-shaped projection* that MobX/AG Grid consume. The engine boundary sits between
> "columnar facts" and "row-shaped, observable result." This is exactly Perspective's `Table`
> (columnar) -> `View` -> `on_update(delta)` shape, and it is exactly Hoist's `Cube` -> `View` ->
> consuming `Store` shape. **The two map onto each other almost one-to-one** - which is the strongest
> single argument that a columnar engine can coexist with the shared-store contract.

The cost you trade for the memory win is **materialization on the result side**: gathering rows out
of columns to feed AG Grid/charts. Whether that gather is cheaper than today's multiplication cascade
is precisely a harness question (see Serialization Tax below). It is plausibly a net win *because the
result set is usually far smaller than the leaf set* - but "usually" is doing work that must be
measured, since many widgets show near-full leaf sets (kickoff §5).

---

## Recommended Architecture (for the *integration*, not a rewrite)

Given the coexistence mandate ("Data 2.0 stands alongside"), the recommended target is a **headless
engine behind the existing View contract**, not an engine that owns rendering.

```
        Server (Grails - we shape this)              Fixed client systems
        delta protocol / Arrow IPC / binary          WS / SignalR / HTTP
                 │                                          │
                 ▼                                          ▼
        ┌─────────────────────────────────────────────────────────┐
        │   INGEST ADAPTER  (normalizes both into engine updates)   │
        └──────────────────────────┬────────────────────────────────┘
                                   ▼
        ┌─────────────────────────────────────────────────────────┐
        │   DATA 2.0 ENGINE (columnar; worker/WASM or main-thread)  │
        │   leaf facts + incremental aggregation                    │
        └──────────────────────────┬────────────────────────────────┘
                                   │  result sets + DELTAS (Arrow)
                                   ▼
        ┌─────────────────────────────────────────────────────────┐
        │   VIEW BRIDGE  (Hoist View contract, unchanged signature) │
        │   - subscribes to engine query                            │
        │   - applies delta to a row-shaped projection              │
        │   - wraps projection in a MobX atom (reportChanged)       │
        └──────────────────────────┬────────────────────────────────┘
                                   ▼   << shared, grid-independent substrate preserved >>
        ┌──────────┬───────────────┬─────────────┬──────────────────┐
        │ AG Grid  │   Charts      │  Toolbars   │  other consumers  │
        │(txns)    │               │             │                   │
        └──────────┴───────────────┴─────────────┴──────────────────┘
```

**Why this shape:** the `View -> Store` contract is the natural insertion seam. If Data 2.0 replaces
*what is behind the View* without changing the View's outward signature, the shared-store contract
and every non-grid consumer survive untouched. The engine swap is invisible above the bridge.

---

## Architectural Patterns

### Pattern 1: Headless engine behind the View contract (RECOMMENDED default)

**What:** The new engine replaces the Cube's internal compute/storage but keeps emitting results
through the existing `View`. The View becomes a *bridge* that subscribes to the engine and applies
its output into a consuming Store (or directly drives a MobX atom).

**Where the seam goes:** between the engine and the View. Above the View, *nothing changes* - AG
Grid, charts, and toolbars still read one filtered Store.

**Shared-store contract:** PRESERVED. This is the only pattern that fully preserves it by construction.

**Reactivity bridge:** The View wraps each result projection in a MobX atom. On a delta, the bridge
mutates the projection and calls `atom.reportChanged()`; consumers re-derive. MobX's `createAtom` /
`reportObserved` / `reportChanged` is the documented, supported mechanism for "integrating external
data engines or streams into MobX's reactivity system" (MobX custom-observables docs, MEDIUM-HIGH).

**Trade-offs:** Cleanest coexistence; lowest blast radius. Cost is the result-side materialization /
serialization tax (below). Does not by itself buy threading unless the engine is off-main-thread.

**Example (bridge sketch):**
```typescript
// View bridge: engine is the source of truth; MobX observes the *projection*.
class EngineView {
    private atom = createAtom('EngineView');
    private rows: PlainRow[] = [];   // row-shaped projection consumers read

    constructor(engineQuery: EngineQuery) {
        // Perspective-style: deltas arrive as Arrow; apply to projection, then notify MobX.
        engineQuery.onUpdate(delta => {
            applyDeltaToRows(this.rows, delta);   // mutate in place where possible
            this.atom.reportChanged();             // fine-grained-ish: per-view, not per-field
        });
    }
    get result(): PlainRow[] {
        this.atom.reportObserved();
        return this.rows;
    }
}
```

### Pattern 2: Perspective as the engine (the closest off-the-shelf fit)

**What:** Use FINOS Perspective's `Table` (columnar, C++/WASM) as the Data 2.0 engine, headless -
i.e. **without** `perspective-viewer`, feeding Hoist's existing AG Grid via the View bridge.

**Why it is uncannily close:** Perspective's model *is* the Hoist Cube model.
- `Table` (columnar leaf facts) == Cube's internal store of leaf records.
- `Table.view({group_by, filter, aggregates})` == a Hoist `View` query.
- `view.on_update(cb, {mode: "row"})` delivers **row deltas of only changed rows** == Cube's
  differential fan-out. (Verified, Context7.)
- One `Table` feeds many `View`s, each with its own query == one Cube feeding many widgets.

**Placement is configurable** (this is the architecturally important part, HIGH confidence via
Context7): Perspective can run
1. **In a Web Worker** (`perspective.worker()`) - off-main-thread compute, deltas streamed back as
   Arrow IPC;
2. **On the server** (Python/Node/Rust) with the browser as a thin `perspective.websocket()` client
   that proxies queries - data stays server-side; **or**
3. **Hybrid:** clone a server `Table` into a *local* WASM `Table` where "delta updates are streamed
   automatically via Arrow IPC" - server is source of truth, local engine answers queries.

That hybrid is essentially a productized version of Hoist's "WebSocket feeds a central cube" pattern,
with the binary delta protocol *already built*.

**Shared-store contract:** PRESERVED if used headless behind the View bridge. BROKEN if you adopt
`perspective-viewer` as the renderer (then Perspective owns the grid and charts, and AG Grid / the
shared Store fall away - that is the "eject from Hoist" path).

**Reactivity bridge:** `on_update` -> mutate projection -> `atom.reportChanged()`. The delta is
row-shaped and small, which is the good case for the bridge.

**Trade-offs:** Purpose-built for financial dashboards; streaming + incremental aggregation are
native; licensing is permissive (Apache/FINOS). Costs: a multi-MB WASM payload; a second columnar
copy of leaf data (engine) on top of whatever Hoist retains; and the worker/WASM boundary tax on
*large* result reads (below). Dynamic schema and arbitrary calculated-column dependency graphs need
verification against Perspective's expression columns.

### Pattern 3: Engine-owns-the-data, render layer thinned (the "eject" path)

**What:** Data 2.0 engine owns storage *and* the query layer *and* potentially the renderer
(Perspective viewer, or a WASM grid). Hoist's Store/Cube/GridModel shrink or disappear.

**Where the seam goes:** at the very top, between engine-owned UI components and the rest of the app.

**Shared-store contract:** BROKEN unless deliberately rebuilt. Charts/toolbars would have to read
from the engine's own view API rather than a shared Hoist Store. This is the path that loses the
thing the kickoff calls "central to Hoist's identity."

**When justified:** only if the harness shows the materialization/bridge tax of Patterns 1-2 is
prohibitive at target scale AND an engine-native renderer hits the latency target that the
Store->transaction->AG Grid path cannot. Treat as the *fallback*, not the default.

### Pattern 4: Lean MORE on AG Grid internals while keeping the shared substrate

**What:** Instead of (or alongside) a new engine, route *calculated columns and some aggregation*
through AG Grid 36's native features (calculated columns, "show values as", aggregation editing,
automatic column generation) - but keep the **shared Store as the single filtered dataset** that
charts and toolbars read.

**The architectural tension (this is the §7 strategic question made concrete):** AG Grid's calculated
columns and aggregation operate on AG Grid's *internal* row model. If a user creates a calculated
column in AG Grid, that derived value lives in AG Grid's nodes - **invisible to the shared Store**, so
charts/toolbars cannot see it. Verified framing: AG Grid `valueGetter`s "must be pure functions" and
the grid "recalculate[s] all aggregations impacted by the changed value" internally (AG Grid docs).
That internal-ness is exactly what bypasses the Store layer (kickoff §3.1).

**Two sub-patterns to preserve the contract:**
- **(4a) Derive in the Store, project to the grid.** Calculated columns are defined as Store-level
  computed fields (the engine or a derived-field layer computes them); AG Grid just *displays* them
  via a thin `valueGetter` that reads the Store value. Shared-store contract PRESERVED; you reimplement
  the calculated-column *UI* but not the math routing. This is the Hoist-aligned answer.
- **(4b) Mirror grid-side calculations back into the Store.** Let AG Grid compute, then write derived
  results back into the shared Store so other consumers can see them. Possible but fragile - two
  sources of truth, ordering/echo hazards. Not recommended as a primary pattern.

**Where the seam goes:** the calculated-column *definition* and *math* live below the View (Store/
engine); AG Grid is a pure projector. The seam stays at the View, same as Pattern 1.

**Reactivity:** unchanged - derived fields are MobX computeds over the Store.

### Pattern 5: Server-side pre-aggregation pushing deltas (the transport-led pattern)

**What:** Push aggregation to the server (Grails / hoist-core), pre-aggregate to the shape each widget
needs, and stream **deltas** down. The client engine becomes thin - it holds pre-shaped results and
fans them to consumers.

**Where the seam goes:** at the network. The "query" is effectively defined server-side; the client
View subscribes to a server-maintained result.

**Asymmetric-control reality (verified framing, MEDIUM):** this is only available where *we* control
the transport (Grails). Industry pattern is continuous/materialized aggregates server-side (e.g.
TimescaleDB continuous aggregates) plus **delta encoding over a binary protocol (protobuf/Arrow IPC)
on WebSocket**. Where the client transport is fixed (their WebSocket/SignalR/HTTP), this degrades to
client-side aggregation - so the architecture must support *both* modes behind one View contract.

**Shared-store contract:** PRESERVED - results still land in a shared Store.

**Trade-offs:** Slashes client memory/CPU (the §3.2/§3.4 wins) and is the most robust answer to the
real-time-latency ask, because the heavy recompute happens server-side and only a small delta crosses
the wire. Costs: server compute/bandwidth, and it only works on the controllable transport. **This is
probably the highest-leverage pattern for the EMC real-time ask specifically**, and it is independent
of the columnar-engine choice - the two compose.

---

## Data Flow

### The serialization / engine-boundary tax (the crux for large result shapes)

This is the single most important quantitative risk and the kickoff names it the crux. Framing
(MEDIUM-HIGH, multiple sources):

- **Structured-clone copy across a worker boundary is expensive for large data**; reported figures
  put a full structured clone of a ~MB buffer at ~270ms vs ~29ms for a transfer - roughly 100x for
  large buffers (MDN; multiple practitioner sources).
- **Transferables (ArrayBuffer) move ownership with zero copy** but *detach* the buffer in the sender
  - usable for one-shot handoff, not for a buffer the engine must keep.
- **SharedArrayBuffer is not transferable but is genuinely shared** - both threads see the same
  memory. This is the only true zero-copy-*and*-retained option, and it requires cross-origin
  isolation headers (COOP/COEP). For a Chromium/Edge-first deployment this is acceptable. Arrow's
  columnar layout is explicitly designed for this zero-copy shared-memory case (Arrow zero-copy paper).
- **Arrow IPC is the right wire format** for crossing worker *and* network boundaries: deltas serialize
  as `RecordBatch` messages, and the format even has first-class **delta** support
  (`DictionaryBatch.isDelta`) (Apache Arrow IPC spec, Context7).

**The decision rule this yields:**

> The boundary tax scales with **result size**, not leaf-set size. Offloading compute to a worker/WASM
> engine is a net win **iff** the data crossing back per update is small relative to the compute saved.
> For Hoist's hard case - widgets showing near-full leaf sets plus aggregates - the result is large, so
> a naive "serialize the whole result every tick" worker design can erase the gain (the kickoff's
> warning, now mechanistically explained). **Mitigations, in priority order:** (1) ship **deltas
> only**, not full results (Perspective's `on_update` row-delta mode does exactly this); (2) use
> **Arrow** so serialization is layout-copy not object-graph-walk; (3) use **SharedArrayBuffer** for the
> retained columnar store so reads need no copy at all; (4) keep the engine **on the main thread** for
> widgets whose results are genuinely large and whose compute is light, accepting no threading there.

There is no universal answer - the harness must measure per result shape. But the *architecture* must
make delta-only + Arrow + (optional) SAB the default path, because that is the only path with a
plausible win at our result sizes.

### Update fan-out flow (target, columnar engine, worker placement)

```
server delta ──(Arrow IPC / protobuf over WS)──► ingest adapter
   │
   ▼
engine.update(delta)  [in worker]   ── recompute affected aggregations incrementally
   │
   ▼ (per subscribed View)
view.on_update ──► row-delta (small) ──(structured clone or SAB)──► main thread
   │
   ▼
bridge: apply delta to projection ; atom.reportChanged()
   │
   ├──► AG Grid: translate to applyTransactionAsync (high-frequency path)
   ├──► charts: re-derive from shared projection
   └──► toolbars: re-derive filter facets
```

Two verified details that matter here:
- AG Grid's **`applyTransactionAsync`** is the correct high-frequency ingest API ("Async Transactions
  allow for efficient high-frequency grid updates"; updating row data directly is the anti-pattern) -
  GridModel already does transaction translation, so this path is preserved. (AG Grid docs.)
- Perspective resolves `Table.update` only *after* all derived `View.on_update` callbacks fire - i.e.
  it has a built-in, coalesced, consistent fan-out, the same property Hoist's Cube provides. (FINOS.)

---

## Scaling Considerations

Reframed for *this* domain - scaling is in **rows x fields x update rate x memory**, not user count.

| Scale | Architecture adjustments |
|-------|--------------------------|
| ~30-60k positions x tens of fields (today's ceiling) | Current row-record stack *fits* but is near its wall. Structural-sharing (Immer-style reference reuse) and killing copy-points can buy headroom **without** rearchitecture - cheap, high-ROI first move. |
| ~100-250k positions, or smaller-heap machines | Columnar storage becomes the memory unlock (typed arrays vs per-object overhead). Move leaf facts into a columnar engine (Arrow/Perspective) behind the View; keep result projections row-shaped. SharedArrayBuffer to avoid copy on read. |
| 500k+ positions, or many such tabs | Server-side pre-aggregation + delta push (Pattern 5) becomes necessary where transport allows; client holds pre-shaped results only. Otherwise off-main-thread WASM engine with delta-only fan-out. |

### Scaling priorities (what breaks first)

1. **Memory saturation** breaks first (the documented OOM history, the multiplication cascade). Fix
   order: eliminate copy-points / structural sharing -> columnar leaf storage -> server pre-aggregation.
2. **Main-thread jank** breaks second under real-time cadence. Fix order: delta-only fan-out +
   `applyTransactionAsync` -> off-main-thread engine -> server pre-aggregation.

Both fixes converge on the same architecture: **columnar facts + delta-only fan-out behind the View
contract**, with server pre-aggregation as the transport-permitting accelerant.

---

## Anti-Patterns

### Anti-Pattern 1: Making columnar buffers directly MobX-observable

**What people do:** Try to wrap Arrow column buffers in MobX so consumers "just observe the data."
**Why it's wrong:** MobX cannot see into index `i` of a `Float64Array`; you would have to observe the
whole buffer as one atom, destroying fine-grained reactivity, or shadow every cell as an observable,
destroying the memory win that motivated columnar in the first place.
**Do this instead:** Observe the *query result projection*, not the raw columns. One atom per View
result; deltas mutate the projection and `reportChanged()`.

### Anti-Pattern 2: Serializing full result sets across the worker boundary every tick

**What people do:** Run the engine in a worker, then `postMessage` the entire query result on each
update.
**Why it's wrong:** For near-full-leaf-set widgets the structured-clone copy can cost more than the
compute it offloaded - the gain inverts.
**Do this instead:** Ship **deltas only** as Arrow IPC; use SharedArrayBuffer for retained columnar
state; keep main-thread placement for light-compute/large-result widgets.

### Anti-Pattern 3: Enabling AG Grid's native calculated columns naively

**What people do:** Turn on AG Grid 36 calculated columns / aggregation because "it's AG Grid."
**Why it's wrong:** Derived values live in AG Grid's internal node model, invisible to the shared
Store - charts and toolbars cannot see them, silently breaking the shared-store contract.
**Do this instead:** Compute derived fields below the View (Store/engine computed fields) and let AG
Grid *display* them via a thin pure `valueGetter` (Pattern 4a).

### Anti-Pattern 4: Adopting the engine's UI to get the engine's speed

**What people do:** Take Perspective (or a WASM grid) wholesale, including its viewer, to get fast
rendering.
**Why it's wrong:** The renderer then owns the data; the shared, grid-independent substrate that
non-grid consumers depend on is gone. You have replaced Hoist's identity, not augmented it.
**Do this instead:** Use the engine **headless** behind the View bridge; keep AG Grid + the shared
Store as consumers (Patterns 1-2). Only eject (Pattern 3) if the harness proves the bridge tax is
fatal.

### Anti-Pattern 5: Treating "off-main-thread" as automatically faster

**What people do:** Assume moving compute to a worker/WASM always helps.
**Why it's wrong:** Threading solves jank, not memory, and adds a serialization tax that for large
results can dominate. The bridge cost is the crux, not the compute.
**Do this instead:** Decide placement per workload from harness numbers; default off-thread only for
heavy-compute / small-result widgets, on-thread for light-compute / large-result widgets.

---

## Integration Points

### External engines (candidate seams)

| Engine | Integration pattern | Notes |
|--------|---------------------|-------|
| Perspective (FINOS) | Headless `Table`+`View` behind View bridge; worker / websocket / hybrid placement | Closest structural fit; native delta fan-out + Arrow IPC; permissive license; multi-MB WASM; verify expression-column dependency graphs & dynamic schema |
| Apache Arrow JS | Columnar storage primitive under a custom View; Arrow IPC for transport/worker | Format + memory layer, not a query engine; pair with own aggregation or DuckDB |
| DuckDB-WASM | SQL engine; query = SQL, no native change-notification -> re-query or build delta layer | Strong analytics/Arrow interop; **no built-in reactive model** is the key integration gap; large WASM payload |
| SQLite-WASM | Durable/queryable leaf store; thin reactive delta layer on top | Same no-reactivity gap as DuckDB; hybrid "index leaves, serialize deltas" worth a spike |
| Immer / structural sharing | Reduce copy-points in the *existing* row stack; no rearchitecture | Cheapest near-term memory win; note Immer + MobX do not compose directly (MobX getters/setters), so use for plain-object layers / the raw->record transition |
| AG Grid 36 native features | Display layer for Store-derived calculated columns (Pattern 4a) | Keep math below the View; grid as projector only |

### Internal boundaries

| Boundary | Communication | Considerations |
|----------|---------------|----------------|
| Engine <-> View bridge | Result sets + **row deltas** (Arrow preferred) | THE seam. Keep delta-only; this is where the serialization tax is paid or avoided |
| View bridge <-> MobX | `createAtom` / `reportObserved` / `reportChanged` | Per-View atom granularity; do not try for per-field across a columnar boundary |
| Store <-> AG Grid | `applyTransactionAsync` (existing GridModel translation) | Preserved as-is; high-frequency path already correct |
| Store <-> charts/toolbars | MobX-observed shared projection | The shared-store contract; must remain the single filtered dataset |
| Ingest adapter <-> transport | Arrow IPC / protobuf delta (ours) OR fixed WS/SignalR/HTTP (theirs) | Must support both behind one contract; degrade gracefully on fixed transport |

---

## Build-Order Implications (for the roadmap)

The architecture dictates an order that de-risks the seam before committing to any engine:

1. **Instrument the existing seam first.** The View->Store boundary is where Data 2.0 plugs in;
   the harness must measure today's copy-points and per-update fan-out cost *at that exact seam* so
   any engine is compared apples-to-apples. (Aligns with Phase 1/2.)
2. **Cheap structural-sharing spike before any engine.** Immer-style copy elimination in the
   raw->record transition may buy meaningful memory headroom with zero rearchitecture - measure it
   before reaching for WASM.
3. **Prove the bridge with a delta-only, row-shaped projection** behind the existing View, using a
   stub engine, to validate the MobX-atom reactivity bridge in isolation - *before* introducing a
   real columnar engine. This isolates "does the bridge pattern work" from "is engine X fast."
4. **Perspective headless spike** as the lead engine candidate (closest structural fit; native
   deltas), measured at our real result shapes - specifically the large-result worker-boundary tax.
5. **Server-pre-aggregation spike** in parallel on the Grails-controlled transport - it is engine-
   independent and likely the strongest answer to the real-time ask; it composes with any engine.
6. **Pilot selection follows the seam, not the feature.** The first coexistence pilot should be a
   single high-volume widget where the View->Store seam is clean and the result set is *not* the full
   leaf set (best-case bridge economics), to demonstrate "Data 2.0 alongside" with the lowest risk.

**Every pattern's relationship to the two invariants, summarized:**

| Pattern | Shared-store contract | MobX reactivity bridge |
|---------|----------------------|------------------------|
| 1. Headless engine behind View | PRESERVED (by construction) | atom per View result |
| 2. Perspective headless | PRESERVED | `on_update` -> atom |
| 3. Engine-owns-data / eject | BROKEN unless rebuilt | engine-native; bridge unclear |
| 4a. Derive in Store, project to grid | PRESERVED | MobX computeds (native) |
| 4b. Mirror grid calc back to Store | FRAGILE (two sources of truth) | possible, echo hazards |
| 5. Server pre-aggregation + delta | PRESERVED | unchanged (results land in Store) |

---

## Sources

- Apache Arrow - columnar format, IPC `RecordBatch`/`DictionaryBatch` (incl. `isDelta` delta dictionaries), zero-copy interchange. Context7 `/apache/arrow` (HIGH).
- FINOS Perspective - C++/WASM streaming engine; `Table`/`View`/`on_update({mode:"row"})` row deltas; `perspective.worker()`, `perspective.websocket()`, server/hybrid placement; Arrow IPC delta streaming; headless vs `perspective-viewer`. Context7 `/perspective-dev/perspective`; https://perspective.finos.org/guide/explanation/view.html ; https://deepwiki.com/finos/perspective/1-overview (HIGH for API/placement, MEDIUM for internals).
- MobX custom observables - `createAtom` / `reportObserved` / `reportChanged` for bridging external data sources into MobX reactivity. https://mobx.js.org/custom-observables.html ; https://mobx.js.org/api.html (MEDIUM-HIGH).
- Web Worker boundary costs - structured clone vs transferables (~100x for large buffers), SharedArrayBuffer semantics & cross-origin isolation. https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Transferable_objects ; https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer (MEDIUM-HIGH).
- Arrow zero-copy shared memory - https://arxiv.org/pdf/2404.03030 (MEDIUM).
- AG Grid - high-frequency `applyTransactionAsync`, value getters as pure functions, internal aggregation recompute, SSRM datasource. https://www.ag-grid.com/javascript-data-grid/data-update-high-frequency/ ; https://www.ag-grid.com/javascript-data-grid/value-getters/ ; https://blog.ag-grid.com/whats-new-in-ag-grid-36/ (MEDIUM-HIGH).
- DuckDB-WASM in browser - OLAP, Arrow/typed-array zero-copy, no native reactive model. https://medium.com/@jickpatel611/olap-in-your-browser-duckdb-meets-wasm-9248b1077281 ; https://motherduck.com/blog/duckdb-ecosystem-newsletter-february-2026/ (MEDIUM/LOW - practitioner sources).
- Server-side pre-aggregation / delta push - continuous/materialized aggregates, protobuf/binary delta over WebSocket. https://hexshift.medium.com/how-to-build-real-time-financial-dashboards-81fe8bd00181 ; https://medium.com/@akhilvpsharma/system-design-real-time-stock-market-data-streaming-at-scale-2ee276619ba9 (LOW-MEDIUM - practitioner sources).
- Immer structural sharing - shared-data reuse, `produceWithPatches`; Immer/MobX non-composition caveat. https://immerjs.github.io/immer/ ; https://github.com/immerjs/immer/issues/515 (MEDIUM).

---
*Architecture research for: in-browser analytical/dashboard data layers (Hoist Data Layer 2.0)*
*Researched: 2026-06-27*
