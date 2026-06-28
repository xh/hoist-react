# Project Research Summary

**Project:** Hoist Data Layer 2.0
**Domain:** In-browser client-side analytical data layer for data-dense financial dashboards (React / MobX / AG Grid / TypeScript, Chromium/Edge-first, desktop)
**Researched:** 2026-06-27
**Confidence:** MEDIUM-HIGH overall - HIGH on technology facts, versions, and architecture patterns; MEDIUM on bridge-cost magnitudes for our specific result shapes (the decisive numbers must come from the Phase 2 harness, not this document)

---

## Executive Summary

Hoist Data Layer 2.0 is an R&D, baseline-measurement, and strategy effort targeting the Store / Cube / View / GridModel complex. The central question is whether an alternative compute/storage engine (columnar WASM, SQL in-browser, structural sharing, or server-side pre-aggregation) can outperform the current row-record stack on the two binding constraints: memory multiplication across the full data pipeline, and throughput under sustained high-rate batch updates. All four research streams converge on a single decisive finding: **the JS-to-engine bridge cost (transpose tax + reactivity tax) is the crux that determines every build/adopt verdict**, and it can only be settled by a measurement harness operating on realistic result shapes - many leaf rows (up to ~60k) plus aggregate tree, sustained at batch cadence - not by vendor benchmarks on thin summaries.

The strongest single candidate is **Perspective v4.5.1** (FINOS, Apache-2.0), which is structurally the closest off-the-shelf match: its `Table -> View -> on_update(delta)` pipeline mirrors Hoist's `Cube -> View -> Store` fan-out almost one-to-one, it has a native incremental/streaming update model designed for financial dashboards, and its engine and viewer are separable. Critically, it can be used **headless** - the engine feeds our existing AG Grid through the View bridge, preserving the shared-store contract and the AG Grid investment. **DuckDB-WASM** is a strong analytics engine but has been re-tiered to a supporting role: its lack of materialized views and native streaming ingest means every delta batch requires a full re-query and re-transpose, which is structurally mismatched to our differential fan-out pattern. The two cheapest near-term wins - **structural sharing (Immer/Mutative)** to cut copy-points in the existing StoreRecord cascade, and **backend aggregation** (pre-shape deltas server-side on the Grails transport) - deserve early spikes because they require no rearchitecture and may deliver meaningful headroom.

The validated current architecture (per KICKOFF-VALIDATION.md) corrects several claims from the original brief that would have misdirected planning. Update transport is **pluggable and varies by client** - Hoist supports HTTP poll-then-diff (what the local sample apps use), first-class **WebSocket data push** (`XH.webSocketService`, shown in Toolbox's portfolio example and used in client apps not checked out locally), WebSocket-as-notification, and SignalR; the layer is transport-agnostic and must stay adaptive to whatever a client presents. Cube-to-View propagation is imperative push (`noteCubeUpdated`), not MobX observation; MobX observability enters only at the `View.result` boundary (`@observable.ref`). Weighted-average aggregation is a custom `Aggregator` subclass, not a built-in. These corrections sharpen the integration seam analysis: any new engine must feed MobX observability at the `View.result -> Store` boundary, and any transport- or pattern-specific performance unlock must be treated as a labeled, conditional optimization - broadly-adopted solutions must work across the transport variety.

---

## Key Findings

### Recommended Stack

No single engine dominates across all constraints; the recommended set is a prioritized evaluation list ordered by fit to our actual workload shape (large leaf sets + aggregates, high delta rate, shared-store contract, MobX reactivity).

**Core technologies (evaluate seriously - spike against the harness):**

- **Perspective v4.5.1** (`@finos/perspective`, Apache-2.0) - streaming columnar WASM analytics engine, purpose-built for financial dashboards, with a native incremental update + change-notification model (`on_update`, index-based partial `update()`) that maps directly to our cube delta-fanout pattern. The most important single spike: measure headless (engine feeds our Store/AG Grid) AND viewer modes, at real result shapes.
- **Apache Arrow JS v21.1.0** (`apache-arrow`, Apache-2.0) - not an engine but the columnar interchange format every WASM engine speaks. Evaluate as the boundary format and to measure the transpose tax (Arrow column buffers -> row StoreRecords) in isolation. The decisive measurement instrument for understanding the bridge cost floor.
- **DuckDB-WASM v1.5.4 / npm 1.33.x** (`@duckdb/duckdb-wasm`, MIT) - best-in-class in-browser analytical query speed, Arrow-native I/O. Re-tiered to a supporting role: evaluate for durable/queryable leaf storage and heavy batch/ad-hoc analytical queries, NOT as the real-time delta-fanout engine (no materialized views, no incremental re-aggregation, single-threaded in browser).

**Supporting libraries (evaluate lightly - cheap or narrow role):**

- **Immer / Mutative** (both MIT) - structural sharing to cut copy-points in the StoreRecord cascade without rearchitecture. Potentially the highest-ROI / lowest-effort near-term experiment. Prefer Mutative if Immer's auto-freeze/Proxy cost shows in the harness hot path (10-17x faster on large state).
- **Arquero** (`uwdata`, BSD-3-Clause) - pure-JS Arrow-backed dataframe; the "go columnar but stay in JS" midpoint. No WASM dependency, no cross-origin-isolation requirement. Worth one spike as a low-risk improvement over hand-rolled cube aggregation.
- **Web Workers** (platform) - measurement vehicle for the bridge cost, not a solution by itself. Pair with Arrow Transferable buffers to get the best-case boundary number.
- **Backend aggregation via hoist-core (Grails)** - not a library, but a first-class architectural option: push aggregation server-side and ship pre-shaped deltas. Strongest where we control transport. The lowest-client-memory path; composes with any engine choice.

**Version compatibility notes:**
- `@duckdb/duckdb-wasm` 1.33.x and `apache-arrow` 21.x must be version-aligned (Arrow major) to avoid RecordBatch shape mismatches.
- DuckDB-WASM multi-threading (and `performance.measureUserAgentSpecificMemory()` for heap attribution) both require cross-origin isolation headers (COOP/COEP) - a deployment constraint to confirm per-client before scoring as viable.
- Perspective 4.5.x accepts Arrow-format ingest; it bundles its own WASM engine and is not built on Arrow JS.

**Explicitly deprioritized:** sql.js (superseded), SQLite-WASM as an analytics engine (OLTP, no reactive model, Worker1/Promiser API deprecated 2026-04-15), Glide Data Grid (renderer, not data engine), TanStack Query (useful patterns, not an analytical engine).

### Expected Features

The calculated-columns taxonomy is the feature spec's center of gravity, and it must keep three genuinely distinct flavors separate because they differ in where they compute, how they interact with grouping, and what they cost.

**Must have (table stakes) - specify and build first:**
- **CC-1: simple per-row derived column** (`C = A + B`), computed in the shared data layer (not grid-only), reaching the Store, with a declared roll-up aggregator and lazy-by-default evaluation - the AG Grid 36 competitive trigger.
- **CC-2: runtime user-chosen aggregation (sum, avg) on existing fields** - retires the "pre-code every variant, everyone sees the union" pain; the runtime-dynamic selection of active aggregations is the new work, not the aggregation math.
- **Correct multi-level grouped aggregation and grand totals** preserved for all of the above (the cube already does this; must not regress it).
- **Derived/calc columns are filterable, sortable, groupable** like real fields - requires derived values to reach the Store, not live only in the grid.

**Should have (differentiators) - add after core validates:**
- **CC-2 weighted-average-by-another-field** - Excel pivot tables cannot do this correctly (no SUMPRODUCT in calculated fields); native runtime weighted aggregation is a clean competitive win.
- **"Show values as" / % of total** (group, parent, grand total) as a ratio axis on CC-2 - owned by us dodges AG Grid's CSRM-only limitation.
- **Renderer/formatter registry** for derived and dynamic fields to carry presentation config.
- **Sub-second recompute-and-render under live batches** - differentiator only if the harness proves it.

**Defer to v2+ (high value, high risk, flag for deep research):**
- **CC-3: dependency chains** with managed dependency graph, topological incremental recompute, and cycle prevention - the most likely differentiator and the most likely source of subtle bugs.
- **Dynamic / soft-defined schema** (non-derived, runtime field addition by entitled admin, no redeploy) - the 20% case; a **weighted factor, not a gate**. Flag candidates that preclude it; don't let it eliminate every otherwise-strong option.
- **Lazy/materialized evaluation as an exposed, per-column tunable** - once profiling under the harness justifies the knob.

**Anti-features (deliberately do NOT build):**
- Route calculated columns through AG Grid's internal model ("just turn it on") - bypasses the shared Store; charts/toolbars go blind.
- Full spreadsheet formula language (cell-level, A1:B7 ranges, 100+ functions) - fights the row-record + MobX model; column-level expression language against a curated function set covers the real needs.
- Aggregation write-back (edit a total, push down to leaves) - semantically fraught for read-oriented financial aggregates; the cube is primarily read/aggregate-oriented.
- Unbounded eager materialization of user-created calc columns - multiplies leaf-level heap.

**AG Grid 36 parity context:** AG Grid 36.0 (shipped 2026-06-24) lands calculated columns, "show values as," and automatic column generation; 35.2 added aggregation editing; 35 added formula editing. All advanced analytics features (FormulaModule, PivotModule, and by inference calculated columns and "show values as") sit in AG Grid Enterprise. Confirm XH per-client entitlement before depending on any of them. The strategic tension: AG Grid computed columns are grid-internal and invisible to the shared Store - parity on the feature would cost parity on the shared-data contract.

### Architecture Approach

The validated integration seam is the **View.result -> Store boundary**: the cube-to-view propagation is imperative push (`noteCubeUpdated`), and MobX observability enters only at `View.result` (`@observable.ref`). Any new engine must feed that seam, not some imagined cube-level observable. The recommended target is a **headless engine behind the existing View contract** - the engine replaces what is behind the View without changing the View's outward signature, leaving the shared-store contract and every non-grid consumer untouched.

**Major components:**
1. **Ingest / Transport adapter** - normalizes our shapeable Grails transport and fixed client transports (WebSocket/SignalR/HTTP) into engine update calls; must degrade gracefully where transport is fixed.
2. **Compute / Storage engine** - holds leaf facts; applies filter/group/aggregate; recomputes incrementally. The "Data 2.0 candidate" layer. Can be row-record (current), columnar (Arrow/Perspective/DuckDB), or server-resident.
3. **Query / View layer** - a stable, named subscription (a query) that emits result sets AND incremental deltas. Hoist `View` == Perspective `View`; this mapping is the strongest argument for Perspective coexistence.
4. **Reactivity / Observation bridge** - the seam where any cross-thread or WASM engine connects to MobX. Pattern: wrap the query result projection in a MobX `createAtom`; deltas mutate the projection in place and call `atom.reportChanged()`. Per-View atom granularity, not per-field.
5. **Render consumers** - AG Grid (synchronous `applyTransaction` today; `applyTransactionAsync` is the documented high-frequency path and should be evaluated), Highcharts, toolbars, all reading the same shared Store.

**The serialization / bridge tax (decision rule):** The boundary tax scales with result size, not leaf-set size. Mitigations in priority order: (1) ship deltas only, not full results (Perspective's `on_update` row-delta mode does this natively); (2) use Arrow IPC so serialization is a layout copy, not an object-graph walk; (3) use SharedArrayBuffer for the retained columnar store (requires cross-origin isolation - confirm deployability per client); (4) keep the engine on the main thread for widgets whose results are genuinely large and whose compute is light.

**Key pattern to preserve:** derive calculated columns in the Store/engine layer below the View, and let AG Grid display them via a thin pure `valueGetter` (Pattern 4a). This keeps the shared-store contract intact and makes derived values available to charts/toolbars. Do not compute them inside AG Grid's internal model.

### Critical Pitfalls

1. **Benchmarking unrepresentative result shapes (tiny-summary fallacy)** - vendor benchmarks post "10-100x faster" numbers on small summaries. Our hard case is the full or near-full leaf set (~40-60k rows x tens of fields) PLUS aggregates. Make result shape a first-class harness parameter and report bridge/serialization cost as a separate line item from compute cost. A candidate that wins compute but loses on the fat-leaf round-trip must show as losing. (Phase 2 harness design, Phase 4 scoring)

2. **The serialization/bridge tax that silently erases offload gains** - `postMessage` of JS object arrays is a structured clone, a full deep copy on both sides on the main thread. For large results this can cost as much as the compute it offloaded. Measure three transfer strategies explicitly: (a) structured-clone of row objects (naive baseline), (b) Transferable Arrow/TypedArray buffers, (c) SharedArrayBuffer. Treat any candidate requiring main-thread row-object re-materialization as suspect until measured. (Phase 4, Phase 5)

3. **SharedArrayBuffer / cross-origin-isolation deployment trap** - SharedArrayBuffer (and `performance.measureUserAgentSpecificMemory()` for heap attribution) requires COOP/COEP headers that can break SSO iframes, third-party analytics widgets, and embedded content in locked-down financial deployments. Confirm deployability per client before scoring a SharedArrayBuffer-dependent candidate as viable. Provide a non-isolated fallback for heap attribution in the harness. (Phase 2, Phase 4)

4. **Reactivity non-fit: fast engine, no fine-grained update path** - SQLite-WASM and DuckDB-WASM have no built-in reactive/change-notification layer; the only way to reflect updates is to re-run the query and replace the whole result set, which forces a full re-render. Make the reactivity bridge a mandatory demonstrated deliverable in every candidate spike: a single-cell update must flow from engine to MobX observable to AG Grid transaction to single-cell DOM update, without a full result-set replacement. Score "must re-run full query to see changes" as a major negative. (Phase 4, Phase 5)

5. **Memory-multiplication cascade and OOM on small-heap machines** - a new engine that adds a columnar copy alongside the existing row-record pipeline can increase total heap even if its internal footprint is small. Evaluate every candidate on total-pipeline heap delta vs. baseline, never on engine-internal footprint alone. Test on a named small-heap machine target with a hard ceiling pass/fail gate; the 32GB dev machine will hide the problem. (Phase 1, Phase 2, Phase 4)

---

## Implications for Roadmap

The architecture dictates a build order that de-risks the seam before committing to any engine, and measures before recommending. The phases below reflect the dependencies and risk sequencing that all four research files converge on.

### Phase 1: Current-State Inventory and Baseline Architecture

**Rationale:** The validated architecture is the prerequisite for every measurement and comparison. Several claims from the original brief were imprecise (the single-transport WebSocket framing, built-in weighted-avg, cube as MobX observable) - corrected to: transport is pluggable/transport-agnostic, weighted-avg is a custom Aggregator, and MobX enters at View.result. Phase 1 resolves the two remaining explicit unknowns: the exact copy-vs-reuse map across the full data pipeline, and the MobX reaction granularity in the View.result -> Store -> GridModel -> AG Grid path.

**Delivers:**
- Corrected Store/Cube/View/GridModel architecture document with Mermaid diagrams and full data flow
- Copy-vs-reuse heap map (when/where data is copied vs. reused across each layer)
- MobX reaction granularity map (record-level vs. batch-level in the View.result -> Store -> AG Grid path)
- Baseline instrumentation points identified for the Phase 2 harness

**Addresses:** Memory-multiplication problem (PROJECT constraint), reactivity bridge analysis (architecture seam)
**Avoids:** Premature engine commitment before the baseline exists (Pitfall 11), benchmarking the wrong thing because the current stack is misunderstood (Pitfall 1)

### Phase 2: Measurement Harness and Baseline Performance Envelope

**Rationale:** The harness is the only thing that can settle "bridge cost is the crux" with numbers. Every candidate comparison depends on it. Building it before any candidate evaluation is the anti-premature-lock-in discipline. The harness must parameterize result shape (not just dataset size), measure compute and bridge cost as separate line items, drive sustained delta streams (not burst-only), force GC before heap snapshots, and provide a non-isolated fallback for heap attribution. OTel instrumentation at boundaries only, not per micro-op.

**Delivers:**
- Reusable, configurable load/throughput generator parameterizing dataset shape (`leafCount`, `aggregateRowCount`, `fieldCount`), update pattern/breadth/throughput, and transport
- Baseline performance envelope: where the current stack's wall is, on both memory and CPU, across dataset shapes and update cadences
- Per-layer heap attribution report (cube store records / grid store records / AG Grid nodes / view results)
- Measurement protocol: warm-up/iteration discipline, median+p95 reporting, post-GC heap snapshots, Chrome/Edge version pinned
- Batch-in / render-out invariant validation (one recompute/render per batch under sustained load)
- Toolbox technology demo (highest near-term business value - shows what the current stack can do at scale; land early)

**Uses:** Hoist OTel instrumentation (boundaries only), Chrome DevTools heap snapshots + `performance.measureUserAgentSpecificMemory()` (with non-isolated fallback), `timlrx/browser-data-processing-benchmarks` as a sanity baseline for engine-only query times
**Avoids:** Tiny-summary benchmarks (Pitfall 1), blended speed metrics hiding bridge cost (Pitfall 2), GC noise as signal (Pitfall 4), OTel overhead distorting hot paths (Pitfall 5), COOP/COEP dependency in the harness itself (Pitfall 3)

### Phase 3: Feature Spec and AG Grid 36 Parity Map

**Rationale:** Before evaluating engines against features, the feature spec must be locked and classified (gate vs. weighted factor). This phase turns the CC-1/CC-2/CC-3 taxonomy and dynamic-schema ask into a testable spec, applies the gate/factor classification, and produces the AG Grid 36 parity map to clarify which features require Store-layer computation vs. which could safely delegate to the grid.

**Delivers:**
- Calculated-columns feature spec (CC-1, CC-2, CC-3) with explicit aggregator + renderer requirements, lazy/materialized policy decision, and grouping interaction rules
- Gate/factor classification for every requirement (survivor check: if applying all gates leaves zero candidates, surface the conflict as a finding)
- AG Grid 36 parity map (feature cluster vs. taxonomy, with licensing/entitlement status per feature per client)
- Dynamic schema scoped as a factor - flag candidates that preclude it, weight rather than eliminate
- Confirmed AG Grid Enterprise entitlement for calculated columns, "show values as," and FormulaModule per client (esp. the lead client) before depending on any

**Addresses:** CC-1/CC-2/CC-3 taxonomy (FEATURES.md), own-it-all vs. lean-on-AG-Grid decision (ARCHITECTURE.md Pattern 4a), shared-store contract test
**Avoids:** Over-tailored spec that eliminates all candidates (Pitfall 10), naively routing calc through AG Grid's internal model (Pitfall 12)

### Phase 4: Technology Candidate Evaluation

**Rationale:** With the harness, baseline, and feature spec in hand, evaluate all candidates against the common rubric at real result shapes. Perspective is the lead candidate and must be measured in both headless and viewer modes. DuckDB-WASM is measured for its re-tiered role (batch/storage, not streaming fan-out). Structural sharing (Immer/Mutative) and backend aggregation are the cheapest experiments and should run early in this phase. Every candidate must demonstrate a single-cell incremental update path.

**Delivers:**
- Technology comparison matrix: every candidate scored on compute speed, bridge/serialization cost (fat-leaf scenario), memory (total-pipeline delta), reactivity bridge (demonstrated, not checkbox), and dynamic-schema compatibility
- Perspective headless spike at real result shapes - specifically the large-result worker-boundary tax
- DuckDB-WASM spike for batch/storage role (vs. real-time fan-out role)
- Structural sharing spike (Immer vs. Mutative) measuring heap delta and hot-path overhead
- Backend aggregation spike on the Grails-controlled transport path
- Arrow JS as boundary format + transpose-tax isolation measurement
- Arquero spike as the "go-columnar-stay-in-JS" midpoint option
- Per-client transport matrix (gates SharedArrayBuffer and backend-aggregation candidates by deployability)
- Reactivity bridge demonstrated for each live candidate: delta -> MobX atom -> AG Grid transaction -> single-cell DOM update

**Uses:** Perspective v4.5.1, Apache Arrow JS v21.1.0, DuckDB-WASM v1.5.4, Immer + Mutative, Arquero
**Avoids:** Unrepresentative benchmarks (Pitfall 1), bridge tax undiscovered (Pitfall 2), SharedArrayBuffer gated by deployment reality (Pitfall 3), reactivity non-fit evaluated after commitment (Pitfall 8), columnar/row mismatch (Pitfall 9), premature lock-in (Pitfall 11)

### Phase 5: Prototype Spikes and Strategy Synthesis

**Rationale:** The top candidate(s) from Phase 4 get full prototypes against a real Hoist widget, measured against the baseline on the harness. The coexistence pilot should be a single high-volume widget where the View -> Store seam is clean and the result set is not the full leaf set (best-case bridge economics), to demonstrate "Data 2.0 alongside" at the lowest risk. The strategy synthesis presents an honest tradeoff frontier, not a forced single recommendation.

**Delivers:**
- Full prototype for the top candidate(s): Perspective headless (and possibly backend aggregation path), benchmarked against baseline using the harness
- Validated reactivity bridge: `on_update` -> MobX atom -> AG Grid transaction, end-to-end incremental update demonstrated in a real widget
- Coexistence pilot selection: identify the first workload for a live "Data 2.0 alongside" deployment
- Quantitative targets: defensible numbers for max positions x fields, sustained batch size/rate without jank, end-to-end update-to-render latency, memory ceiling per tab (reference + small-heap machine)
- Strategy and roadmap synthesis: own-it-all vs. lean-on-AG-Grid assessment, tradeoff frontier, recommended path, phased adoption plan ("Data 2.0 alongside, then absorbs high-volume cases")

**Implements:** Headless engine behind the View contract (Architecture Pattern 1) or Perspective headless (Pattern 2); server pre-aggregation (Pattern 5) in parallel if the Grails transport path validates
**Avoids:** Engine-owns-data / eject path (Pattern 3) unless the harness proves the bridge tax is fatal; AG Grid calc-internal routing (Pattern 4b, fragile)

### Phase Ordering Rationale

- **Phase 1 before Phase 2:** The copy-vs-reuse map and reaction granularity are prerequisites for knowing what the harness must measure and where to instrument.
- **Phase 2 before Phase 4:** The harness and baseline must exist before any candidate is scored. The Toolbox demo lands here to deliver near-term business value.
- **Phase 3 concurrent with Phase 2:** Feature spec and gate/factor classification share no hard dependency with harness construction; landing before Phase 4 ensures candidates are scored against the right rubric.
- **Phase 4 before Phase 5:** The full comparison matrix determines which candidate(s) get full prototypes.
- **Structural sharing and backend aggregation are Phase 4's cheapest and fastest experiments** and should run early - they need no WASM, no cross-origin-isolation, and no new architectural seam.

### Research Flags

**Needs deeper research during planning:**
- **Phase 2:** Heap attribution methodology with and without cross-origin isolation; `applyTransaction` vs. `applyTransactionAsync` baseline tradeoff.
- **Phase 3:** AG Grid calculated columns CC-3 depth (column-level calc-on-calc, cycle handling - the docs page was inaccessible during research); AG Grid Enterprise entitlement confirmation per feature per client.
- **Phase 4:** Perspective delta granularity under high fan-out breadth (full-row vs. field-level delta, per GitHub discussions #1463/#1750); per-client transport and cross-origin-isolation deployability matrix; Perspective expression-column dynamic-schema support.
- **Phase 5:** Perspective worker placement API and WebSocket proxy mode; Arrow IPC delta protocol in depth; hoist-core Grails server-side aggregation architecture (if Phase 4 backend spike validates).

**Standard patterns (no dedicated research phase needed):**
- **Phase 1:** Source-reading and annotation against a known codebase with existing documentation and real production apps available locally.
- **Phase 2 (Toolbox demo):** Well-documented patterns within the existing Hoist framework.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack - technology facts, versions, licensing | HIGH | Versions verified against npm and official repos (2026-06-27). Perspective v4.5.1, Arrow JS v21.1.0, DuckDB-WASM v1.5.4 pinned. |
| Stack - bridge-cost magnitudes for our result shapes | MEDIUM | Directional understanding verified; decisive numbers must come from the Phase 2 harness. Vendor "10-100x faster" claims are not our numbers. |
| Features - AG Grid 36 feature surface | HIGH | Verified against AG Grid 36 announcement (2026-06-24) and Context7-indexed live docs. Enterprise tier tags for FormulaModule/PivotModule confirmed; calculated-columns tier tag MEDIUM (docs page 403'd). |
| Features - Excel competitive framing | MEDIUM | Weighted-average-in-pivot limitation corroborated across multiple help sources; not an authoritative Microsoft doc. Directionally reliable. |
| Architecture - integration seam and patterns | MEDIUM-HIGH | Perspective/Arrow architecture HIGH via Context7/official. MobX bridge pattern MEDIUM-HIGH (supported API, directionally verified). Specific bridge-cost numbers not yet measured. |
| Architecture - validated current state | HIGH | Corrections to the kickoff brief validated against hoist-react source and real app usage on 2026-06-27. |
| Pitfalls - structural pitfalls | HIGH | Corroborated by official Arrow/DuckDB/Perspective docs, web.dev COOP/COEP guidance, Chrome DevTools guidance, and the project's own validated architecture. |
| Pitfalls - specific copy/reuse behavior in our pipeline | MEDIUM | An explicit Phase 1 unknown - the copy-vs-reuse map is not yet resolved. |

**Overall confidence:** MEDIUM-HIGH on direction and candidate prioritization. LOW on the magnitudes that matter most - bridge cost at our result shapes - because those require the Phase 2 harness to resolve.

### Gaps to Address

- **Bridge-cost numbers:** The critical unknowns (transpose tax magnitude, reactivity tax, total-pipeline heap delta vs. baseline) are not resolvable by research alone. Every technology verdict marked MEDIUM should be treated as a hypothesis until the harness speaks.
- **Copy-vs-reuse map:** Phase 1 must resolve exactly when/where data is copied vs. reused across the raw object -> StoreRecord -> ViewResult -> grid store -> AG Grid node pipeline.
- **MobX reaction granularity:** Phase 1 must trace the exact reaction granularity (record-level vs. batch-level) in the View.result -> Store -> GridModel -> AG Grid path. This is a concrete baseline-measurement target.
- **Per-client transport and isolation matrix:** The transport asymmetry and cross-origin-isolation deployability question (gating SharedArrayBuffer and `measureUserAgentSpecificMemory`) need a client-by-client matrix before candidate scoring can be finalized. the lead client's deployment constraints should be confirmed early.
- **AG Grid Enterprise entitlement:** Whether XH's current Enterprise agreement covers calculated columns, "show values as," and FormulaModule across all clients (especially the lead client) is an open licensing question. Confirm before the feature spec depends on any of them.
- **Perspective delta granularity under high fan-out breadth:** Maintainer discussions suggest partial updates may propagate full rows rather than field-level deltas when many views are subscribed. Verify in the Phase 4 spike before committing to Perspective headless as the lead prototype.
- **Transport variety / adaptability:** Hoist already supports WebSocket data push (`XH.webSocketService`) alongside HTTP poll-then-diff, SignalR, and notification-then-fetch, and must stay adaptive to whatever a client presents. The harness must parameterize across these patterns rather than assume one. Phase 5 strategy must keep any transport-specific performance unlock labeled as a conditional optimization, not the default path.

---

## Sources

### Primary (HIGH confidence)
- `.planning/research/STACK.md` - technology versions, licensing, bridge-cost framing, candidate tiering (2026-06-27)
- `.planning/research/FEATURES.md` - CC-1/CC-2/CC-3 taxonomy, AG Grid 36 feature parity map, dynamic schema framing (2026-06-27)
- `.planning/research/ARCHITECTURE.md` - integration seam analysis, serialization tax mechanics, five architectural patterns (2026-06-27)
- `.planning/research/PITFALLS.md` - 12 enumerated pitfalls with phase-by-phase prevention strategies (2026-06-27)
- `docs/planning/data2/KICKOFF-VALIDATION.md` - corrections to the kickoff brief, validated against hoist-react source and real app usage (2026-06-27)
- `.planning/PROJECT.md` - project scope, constraints, validated requirements, active deliverables
- FINOS Perspective official docs - `Table`/`View`/`on_update` API, worker/websocket/hybrid placement, Arrow IPC
- Apache Arrow JS npm + release - v21.1.0, Arrow format v24.0.0
- DuckDB-WASM official docs + npm - v1.5.4/1.33.x, single-thread note, no materialized views
- AG Grid 36 announcement (blog.ag-grid.com, 2026-06-24) - calculated columns, "show values as," automatic column generation
- web.dev COOP/COEP guidance - SharedArrayBuffer isolation requirements

### Secondary (MEDIUM confidence)
- Perspective maintainer discussions (#1463, #1750) - delta granularity under partial updates
- Mutative vs. Immer benchmarks - 10-17x on large state with auto-freeze off
- timlrx/browser-data-processing-benchmarks - cross-engine query-time baselines (methodology context)
- Multiple Excel pivot help sources - weighted-average limitation in pivot calculated fields

### Tertiary (LOW confidence)
- Practitioner sources on server-side pre-aggregation and delta push patterns
- MobX custom-observables per-record overhead benchmarks for 2026 (directional only, no current benchmark found)

---
*Research completed: 2026-06-27*
*Ready for roadmap: yes*
