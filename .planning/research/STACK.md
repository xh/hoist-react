# Stack Research

**Domain:** In-browser client-side analytical data layer for data-dense financial dashboards (React / MobX / AG Grid / TypeScript, Chromium-Edge-first, desktop)
**Researched:** 2026-06-27
**Confidence:** HIGH on versions/maturity/licensing (verified live); MEDIUM on bridge-cost magnitudes and reactivity-bridge ergonomics (verified directionally via docs + multiple sources, but the decisive numbers must come from the Phase 2 harness, not this document)

---

## Reading guide (the one thing that matters)

The recurring crux for every candidate is the **JS<->engine data boundary cost for our actual result shapes**: many leaf rows (up to the full ~30-60k leaf set) PLUS aggregates, fanned out to many views, on coalesced delta batches (hundreds of updates/sec). The temptation is to read "DuckDB is 10-100x faster than JS objects" or "Arrow transfers are zero-copy" and conclude the bridge is cheap. **It is not cheap for our shape**, and the reasons are subtle. Two distinct taxes compound:

1. **Transpose tax (columnar <-> row).** WASM/columnar engines (Arrow, DuckDB, Perspective) hold data column-major. AG Grid, our Store, and MobX all want row-major `StoreRecord` objects. The "zero-copy" claims apply to moving the *columnar buffer* across the worker boundary - NOT to the column->row materialization that AG Grid + MobX require on the other side. For a large leaf result that materialization is O(rows x fields) object allocation - exactly the cost we are trying to eliminate. This is why offloading to a worker "looks like it might erase the gains" (KICKOFF §5): you save compute but pay it back at the boundary.

2. **Reactivity tax (MobX observability).** Every leaf datum that drives fine-grained reactive rendering today is wrapped in MobX observability. A fast engine that hands back a flat columnar buffer has *no* MobX observability; making it reactive means either (a) re-wrapping into observable records (re-incurring tax #1 plus per-field atom overhead), or (b) replacing MobX-driven rendering with the engine's own change feed bridged to React. Option (b) is architecturally invasive and is the deep question this whole project exists to answer.

Read every recommendation below through this lens. The tiering is driven primarily by how each candidate behaves on these two taxes for large-leaf-plus-aggregate results - not by raw single-shot query speed.

---

## Recommended Stack

This is an R&D evaluation, not a greenfield build, so "recommended stack" = the prioritized set of technologies to put hands on, with version pins for the spikes. Tiering rationale is in the next section.

### Core Technologies (evaluate seriously - spike against the harness)

| Technology | Version (verified 2026-06) | Purpose | Why Recommended |
|------------|----------------------------|---------|-----------------|
| **Perspective** (`@finos/perspective`, `@finos/perspective-viewer`) | **4.5.1** (2026-05-31); repo now `perspective-dev/perspective`, commercial backer Prospective | Columnar WASM analytics engine + optional canvas viewer, **purpose-built for streaming financial dashboards** | The single closest off-the-shelf fit. Only candidate with a *native* incremental/partial-update + change-notification model (`on_update`, index-based partial `update()`), which directly maps to our cube delta-fanout pattern. Has a real reactivity story (its own change feed). Likely the "fast WASM grid" the the lead client dev demoed. Engine and viewer are separable - evaluate **headless** (engine feeds our Store/AG Grid) AND **UI** modes. |
| **Apache Arrow JS** (`apache-arrow`) | **21.1.0** (npm JS line; tracks Arrow format v24.0.0, 2026-04) | Columnar in-memory format / interchange substrate | Not an engine - the *lingua franca* every WASM engine speaks. The decision-relevant artifact: it is the wire format whose buffers are `Transferable` (zero-copy across worker boundary). Evaluate as the **boundary format**, and to measure the transpose tax (Arrow column buffers -> row `StoreRecord`s) in isolation. Its in-JS compute (filter/aggregate via Arrow alone) is weak vs. DuckDB - do not evaluate it as a query engine. |
| **DuckDB-WASM** (`@duckdb/duckdb-wasm`) | stable **1.5.4** (engine), npm `1.33.x`; based on DuckDB v1.5.x | OLAP SQL engine in the browser, Arrow-native I/O | Best-in-class analytical query speed in-browser (10-100x vs. JS objects on cold queries; zero-copy Arrow results). BUT two structural mismatches for *our* use case: (1) **single-threaded in browser** (SharedArrayBuffer/cross-origin-isolation limits persist in 2026); (2) **no materialized views / no incremental re-aggregation** - every delta batch implies re-INSERT + full re-query + re-transpose. Evaluate to quantify the bridge/transpose tax and as a possible **durable-storage / heavy-batch-query** role, NOT as the real-time delta-fanout engine. |

### Supporting Libraries (evaluate lightly - cheap, possibly high near-term ROI, or narrow role)

| Library | Version (verified 2026-06) | Purpose | When to Use |
|---------|----------------------------|---------|-------------|
| **Immer** | mature, stable | Structural-sharing immutable updates | Cheap to evaluate, potential memory win **without** rearchitecture by reducing copying in the StoreRecord cascade. BUT auto-freeze + Proxy overhead is real in hot per-row loops - measure, don't assume. Likely the lowest-effort/highest-ROI experiment to run early. |
| **Mutative** | 1.x, actively maintained | Faster Immer-compatible alternative (auto-freeze off by default; benchmarked ~10-17x faster than Immer on large state) | If structural sharing helps but Immer's freeze/Proxy cost shows up in the harness hot path, swap to Mutative. Same mental model, drop-in-ish API. |
| **Web Workers** | platform | Threading primitive | Not a solution by itself - "solves threading, not memory" (KICKOFF §6). Evaluate strictly as the transport for measuring the serialization/transpose bridge under realistic large-result shapes. Pair with Arrow `Transferable` buffers to get the best-case boundary number. |
| **Arquero** (`arquero`, uwdata) | ~7.x, maintained | Pure-JS Arrow-backed dataframe (filter/group-by/aggregate) | A *lightweight* main-thread or worker alternative that avoids a WASM dependency and avoids the transpose-to-WASM-memory tax (it operates on Arrow-backed JS arrays directly). Slower than DuckDB on big group-bys, but no WASM bridge and simpler licensing/footprint. Worth one spike as the "stay-in-JS, go-columnar" midpoint between today's stack and a WASM engine. |

### Development / Measurement Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Hoist OTel instrumentation (existing) | Boundary-level timing/throughput in harness + spikes | Instrument at boundaries and aggregate; do NOT trace per-micro-op (KICKOFF §10 - OTel overhead in hot paths). |
| Chrome DevTools heap snapshots + `performance.measureUserAgentSpecificMemory()` | Per-layer heap attribution | The memory-attribution report (PROJECT Active deliverable) depends on this. `measureUserAgentSpecificMemory` gives cross-origin-isolated, GC-accurate totals in Chromium - ideal for the desktop/Edge target. |
| `timlrx/browser-data-processing-benchmarks` (reference harness) | Cross-check our harness numbers against a published Arquero/SQLite-WASM/DuckDB-WASM benchmark | Use as a sanity baseline for engine-only query times before layering in our transpose + reactivity taxes. |

---

## Candidate-by-candidate assessment (the rubric: version/maturity, licensing, bridge cost, incremental updates, MobX/React bridge)

### Tier 1 - Evaluate seriously (hands-on spikes against the harness)

**Perspective (`@finos/perspective` 4.5.1)** - CONFIDENCE: HIGH on facts below, MEDIUM on fit conclusion
- **Version/recency:** v4.5.1, 2026-05-31. Very actively developed (4.3 -> 4.5 across Mar-May 2026). Note the repo now lives at `perspective-dev/perspective` with commercial backer **Prospective** (founded by the former JPMorgan FINOS lead maintainer, ~$6M seed). Still Apache-2.0 open source; the company sells an enterprise tier on top.
- **Licensing:** Apache-2.0 (permissive, commercial-friendly). FLAG for the lead client/compliance review: confirm the open-source engine (not the enterprise product) is what's adopted, and that Apache-2.0 + WASM binary distribution is acceptable in client deployment.
- **Bridge cost:** Best-positioned of the engines. Columnar internally, but designed end-to-end for the streaming-dashboard shape, and the viewer can render *without* round-tripping data back to JS row objects (engine and renderer both live in the WASM/worker world). The decision fork: **headless mode** (engine feeds OUR AG Grid/Store - re-incurs the transpose + MobX tax) vs. **viewer mode** (Perspective owns rendering - avoids the tax but breaks the shared-store contract and the AG Grid investment). Measure both.
- **Incremental updates:** YES, native. Index-based partial `update()` (in-place row updates by key), `on_update` notifications, built for streaming. KNOWN LIMITATION (verify in spike): partial updates can still propagate full *rows* to subscribed views rather than field-level deltas (GitHub discussions #1463, #1750) - assess whether that re-introduces a fanout cost at our breadth.
- **MobX/React bridge:** Has its own reactive change feed. Bridging `on_update` -> MobX is plausible (wrap a thin observable layer keyed by index), but the natural mode is to let Perspective drive its own viewer. This is the crux for the shared-store contract.
- **Verdict:** The most important single spike in the project. Test headless-feeding-our-grid AND viewer-replaces-our-grid, and measure the delta-fanout breadth limitation explicitly.

**Apache Arrow JS (`apache-arrow` 21.1.0)** - CONFIDENCE: HIGH
- **Version/recency:** npm JS line 21.1.0; the Arrow *format* is at v24.0.0 (2026-04). JS API is stable; cross-language version numbers do not imply JS breakage.
- **Licensing:** Apache-2.0.
- **Bridge cost:** This is the candidate that lets us *measure* the bridge in isolation. Arrow buffers are `Transferable` -> moving them main<->worker is genuinely zero-copy. The tax is entirely on the **column->row materialization** into `StoreRecord`s. Spike: time "Arrow RecordBatch in worker -> Transferable to main -> materialize N row objects with M fields" at N=60k, M=60. That number is the floor for any WASM-engine path that feeds our existing row/MobX world.
- **Incremental updates:** N/A - Arrow is an immutable columnar format, not an update engine. Mutating an Arrow table = rebuild. Not a fit as a live store; a fit as a transport/interchange format.
- **MobX/React bridge:** None natively; columnar buffers are the opposite of per-record observables. Any bridge requires materialization (tax #1) or a column-oriented reactivity rethink.
- **Verdict:** Evaluate as **boundary format + measurement instrument**, and as the interop glue if DuckDB/Perspective enter the stack. NOT as a standalone engine.

**DuckDB-WASM (`@duckdb/duckdb-wasm`, engine 1.5.4)** - CONFIDENCE: HIGH
- **Version/recency:** stable engine 1.5.4; npm `1.33.x-dev` published within days of this research. Very active. Based on DuckDB v1.5.x core.
- **Licensing:** MIT (very permissive). Easiest licensing story of the WASM engines.
- **Bridge cost:** Query results are native Arrow (zero-copy out of the engine). But for our shape the transpose tax (tax #1) applies in full to get rows into AG Grid/MobX, and DuckDB-WASM is **single-threaded in the browser** (SharedArrayBuffer / cross-origin-isolation constraints still bite in 2026; COI support experimental) - so a big query competes with the main thread unless isolated in a worker, which then re-incurs the boundary cost.
- **Incremental updates:** WEAK FIT. No materialized views, no native streaming ingest. A delta batch = INSERT/UPDATE rows + **re-run the aggregation query + re-transpose the full result**. There is no cube-style incremental re-aggregation or differential fanout. This is the decisive mismatch against the §3.3 real-time delta-fanout requirement.
- **MobX/React bridge:** None. Pull-based query model; reactivity is "re-query and diff yourself."
- **Verdict:** Evaluate seriously but with a **narrowed role hypothesis**: durable/queryable leaf storage and heavy ad-hoc / batch analytical queries, NOT the live real-time aggregation engine. Its strengths (SQL, big cold queries, Arrow interop) don't match the differential-update crux; its incremental story is its weakness.

### Tier 2 - Evaluate lightly (cheap experiments, narrow roles, or measurement scaffolding)

**Immer / Mutative** - CONFIDENCE: HIGH on perf characteristics
- Structural sharing could cut the memory multiplication (PROJECT §2.7) by reusing references across the StoreRecord cascade without a rearchitecture - potentially the highest near-term ROI for the lowest effort. Caveat: Immer's auto-freeze + Proxy machinery has measurable cost in hot per-row loops (benchmarks show Mutative 10-17x faster on large state with auto-freeze off). Run a small heap+throughput experiment early; prefer **Mutative** if Immer's freeze cost shows up. Licensing: both MIT.

**Web Workers** - CONFIDENCE: HIGH
- Platform primitive, not a solution. Solves main-thread jank, not memory, and introduces the serialization boundary that is the project's crux. Use it as the measurement vehicle for the bridge (paired with Arrow `Transferable`). Decision-relevant only insofar as it quantifies tax #1.

**Arquero (uwdata)** - CONFIDENCE: MEDIUM
- The "go columnar but stay in pure JS" midpoint: Arrow-backed dataframe with filter/group-by/aggregate, no WASM dependency, no transpose-into-WASM-memory tax. Slower than DuckDB on large group-bys but with a far simpler footprint and no cross-origin-isolation requirement. Worth one spike as a low-risk improvement path over today's hand-rolled cube aggregation. Licensing: BSD-3-Clause.

**SharedArrayBuffer / zero-copy WASM** - CONFIDENCE: MEDIUM
- Genuinely useful for columnar data shared between worker/WASM and main thread without copy, AND it is the gating requirement for multi-threaded DuckDB-WASM. BUT requires **cross-origin isolation** (COOP/COEP headers), which constrains the page (cross-origin embeds, some third-party scripts). On the Chromium/Edge-first, desktop-first target this is acceptable to pursue; flag the COOP/COEP deployment constraint to app teams. Evaluate only after a Tier-1 engine shows promise.

### Tier 3 - Deprioritize / do not pursue (with reasons)

| Candidate | Reason to deprioritize |
|-----------|------------------------|
| **sql.js** | In-memory only, main-thread, no OPFS persistence, no reactive model. Superseded by `@sqlite.org/sqlite-wasm` and DuckDB-WASM for every dimension we care about. Do not pursue. |
| **`@sqlite.org/sqlite-wasm` / `wa-sqlite` (SQLite-WASM generally)** | OLTP row-store, not analytical. No built-in reactive/change-notification model (we'd have to build delta-tracking ourselves), and the official Worker1/Promiser APIs were deprecated 2026-04-15 as too fragile/imperformant for non-toy software. DuckDB-WASM dominates it for in-browser *analytics*. Only relevant if durable on-device persistence (OPFS) became a hard requirement - it is not in scope. Note for the report rather than spike. |
| **Glide Data Grid** (`@glideapps/glide-data-grid`) | MIT, canvas-based, fast - but it is a **renderer, not a data engine**, orthogonal to the data-layer question and a competitor to AG Grid, not to our Store/Cube. Likely NOT the the lead client "fast WASM grid" (it is canvas-JS, not WASM). Mention as a rendering-tier datapoint only; do not spike for the data-layer question. |
| **TanStack Query** | Server-state cache / request-dedup / differential-fetch patterns. Useful *pattern* vocabulary for streaming-update management, but not a client-side analytical data engine and adds nothing our cube delta-fanout doesn't already do. Read for patterns; do not adopt as a dependency. |
| **RevoGrid / RealGrid / other AG Grid alternatives** | Rendering-tier alternatives, not data-layer engines. Out of scope for STACK; AG Grid 36 is the incumbent renderer and the §3.1 forcing function. |

### Cross-cutting: backend / server-side aggregation - CONFIDENCE: MEDIUM
- Not a library but a stack *posture*: push aggregation to `hoist-core` (Grails) and ship pre-shaped deltas. Trades backend compute + bandwidth for client memory/CPU. Strongest where **we control transport** (our Grails server). Bounded by the §5 transport asymmetry: degrades to "client owns transport, we can't reshape" against fixed client WebSocket/SignalR/HTTP. Treat as a first-class architectural option in the comparison matrix, evaluated per-client against the transport matrix (KICKOFF §12 Q3). It is the lowest-client-memory path and should not be dismissed in favor of a shiny in-browser engine.

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Perspective (real-time engine) | DuckDB-WASM | When the workload is heavy *ad-hoc/batch SQL analytics* over a large static-ish leaf set, not high-rate streaming fanout |
| DuckDB-WASM (in-browser query) | Backend aggregation in `hoist-core` | When we control transport AND client memory is the binding constraint - push the compute server-side, ship deltas |
| DuckDB-WASM (analytics) | Arquero | When avoiding a WASM dependency / cross-origin-isolation matters more than peak group-by speed, and staying in pure JS eases the MobX bridge |
| Immer (structural sharing) | Mutative | When auto-freeze/Proxy overhead appears in harness hot paths - Mutative is the faster drop-in |
| `@sqlite.org/sqlite-wasm` | DuckDB-WASM | Always, for *analytical* in-browser work - SQLite is OLTP; only choose SQLite if durable OPFS persistence becomes a hard requirement |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| sql.js | In-memory only, main-thread, no reactivity, superseded | DuckDB-WASM (analytics) or skip |
| SQLite-WASM as the analytics engine | OLTP row-store, no reactive model, Worker1/Promiser deprecated 2026-04 | DuckDB-WASM or Perspective |
| Apache Arrow JS as a query/update engine | Immutable columnar format; weak in-JS compute; no incremental updates | Arrow as transport only; DuckDB/Perspective for compute |
| Assuming "zero-copy Arrow" means a cheap bridge | Zero-copy applies to the columnar *buffer transfer*, NOT the column->row + MobX materialization our grid needs | Measure the transpose + reactivity tax explicitly in the harness |
| Glide Data Grid for the data-layer question | It is a renderer, not a data engine | AG Grid 36 stays the renderer; engine question is separate |

## Stack Patterns by Variant

**If the binding constraint is real-time streaming fanout (the §3.3 the lead client pressure):**
- Lead with **Perspective** (only native incremental + change-notification engine).
- Because DuckDB's re-query-on-every-delta model and SQLite's lack of reactivity both fail the differential-fanout test.

**If the binding constraint is client memory ceiling / OOM on small-heap machines (the §3.4 pressure):**
- Lead with **structural sharing (Immer/Mutative)** to cut the StoreRecord cascade, AND **backend aggregation** to keep leaf volume off the client where transport allows.
- Because the memory is dominated by raw leaf facts (PROJECT §2.7), and the cheapest wins are reducing copies and reducing how much leaf data lives client-side.

**If the binding constraint is heavy ad-hoc analytical queries over a large leaf set:**
- Lead with **DuckDB-WASM** (in a worker, Arrow results), accept the transpose tax for cold queries.

**If preserving the shared-store contract is paramount (charts/toolbars consume one filtered dataset):**
- Favor **headless engine feeds our Store** topologies (Perspective-headless, DuckDB-in-worker) over **engine-owns-rendering** (Perspective-viewer), and budget for the transpose + MobX re-wrap tax accordingly.

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `@duckdb/duckdb-wasm` 1.33.x | `apache-arrow` 21.x | DuckDB-WASM emits Arrow; align Arrow JS major to avoid RecordBatch shape mismatches. Verify exact peer range in the spike. |
| `@finos/perspective` 4.5.x | `apache-arrow` (Arrow-format ingest) | Perspective accepts Arrow input; it bundles its own WASM engine - it is not built *on* Arrow JS. |
| DuckDB-WASM multi-threaded | SharedArrayBuffer + COOP/COEP | Multi-thread requires cross-origin isolation headers on the host page - a deployment constraint, not just a dependency. |
| `apache-arrow` Transferable buffers | Web Workers | Arrow buffers are `Transferable` for zero-copy postMessage; this is the best-case worker bridge to measure. |

## Sources

- https://github.com/finos/perspective/releases - Perspective v4.5.1 (2026-05-31), release cadence, repo now `perspective-dev/perspective` (HIGH, official)
- https://prospective.co/blog/announcing-perspective-3-0-0-the-worst-release-yet + https://www.linkedin.com/company/prospective-company - Prospective commercial backer, ex-JPMC maintainer, seed round (MEDIUM)
- https://perspective.finos.org/guide/explanation/table/update_and_remove.html - index-based partial `update()`, streaming model (HIGH, official docs)
- https://github.com/finos/perspective/discussions/1463 + /1750 - delta granularity: partial updates can propagate full rows (MEDIUM, maintainer discussions - verify in spike)
- https://github.com/duckdb/duckdb-wasm/releases + https://www.npmjs.com/package/@duckdb/duckdb-wasm - DuckDB-WASM 1.5.4 / 1.33.x, Arrow-native, single-threaded note (HIGH, official)
- https://duckdb.org/docs/current/clients/wasm/overview + https://duckdb.org/2025/10/13/duckdb-streaming-patterns - single-thread limitation, no native streaming/materialized views, workaround patterns (HIGH, official)
- https://duckdb.org/2025/05/23/arrow-ipc-support-in-duckdb + https://arrow.apache.org/blog/2025/01/10/arrow-result-transfer/ - Arrow IPC / zero-copy result transfer mechanics (HIGH, official)
- https://www.npmjs.com/package/apache-arrow + https://arrow.apache.org/release/ - Arrow JS 21.1.0, format v24.0.0 (2026-04) (HIGH, official)
- https://observablehq.com/@kylebarron/zero-copy-apache-arrow-with-webassembly + https://github.com/kylebarron/arrow-js-ffi - zero-copy Arrow buffers across WASM/worker boundary; what "zero-copy" does and does not cover (MEDIUM-HIGH)
- https://github.com/timlrx/browser-data-processing-benchmarks + https://www.timlrx.com/blog/the-best-in-browser-data-processing-framework-is-sql (paywalled, title-level only) - Arquero vs SQLite-WASM vs DuckDB-WASM in-browser; DuckDB fastest on analytics (MEDIUM)
- https://powersync.com/blog/sqlite-persistence-on-the-web (May 2026) + https://github.com/sqlite/sqlite-wasm - SQLite-WASM landscape, Worker1/Promiser deprecation 2026-04-15, OPFS (HIGH)
- https://github.com/rhashimoto/wa-sqlite - wa-sqlite VFS options, AccessHandlePoolVFS (MEDIUM)
- https://mutative.js.org/docs/extra-topics/comparison-with-immer/ + https://github.com/unadlib/mutative + https://blog.logrocket.com/react-state-tools-mutative-vs-immer-vs-reducers/ - Immer auto-freeze/Proxy cost, Mutative 10-17x on large state (MEDIUM-HIGH)
- https://github.com/glideapps/glide-data-grid + LICENSE - MIT, canvas renderer (HIGH, official)
- https://github.com/uwdata/arquero - Arquero Arrow-backed dataframe, BSD-3 (HIGH, official)
- MobX architecture refs (fine-grained per-observer reactivity, observer-count overhead tradeoff) - directional only, no 2026 per-record benchmark found (LOW-MEDIUM)

---
*Stack research for: in-browser client-side analytical data layer (Hoist Data 2.0)*
*Researched: 2026-06-27*
