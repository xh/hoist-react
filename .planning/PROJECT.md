# Hoist Data Layer 2.0

## What This Is

A spec-driven R&D, baseline-measurement, prototyping, and strategy effort targeting the **data layer
of `hoist-react`** - specifically the **Store / Cube / View / GridModel** complex and its integration
with **AG Grid**. The effort asks whether Extremely Heavy (XH) should design a **"Data 2.0"**: a
re-thought, possibly clean-sheet data/interop layer for 2026, grounded in our actual deployment
environment (data-dense enterprise SPAs for hedge funds and fund administrators), the realistic set of
technologies available today, and the path data must travel to end up rendered in AG Grid.

Data 2.0 need **not** be an in-place upgrade. It can be a **new system that stands alongside the
existing one** and, over time, absorbs high-volume / non-trivial workloads - leaving current
structures in place for simpler cases. This phase is **R&D, baseline, and recommendation, not a
commitment to rewrite.**

The audience is XH's engineering leadership and our largest clients (notably EMC), who are actively
asking - right now - where our performance ceiling is and why interactions aren't "fully real-time."

## Core Value

**An evidence-based answer** - backed by a reusable measurement harness and real heap/throughput
numbers - to whether and how to build a Data 2.0 layer. If everything else is deferred, the harness,
the measured baseline envelope, and an honest strategy recommendation (with the tradeoff frontier laid
bare) must exist. Verifiability over opinion: every "X is faster / lighter" claim is backed by a
measurement and its conditions.

## Requirements

### Validated

<!-- Capabilities the EXISTING data layer already provides (current-state, confirmed by Phase 1
inventory). These are context for the R&D, not deliverables of this project. -->

- ✓ Store: typed-field records, add/update, dirty tracking, editing model, filtering, single
  inbound-transform hook - existing
- ✓ Cube: typed fields with aggregators, query (filter + group-by + metrics), efficient incremental
  re-aggregation, differential update fan-out to many views - existing
- ✓ View: stable bridge between a cube query and a consuming Store - existing
- ✓ GridModel: store-bound AG Grid wrapper; store-level filtering; custom column chooser/header
  filters; store changes translated to AG Grid transactions - existing
- ✓ MobX reactivity substrate driving views, GridModel, and React rendering - existing
- ✓ WebSocket-fed incremental updates into a central cube with coalescing - existing

### Active

<!-- The R&D deliverables this effort must produce. Hypotheses/targets until shipped and validated. -->

- [ ] **Current-state architecture document** - corrected Store/Cube/View/GridModel model, full data
  flow, and copy-vs-reuse map, grounded in `hoist-react` source + real usage in `jobsite` /
  `veracity-webapp`. Includes Mermaid diagrams.
- [ ] **Memory-attribution report** - heap broken down by layer (cube store records vs. grid store
  records vs. AG Grid internals vs. intermediate view results), with methodology.
- [ ] **Test harness** - reusable, configurable load/throughput generator parameterizing dataset
  shape/size/field-count, update pattern/breadth/throughput, and change-delivery/transport. OTel
  instrumented at boundaries. Heap attribution built in. First-class, durable infrastructure.
- [ ] **Baseline performance envelope** - where the current stack's wall is, on both memory and CPU,
  across dataset shapes and update cadences.
- [ ] **Toolbox technology demo** - a portfolio / real-time-flavored demo in `toolbox` showing what
  the *current* stack can do at scale. High near-term business value - prioritize landing early.
- [ ] **Calculated-columns + dynamic-schema feature spec** - the §4 taxonomy turned into a concrete,
  testable spec with explicit AG Grid 36 parity mapping.
- [ ] **Technology comparison matrix** - every candidate (Arrow JS, SQLite-WASM, DuckDB-WASM,
  Perspective/FINOS, Web Workers, WASM, Immer/structural sharing, TanStack-style patterns, backend
  aggregation, the unidentified "fast WASM grid") scored on the common rubric, with evidence + spike
  notes.
- [ ] **Prototype spikes** - for the top candidate(s), benchmarked against the baseline using the
  harness. Validate bridge cost, incremental-update throughput, memory, and reactivity bridge.
- [ ] **Strategy & roadmap synthesis** - own-it-all vs. lean-on-AG-Grid assessment, honest tradeoff
  frontier, recommended path(s), and a phased "Data 2.0 alongside, then absorbs high-volume cases"
  adoption plan.
- [ ] **Quantitative targets** - defensible numbers for max positions x fields held client-side,
  sustained batch size/rate without jank, end-to-end update->render latency, and memory ceiling per
  tab (reference + small-heap machine). These become the harness pass/fail criteria.

### Out of Scope

- Committing to a full data-layer rewrite - this is R&D and recommendation; Data 2.0 may coexist and
  absorb high-volume cases incrementally
- Breaking or regressing the existing stack - coexistence is a design requirement, not an afterthought
- Premature lock-in to any single engine before the harness has spoken
- HFT-grade latency - target is human-perceptible live-trading-screen cadence (hundreds to low
  thousands of position updates/sec in coalesced batches, sub-second render), not microsecond trading
- First-class mobile / Firefox / Safari optimization - deployment is Chromium / Edge-first,
  desktop-first; other targets are far secondary
- Over-tailoring the spec so no viable candidate survives - if dynamic schema (the 20% case) or some
  calculated-column flavor would eliminate every strong option, flag the conflict instead of silently
  dropping good options

## Context

### Current architecture (working model - verify against source in Phase 1)

- **Store**: container of `StoreRecord`s defined by typed fields; add/update, dirty tracking, editing,
  filtering, single custom inbound-transform hook. Does NOT sort (the grid does).
- **Cube**: a distinct class that *contains* a Store internally; typed fields carry aggregators;
  applies filter + grouping + metric selection; accepts updates and efficiently recomputes
  aggregations; read/aggregate-oriented, not editable. Built for portfolio apps - one cube feeds many
  widgets, small differential updates fan out efficiently.
- **View**: stable bridge between a query and a Store; observes the cube, recomputes, pushes results
  into a consuming Store.
- **GridModel**: store-bound; observes store records; translates store changes into AG Grid
  transactions applied to AG Grid's internal structure. We've replaced much AG Grid machinery (column
  chooser, header filters) operating on the Store, so the Store is a shared, AG-Grid-independent data
  substrate that charts and toolbars also consume. This shared-store contract is central to Hoist's
  identity and value - and the source of real tension with "just use AG Grid's features."

### Full data flow (complex apps)

Compressed JSON over HTTP -> parsed raw JS object -> Store mints `StoreRecord`s (each keeps a
reference to the raw object AND a new inner data object) -> central cube holds leaf-level facts in its
internal store, WebSocket feeds incremental updates -> dashboard grid widget's coordinating model
creates a View on the cube (filter + group-by) -> View observes cube, results flow into the grid's
store -> store change generates AG Grid transactions -> AG Grid renders.

### Memory-multiplication problem (central concern)

The same datum can exist in several representations: JSON string -> parsed raw object -> StoreRecord
(raw ref + new inner data) -> View raw/aggregated results -> grid's store records -> AG Grid internal
nodes. Some reuse, some definite copying; aggregate/group rows are genuinely new. Memory is dominated
by raw leaf-level facts today (not derived fields - though user-defined calculated fields could change
that). Two explicit unknowns to resolve empirically: (1) exactly when/where data is copied vs. reused;
(2) how much heap lives in each layer (attribution is a harness output).

### Reactivity substrate

Hoist reactivity runs on **MobX**. Views observe cube state, GridModel observes the store, React
renders off MobX observers. Any new data engine must either feed MobX observability or provide its own
reactivity that bridges cleanly to React. A fast engine that can't drive fine-grained reactive updates
is not a fit.

### Forcing functions (why now)

- **AG Grid 36.0 (24 Jun 2026) calculated columns** (the trigger), plus "show values as," "automatic
  column generation" (35/36), and "aggregation editing" (35.2) - a feature cluster that overlaps our
  own wishlist and, if naively enabled, routes calculation through AG Grid's internal model, bypassing
  our Store layer. Deeper competitive frame: **Excel**.
- **Performance ceiling**: ~30-60k positions x tens of fields, ~10s load when smooth, all client-side
  aggregation, single-threaded main JS. Fits, but the tipping point feels near (memory or CPU).
- **Real-time / latency pressure**: EMC's head of software is pushing for sub-second / near-real-time,
  citing another dev's fast (possibly WASM-based) grid. Calibrated target: live-trading-screen cadence,
  ~500 position updates touching ~20 fields per batch, recompute aggregations and render before the
  next batch, no jank, bounded memory.
- **Scaling / headroom**: want to know where the wall is. Past OOM crashes on older small-heap Chrome
  machines. Measurement is the point.

### Primary sources available locally (siblings of hoist-react)

- `hoist-react` (primary, running inside it), `toolbox` (public demo, deploy target for the tech demo),
  `jobsite` (internal app using cube/typed-field/aggregation patterns), `veracity-webapp` (client app,
  same patterns). `hoist-core` (Grails/Spring Boot server) available if server-side
  aggregation/transport questions warrant. Read real usage, not just library definitions.

### Documented assumptions (from kickoff §12 - revisit if they block)

- **Quantitative targets**: we will propose defensible targets and let the harness adjudicate; not yet
  anchored to specific EMC-mandated numbers.
- **Licensing posture**: assume openness to evaluating third-party deps (Perspective, DuckDB-WASM)
  during research; deployment/compliance acceptability (esp. EMC) to be confirmed before adoption.
- **Transport reality**: assume asymmetric control - we shape our Grails transport; client
  WebSocket/SignalR/HTTP transports are fixed. A per-client transport matrix would sharpen research.
- **AG Grid Enterprise entitlement**: assume the relevant AG Grid 36 features may carry licensing
  implications across clients; confirm before depending on them.
- **Coexistence pilot**: no preferred first pilot workload chosen yet; candidates drawn from
  `jobsite` / `veracity-webapp` / `toolbox`.

## Constraints

- **Platform**: Chromium / Edge-first, desktop-first - Firefox/Safari/mobile far secondary. A
  Chromium-optimized strategy is acceptable if it unlocks gains.
- **Reactivity**: MobX/React fine-grained reactivity must be served or bridged cleanly.
- **Architecture**: the shared-store contract (charts, toolbars, non-grid consumers reading one
  filtered dataset) must be preserved, or its loss explicitly justified.
- **Transport**: asymmetric control - shapeable for our Grails server, fixed for client systems;
  solutions must degrade gracefully where transport is fixed.
- **Threading**: single-threaded main JS today; workers/WASM are on the table but carry a
  serialization/data-bridge tax that must be measured, not hand-waved (results are often large leaf
  sets + aggregates, not tiny summaries - the bridge cost is the crux).
- **Observability**: instrument harness/prototypes with Hoist's existing OTel tooling from day one, but
  be deliberate about OTel overhead in hot paths - instrument at boundaries, aggregate, don't trace
  every micro-op.
- **Dynamic schema** is a *factor, not a gate* (the 20% case): flag candidates that preclude it, but
  don't let it eliminate every otherwise-strong option.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Data 2.0 may stand *alongside* the current system, not replace in-place | De-risks; lets high-volume cases migrate incrementally while simple cases stay put | — Pending |
| Treat as spec-driven R&D, not a feature ticket | Deliberately ambitious; success is objectively measurable in this domain | — Pending |
| Codebase-mapping folded into Phase 1 (current-state inventory) rather than a separate `/gsd:map-codebase` pre-step | Phase 1 maps the data layer more deeply and grounds it in real `jobsite`/`veracity-webapp` usage | — Pending |
| R&D deliverables -> `docs/planning/data2/`; GSD orchestration -> `.planning/` | Deliverables belong in tracked repo docs; GSD metadata stays in its own home, cross-referenced | — Pending |
| Track `.planning/` on the `data2` branch (gitignore entry temporarily disabled) | Keep planning portable with the branch; revisit the "archive to hoist-ai" convention before merge | — Pending |
| Model profile: Quality (Opus for research/roadmap) | Ambitious R&D where analysis depth matters; long-running effort justifies the cost | — Pending |
| Land the Toolbox demo + baseline early | Highest near-term business value; answers the "where's our limit" question being asked now | — Pending |

---
*Last updated: 2026-06-27 after initialization*
