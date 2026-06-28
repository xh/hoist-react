# Pitfalls Research

**Domain:** In-browser data engines & real-time grid data layers for data-dense financial dashboards (Hoist Store/Cube/View/GridModel + AG Grid, MobX/React, Chromium-first)
**Researched:** 2026-06-27
**Confidence:** HIGH on the structural pitfalls (corroborated by official Arrow/DuckDB/Perspective docs, web.dev COOP/COEP guidance, Chrome DevTools memory guidance, and the project's own KICKOFF analysis); MEDIUM where a claim depends on this stack's specific copy/reuse map (an explicit Phase 1 / Phase 2 unknown).

This file is scoped to the failure modes that wreck *this* effort: a measurement harness, a baseline envelope, technology research, and prototype spikes feeding a build/adopt/coexist strategy decision. Generic web-dev advice is excluded. Every pitfall maps to a phase and gives early warning signs.

---

## Critical Pitfalls

### Pitfall 1: Benchmarking unrepresentative result shapes (tiny-summary fallacy)

**What goes wrong:**
Candidates (DuckDB-WASM, Perspective, Arrow, SQLite-WASM) are benchmarked on small aggregated summaries (a few hundred group rows) and post stunning "10-100x faster than JS objects" numbers. The harness then declares a winner that collapses in production, because real widgets return **the full or near-full leaf set (up to ~40-60k rows x tens of fields) PLUS aggregates on top**, and the cost that matters - moving that result back across the engine/worker boundary into something MobX and AG Grid can render - was never in the measurement.

**Why it happens:**
Vendor benchmarks and tutorials (TPC-H, "statistical dashboard" demos) optimize for the headline compute number. The engine's strength (vectorized columnar aggregation) is exactly the part that *isn't* the bottleneck here. The KICKOFF says this explicitly: "results are frequently not heavily summarized... shipping query results back across a worker/WASM boundary can be as expensive as the compute it offloaded. This bridge cost is the crux." DuckDB's own "10-100x" claim is specifically *querying Arrow data*, not materializing row-oriented results for a row-model grid.

**How to avoid:**
Make result shape a first-class harness parameter (`leafCount`, `aggregateRowCount`, `fieldCount`, `valueRows` returned). Mandate that every candidate benchmark includes at least one "fat leaf result" scenario matching the real widgets (full leaf set + aggregate tree), not just the "thin summary" scenario. Report bridge/serialization cost as a separate line item from compute cost - never a single blended number. A candidate that wins compute but loses on the fat-leaf round-trip must show as losing.

**Warning signs:**
A benchmark result expressed as a single "query took Xms" number with no breakdown. Result-row counts in the hundreds when the real widget shows tens of thousands. Anyone citing a vendor TPC-H number as evidence for our use case.

**Phase to address:** Phase 2 (harness design - bake result-shape parameterization and compute-vs-bridge split into the API) and Phase 4 (every candidate scored on the *fat* scenario).

---

### Pitfall 2: The serialization / data-bridge tax that silently erases offload gains

**What goes wrong:**
Web Worker or WASM offload moves aggregation off the main thread, but the result (large leaf set + aggregates) must cross the boundary. Plain `postMessage` of JS objects is a **structured clone** - a full deep copy on both sides, on the main thread. The main-thread serialize/deserialize and the GC pressure from the cloned objects can cost as much as or more than the compute that was offloaded, while *also* adding latency and jank from the copy itself. The "we moved it off-thread so we're faster" conclusion is then simply wrong.

**Why it happens:**
"Web Workers solve our performance problem" treats threading as free. It isn't: workers solve main-thread *blocking*, not *memory* and not *transfer*. The KICKOFF flags this ("Web Workers - solve threading, not memory; quantify the serialization bridge"). The escape hatches are non-obvious: Transferable objects (ArrayBuffer/Arrow buffers passed by reference, neutering the sender's copy) and SharedArrayBuffer (true shared memory) avoid the clone - but only for columnar/binary layouts, not for arrays of row objects or MobX-observable records.

**How to avoid:**
Measure three transfer strategies explicitly in spikes: (a) structured-clone of row objects (the naive baseline), (b) Transferable Arrow/TypedArray buffers, (c) SharedArrayBuffer. Confirmed: Apache Arrow tables are Transferable with no clone overhead, and DuckDB-WASM uses Arrow as its result protocol with near-zero-copy reads. But the win only survives if the *consumer* (AG Grid + MobX) can read columnar buffers without immediately copying them back into row objects - which is Pitfall 9. Treat any offload candidate that requires re-materializing row objects on the main thread as suspect until measured.

**Warning signs:**
A worker prototype whose main-thread time barely improved despite "moving work off-thread." `postMessage` payloads that are arrays of objects rather than buffers. Profiler showing time in structured-clone / "deserialize" on the main thread.

**Phase to address:** Phase 4 (candidate boundary-cost spikes) and Phase 5 (prototype validation of the actual transfer strategy).

---

### Pitfall 3: SharedArrayBuffer / cross-origin-isolation deployment trap (COOP/COEP)

**What goes wrong:**
A zero-copy WASM threading strategy (SharedArrayBuffer, WASM threads, and `performance.measureUserAgentSpecificMemory()` for heap attribution) is prototyped locally and proves out, then is undeployable at a client because **SharedArrayBuffer requires the page to be cross-origin isolated**: `Cross-Origin-Opener-Policy: same-origin` + `Cross-Origin-Embedder-Policy: require-corp` (or `credentialless`), AND every cross-origin subresource (CDN scripts, embedded iframes, Bloomberg/analytics widgets, auth flows) must send CORP/CORS headers or be blocked. In locked-down financial deployments (the lead client), flipping these headers can break SSO iframes, third-party widgets, and embedded content - and the client may not control all the headers involved.

**Why it happens:**
Cross-origin isolation works transparently on localhost and simple demos, so the constraint stays invisible until a real deployment. The same isolation that unlocks SharedArrayBuffer also unlocks `measureUserAgentSpecificMemory()` - so a harness built around precise heap attribution may *itself* silently depend on isolation that production can't enable.

**How to avoid:**
Decide the threading transfer strategy with deployment isolation as a hard input. If a candidate's win depends on SharedArrayBuffer, treat cross-origin isolation as a deployment blocker to confirm per-client *before* scoring it as viable (it belongs in the transport/deployment matrix the KICKOFF §12 asks for). Confirm whether the harness's heap-attribution method needs isolation, and if so, provide a non-isolated fallback (e.g. coarse `performance.memory` deltas) so baseline measurement isn't gated on a production-impossible config. Transferable Arrow buffers (Pitfall 2) do NOT need isolation - prefer them as the portable default; reserve SharedArrayBuffer for cases where it demonstrably wins and isolation is deployable.

**Warning signs:**
A spike that "only works when I serve with these two headers." `crossOriginIsolated === false` in a target deployment. Client security team flagging COEP. Heap-attribution numbers that are only obtainable in the dev harness.

**Phase to address:** Phase 4 (mark SharedArrayBuffer-dependent candidates and gate on deployability) and Phase 2 (ensure harness heap attribution has a non-isolated fallback path).

---

### Pitfall 4: Warm-vs-cold heap and GC noise masquerading as signal

**What goes wrong:**
Memory and latency numbers swing wildly run-to-run and the team chases phantom regressions or celebrates phantom wins. Causes: heap snapshots taken without forcing GC (retained-but-collectable garbage counted as "live"), JIT warm-up (first runs slow, later runs fast), WASM module instantiation and DuckDB/Perspective worker spin-up amortized differently across runs, and a GC pause landing inside a timed region adding tens of ms of noise.

**Why it happens:**
In-browser measurement is inherently noisy and the noise is larger than many real effects (a 5ms compute delta is invisible under a 40ms GC pause). Teams report a single run, or average cold and warm runs together. Chrome only exposes reliable "live" heap after a forced collection, which requires `--expose-gc` or DevTools.

**How to avoid:**
Codify a measurement protocol in the harness: discard N warm-up iterations; run M timed iterations; report median + p95, never the mean of a tiny sample; force GC before every heap snapshot (`--enable-precise-memory-info` / `--expose-gc`, or DevTools allocation timeline) and document that the snapshot is post-GC "retained" size. Separately report cold-start cost (WASM instantiation, worker boot, first query) as its own metric - it's real and user-visible, but must not contaminate steady-state throughput numbers. Pin the Chrome/Edge version in the harness output; heap behavior changes across versions.

**Warning signs:**
Numbers that change >10% between identical runs. Heap "live size" that includes objects you know are dead. A single-run result presented as authoritative. No GC-forcing step before snapshots.

**Phase to address:** Phase 2 (harness measurement protocol - this is the harness's credibility foundation).

---

### Pitfall 5: OTel instrumentation overhead distorting the hot path

**What goes wrong:**
The harness, instrumented with Hoist's OTel tooling "from day one," traces every micro-operation (per-record transform, per-cell aggregation, per-update fan-out). Span creation, context propagation, and timestamp capture per micro-op add overhead comparable to the work being measured, inflating baseline cost and - worse - distorting it *unevenly* across candidates (a candidate doing more, smaller operations gets penalized more by per-op tracing), corrupting the comparison the whole effort rests on.

**Why it happens:**
"Instrument everything" is the natural instinct after a big OTel upgrade. But OTel is designed for distributed-request observability, not nanosecond hot-loop profiling. The KICKOFF explicitly warns: "be deliberate about OTel overhead in low-level hot paths - instrument at boundaries and aggregate, don't trace every micro-operation."

**How to avoid:**
Instrument at coarse boundaries only: "load batch," "run query," "fan out to N views," "apply grid transaction" - not per record or per cell. Aggregate counts/durations in plain counters inside hot loops and emit one span/metric at the boundary. For the precise micro-benchmarks that feed the comparison, use `performance.now()` / `performance.measure` directly and keep OTel for the system-level observability story. Run a control: measure a known workload with OTel on vs. off and confirm the overhead is <~1-2% of the measured region; if not, the instrumentation is too fine.

**Warning signs:**
Span counts in the millions for a single benchmark run. Baseline numbers that drop noticeably when instrumentation is disabled. Per-record or per-cell span names in traces.

**Phase to address:** Phase 2 (harness instrumentation design) and Phase 5 (ensure prototype spikes measure with the same boundary-only discipline so comparisons are apples-to-apples).

---

### Pitfall 6: Recompute storms and uncoalesced fan-out under sustained deltas

**What goes wrong:**
A batch of ~500 position updates touching ~20 fields each lands, and instead of one coalesced recompute, the system triggers a cascade: each leaf write notifies the cube, which re-runs aggregation, which updates every connected View's observable `ViewResult`, which triggers each connected Store's load, which generates AG Grid transactions, which triggers MobX-driven React re-renders - potentially *per update* rather than *per batch*. With many widgets on one cube (the portfolio pattern: "one cube feeds many widgets"), N updates x M views x grouping recompute = quadratic-ish work, and the next batch arrives before this one finishes, so the queue grows unboundedly and the UI locks.

**Why it happens:**
MobX makes reactivity easy and therefore easy to over-trigger. Coalescing exists at the WebSocket-ingest layer ("WebSocket-fed incremental updates... with coalescing" is a validated capability), but coalescing at *ingest* does not guarantee coalescing at *every* downstream stage - a single coalesced batch can still fan out into per-record reactions if any layer reacts at record granularity. The failure only appears under sustained high-rate load, which naive functional testing never exercises.

**How to avoid:**
Make the harness drive *sustained* delta streams at configurable rate/breadth (it already must parameterize "update pattern/breadth/throughput"), and assert that one input batch produces one recompute pass and one render pass per affected view (instrument batch-in / renders-out counts). Verify MobX reactions are batched (`runInAction` / transaction boundaries) around the whole batch apply, not per record. Establish the "process batch before next batch arrives" invariant from the KICKOFF as an explicit harness pass/fail metric. Measure with backpressure: what happens when input rate exceeds processing rate (drop/coalesce/queue?).

**Warning signs:**
Render count >> batch count. Latency that grows monotonically under sustained load (queue backlog) rather than reaching steady state. Frame drops that worsen over time, not just at peak. CPU pinned between batches.

**Phase to address:** Phase 2 (sustained-load harness scenarios + batch-in/render-out invariant) and Phase 1 (map the exact reaction granularity in the current cube->view->store->grid fan-out - it's a documented unknown).

---

### Pitfall 7: Memory-multiplication cascade and small-heap-machine OOM

**What goes wrong:**
The same datum exists in many representations simultaneously - JSON string -> parsed raw object -> StoreRecord (raw ref + new inner data object) -> View raw/aggregated results -> grid's Store records -> AG Grid internal nodes. A candidate that "saves memory" in its own engine can still *increase* total heap if it adds yet another representation (e.g. an Arrow columnar copy) on top of the existing cascade rather than replacing layers. Result: tabs that already use a lot of memory tip over, and the documented past failure mode recurs - OOM crashes on the cohort of older machines with smaller Chrome heaps.

**Why it happens:**
Engines are evaluated on their *internal* footprint in isolation, not on the *whole-pipeline* delta. Coexistence ("Data 2.0 alongside the current system") structurally risks *adding* a representation rather than removing one. The KICKOFF names two explicit unknowns: when/where data is copied vs. reused, and how much heap lives in each layer - if these aren't resolved first, any memory claim is unfounded.

**How to avoid:**
Build heap attribution into the harness as a deliverable, not an afterthought (attribute heap to cube store records vs. grid store records vs. AG Grid nodes vs. view results). Evaluate every candidate on **total pipeline heap delta vs. baseline**, never on engine-internal footprint alone. For coexistence scenarios, explicitly measure the "both systems resident" peak. Treat the small-heap machine as a named test target with its own memory ceiling (the KICKOFF asks for a "small-heap machine" target in quantitative goals) - set the ceiling low and make it a hard pass/fail gate, because the reference workstation will hide the problem. Evaluate structural-sharing (Immer) as a *copy-reduction* path that needs no new representation - potentially high ROI, low risk.

**Warning signs:**
A candidate's memory pitch citing only its internal size. Heap that grows when a new layer is added "alongside." Testing only on a 32GB dev machine. No per-layer attribution available.

**Phase to address:** Phase 1 (copy-vs-reuse map - resolve the unknowns), Phase 2 (heap attribution + small-heap ceiling as pass/fail), Phase 4 (total-pipeline-delta scoring rule).

---

### Pitfall 8: Adopting a fast engine that can't drive fine-grained MobX/React reactivity (the non-fit)

**What goes wrong:**
A candidate wins on raw throughput and memory but has no incremental change-notification model, so the only way to reflect updates is to **re-run the query and replace the whole result set** - which then forces a full re-render and defeats the fine-grained, per-cell update behavior that a live trading screen needs (and that the current MobX/Store/transaction path provides). The engine is fast in a benchmark and a regression in the product.

**Why it happens:**
SQLite-WASM and DuckDB-WASM are query engines with **no built-in reactive/change-notification layer** (the KICKOFF flags exactly this for SQLite: "no built-in reactive/change-notification model, so we'd either re-run queries... or build our own change-tracking layer"). Perspective is the opposite - it has live Views and can emit deltas via `on_update` - but its reactivity is its own (Web Component / callback), not MobX, so bridging it to fine-grained MobX observability and AG Grid transactions is non-trivial and is the part most likely to be hand-waved. The KICKOFF is unambiguous: "a fast engine that can't drive fine-grained reactive updates into the existing component model is not actually a fit."

**How to avoid:**
Make the reactivity bridge a mandatory, *demonstrated* line in every candidate's rubric, not a checkbox - the spike must show a single-cell update flowing from engine -> change notification -> MobX observable -> AG Grid transaction -> single-cell DOM update, WITHOUT a full result-set replacement or full re-render. For query-only engines (SQLite/DuckDB), require a credible delta/change-tracking design (the KICKOFF's "thin reactive layer that tracks which views care about which aggregations and serializes only deltas") and prototype it, because that layer - not the engine - is the hard and risky part. For Perspective, prototype the `on_update`-delta -> MobX -> AG Grid transaction path specifically. Score "must re-run full query to see changes" as a major negative.

**Warning signs:**
A candidate eval that scores compute and memory but leaves "reactivity bridge" as "TBD." A spike that updates the grid by reloading the entire dataset. "We'll figure out reactivity later." Per-update full re-renders in the prototype.

**Phase to address:** Phase 4 (reactivity bridge mandatory in rubric) and Phase 5 (prototype must demonstrate single-cell incremental path end to end).

---

### Pitfall 9: Columnar engine vs. row-record / per-row consumption mismatch

**What goes wrong:**
A columnar engine (Arrow, DuckDB, Perspective) is adopted for its memory and vectorized-aggregation wins, but AG Grid's data model and Hoist's `StoreRecord` are **row-oriented**, and so is MobX observation (per-record observables). Bridging columnar results into the row model means either materializing row objects on the main thread (re-introducing the copy and the memory the columnar format was supposed to save - back to Pitfall 7) or accessing columns row-by-row, which in Arrow JS is a **random-access pattern across separately-stored columns** - the slow path the columnar format explicitly trades away. The columnar win evaporates at the consumption boundary.

**Why it happens:**
Columnar is genuinely superior for scan/aggregate; it is genuinely worse for "give me all fields of row N," which is exactly what a grid renderer and a per-row MobX record want. The Arrow docs are explicit: columnar gives data locality for column operations "in exchange for comparatively more expensive" per-row access, with random memory access when materializing a single entity's attributes. Demos that only aggregate never hit this; a grid that renders rows hits it constantly.

**How to avoid:**
In spikes, measure the *row-materialization* cost (columnar result -> what AG Grid actually renders), not just the aggregation cost. Investigate whether AG Grid can consume columnar/virtualized data without full row materialization for the visible window only (virtualization means only ~50-100 rows are ever rendered - the trap is materializing all 60k when only the viewport is needed). Decide deliberately whether the columnar format lives end-to-end or is a transient compute representation that's converted at the boundary - and price the conversion. Treat "columnar engine + row grid" as an integration risk to prototype, not an assumed fit.

**Warning signs:**
A spike that converts the entire columnar result to row objects up front. Per-row field access showing up hot in the profiler. Memory savings on paper that don't appear in whole-pipeline heap. Aggregation benchmarked, rendering not.

**Phase to address:** Phase 4 (boundary-cost spikes must include row materialization) and Phase 5 (prototype the actual grid-consumption path).

---

### Pitfall 10: Over-tailoring requirements until no candidate survives (the scoping corner)

**What goes wrong:**
The calculated-columns taxonomy and especially the dynamic-schema ask (the explicit "20% case") are hardened into mandatory gates. Combined with the must-haves (MobX reactivity, shared-store contract, fixed-transport degradation, memory ceiling, calculated-column dependency graphs), the requirement set becomes self-contradictory: a candidate strong on dynamic schema (e.g. AG Grid 36 "automatic column generation" routing through AG Grid's model) breaks the shared-store contract; an engine strong on memory/speed (a compiled columnar engine) can't do runtime soft-schema cheaply. Every option fails *some* gate, and the effort concludes "nothing works" - when the real situation is "no single option does all of it, and some requirements are negotiable."

**Why it happens:**
It is psychologically easier to add a requirement than to weigh one. The dynamic-schema case is real and has shipped in a couple of apps, so it *feels* mandatory. The KICKOFF explicitly pre-empts this: dynamic schema is "a factor, not a gate... Do not over-tailor the requirements to the point where no viable solution survives - if the requirement set becomes self-contradictory, surface that explicitly and force the tradeoff into the open."

**How to avoid:**
In the spec phase, classify every requirement as **gate** (disqualifying if unmet) vs. **factor** (weighted, tradeable) before scoring any candidate - and keep the gate list short and defensible. Explicitly tag dynamic schema and the exotic calculated-column flavors (dependency chains, runtime aggregation choice) as factors. Run a "survivor check": if applying all gates leaves zero candidates, that is a *finding to surface*, not a reason to keep tightening - report the conflicting requirements and present the tradeoff frontier. Preserve good options whose only failure is a factor, with the cost noted.

**Warning signs:**
A growing must-have list. A candidate eliminated solely for the 20% case. A comparison matrix where every row has a fatal red cell. Discussion framed as "find the one that does everything" rather than "where's the frontier."

**Phase to address:** Phase 3 (spec - gate/factor classification + survivor check) and Phase 6 (strategy synthesis - present the frontier honestly, per KICKOFF §7).

---

### Pitfall 11: Premature engine lock-in before the harness has spoken

**What goes wrong:**
Enthusiasm for a candidate (Perspective is "the closest off-the-shelf fit"; the the lead client developer's "fast WASM grid") drives an early architectural commitment, prototype work narrows to that one engine, and the baseline/comparison becomes a post-hoc justification rather than a decision input. The team builds toward an answer the harness never validated, and the "evidence-based recommendation" core value is hollowed out.

**Why it happens:**
External pressure (the lead client's head of software pointing at a fast grid) and the appeal of a purpose-built financial engine create a pull toward "just adopt it." It's faster in the short term to commit than to measure. The KICKOFF lists "avoid premature lock-in to any single engine before the harness has spoken" as a non-goal.

**How to avoid:**
Sequence the work so the harness and baseline exist *before* any candidate is scored (Phase 2 before Phase 4/5), and require every "X is faster/lighter" claim to cite a harness measurement and its conditions ("verifiability over opinion"). Identify the the lead client developer's grid as a *candidate to evaluate on the rubric*, not a target to match. Keep at least two candidates live into prototyping so the comparison is real. Treat the Toolbox demo (which proves the *current* stack at scale) as evidence that constrains the "we obviously need a new engine" narrative.

**Warning signs:**
A prototype for exactly one engine. A recommendation forming before baseline numbers exist. "We already know it'll be Perspective." The comparison matrix half-empty when prototyping starts.

**Phase to address:** Phase 2 (baseline first), Phase 4 (full matrix before deep prototyping), Phase 6 (recommendation traces to measurements).

---

### Pitfall 12: "Not invented here" over-wrapping vs. naively routing calc through AG Grid (the two-sided trap)

**What goes wrong:**
Two symmetric failures. (a) The instinct to "own it all" leads to re-implementing AG Grid 36 capabilities (calculated columns, show-values-as, aggregation editing, automatic column generation) inside the Store/Cube layer at high cost and perpetual catch-up, deepening the existing "we replaced much of AG Grid's machinery" position - when a bridge that uses more of AG Grid's own APIs while preserving the shared-store contract may exist. (b) The opposite: a client says "AG Grid has calculated columns, turn them on," and enabling them routes calculation **through AG Grid's internal model, bypassing the Store** - silently breaking the shared-store contract that charts, toolbars, and non-grid consumers depend on, because the derived data now lives only in the grid.

**Why it happens:**
Hoist's identity is the grid-independent shared store, so both "build our own" (protect the architecture) and "just use AG Grid" (give clients what they ask for) are locally rational and globally damaging. The KICKOFF frames this as the central strategic question (§7) and notes the shared-store contract is "central to Hoist's identity and the source of real tension with 'just use AG Grid's features.'"

**How to avoid:**
Treat the shared-store contract as the invariant to test every option against: does derived/calculated data remain available to non-grid consumers (charts, toolbars)? Map AG Grid 36's feature cluster against the §4.1 taxonomy and explicitly evaluate the "bridge" path (use AG Grid APIs but feed/mirror the Store) alongside the "build it in the Store" path, scoring each on the contract and on maintenance burden - per the KICKOFF's explicit ask to "compare them fairly against the build-our-own path." Confirm AG Grid Enterprise entitlement for these features per client before depending on them (KICKOFF §12).

**Warning signs:**
Calculated-column work that only the grid can see. A plan to reimplement an AG Grid 36 feature with no evaluation of using AG Grid's own. Charts/toolbars going stale when a calculated column is added. Licensing not checked.

**Phase to address:** Phase 3 (spec the contract test + AG Grid 36 parity map) and Phase 6 (own-vs-bridge strategy synthesis).

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems for this effort.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Harness as throwaway script per candidate | Fast first numbers | Non-comparable results, no reuse for baseline/demo, the "first-class infrastructure" deliverable never materializes | Never - the harness is a named deliverable; invest up front |
| Blended single "speed" metric (compute + bridge) | One easy number to cite | Hides the bridge-cost crux; picks wrong winner (Pitfall 1, 2) | Never for cross-candidate comparison |
| Engine-internal memory measured in isolation | Flattering candidate numbers | Whole-pipeline heap regresses; small-heap OOM recurs (Pitfall 7) | Only as a sub-metric *alongside* total-pipeline delta |
| Per-op OTel tracing for "completeness" | Rich traces | Distorts the comparison the effort rests on (Pitfall 5) | Never in hot paths; boundary spans only |
| Single-run / mean-of-few benchmark numbers | Quick to produce | GC/warm-up noise > real effect; phantom conclusions (Pitfall 4) | Never - require median+p95 over warm iterations |
| Demo/spike measured on full leaf set converted to rows up front | Simple to wire | Hides virtualization opportunity; inflates columnar conversion cost or wrongly condemns it (Pitfall 9) | Only as the explicit "naive baseline" arm of a comparison |
| Enable AG Grid 36 calc columns to satisfy a client quickly | Instant feature parity | Derived data bypasses Store; shared-store contract silently broken (Pitfall 12) | Only with an explicit decision to relax the contract for that widget, documented |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Web Worker boundary | `postMessage` arrays of row objects (structured clone, deep copy main-thread) | Transfer Arrow/TypedArray buffers (Transferable, no clone) or SharedArrayBuffer where deployable; never clone large row-object arrays |
| WASM threads / SharedArrayBuffer | Assuming it works because localhost works | Confirm cross-origin isolation (COOP/COEP + all subresources CORP/CORS) is deployable per client *before* scoring the candidate viable (Pitfall 3) |
| DuckDB-WASM / Arrow result | Treating Arrow result as drop-in rows | Arrow is columnar; price row materialization for grid consumption; exploit zero-copy only where the consumer reads columns (Pitfall 9) |
| SQLite-WASM | Expecting change notifications | No reactive model exists; you must build delta tracking or re-query (full reserialize) - prototype the delta layer, it's the hard part (Pitfall 8) |
| Perspective | Assuming its reactivity drops into MobX | Perspective's `on_update`/delta is its own model; prototype the on_update -> MobX -> AG Grid transaction bridge explicitly (Pitfall 8) |
| Fixed-transport clients (their WebSocket/SignalR/HTTP) | Designing a delta protocol we can't deploy | Solutions must degrade gracefully where transport is fixed; build a per-client transport matrix first (KICKOFF §12) |
| AG Grid transactions | Replacing whole row data on update | Use AG Grid transaction API (add/update/remove) for incremental updates; full `setRowData` defeats real-time and causes render storms |
| MobX reaction granularity | Per-record reactions firing per update in a batch | Wrap batch apply in a single action/transaction; assert one-batch-in -> one-render-out (Pitfall 6) |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Tiny-summary benchmark | Great numbers, bad production | Benchmark fat leaf results + aggregates (Pitfall 1) | When real widget returns full leaf set (~30-60k rows) |
| Structured-clone bridge | Off-thread work but no main-thread win | Transferable/shared buffers (Pitfall 2) | At large result sizes; worse with high update rate |
| Uncoalesced fan-out | Latency grows under sustained load | One recompute/render per batch; backpressure (Pitfall 6) | Under sustained ~500 updates/batch x many views |
| Memory multiplication | High tab memory, OOM on old machines | Whole-pipeline heap delta; small-heap ceiling gate (Pitfall 7) | On small-heap Chrome cohort; data-hungry tabs |
| Columnar->row materialization | Aggregation fast, rendering slow/heavy | Materialize viewport only; price conversion (Pitfall 9) | When all rows materialized instead of virtualized window |
| Derived-field explosion | Heap shifts from leaf facts to derived data | Compute lazily / on aggregate level; cap materialization | If user-defined calculated fields become prevalent (§4) |
| Initial-load parse stall | ~10s load, main-thread frozen | Measure parse + mint separately; consider streaming/columnar wire | At upper end of leaf count x field count |

## "Looks Done But Isn't" Checklist

- [ ] **Harness:** Often missing the *fat leaf result* scenario - verify it parameterizes result shape (leaf count + aggregate rows + field count), not just dataset size.
- [ ] **Harness:** Often missing GC-forcing before heap snapshots - verify "live heap" is post-GC retained size, version-pinned.
- [ ] **Harness:** Often reports blended speed - verify compute cost and bridge/serialization cost are separate line items.
- [ ] **Harness:** Often only tests burst load - verify *sustained* delta streams with backpressure and a batch-in/render-out invariant.
- [ ] **Heap attribution:** Often coarse - verify per-layer breakdown (cube store / grid store / AG Grid nodes / view results) and a non-isolated fallback if `measureUserAgentSpecificMemory` is unavailable.
- [ ] **Candidate eval:** Often skips the reactivity bridge - verify a *demonstrated* single-cell incremental update path (engine -> MobX -> AG Grid transaction), not a checkbox.
- [ ] **Candidate eval:** Often measures engine-internal memory only - verify total-pipeline heap delta vs. baseline.
- [ ] **Columnar candidate:** Often benchmarks aggregation only - verify row-materialization cost for actual grid rendering is measured.
- [ ] **Spec:** Often treats dynamic schema as a gate - verify gate/factor classification and a survivor check.
- [ ] **Strategy:** Often a forced single recommendation - verify the tradeoff frontier is shown where no clean winner exists.
- [ ] **SharedArrayBuffer candidate:** Often "works on my machine" - verify cross-origin isolation deployability per target client.
- [ ] **Calc columns:** Often grid-only - verify derived data is visible to non-grid consumers (shared-store contract test).

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Unrepresentative benchmarks (1) | MEDIUM | Re-run all candidates on fat-leaf scenario; re-score; invalidate prior conclusions explicitly |
| Bridge tax discovered late (2) | HIGH | May invalidate an offload candidate entirely; re-architect transfer (Transferable/shared) or drop the candidate |
| SharedArrayBuffer undeployable (3) | HIGH | Fall back to Transferable buffers (no isolation needed) or non-offload path; re-score affected candidates |
| GC/warm noise (4) | LOW | Re-run with proper protocol; cheap if caught before conclusions drawn |
| OTel distortion (5) | LOW-MEDIUM | Re-measure with boundary-only spans; re-baseline if conclusions cited tainted numbers |
| Recompute storm (6) | MEDIUM | Add batch transaction boundaries; may require reaction-granularity rework in fan-out |
| Memory multiplication (7) | HIGH | If a layer was added rather than replaced, may require representation redesign; structural sharing as mitigation |
| Non-fit reactivity (8) | HIGH | If discovered post-adoption, may force engine swap; building delta layer is significant work |
| Columnar/row mismatch (9) | MEDIUM-HIGH | Add boundary conversion (cost) or restrict columnar to compute-only; re-evaluate fit |
| Over-tailored spec (10) | LOW-MEDIUM | Reclassify gates as factors; re-score; surface the conflict as a finding |
| Premature lock-in (11) | HIGH | Re-open comparison; rebuild trust in the evidence base; costly in time and credibility |
| Shared-store contract break (12) | HIGH | Re-route calc through Store or mirror grid-derived data back; charts/toolbars may need rework |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| 1 Unrepresentative result shapes | Phase 2 (harness), Phase 4 (scoring) | Every candidate has a fat-leaf benchmark row; compute/bridge split present |
| 2 Serialization/bridge tax | Phase 4, Phase 5 | Transfer strategy measured (clone vs. transferable vs. shared) |
| 3 SharedArrayBuffer / COOP-COEP | Phase 4, Phase 2 | Cross-origin-isolation deployability confirmed per client; harness has non-isolated fallback |
| 4 Warm/cold heap, GC noise | Phase 2 | Measurement protocol documented; median+p95 over warm runs; post-GC snapshots |
| 5 OTel hot-path overhead | Phase 2, Phase 5 | OTel-on vs OTel-off control shows <~2% overhead in measured region |
| 6 Recompute storms / fan-out | Phase 2, Phase 1 | Batch-in/render-out invariant holds under sustained load; reaction granularity mapped |
| 7 Memory multiplication / OOM | Phase 1, Phase 2, Phase 4 | Per-layer heap attribution exists; total-pipeline delta scored; small-heap ceiling is a gate |
| 8 Reactivity non-fit | Phase 4, Phase 5 | Demonstrated single-cell incremental path per live candidate |
| 9 Columnar/row mismatch | Phase 4, Phase 5 | Row-materialization cost measured; viewport-only path evaluated |
| 10 Over-tailored spec | Phase 3, Phase 6 | Gate/factor classification done; survivor check run; conflicts surfaced |
| 11 Premature lock-in | Phase 2, Phase 4, Phase 6 | Baseline precedes scoring; >=2 candidates into prototyping; recommendation cites measurements |
| 12 NIH vs naive AG Grid routing | Phase 3, Phase 6 | Shared-store contract test applied to every option; AG Grid 36 parity map done; entitlement confirmed |

## Sources

- Apache Arrow columnar format - data locality for column ops "in exchange for comparatively more expensive" per-row access; random access when materializing a single entity (HIGH): https://arrow.apache.org/docs/format/Columnar.html
- DuckDB-WASM uses Arrow as result protocol, near-zero-copy reads, "10-100x faster than JS objects" is specifically querying Arrow data (HIGH/MEDIUM): https://duckdb.org/2021/10/29/duckdb-wasm and https://www.npmjs.com/package/@duckdb/duckdb-wasm
- Browser data-processing benchmarks (Arquero / SQLite-WASM / DuckDB-WASM), useful methodology and the result-shape caveat (MEDIUM): https://github.com/timlrx/browser-data-processing-benchmarks
- web.dev - SharedArrayBuffer requires cross-origin isolation; COOP same-origin + COEP require-corp/credentialless; all subresources need CORP/CORS; gates measureUserAgentSpecificMemory and high-res timers (HIGH): https://web.dev/articles/coop-coep and https://web.dev/articles/cross-origin-isolation-guide
- MDN - COEP header and Transferable/SharedArrayBuffer postMessage behavior under isolation (HIGH): https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cross-Origin-Embedder-Policy
- FINOS Perspective - live Views update incrementally; deltas available via on_update but not generated unless requested; reactivity is Perspective's own model (MEDIUM): https://perspective.finos.org/docs/view and https://github.com/finos/perspective/discussions/1463
- Chrome DevTools / Edge memory tooling - detached-node and heap-growth diagnosis; forced-GC for accurate live size; SPA/trading-dashboard leak patterns from event listeners and detached nodes (HIGH for method, MEDIUM for the trading-dashboard anecdote): https://developer.chrome.com/docs/devtools/memory-problems and https://learn.microsoft.com/en-us/microsoft-edge/devtools/memory-problems/dom-leaks-memory-tool-detached-elements
- Hoist Cube/View docs - View produces observable `ViewResult`, connected stores auto-update on cube data change or query change; `connect: true` fan-out (HIGH, authoritative for this stack): hoist-react `data/cube/README.md`
- Project KICKOFF-PROMPT.md §2.7 (memory multiplication), §3.3-3.4 (real-time, OOM cohort), §5 (bridge cost crux, transport asymmetry), §6 (engine reactivity caveats), §7 (own-vs-AG-Grid), §10 (OTel overhead discipline), §11 (scoping guards) - the primary domain-specific source (HIGH for this project's context)

---
*Pitfalls research for: in-browser data engines & real-time grid data layers (Hoist Data Layer 2.0)*
*Researched: 2026-06-27*
