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

The audience is XH's engineering leadership and our largest clients (notably the lead client), who are actively
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
- ✓ Cube: a distinct class wrapping a `Store` internally; typed fields with `Aggregator`s (built-ins
  SUM/AVG/MIN/MAX/UNIQUE/LEAF_COUNT/etc.; weighted-average is a custom `Aggregator` subclass, NOT a
  built-in); query (filter + dimensions + aggregated fields); efficient incremental re-aggregation;
  imperative differential fan-out to connected views. Supports local edits via `modifyRecordsAsync` -
  existing
- ✓ View: stable bridge between a cube query and one OR MORE consuming Stores (`ViewConfig.stores`);
  results exposed as `ViewResult {rows, leafMap}` - existing
- ✓ GridModel: store-bound AG Grid wrapper; store-level filtering (`GridFilterModel`/`StoreFilterField`,
  can bind a Store or a Cube View); custom column chooser (column-state, not store); store changes
  translated to SYNCHRONOUS AG Grid transactions (`applyTransaction`) by reactions that live in the
  grid component (`GridLocalModel`, active only while mounted) - existing
- ✓ MobX reactivity: React rendering driven off MobX observers; the cube->view fan-out is IMPERATIVE
  push (`noteCubeUpdated`), with MobX observability entering at the `View.result` boundary
  (`@observable.ref`) - existing
- ✓ Transport-agnostic incremental delivery (multiple patterns, all existing): (a) poll-then-diff over
  HTTP (full snapshot or `isPartial` diff -> `loadDataAsync`/`updateDataAsync`); (b) **WebSocket data
  push** via a first-class `XH.webSocketService` (`WebSocketSubscription`/`WebSocketMessage`),
  demonstrated in Toolbox's portfolio example (`PortfolioService`/`PositionSession`) and used heavily
  in client apps not checked out locally; (c) WebSocket-as-notification ("refresh ready" -> HTTP
  fetch). The data layer must remain transport-agnostic and support all of these

### Active

<!-- The R&D deliverables this effort must produce. Hypotheses/targets until shipped and validated. -->

- [ ] **Current-state architecture document** - corrected Store/Cube/View/GridModel model, full data
  flow, and copy-vs-reuse map, grounded in `hoist-react` source + real usage in `jobsite` /
  a client app. Includes Mermaid diagrams.
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
- **Cube**: a distinct class that *contains* a Store internally; typed fields carry `Aggregator`s
  (built-ins are SUM/AVG/MIN/MAX/UNIQUE/etc.; weighted-average is a custom subclass, not built-in);
  applies filter + dimensions + aggregated-field selection; accepts updates and efficiently recomputes
  aggregations; primarily read/aggregate-oriented but supports local edits via `modifyRecordsAsync`.
  Built for portfolio apps - one cube feeds many widgets (and apps run multiple cubes); small
  differential updates fan out **imperatively** to connected views.
- **View**: stable bridge between a query and one or more consuming Stores. The cube pushes changes to
  the view imperatively (`noteCubeUpdated`); the view recomputes and exposes a `ViewResult` whose
  reference is MobX-observable (`@observable.ref`); results are loaded into the consuming store(s).
- **GridModel**: store-bound; reactions (in the mounted grid component, not GridModel itself) observe
  store records and translate changes into **synchronous** AG Grid transactions (`applyTransaction`)
  applied to AG Grid's internal structure. We've replaced much AG Grid machinery: the column chooser
  operates on column-state, while filtering (`GridFilterModel`, `StoreFilterField`) operates on the
  Store (or a Cube View). The Store is a shared, AG-Grid-independent data substrate that charts and
  toolbars also consume. This shared-store contract is central to Hoist's identity and value - and the
  source of real tension with "just use AG Grid's features."

### Full data flow (complex apps)

JSON over HTTP (transport-level compression) -> parsed raw JS object -> Store mints `StoreRecord`s
(each keeps a reference to the raw object AND a new inner data object) -> central cube holds leaf-level
facts in its internal store; incremental updates arrive via whichever transport an app uses - **HTTP
poll-then-diff** (full snapshot or `isPartial` diff -> `loadDataAsync`/`updateDataAsync`), **WebSocket
data push** (`XH.webSocketService` subscriptions feeding `updateDataAsync`), SignalR, or
WebSocket-as-notification - the layer is transport-agnostic -> a dashboard grid widget's coordinating
model wires the cube to the grid's
store by one of two production patterns: (a) declarative - `cube.createView({connect: true})` +
`view.setStores([...])`; or (b) manual - a MobX reaction on `cube.records` calls `cube.executeQuery()`
and feeds `gridModel.loadData()` -> store change generates synchronous AG Grid transactions -> AG Grid
renders.

> Architecture above was validated against source and real `jobsite`/a client app usage on
> 2026-06-27 (corrections in `docs/planning/data2/KICKOFF-VALIDATION.md`). **Caveat:** the two local
> apps are *samples* - they use HTTP poll-then-diff, but that is not representative of all XH apps.
> WebSocket data push is a first-class, important pattern elsewhere. Do not over-anchor requirements to
> what the local samples do or don't do.

### Memory-multiplication problem (central concern)

The same datum can exist in several representations: JSON string -> parsed raw object -> StoreRecord
(raw ref + new inner data) -> View raw/aggregated results -> grid's store records -> AG Grid internal
nodes. Some reuse, some definite copying; aggregate/group rows are genuinely new. Memory is dominated
by raw leaf-level facts today (not derived fields - though user-defined calculated fields could change
that). Two explicit unknowns to resolve empirically: (1) exactly when/where data is copied vs. reused;
(2) how much heap lives in each layer (attribution is a harness output).

### Reactivity substrate

Hoist reactivity runs on **MobX**, but the cube->view layer is **imperative push**, not reactive
observation: the cube calls `view.noteCubeUpdated()` directly. MobX observability begins at the
`View.result` reference (`@observable.ref`); grid reactions (in the mounted grid component) observe the
store and React renders off MobX observers. The integration seam for any new engine is therefore the
**View.result -> Store boundary**, not a cube-level observable. Any new data engine must either feed
MobX observability at that seam or provide its own reactivity that bridges cleanly to React. A fast
engine that can't drive fine-grained reactive updates is not a fit.

### Forcing functions (why now)

- **AG Grid 36.0 (24 Jun 2026) calculated columns** (the trigger), plus "show values as," "automatic
  column generation" (35/36), and "aggregation editing" (35.2) - a feature cluster that overlaps our
  own wishlist and, if naively enabled, routes calculation through AG Grid's internal model, bypassing
  our Store layer. Deeper competitive frame: **Excel**.
- **Performance ceiling**: ~30-60k positions x tens of fields, ~10s load when smooth, all client-side
  aggregation, single-threaded main JS. Fits, but the tipping point feels near (memory or CPU).
- **Real-time / latency pressure**: the lead client's head of software is pushing for sub-second / near-real-time,
  citing another dev's fast (possibly WASM-based) grid. Calibrated target: live-trading-screen cadence,
  ~500 position updates touching ~20 fields per batch, recompute aggregations and render before the
  next batch, no jank, bounded memory. Hoist already supports WebSocket data push (`XH.webSocketService`)
  alongside HTTP poll-then-diff; the open question is throughput/latency under load, not whether push
  exists. Transport-agnostic, multi-pattern support is a requirement.
- **Scaling / headroom**: want to know where the wall is. Past OOM crashes on older small-heap Chrome
  machines. Measurement is the point.

### Primary sources available locally (siblings of hoist-react)

- `hoist-react` (primary, running inside it), `toolbox` (public demo, deploy target for the tech demo;
  includes a WebSocket portfolio example - `PortfolioService`/`PositionSession`), `jobsite` (internal
  app using cube/typed-field/aggregation patterns), a client app (client app, same patterns).
  `hoist-core` (Grails/Spring Boot server) available if server-side aggregation/transport questions
  warrant. Read real usage, not just library definitions.
- **These local apps are SAMPLES, not the full picture.** They are a convenience for grounding, not a
  definition of requirements. XH encounters a wide variety of client patterns (transports, update
  cadences, data shapes) that are not represented here. Do not narrow scope to only what these apps
  happen to do.

### Documented assumptions (from kickoff §12 - revisit if they block)

- **Quantitative targets**: we will propose defensible targets and let the harness adjudicate; not yet
  anchored to specific client-mandated numbers.
- **Licensing posture**: assume openness to evaluating third-party deps (Perspective, DuckDB-WASM)
  during research; deployment/compliance acceptability (esp. the lead client) to be confirmed before adoption.
- **Transport reality**: assume asymmetric control - we shape our Grails transport; client
  WebSocket/SignalR/HTTP transports are fixed. A per-client transport matrix would sharpen research.
- **AG Grid Enterprise entitlement**: assume the relevant AG Grid 36 features may carry licensing
  implications across clients; confirm before depending on them.
- **Coexistence pilot**: no preferred first pilot workload chosen yet; candidates drawn from
  `jobsite` / a client app / `toolbox`.

## Constraints

- **OPEN REPOSITORY - no private names (hard rule)**: `hoist-react` is public. NEVER commit private
  client/customer names or client-app identifiers (fund/firm names, names of apps written for clients).
  Only XH's own properties may be named: **Hoist, Toolbox, JobSite**. General financial terms,
  concepts, formulas, and roles are fine ("a client app", "the lead client", "hedge funds", "trading
  dashboards") - just no names. A local guard enforces this (see Key Decisions); when in doubt,
  genericize.
- **Adaptability across client patterns (overarching principle)**: Hoist is a toolkit deployed across
  many clients with differing transports, update cadences, and data shapes. Anything intended for wide
  adoption MUST be adaptable to that variety - it cannot hard-depend on one transport or one ingest
  pattern. Targeted, conditional optimizations are still valuable to surface ("if you did exactly X,
  you could achieve Y") and may suit a specific high-value client/workload, but they must be labeled as
  conditional, not baked in as the default path. Adaptability beats a single fast-but-rigid answer.
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
| Codebase-mapping folded into Phase 1 (current-state inventory) rather than a separate `/gsd:map-codebase` pre-step | Phase 1 maps the data layer more deeply and grounds it in real `jobsite`/a client app usage | — Pending |
| R&D deliverables -> `docs/planning/data2/`; GSD orchestration -> `.planning/` | Deliverables belong in tracked repo docs; GSD metadata stays in its own home, cross-referenced | — Pending |
| Track `.planning/` on the `data2` branch (gitignore entry temporarily disabled) | Keep planning portable with the branch; revisit the "archive to hoist-ai" convention before merge | — Pending |
| Model profile: Quality (Opus for research/roadmap) | Ambitious R&D where analysis depth matters; long-running effort justifies the cost | — Pending |
| Land the Toolbox demo + baseline early | Highest near-term business value; answers the "where's our limit" question being asked now | — Pending |
| Kickoff brief validated against source + real app usage before planning (corrections in `docs/planning/data2/KICKOFF-VALIDATION.md`) | The brief was authored without repo access; several claims (WebSocket push, built-in weighted-avg, cube-as-MobX-observable) were inaccurate and would have misdirected the roadmap | ✓ Good |
| Local-only client-name guard (no CI, denylist kept outside the repo) enforces the open-repo no-private-names rule | Open repo must not leak client names; a checked-in denylist would itself leak them. A PreToolUse hook blocks commits with forbidden names. Scanner + denylist live at `~/.claude/projects/-Users-amcclain-dev-hoist-react/client-name-guard/`; run `--all` for a full audit | ✓ Good |

---
*Last updated: 2026-06-27 after initialization, kickoff validation, and open-repo guard setup*
