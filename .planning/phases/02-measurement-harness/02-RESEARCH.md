# Phase 2: Measurement Harness - Research

**Researched:** 2026-06-29
**Domain:** Browser performance/heap measurement of the Hoist data layer (Cube / Store / View / AG Grid), instrumented through Hoist's existing client-side OTel tracing, with an out-of-process Grails test-data API
**Confidence:** HIGH (Hoist internals and browser APIs both verified against source and current docs)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Harness home & invocation**
- **Split architecture: reusable measurement core in hoist-react + runnable UI in Toolbox.** The measurement/instrumentation core ships with the framework so any app can measure its own data layer; the interactive UI that exercises it lives as a Toolbox example app (public, demonstrable).
- **Both UI and programmatic.** A programmatic, config-driven core that can run standalone, wrapped by an interactive UI for picking scenarios and viewing results. The UI sits on top of the core.
- **Interactive browser only for now.** Manual, human-driven runs. Heap/GC APIs and AG Grid all require a real browser anyway. Headless/CI automation is explicitly out of scope for this phase.
- **Out-of-process data generation via a server-side test API.** Synthetic data generation must NOT run in the same browser JS thread as the measured pipeline. The decided approach is a **test API built into Toolbox's Grails (Hoist Core) server layer**, capable of emitting different data shapes and serving updates over different delivery mechanisms including HTTP and WebSocket subscriptions. Preferred over a standalone test API in another technology because it additionally yields reusable server-side Hoist patterns. (Reconsider only if a strong, specific benefit of another technology surfaces during research.)

**Scenario library & defaults (HARN-01 / HARN-02)**
- **Flexible parametric API first.** Expose all the tuning knobs as a clean API rather than a fixed menu of hardcoded shapes.
- **Named profiles via Hoist persistence, not hardcoded.** Leverage a Hoist `ViewManager` + persistence in the UI harness layer so scenario configurations are saved, named, shared, and managed as serializable JSON blobs. Profiles and update patterns are data, not code.
- **Update patterns: research-and-propose, then persist.** Curated spread of realistic patterns (steady trickle, periodic bursts, broad re-snapshot/replace, targeted narrow-field updates); the planning/research step should first work through the actual testing knobs the harness must support; the real-world scenario permutations then fall out of those knobs and are captured/evolved as persisted JSON-blob configs rather than baked in.
- **Transport: build the Toolbox/Grails test API to drive ingest realistically over HTTP and WebSocket.** Driving the Cube/Store ingest contract is the invariant seam (Phase 1 finding), but delivery comes from the out-of-process test API rather than an in-browser generator. WebSocket push is a first-class Data 2.0 transport and must be exercisable.
- **Data realism: mixed field types including object-valued fields, seeded/deterministic.** Generate a realistic mix (numbers, strings, dates, object-valued fields) so the harness can probe the object-valued-field heap question Phase 1 flagged. Generation is seeded for reproducibility.
- **Start with a seeded, curated set; data-composition-as-config is a likely follow-on phase.**

**Results output & comparison**
- **On-screen + persisted, with OTel via TraceService.** Spans bubble into Hoist's existing OTel/`TraceService` tooling (HARN-03); a result summary renders on-screen; each run is persisted via Hoist persistence for later comparison. In-harness analysis is self-contained and does not depend on an external collector.
- **Comparison is a first-class harness feature, driven from saved runs.** Load two or more persisted runs and show them side-by-side (deltas, percent change).
- **Full scorecard per run.** Report compute time AND bridge time, each as median + p95 (HARN-05); peak/resident heap attributed by layer - cube store records, grid store records, intermediate view-result rows, AG Grid internals (HARN-04); plus row counts and the full scenario config. ("Compute" = Hoist-side JS measured directly; "bridge" = the opaque cost of crossing into AG Grid / a worker / WASM, measured indirectly.)
- **Capture environment metadata with every run.** Machine, browser version, enabled Chrome flags, and cross-origin-isolation status.

**Run rigor & measurement protocol**
- **Rigorous, flag-documented forced-GC / steady-state protocol.** Use real forced GC (Chrome `--expose-gc` or DevTools) between iterations, with warmup discards and a documented steady-state settle. Required flags must be documented.
- **Median + p95 over warmup + measured iterations** (HARN-05). Iteration/warmup counts are Claude's discretion, but must be reproducible and persisted with the run.

### Claude's Discretion
- **Candidate plug-in seam (HARN-06).** Design how a candidate implementation plugs in for evaluation against the actual Cube/Store/View/Grid contracts mapped in Phase 1. Lean toward a common-interface/swap approach if it fits the real contracts.
- **Iteration & warmup model.** Pick the counts/defaults; preserve median + p95 and reproducibility, persist settings with the run.
- **Heap attribution technique for owned layers.** Choose owned-object accounting vs heap-snapshot diffing, treating AG Grid internals as the opaque remainder. Use the Phase 1 allocation map.
- **Headless decision tie-breaks** and anything else that keeps Phase 2 focused on the measurement core.

### Deferred Ideas (OUT OF SCOPE)
- **Data-composition-as-config** - field count / data types / null percentage as persisted parameters. Phase 2 starts with a seeded curated set.
- **Headless / CI automation** - scriptable runs. Phase 2 is interactive-browser-only.
- **Server-API transport-impact analysis** - dedicated analysis of how server transport affects performance. Phase 2 builds the test API as substrate only.
- **Precise COI heap measurement** (`measureUserAgentSpecificMemory()`) - implement in Phase 2 only if simple; otherwise deferred. Not a required deliverable.

### Explicit Constraint: keep heap attribution simple
The precise, cross-origin-isolation heap path (`measureUserAgentSpecificMemory()`) is a **nice-to-have, not a driver**. Favor the no-COI path (owned-object accounting + `performance.memory`) as the default so there is zero setup. Support precise COI measurement only if it stays simple; **skip it entirely if it threatens an explosion of complexity**. HARN-04's "fallback that does not require cross-origin isolation" is the primary path by intent. Whichever method a run used must be recorded in that run's environment metadata.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| HARN-01 | Configurable dataset generator parameterizing result shape (leaf-row count, aggregate-row count, field count); realistic large-leaf-plus-aggregate shapes | Generator lives server-side in Toolbox Grails, extending the existing `PortfolioService` randomized-instrument pattern. Knob taxonomy (§Architecture Pattern 1). Shape is driven by Cube dimensions (aggregate-row count) x leaf count x `CubeField`/`Field` count. Seeded RNG for determinism (§Pattern 4). |
| HARN-02 | Configurable update generator parameterizing update pattern, breadth (fields/record), throughput (batch size + rate), and change-delivery transport | Transport collapses to the invariant two-op ingest contract (`Cube.loadDataAsync`/`updateDataAsync`) - Phase 1 TRANSPORT-INVENTORY. HTTP and WebSocket-push both drive the same client ingest; only the adapter differs. Existing Toolbox `PositionService.pushUpdates` WebSocket timer is the precedent. Update-knob taxonomy (§Architecture Pattern 1). |
| HARN-03 | Instrumentation bubbles into Hoist's existing OTel tooling, measured at boundaries (not per-micro-op), bounded/documented overhead | Hoist `TraceService` + `Span` + `runner().span()` chain (verified in source). Instrument the 6 Phase-1 boundaries. CRITICAL: spans use `Date.now()` (ms) - too coarse for sub-ms timing; harness must time with `performance.now()` and use spans for structure/correlation (§Pitfall 1, §Pattern 2). |
| HARN-04 | Heap attribution by layer (cube store records, grid store records, AG Grid internals, intermediate view results) with a fallback that does NOT require cross-origin isolation | No-COI default = owned-object accounting (count x measured per-record cost, from Phase-1 COPY-VS-REUSE map) + whole-heap `performance.memory.usedJSHeapSize` deltas (Hoist already uses this in `InspectorService`/`ClientHealthService`). AG Grid internals = opaque remainder (total heap delta minus owned layers). Optional COI path (`measureUserAgentSpecificMemory`) deferred unless trivial (§Pattern 3, §Pitfall 2). |
| HARN-05 | Separates compute cost from JS<->engine bridge cost; reports median + p95 under documented forced-GC / steady-state protocol | Boundary 5 is the split point: `genTransaction()` = Hoist compute (timed directly in JS); `applyTransaction()` = synchronous bridge call (timed directly) PLUS deferred render captured via `requestAnimationFrame`/`requestPostAnimationFrame`. Forced GC via `--js-flags=--expose-gc` + `window.gc()`; warmup-discard + percentile math (§Pattern 2, §Pattern 5, §Pitfall 3). |
| HARN-06 | Reusable, config-driven, documented infrastructure usable for BOTH baseline measurement AND candidate evaluation | Split architecture: framework-resident measurement core (config in, scorecard out) + Toolbox UI. Candidate plug-in seam targets the `View.result -> Store` contract (the Phase-1 invariant seam) via a common interface (§Pattern 6). Config is a serializable JSON blob persisted via `ViewManager`. |
</phase_requirements>

## Summary

This phase builds a browser-resident measurement harness for the Hoist data pipeline that Phase 1 mapped end to end. The good news from research: nearly every primitive the harness needs **already exists in hoist-react** and is verified in source. Hoist has a complete client-side OTel tracing layer (`TraceService`, `Span`, and the fluent `runner().span()` chain on `HoistBase`) that exports W3C-compatible spans to the server and on to an OpenTelemetry collector - this is exactly the "existing OTel tooling" HARN-03 must bubble into. Hoist also **already reads `performance.memory`** (`usedJSHeapSize`/`totalJSHeapSize`/`jsHeapSizeLimit`) in three places (`InspectorService`, `ClientHealthService`, `StatsModel`) with a `NonStandardPerformance` type augmentation - so HARN-04's no-cross-origin-isolation fallback has a direct in-framework precedent. And `ViewManager` (JsonBlob-backed, private/shared/global named views) is purpose-built to be the serializable-config store the locked decisions call for. The harness is therefore mostly composition of existing Hoist machinery plus a server-side data generator that extends Toolbox's existing randomized-portfolio service.

The two hard, must-get-right measurement subtleties are both about resolution and attribution, not about plumbing. First, **Hoist `Span` timing is `Date.now()` (millisecond) resolution** - fine for distributed-trace structure but useless for sub-millisecond compute/bridge timing. The harness must do its real timing math with `performance.now()` (microsecond-class, coarsened to 100us in non-COI contexts) and use spans for correlation/structure, recording the precise elapsed value as a span tag. Second, **heap attribution is fundamentally an accounting exercise, not a single API call**: the no-COI `performance.memory.usedJSHeapSize` gives only a whole-heap number quantized to ~100KB buckets (un-quantized only with `--enable-precise-memory-info`), so per-layer attribution comes from combining owned-object accounting (record counts from the pipeline x measured per-record cost, using the Phase-1 COPY-VS-REUSE allocation map) with whole-heap deltas, treating AG Grid internals as the opaque remainder. The precise COI API (`measureUserAgentSpecificMemory`) gives an iframe/worker breakdown but **not** the Hoist-layer breakdown HARN-04 wants - confirming the CONTEXT decision to treat it as optional/deferred.

The compute-vs-bridge split (HARN-05) lands precisely at Phase-1 Boundary 5: `genTransaction()` is Hoist-side compute (directly timeable in JS) and `agApi.applyTransaction()` is the synchronous JS->AG Grid bridge call - but the actual layout/render happens later in an animation frame, so the harness must also capture deferred render via `requestAnimationFrame`/`requestPostAnimationFrame` to avoid undercounting bridge cost.

**Primary recommendation:** Build the measurement core in hoist-react as a config-driven engine that (1) wraps the six Phase-1 boundaries with `runner().span()` carrying `performance.now()` timing tags, (2) attributes heap by owned-object accounting plus `performance.memory` whole-heap deltas with AG Grid as the opaque remainder, and (3) runs a forced-GC (`--js-flags=--expose-gc`) warmup-then-measure iteration protocol reporting median + p95. Drive realistic data and updates from a new Toolbox Grails test API extending the existing portfolio generator, exercising both HTTP and WebSocket-push delivery against the invariant `Cube.loadDataAsync`/`updateDataAsync` contract. Persist scenario configs and run scorecards as JSON blobs via `ViewManager`; build the picker/comparison UI as a Toolbox example app. Treat the precise COI heap path as out of scope unless it proves trivial.

## Standard Stack

### Core (all already present in hoist-react / Toolbox - HIGH confidence)
| Library / Facility | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@xh/hoist` `TraceService` + `Span` (`svc/TraceService.ts`, `core/Span.ts`) | current `develop` | Client-side OTel span creation, sampling, batched export to `xh/submitSpans` -> collector | The "existing OTel tooling" HARN-03 must use. W3C traceparent compatible. |
| `@xh/hoist` `runner().span()` chain (`HoistBase.runner`) | current | Fluent instrumentation entry: `span`/`timer`/`counter`/`track`/`run`. Auto-nests, auto-tags | The documented, non-deprecated way to instrument. Composes span + metric + track at one call site. |
| `@xh/hoist` `MetricsService` (`XH.metricsService`) | current | Named timers/counters -> server Micrometer registry, with `xh.outcome` tag | For aggregate timer/counter metrics if desired alongside spans. |
| `performance.now()` (Web API) | n/a | High-resolution elapsed timing for compute/bridge measurement | The real timing source (Span is ms-only). 100us resolution non-COI, 5us COI. |
| `performance.memory` (Chromium non-standard) | n/a | `usedJSHeapSize` whole-heap reading - the no-COI heap fallback | Already used by Hoist `InspectorService`/`ClientHealthService`; the HARN-04 default path. |
| `window.gc()` via `--js-flags=--expose-gc` | n/a | Force full GC between iterations for clean steady-state heap | The documented forced-GC mechanism the protocol requires. |
| `@xh/hoist` `ViewManager` (`cmp/viewmanager`) | current | JsonBlob-backed named/shared/global config storage | Scenario profiles + run scorecards as serializable JSON, per locked decision. |
| `@xh/hoist` `Cube` / `View` / `Store` / `GridModel` (`data/cube`, `data`, `cmp/grid`) | current | The measured pipeline + ingest contract (`loadDataAsync`/`updateDataAsync`) | The system under test; the invariant ingest seam HARN-02 drives. |
| AG Grid Community/React | **35.x** (per `package.json`; v34->35 was a recent Hoist upgrade) | The grid engine; `agApi.applyTransaction` is the JS<->engine bridge boundary | Boundary 5 / HARN-05 bridge cost target. Note: harness targets AG Grid 35, not 36. |
| Toolbox Grails server (`grails-app/services/io/xh/toolbox/portfolio`) | current | Existing randomized data generator + WebSocket `pushUpdates` timer to extend into the test API | Locked decision: build the test API here for reusable server-side patterns. |

### Supporting (Claude's discretion / optional)
| Facility | Purpose | When to Use |
|---------|---------|-------------|
| `performance.measureUserAgentSpecificMemory()` | Precise per-iframe/worker heap with built-in GC; requires `crossOriginIsolated` | OPTIONAL/likely-deferred. Gives realm breakdown, NOT Hoist-layer breakdown - low value for HARN-04. Use only if it stays trivial. |
| `--enable-precise-memory-info` Chrome flag | Un-quantizes `performance.memory` from ~100KB buckets to exact bytes | Recommended for the no-COI path so heap deltas aren't lost in quantization noise. Document as a required run flag. |
| `requestPostAnimationFrame` / `requestAnimationFrame` | Capture deferred render/paint after the synchronous `applyTransaction` returns | Needed to fully account bridge cost (render is async after the sync call). |
| `--trace-gc` Chrome flag | Logs GC events for protocol validation | Diagnostic only - confirm forced GC is actually running. |
| `PerformanceObserver` (`longtask`, `event`) | Detect main-thread jank / long tasks during sustained updates | Useful precursor for Phase 3 jank-wall work; can be wired now at low cost. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Server-side Grails data generator | In-browser synthetic generator | REJECTED by CONTEXT: in-thread generation competes for the main thread and pollutes results; out-of-process is mandatory. |
| `performance.now()` for timing | Hoist `Span.duration` | Span is `Date.now()` ms-resolution - too coarse. Use `performance.now()`; record into span as a tag. |
| Owned-object accounting + `performance.memory` | `measureUserAgentSpecificMemory()` (COI) | COI path needs COOP/COEP headers and gives realm-level (not Hoist-layer) breakdown; per CONTEXT it is optional. |
| `ViewManager` JsonBlob config | Bespoke localStorage / custom config store | ViewManager already does named/shared/global serializable config - don't reinvent. |
| Toolbox UI example app | hoist-react admin/inspector panel | Toolbox is the public, demonstrable home for the interactive UI per CONTEXT; core stays headless in the framework. |

**Installation:** No new npm dependencies required. The harness composes existing hoist-react facilities and Web Platform APIs. Server work extends existing Toolbox Grails services. Document the required Chrome launch flags rather than adding packages:

```bash
# Recommended Chrome launch flags for a measurement run (document these per HARN-05/HARN-04):
google-chrome \
  --js-flags="--expose-gc" \           # enables window.gc() for forced GC between iterations
  --enable-precise-memory-info \       # un-quantizes performance.memory (else ~100KB buckets)
  --enable-benchmarking                # reduces some background nondeterminism (optional)
```

## Architecture Patterns

### Recommended Project Structure
```
hoist-react/
  data/
    measure/                  # NEW: framework-resident measurement core (headless, config-driven)
      MeasurementHarness.ts   # orchestrator: takes a ScenarioConfig, runs the protocol, returns a RunResult
      MeasurementProtocol.ts  # warmup/measure iteration loop, forced-GC, percentile (median+p95) math
      BoundaryInstrumentation.ts  # wraps the 6 Phase-1 boundaries with runner().span() + performance.now()
      HeapAttribution.ts      # owned-object accounting + performance.memory deltas; AG Grid = remainder
      types.ts                # ScenarioConfig, UpdateConfig, RunResult, Scorecard, EnvMetadata
      CandidateAdapter.ts     # HARN-06 plug-in seam interface (baseline vs candidate)

toolbox/
  client-app/src/examples/datalab/    # NEW: interactive harness UI (example app)
    HarnessModel.ts           # drives MeasurementHarness; wires ViewManager for scenario configs + run history
    HarnessPanel.ts           # scenario picker, run controls, on-screen scorecard, side-by-side comparison
  grails-app/
    controllers/io/xh/toolbox/datalab/   # NEW: test-data API (HTTP)
    services/io/xh/toolbox/datalab/      # NEW: seeded shape generator + WebSocket push variants
                                         #      (extends existing portfolio PositionService.pushUpdates pattern)
```
(Folder names illustrative; planner picks final paths. The split - core in hoist-react, UI + server API in Toolbox - is a locked decision.)

### Pattern 1: The knob taxonomy (HARN-01 + HARN-02) - work the knobs first
**What:** Per the locked decision, define the parametric API (the "knobs") first; realistic scenario profiles are then just persisted JSON-blob instances of those knobs, not hardcoded shapes.
**When to use:** This is the spine of the config-driven design; everything else consumes a `ScenarioConfig`.

Dataset-shape knobs (HARN-01), driven through the Cube so aggregate rows are real:
- `leafRowCount` - number of leaf records loaded to the Cube's internal store.
- `dimensions` - Cube grouping dimensions; **this is what produces the aggregate-row count** (cardinality of the dimension cross-product). Large-leaf-plus-aggregate shapes come from many leaves under few/coarse dimensions.
- `fieldCount` + `fieldTypeMix` - number and type distribution of `CubeField`s/`Field`s: numbers, strings, dates, and **object-valued fields** (the Phase-1 heap question). Seeded.
- `aggregators` - which aggregated fields (SUM/AVG/etc.) the View computes (affects ViewResult size and the dataOnlyUpdate fast-path eligibility).

Update knobs (HARN-02):
- `updatePattern` - steady trickle | periodic burst | broad re-snapshot/replace | targeted narrow-field. (Determines snapshot vs diff and whether the View takes `fullUpdate` vs `dataOnlyUpdate`.)
- `breadth` - fields changed per updated record (narrow vs wide).
- `batchSize` + `rate` - records per batch and batches per second (throughput).
- `transport` - HTTP poll/diff | WebSocket push. **Only the delivery adapter changes**; both land on the same two ingest ops (Phase-1 invariant contract).

**Key insight (Phase-1 grounded):** every transport collapses to exactly two client ingest calls - full snapshot -> `Cube.loadDataAsync()`, incremental diff -> `Cube.updateDataAsync()`. So `transport` is a clean experimental knob: hold the pipeline constant, vary only the adapter that invokes those two entry points.

### Pattern 2: Boundary instrumentation with span structure + `performance.now()` timing (HARN-03 + HARN-05)
**What:** Wrap each of the six Phase-1 boundaries in a `runner().span()` for trace structure/correlation, but capture the load-bearing elapsed numbers with `performance.now()` and attach them as span tags. Instrument at boundaries, never per-micro-op.
**When to use:** Around each measured operation in the pipeline.
```typescript
// Source: hoist-react svc/TraceService.ts + docs/telemetry.md (verified), MDN performance.now()
// Boundary 5: compute (genTransaction) vs bridge (applyTransaction) - the HARN-05 split.
async measureGridSync(/* ... */) {
    return this.runner()
        .span('xhDataLab.gridSync')          // structure/correlation only (Date.now() ms)
        .run(async span => {
            const t0 = performance.now();
            const txn = genTransaction(newRs, prevRs);   // Hoist-side COMPUTE
            const t1 = performance.now();
            agApi.applyTransaction(txn);                 // synchronous JS->AG Grid BRIDGE call
            const t2 = performance.now();
            // Deferred render lands in a later frame - capture it so bridge cost isn't undercounted:
            await new Promise<void>(res => requestAnimationFrame(() => res()));
            const t3 = performance.now();

            const computeMs = t1 - t0, bridgeCallMs = t2 - t1, renderMs = t3 - t2;
            span.setTags({
                'xhDataLab.computeMs': computeMs,
                'xhDataLab.bridgeCallMs': bridgeCallMs,
                'xhDataLab.renderMs': renderMs,
                'xhDataLab.rowCount': newRs.count
            });
            return {computeMs, bridgeCallMs, renderMs};
        });
}
```
**Why not just use `Span.duration`?** `Span` records `startTime`/`endTime` via `Date.now()` (verified `core/Span.ts:67-89`) - 1ms resolution. A `genTransaction` over a few hundred rows can be well under 1ms; `Date.now()` would read 0. `performance.now()` is the correct timer.

The six boundaries to wrap (from Phase-1 ARCHITECTURE.md "Phase 2 instrumentation points"):
1. Cube ingest - `Cube.loadDataAsync` / `updateDataAsync`
2. Cube->View push - `noteCubeUpdated` -> `fullUpdate()` vs `dataOnlyUpdate()`
3. `View.result` `@observable.ref` write
4. Store load / `_filtered` rebuild
5. Grid `dataReaction` -> `genTransaction` -> `applyTransaction` (**the compute-vs-bridge split**)
6. Heap-attribution layers (see Pattern 3)

### Pattern 3: Layered heap attribution, no COI required (HARN-04)
**What:** Attribute resident heap to the four layers by combining (a) owned-object accounting from the Phase-1 allocation map with (b) whole-heap `performance.memory` deltas, treating AG Grid internals as the opaque remainder.
**When to use:** At a quiesced steady state, after a forced GC, at the end of an iteration.
```typescript
// Source: hoist-react svc/InspectorService.ts:129 (performance.memory precedent) + Phase-1 COPY-VS-REUSE
interface NonStandardPerformance extends Performance {
    memory?: {usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number};
}
function heapNow(): number {
    return (window.performance as NonStandardPerformance).memory?.usedJSHeapSize ?? null;
}

// Steady-state attribution after forced GC:
async function attributeHeap(ctx) {
    window.gc?.();                                  // force GC (requires --js-flags=--expose-gc)
    await wait(50);                                 // let GC settle
    const totalDelta = heapNow() - ctx.baselineHeap;

    // Owned layers: counts are known from the pipeline; per-record cost is calibrated once.
    const cubeRecords   = ctx.cube.records.length;
    const gridRecords   = ctx.gridModel.store.allCount;
    const viewRows      = ctx.view.result?.rows.length ?? 0;
    const owned =
        cubeRecords * ctx.calibration.cubeRecordBytes +
        gridRecords * ctx.calibration.gridRecordBytes +
        viewRows    * ctx.calibration.viewRowBytes;

    return {
        cubeStoreRecords: cubeRecords * ctx.calibration.cubeRecordBytes,
        gridStoreRecords: gridRecords * ctx.calibration.gridRecordBytes,
        viewResultRows:   viewRows    * ctx.calibration.viewRowBytes,
        agGridInternals:  Math.max(0, totalDelta - owned),   // opaque remainder
        totalHeapDelta:   totalDelta
    };
}
```
Notes:
- **`performance.memory` is quantized to ~100KB buckets** unless Chrome runs with `--enable-precise-memory-info` - document this flag as required for meaningful deltas.
- **It measures only the V8 heap**, not Blink/DOM/GPU; real renderer RAM is 2-4x. The harness reports V8 heap explicitly and labels it as such.
- Per-record calibration (`cubeRecordBytes`, etc.) can be derived by a dedicated calibration run that loads N records of a known shape and divides the heap delta by N. Object-valued-field shapes get their own calibration (the Phase-1 open question).
- **AG Grid internals are measured as the remainder, never read from source** (Phase-1: opaque library-owned allocation).

### Pattern 4: Out-of-process seeded generation (HARN-01/HARN-02), extending the portfolio service
**What:** The Grails test API generates seeded, deterministic data shapes and serves both an initial snapshot (HTTP) and a stream of updates (WebSocket push and/or HTTP diff), so generation never competes with the measured main thread.
**When to use:** As the data substrate for every run.
- Extend the existing Toolbox pattern: `PortfolioService` already generates randomized instruments/positions; `PositionService` already runs a `pushUpdates` WebSocket timer (`grails-app/services/io/xh/toolbox/portfolio`). The test API generalizes these to be shape-/pattern-parameterized by the request.
- Seed the server RNG from the `ScenarioConfig` so a given config regenerates the same data (reproducibility decision).
- Serve updates over `XH.webSocketService` (first-class WS push) and over HTTP diff, both resolving to the same client ingest contract.

### Pattern 5: Forced-GC, warmup-then-measure iteration protocol (HARN-05)
**What:** A reproducible loop: discard warmup iterations, force GC between iterations, take N measured iterations, report median + p95.
**When to use:** Every metric (compute, bridge, render, heap) flows through this loop.
```
for each scenario:
  setup(scenario)                       # load initial snapshot, mount grid
  calibrateHeap()                       # one-time per-record-bytes calibration
  repeat WARMUP times:  runIteration()  # discard (JIT warmup, lazy alloc, caches fill)
  repeat MEASURED times:
     window.gc(); settle()              # forced GC + settle for clean steady state
     t = performance.now(); runIteration(); record(performance.now() - t)
     attributeHeap()                    # post-iteration heap snapshot
  report median + p95 over MEASURED samples; persist with config + env metadata
```
- Iteration/warmup counts are Claude's discretion (a sane default: WARMUP=5, MEASURED=20+, tuned so p95 stabilizes). Persist the chosen counts with the run.
- Compute median + p95 directly (sort + index); no library needed.
- **Stamp environment metadata** every run: machine, browser version, enabled flags (`--expose-gc`, `--enable-precise-memory-info`), and `crossOriginIsolated` status - so runs compare meaningfully across machines and so the heap method used is recorded.

### Pattern 6: Candidate plug-in seam (HARN-06)
**What:** A common interface, swapped at the Phase-1 invariant seam, so baseline and candidate run through the identical protocol apples-to-apples.
**When to use:** To make the harness reusable for Phase 6/7 candidate evaluation, not just baseline.
- The cleanest swap point is the **`View.result -> Store` seam** (Phase-1 names it as the integration seam any reactivity bridge must target; later phases prototype "behind the `View.result -> Store` seam").
- Define an adapter interface like `{ loadSnapshot(rows), applyDiff(txn), getRowCount(), getResultRows() }` that both the baseline (Cube/View/Store) and a candidate engine implement. The harness instruments and measures against the interface; the implementation behind it is the variable.
- Lean toward common-interface/swap (CONTEXT discretion guidance) - keep the interface shaped by the real contracts mapped in Phase 1, not an idealized abstraction.

### Anti-Patterns to Avoid
- **Per-micro-op instrumentation.** HARN-03 says boundaries, not micro-ops. Phase-1 confirms whole-reference MobX granularity, so boundaries 3/4 fire once per ref swap - hook those, not per-row work.
- **Timing with `Date.now()` / `Span.duration` for sub-ms work.** Use `performance.now()`; spans carry the value as a tag.
- **Trusting a single `usedJSHeapSize` read as a layer attribution.** It's whole-heap and quantized; layer attribution needs accounting + remainder.
- **Reading AG Grid internal sizes from source.** They're opaque/library-owned (Phase-1); measure them as the remainder.
- **In-browser data generation.** Pollutes the measured main thread (CONTEXT-rejected).
- **Assuming `applyTransaction` cost ends when the call returns.** Render is deferred to a later frame; capture it.
- **Depending on TraceService being enabled/exported.** It's disabled by default and head-sampled - the harness's primary numbers must come from `performance.now()`/`performance.memory`, with spans as a correlation bonus.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Span creation / OTel export | Custom tracing layer | `runner().span()` + `TraceService` | HARN-03 explicitly says "existing OTel tooling"; W3C-compatible, server export already wired. |
| Whole-heap reading | Custom memory probe | `performance.memory.usedJSHeapSize` (Hoist already wraps it) | In-framework precedent in `InspectorService`; no better no-COI option exists. |
| Forced GC | Allocation-pressure tricks to coax GC | `window.gc()` via `--js-flags=--expose-gc` | The documented, deterministic mechanism. |
| Named/shared serializable config storage | Bespoke config store / localStorage schema | `ViewManager` (JsonBlob backend) | Purpose-built for named/private/shared/global serializable views (CONTEXT decision). |
| Seeded synthetic trading data | New generator from scratch | Extend Toolbox `PortfolioService`/`PositionService` | Existing randomized-instrument + WS `pushUpdates` patterns; reuse yields reusable server patterns (CONTEXT decision). |
| Metric timers/counters to server | Custom metric pipeline | `runner().timer()/.counter()` (`MetricsService`) | Already aggregates to Micrometer with outcome tags. |
| Compute vs bridge separation logic | Profiler-trace parsing | Direct `performance.now()` brackets around `genTransaction` and `applyTransaction` | The two calls are cleanly separable in JS at Boundary 5. |

**Key insight:** This phase is ~80% composition of existing hoist-react facilities. The genuinely new work is the iteration protocol, the heap-attribution accounting (counts x calibrated per-record cost + remainder), the knob/config schema, the Grails test API, and the comparison UI. Resist building a parallel tracing/metrics/config stack.

## Common Pitfalls

### Pitfall 1: Treating Hoist `Span` timing as high-resolution
**What goes wrong:** Using `span.duration` (or `Date.now()`) to measure compute/bridge cost reads 0ms or wildly quantized values for sub-millisecond operations.
**Why it happens:** `Span` sets `startTime`/`endTime` with `Date.now()` (verified `core/Span.ts:67-89,88`) - 1ms granularity by design (it's a distributed-trace span, not a microbenchmark timer).
**How to avoid:** Time with `performance.now()`; attach the elapsed value to the span as a tag for correlation. Use the span for structure/nesting/export, not for the load-bearing number.
**Warning signs:** Per-iteration durations that are integers, lots of 0ms readings, or implausibly identical timings.

### Pitfall 2: Expecting `measureUserAgentSpecificMemory()` to attribute by Hoist layer
**What goes wrong:** Planning HARN-04 around the "precise" API and discovering it returns only an iframe/worker/realm breakdown with `types: ["DOM","JS"]` - not "cube records vs grid records vs view rows vs AG Grid."
**Why it happens:** The API is for cross-realm/regression memory profiling, not intra-realm object attribution (verified MDN). It also requires cross-origin isolation (COOP+COEP).
**How to avoid:** Make owned-object accounting + `performance.memory` deltas the primary HARN-04 path (CONTEXT decision). Treat the COI API as optional and only if trivial. Record which method a run used in env metadata.
**Warning signs:** The plan budgets large effort for COOP/COEP header setup; the "breakdown" doesn't map to Hoist layers.

### Pitfall 3: `performance.memory` quantization swallowing the signal
**What goes wrong:** Heap deltas read as 0 or jump in coarse steps because values are rounded to ~100KB buckets (since Chrome 86, anti-fingerprinting).
**Why it happens:** Quantization is on by default; small per-iteration deltas fall inside a bucket.
**How to avoid:** Run with `--enable-precise-memory-info` to get exact bytes; document it as a required run flag and record it in env metadata. Alternatively measure larger deltas (more rows) so the signal exceeds the bucket.
**Warning signs:** Heap numbers in suspiciously round 100KB multiples; identical readings across differing row counts.

### Pitfall 4: Undercounting bridge cost by ignoring deferred render
**What goes wrong:** `applyTransaction()` returns fast (it queues work); the real layout/paint happens in a later frame, so bridge cost looks artificially cheap.
**Why it happens:** AG Grid (like the DOM generally) defers rendering; the synchronous call is only part of the cost.
**How to avoid:** After `applyTransaction`, await a frame (`requestAnimationFrame`, ideally `requestPostAnimationFrame`) and include that span in bridge/render cost. Report `bridgeCallMs` and `renderMs` separately so the split is honest.
**Warning signs:** Bridge time near zero while the UI visibly stutters; render cost unaccounted for.

### Pitfall 5: `window.gc()` is best-effort and async-ish
**What goes wrong:** Heap reads taken immediately after `window.gc()` still include not-yet-collected garbage, adding noise.
**Why it happens:** A single `gc()` call may not fully collect; collection/finalization can lag.
**How to avoid:** Call `gc()` then `settle()` (a short `wait()`); optionally call it twice. Validate with `--trace-gc`. Keep the settle duration in the protocol config.
**Warning signs:** Heap deltas that shrink on a second consecutive measurement with no work between them.

### Pitfall 6: Mounted-only grid reactions / remount full-replacement
**What goes wrong:** The harness measures a steady-state delta path but the grid was just (re)mounted, so it took a full `updateGridOptions({rowData})` replacement instead of a delta - very different cost.
**Why it happens:** Phase-1 INV-03: grid-driving reactions live in `GridLocalModel.onLinked` (mounted-only); on remount `prevRs` resets and the first load is a full replacement.
**How to avoid:** Ensure the grid is mounted and warmed before measured iterations; measure the remount full-replacement path as its own distinct scenario, not mixed into steady-state delta numbers.
**Warning signs:** First measured iteration is a huge outlier; cost doesn't scale with diff size.

### Pitfall 7: Instrumentation overhead leaking into the numbers (HARN-03 "bounded, documented overhead")
**What goes wrong:** Span creation, tag-setting, and frame-awaits add their own cost to the measured operation.
**Why it happens:** Any in-band measurement perturbs what it measures.
**How to avoid:** Keep instrumentation at boundaries (cheap, once per ref swap). Measure and document the harness's own overhead (a "null scenario" / empty-iteration baseline) and subtract or report it. This directly satisfies HARN-03's "bounded and documented overhead" clause.
**Warning signs:** Numbers drift when more spans/tags are added; overhead is a non-trivial fraction of the measured op.

## Code Examples

### Reading whole-heap (no COI) - matches the existing Hoist precedent
```typescript
// Source: hoist-react svc/InspectorService.ts:129, :256-263 (verified in source)
interface NonStandardPerformance extends Performance {
    memory?: {totalJSHeapSize: number; usedJSHeapSize: number; jsHeapSizeLimit: number};
}
const {usedJSHeapSize} = (window.performance as NonStandardPerformance).memory ?? {};
```

### The Runner instrumentation chain (verified API)
```typescript
// Source: hoist-react docs/telemetry.md (verified) - non-deprecated entry point
await this.runner()
    .span('xhDataLab.cubeIngest')      // combined with telemetryPrefix if set
    .timer('xhDataLab.cubeIngestTime') // optional MetricsService timer
    .run(async ctx => {
        const t0 = performance.now();
        await cube.updateDataAsync(diff);   // Boundary 1
        ctx.span.setTag('xhDataLab.elapsedMs', performance.now() - t0);
    });
```
Note: `HoistBase.withSpan()` and `FetchOptions.span`/`loadSpec` are **deprecated (removal v88)** - use `runner().span()` and pass context as the fetch method's second arg. (Verified `docs/telemetry.md`.)

### Detecting environment for run metadata
```typescript
// Capture per-run so saved scorecards stay comparable across machines (CONTEXT decision)
const env = {
    userAgent: navigator.userAgent,
    crossOriginIsolated: self.crossOriginIsolated,           // gates the COI heap path + 5us timers
    preciseMemory: /* whether --enable-precise-memory-info is on (heuristic) */,
    exposeGc: typeof (window as any).gc === 'function',
    heapMethod: self.crossOriginIsolated ? 'measureUAMemory?' : 'performance.memory'
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `HoistBase.withSpan()` for instrumentation | `runner().span()` fluent chain | v86 era (per upgrade notes; `withSpan` removal slated v88) | Harness must use `runner().span()`, not `withSpan`. |
| Exact `performance.memory` values | Values quantized to ~100KB unless `--enable-precise-memory-info` | Chrome 86+ | Document the flag; or measure deltas large enough to exceed a bucket. |
| `usedJSHeapSize` usable everywhere | `usedJSHeapSize` deprecated *in COI contexts*; those must use `measureUserAgentSpecificMemory()` | ongoing | The no-COI default path keeps `performance.memory`; only COI pages are pushed off it. |
| `performance.now()` ~5us everywhere | 100us in non-COI, 5us only when `crossOriginIsolated` | Chrome 91+ | Non-COI timing is coarser (100us) but still far better than `Date.now()` 1ms. |
| AG Grid 34 | AG Grid 35 (Hoist current); 36 is a *later* phase concern (SPEC-05) | recent Hoist upgrade | Harness targets AG Grid 35's `applyTransaction` API. |

**Deprecated/outdated:**
- `HoistBase.withSpan()` / `FetchOptions.span` / `FetchOptions.loadSpec` - deprecated, removal v88. Use `runner().span()`.
- Relying on un-flagged `performance.memory` precision - quantized since Chrome 86.

## Open Questions

1. **Per-record byte calibration accuracy.**
   - What we know: counts are exact; whole-heap delta is measurable post-GC.
   - What's unclear: how stable the per-record byte cost is across field-type mixes (esp. object-valued fields, where Phase-1 flagged shared-by-reference behavior) and whether shared object fields make naive `count x bytes` double-count.
   - Recommendation: a dedicated calibration scenario per field-shape; for object-valued fields, calibrate with and without the shared object to bound the sharing effect. Report calibration as part of the scorecard.

2. **Whether `measureUserAgentSpecificMemory()` adds enough value to justify COI setup.**
   - What we know: it requires COOP/COEP and returns realm-level breakdown (not Hoist-layer), and CONTEXT marks it optional/deferred.
   - What's unclear: whether its built-in GC + total-bytes number is a useful cross-check on `performance.memory`.
   - Recommendation: default OFF; if a planner wants a cheap cross-check, gate it behind `crossOriginIsolated` and only report its total `bytes`, never as the layer attribution. Skip if it grows complexity (CONTEXT directive).

3. **Does MobX action batching coalesce a burst into one `syncData()` run?** (Phase-1 open question carried forward.)
   - What we know: no explicit queue; Cube fans out to views via `forEachAsync` (async).
   - What's unclear: whether a high-rate burst collapses into one grid transaction or fires N times.
   - Recommendation: the harness should *measure* this directly (count `dataReaction`/`genTransaction` invocations per burst) - it's both a HARN-02 throughput knob output and a Phase-1 question the harness exists to answer.

4. **Grails test API: regenerate-on-seed cost and cluster behavior.**
   - What we know: existing portfolio data is cached + regenerated daily; updates pushed by a primary-only timer.
   - What's unclear: how to make per-run seeded regeneration cheap and deterministic without disturbing the cached portfolio app, and how WebSocket push fan-out behaves under harness-driven high rates.
   - Recommendation: build the test API as a distinct service/namespace from the portfolio demo so harness load doesn't perturb the existing example; seed deterministically per request.

## Sources

### Primary (HIGH confidence)
- hoist-react source (verified by direct read): `svc/TraceService.ts`, `core/Span.ts`, `core/types/Telemetry.ts`, `svc/InspectorService.ts` (`performance.memory` usage + `NonStandardPerformance` type), `svc/ClientHealthService.ts`, `inspector/stats/StatsModel.ts`/`StatsPanel.ts`.
- hoist-react docs (via Hoist MCP doc tools): `docs/telemetry.md` (Runner chain, TraceService, sampling, deprecations), `cmp/viewmanager/README.md`, `svc/README.md`, `docs/persistence.md`.
- hoist-react `package.json` - AG Grid 35.x.
- Toolbox source: `grails-app/services/io/xh/toolbox/portfolio/PortfolioService.groovy` + `PositionService.groovy` (existing generator + WebSocket `pushUpdates`), `client-app/src/examples/portfolio/PortfolioModel.ts` (cube + `XH.webSocketService` wiring).
- Phase 1 deliverables: `docs/planning/data2/ARCHITECTURE.md` (six instrumentation boundaries, invariant ingest contract, shared-store contract), `COPY-VS-REUSE.md`, `MOBX-GRANULARITY.md`, `TRANSPORT-INVENTORY.md`.
- MDN - [`measureUserAgentSpecificMemory()`](https://developer.mozilla.org/en-US/docs/Web/API/Performance/measureUserAgentSpecificMemory) (return shape, COI requirement, realm-level breakdown); [`Performance.now()`](https://developer.mozilla.org/en-US/docs/Web/API/Performance/now) (resolution).

### Secondary (MEDIUM confidence - current web, cross-checked)
- [Chrome for Developers: Aligning timers with cross-origin isolation](https://developer.chrome.com/blog/cross-origin-isolated-hr-timers) - 100us non-COI / 5us COI `performance.now()` resolution (Chrome 91+).
- [MDN: Performance.memory](https://developer.mozilla.org/en-US/docs/Web/API/Performance/memory) - deprecated in COI contexts; V8-heap-only; quantization.
- [chromestatus: measureUserAgentSpecificMemory](https://chromestatus.com/feature/5685965186138112) - secure-context + COI requirement.
- [AG Grid: High Frequency Updates](https://www.ag-grid.com/javascript-data-grid/data-update-high-frequency/) and [Transaction Updates](https://www.ag-grid.com/javascript-data-grid/data-update-transactions/) - `applyTransaction` (sync) vs `applyTransactionAsync` (50ms batch) cost model.

### Tertiary (LOW confidence - single/community source, flagged)
- Community reports of `--enable-precise-memory-info` un-quantizing `performance.memory` and `--js-flags=--expose-gc` enabling `window.gc()` (Google Groups, GitHub issues). Behavior is well-established and corroborated by Hoist's own usage, but exact quantization bucket size (cited variously as 100KB) should be re-confirmed empirically during the build.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all core facilities verified in hoist-react/Toolbox source and current docs; no new dependencies.
- Architecture: HIGH - the six boundaries, invariant ingest contract, and seam are Phase-1 verified; instrumentation/heap/protocol patterns follow directly.
- Browser APIs: HIGH for capabilities/requirements (MDN + Chrome docs); MEDIUM for exact quantization bucket and `window.gc()` determinism (re-confirm empirically - that's literally what the harness measures).
- Pitfalls: HIGH - each is grounded in a verified source fact (Span ms-resolution, quantization, deferred render, mounted-only reactions).

**Research date:** 2026-06-29
**Valid until:** ~2026-07-29 (30 days). hoist-react internals are stable on `develop`; browser-API specifics (quantization, timer resolution, `withSpan` removal in v88) should be re-checked if the build slips months out.
