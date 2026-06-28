# Hoist Data Layer 2.0 — Research, Baseline & Architecture Kickoff

NOTE - use this /docs/planning/data2 directory to store written artifacts for this project.

## 0. How to run this (read first)

This is a **multi-phase research, baseline-measurement, prototyping, and strategy effort** for the data layer of Hoist React. It is deliberately ambitious. Treat it as spec-driven R&D, not a feature ticket.

**Operating instructions for the receiving agent / GSD orchestrator:**

- **You have been given a large amount of context below.** Absorb it fully before acting. It is the result of an extended design conversation and reflects real nuance — do not flatten it.
- **Charge hard and autonomously.** The goal is to get through the heavy preparatory, exploratory, and prototyping work with minimal hand-holding. Default to making a reasonable, *documented* assumption and proceeding, rather than stopping to ask.
- **Ask clarifying questions only when they are genuinely blocking and consequential.** A short seed list of the questions most worth asking is in §12. Batch them; don't trickle them.
- **Be token- and time-aware.** Prefer durable artifacts (planning docs, decision logs, comparison matrices, harness code, benchmark output) over long conversational narration. Use GSD's sub-agent model to keep each research thread in a clean, scoped context and write findings to disk.
- **This is meant to run for a long time.** Pace the work across phases, commit atomically, and keep state so the effort survives context resets.
- **Honesty over tidiness.** Where the evidence points to "there is no single solution that does all of this well," say so plainly and show the tradeoff frontier. Do not manufacture a clean answer that the data doesn't support.

**Repos available locally on this machine** (all checked out as siblings; confirm exact paths):

- **`hoist-react`** — primary. The React/TypeScript library under study. You are running inside it.
- **`toolbox`** — the public Hoist demo / component library (deployed at `toolbox.xh.io`). Target for a technology-demo deliverable; can be run locally.
- **`jobsite`** — internal XH application. **Uses the cube / typed-field / aggregation patterns** under study.
- **`the client app`** — client application. **Also uses the cube / field patterns** under study.

`jobsite` and `the client app` are important *primary sources* for how these constructs are actually used in production, not just how they're defined in the library. Read real usage, not just the framework.

You may also clone and read `hoist-core` (the Grails/Spring Boot server side) if server-side aggregation / transport questions warrant it.

---

## 1. Who we are and what this is about

**Extremely Heavy (XH)** is a small senior software consultancy that builds data-dense enterprise single-page applications for hedge funds and fund administrators. Our proprietary full-stack toolkit is **Hoist** — `hoist-react` (React / MobX / AG Grid / Highcharts / Blueprint) over `hoist-core` (Grails / Spring Boot), with Bloomberg and FIX integrations on the server side.

This project targets the **data layer of `hoist-react`** — specifically the **Store / Cube / View / GridModel** complex and its integration with **AG Grid** — and asks whether we should design a **"Data 2.0"**: a re-thought, possibly clean-sheet data/interop layer for 2026, grounded in our actual deployment environment, the realistic set of technologies available today, and the path the data must travel to end up rendered in AG Grid.

Data 2.0 need **not** be an in-place upgrade. It can be a **new system that stands alongside the existing one** and, over time, takes over high-volume / non-trivial workloads — leaving the current structures in place for simpler cases.

This effort exists because three pressures and one standing feature request are converging on the same decade-old architectural decision at the same time. See §3 and §4.

---

## 2. Current architecture (as we understand it — **verify against source**)

Everything in this section is our working mental model. **A core early task is to confirm or correct it by reading the actual code** in `hoist-react` and its real usage in `jobsite` and `the client app`. Where reality differs, document the delta — the inaccuracies are themselves findings.

### 2.1 Store

- A **`Store`** is a container for **`StoreRecord`s**. The record shape is defined by **typed fields**.
- Provides container semantics: **add / update**, **dirty tracking**, and an editing model.
- Field-level processing: basic **type coercions** and field **metadata** (e.g. display names).
- Supports **filtering** (filter expressions, field filters).
- **Does not** support sorting — sorting currently lives in the grid.
- Supports processing of **inbound data via a single custom function** — an arbitrary transform hook, not a structured pipeline.

### 2.2 Cube

- A **`Cube`** is a *different class* from `Store`, but it **contains and uses a `Store` internally** to hold its data.
- You **load data** into a cube. It is configured with **typed fields that also carry aggregators** (rules describing how each field aggregates — e.g. sum, average, weighted average by another field).
- The cube is about **running queries**: apply a **filter**, a **grouping** (dimensions), and select the fields / metrics you want; the cube applies filtering and aggregation.
- It **accepts updates** and **efficiently recalculates aggregations** when they change.
- **It is not for editable data** — cubes are read/aggregate-oriented. And although it *uses* a `Store` internally, **a cube is not itself a `Store`.**
- **Purpose / origin:** built for portfolio apps. A single cube of trading positions feeds **many widgets**, each filtering and querying the same dataset differently. Small **differential updates** flow into the cube and fan out efficiently to all connected views, re-aggregating and updating.

### 2.3 View

- A **`View`** is a **stable bridge between a particular query and a `Store`.**
- The cube holds an internal store of **leaf-level (raw) records**. A view specifies a **query**. The cube observes its data; when it changes, it recomputes; the view produces results; the view is connected to a (consuming) `Store`; results are pulled from the query and applied into that store.

### 2.4 Grid (AG Grid, heavily wrapped)

- The **`GridModel`** is bound to a **`Store`**. Either you give `GridModel` a store config and it **creates its own store**, or you hand it an existing store.
- The grid **observes the store's records**. **Filtering is applied at the store level.** We have **replaced much of AG Grid's own machinery** — e.g. our own **column chooser**, our own **column header filters** — and those filters operate on the **store**.
- `GridModel` observes store changes and **translates them into AG Grid transactions**, which it applies to **AG Grid's internal data structure**, which AG Grid then renders. The AG Grid API is driven *from inside* `GridModel`.

### 2.5 Why we wrap AG Grid this way (the rationale and the tension)

- The **`Store` became a shared, AG-Grid-independent data substrate** so that *other* components — charts bound to the same data, filter controls on toolbars outside the grid — can all work against one common, filtered dataset. The grid is **one consumer** of the store, not the owner of the data.
- This was a principled choice with real benefits: our apps are bigger than a grid.
- **But the tension is real:** the grid is so central that the apps are often *not* much bigger than the grid. We have wrapped AG Grid to the point of taking over its core data management and telling it to use *our* features instead of its own. A fair critique is that this is partly "not invented here" — that a more API-integrated, less ejective approach might have been possible. At the same time, this wrapping is **central to Hoist's identity and a genuine competitive draw** (clients with plain AG Grid apps hire us specifically to get Hoist-style capability). The flip side: clients also expect **anything AG Grid can do** to be available, because "it's AG Grid." We have skated that edge for years.

### 2.6 The full data flow (complex apps)

1. Server sends a large **compressed JSON blob** over HTTP on initial load.
2. It is parsed into a large **raw JS object**.
3. Loaded into a `Store`: **`StoreRecord`s are minted**. Each record **keeps a reference to the original raw object** *and* **assigns into a new data object** held inside the record.
4. A **central cube** holds these leaf-level facts in its internal store. A **WebSocket listener** feeds incremental updates into the cube → updates its internal store → **re-runs aggregations**.
5. A dashboard **grid widget** has a `GridModel` (+ its own store), configured with the fields it needs. A coordinating widget model creates a **`View`** on the cube with a **query (filter + group-by)**.
6. The view **observes the cube**; the cube re-runs the query; new results flow into the view; the view's results are **connected into the grid's store**; the store change **generates AG Grid transactions**; AG Grid **renders**.

### 2.7 The memory-multiplication problem (a central concern)

The *same* datum can exist in several representations as it flows through the pipeline:

`JSON string` → `parsed raw object` → `StoreRecord` (which keeps the raw-object reference **and** a new inner data object) → `View` raw/aggregated results (including, at times, leaf-level representations) → **grid's** store records → **AG Grid's** internal node structure.

- There is **some intelligent reuse**, but there is **definitely copying** at some transitions.
- Some objects are **genuinely new and cannot be references** — e.g. aggregate / parent (group) tree rows.
- There is likely **meaningful duplication of leaf-level rows** as well.
- **Memory is dominated by the raw leaf-level facts**, not by derived fields. Derived/duplicated fields (e.g. a "sum" field and an "average" field for the same underlying value) exist but are **not yet the main driver** — though that could change if user-defined calculated fields become easy and prevalent (see §4).

**Two explicit unknowns to resolve empirically (do not assume):**

- **Exactly when and where data is copied vs. reused** across these layers. Read the code; confirm with heap evidence.
- **How much memory lives in each layer** — i.e. can we *attribute* heap to "cube store records" vs. "grid store records" vs. "AG Grid internal nodes" vs. intermediate view results. This attribution is a desired output of the test harness (§9, Phase 2).

### 2.8 Reactivity substrate (don't lose this)

Hoist reactivity runs on **MobX**. Views observe cube state via MobX; `GridModel` observes the store via MobX; React rendering is driven off MobX observers. **Any new data engine must either feed MobX observability or provide its own reactivity that bridges cleanly to React rendering.** This constraint shapes the entire solution space and must be a first-class consideration in every candidate evaluation — a fast engine that can't drive fine-grained reactive updates into the existing component model is not actually a fit.

---

## 3. The forcing functions (why now)

### 3.1 AG Grid calculated columns (the trigger)

AG Grid **36.0** shipped **24 June 2026**, with **calculated columns** as the flagship feature: an end-user, formula-based, built-in-UI way to create new columns on demand, where the new columns behave like any other column (filtering, grouping, etc.). The same release adds **"show values as"** (aggregations expressed relative to other totals) and **"automatic column generation"** (supply data with unknown/dynamic shape and the grid generates columns). The prior minor (**35.2**, March 2026) added **aggregation editing** for grouped data, and **35.1** added a **formula editor**.

**Why this matters to us:** calculated columns have long been requested by our users. We don't have native support for them in the Store/Cube/View world or the UIs we've built on top. Now AG Grid ships them — and the obvious client reaction ("great, turn it on") would route calculation **through AG Grid's internal data model, bypassing our Store layer** and the shared-data architecture that everything else (charts, toolbars, other widgets) depends on. Notably, AG Grid 36's adjacent features ("show values as", "automatic column generation", "aggregation editing") **overlap our own wishlist** (§4) more than we'd assumed — so the competitive/parity research must look at the *whole* AG Grid 36 feature cluster, not just the headline.

**The deeper competitive frame is Excel.** Business users are being moved from Excel workflows into web apps (or run both side by side). Calculated columns are a *core Excel expectation*. We compete with Excel as much as with any grid.

### 3.2 Performance ceiling

- Typical datasets: **tens of thousands of positions** (≈30–60k), where "positions" may be loans or transactions, each with **tens of fields**.
- The recurring pattern: load a lot of data up front, relatively naively (compressed JSON over HTTP → stores), ~**10 seconds** all-in when smooth; then a cube with ~40k leaf-level positions; build dashboards that filter and aggregate **entirely client-side**.
- It **fits** — sometimes noticeably slow / halty, not egregious, often better than the alternatives — but there is a constant sense the **tipping point is near**, in either **memory or processing**.
- It all runs in the **main TypeScript thread.** We have hand-optimized and broken big processing into async loops to keep the event loop moving, but it's still single-threaded JS.

### 3.3 Real-time / latency pressure

The head of software at our largest client (the lead client) is pushing hard on "why isn't this sub-second / near-instant / fully real-time?" and pointing at another developer doing something fast with a different grid (possibly a WASM-based grid component bundled with its UI — **worth identifying during research**).

**Calibrate "real-time" correctly — this is not HFT:**

- Human-perceptible, live-trading-**screen** cadence.
- Order of **hundreds to low-thousands of positions changing per second or per few seconds**, in **batches**, with **coalescing** (which is required and already present).
- Updates land in **well under a second**; batches of perhaps **hundreds of updates**; cost varies with update breadth (1 field vs. 10 vs. 100). Example: a 60-field position where ~20 fields tick because the price moved, every couple of seconds.
- There is **no single fixed batch contract** (it varies by client and backend), but whatever we land on must be **defensible for a 2026 internal trading UI**.
- **The concrete challenge:** process a batch of (say) ~500 position updates, each touching ~20 fields, recompute all dependent aggregations, and flow the result to grid rendering **before the next batch arrives** — without jank and without unbounded memory growth.

### 3.4 Scaling

Same envelope as §3.2 but framed as headroom: we want to know **where the wall is** and how much we can raise it. Both **main-thread blocking** (UI jank, partly mitigated) and **memory creep** are in play. Past OOM crashes were traced to a cohort on **older machines with smaller Chrome heaps**; standard workstations cope today, but tabs use a lot of memory and one data-hungry use case could tip it. We genuinely don't know, objectively, where we stand — **measurement is the point.**

---

## 4. Feature dimensions to pin down (the "what must it do" surface)

### 4.1 Calculated columns — taxonomy (build a sharp inventory)

"Calculated columns" means several distinct things. Produce a crisp inventory and map each against (a) what AG Grid 36 actually does and (b) what we'd need to build ourselves:

1. **Simple derived columns:** `C = A + B` per row. The canonical case.
2. **Aggregation variants of an existing field:** same source field, multiple aggregation rules (sum, average, **weighted average by another field**). Today the cube requires a **separately preconfigured field for each variant** — each field has a single aggregation rule, fixed display name, fixed type. So "account balance (sum)" and "account balance (avg)" are **two hand-coded fields**, both always present; a request for a weighted average becomes a **third**. Everyone sees the **union** of all variants. The goal is to **put aggregation choice in the user's hands** at runtime. (Note AG Grid 36's "show values as" and 35.2's "aggregation editing" partially address this — assess overlap.)
3. **Dependency chains:** a calculated column derived from *another* calculated column — references between columns, a **dependency graph**, and **cycle prevention**. Determine whether AG Grid supports multi-level derivation and how.

For each: where is it computed (row vs. aggregate level)? Does it interact with grouping correctly? Does it survive incremental updates efficiently? Does it materialize new data (memory cost) or compute lazily?

### 4.2 Dynamic / soft-defined schema (the 20%, not the 80%)

A standing, narrower-but-important ask, **distinct from** simple calculated fields: the ability to **add fields without an application code change / redeploy**.

- The **field schema itself is treated as somewhat dynamic** — display names, possibly renderers, and other field aspects defined via a **UI** or supplied by an **external system / API**.
- Crucially this includes **non-derived** fields: an upstream API starts publishing a new field, and an **entitled admin** defines it (type, display name, aggregation rule, renderer) so it **appears in grids** — **without** releasing or recompiling the UI app. (We've implemented versions of this in a couple of apps already.)
- **Constraint it imposes:** solutions that require a fixed set of fields **compiled in** are disfavored. AG Grid 36's "automatic column generation" is directly relevant — assess it.

**Important framing:** this is the **20% case, not the 80%.** Do **not** treat it as a hard constraint. Treat it as a **factor**: flag any candidate path that would *preclude* it or make it materially harder, and weigh that. We may accept a solution that handles it poorly. **Do not over-tailor the requirements to the point where no viable solution survives** — if the requirement set becomes self-contradictory, surface that explicitly and force the tradeoff into the open.

---

## 5. Performance & scale — the real picture (constraints for solutions)

- **Deployment target:** modern Chromium, **almost exclusively Edge** in practice. Firefox and Safari are far secondary; mobile is far secondary. A **desktop-first, Chromium-optimized** strategy is acceptable and should be considered explicitly if it unlocks meaningful gains.
- **Main-thread, single-threaded JS** today. Threading (workers) and off-thread compute (WASM) are on the table but carry a **serialization / data-bridge tax** that has historically looked like it might erase the gains — because results are frequently **not** heavily summarized. Many widgets show a **large number of leaf rows** (up to the full leaf set) **plus** aggregates on top, so shipping query results back across a worker/WASM boundary can be as expensive as the compute it offloaded. **This bridge cost is the crux — do not hand-wave it; measure it.**
- **Transport is part of the equation, with asymmetric control:**
    - Where **we control the API** (our Grails server ↔ Hoist), we can shape transport and payload (e.g. delta protocols, binary framing, columnar wire formats).
    - Where we **face client systems** (their WebSocket, **SignalR**, or HTTP APIs), we **do not control transport** and have limited flexibility. Research may surface transport options, but solutions must degrade gracefully where the transport is fixed.
- **Failure modes to characterize** (both are real): **thread-blocking jank** (tab-load rendering hitches, non-fluid interaction) and **memory saturation** (high tab memory; OOM risk on smaller-heap machines or data-hungry use cases).

---

## 6. Technology landscape to research (everything is on the table)

Spawn scoped research sub-agents per candidate. For **each**, evaluate against a common rubric (§8.2) and **verify current state via live sources** — do not rely on stale model priors. Read docs, check latest releases/versions, and where feasible write a tiny spike to confirm behavior (especially the JS↔engine boundary cost and the reactivity story).

**Candidates (non-exhaustive — actively look for ones not listed):**

- **Apache Arrow / Arrow JS** — columnar in-memory format implemented in pure JS (typed arrays; minimal copying). Evaluate memory efficiency, aggregation/filter speed in-JS, and how a columnar model maps onto our row-record + MobX mental model. (Context: one client uses Parquet on disk with an Avro reader; Parquet = columnar on disk, Arrow = columnar in memory, Avro = row-oriented serialization. Arrow↔Parquet conversion is cheap.)
- **SQLite in the browser** — `sql.js` (pure-JS, main thread) and WASM bindings (e.g. `wa-sqlite`, the official `@sqlite.org/sqlite-wasm`, and similar — **verify the current best-of-breed packages**). Key open question: SQLite has **no built-in reactive/change-notification model**, so we'd either re-run queries (serialize full result sets back) or build our own change-tracking layer. Assess a **hybrid**: leaf data indexed in SQLite as durable/queryable storage, with a thin reactive layer that tracks which views care about which aggregations and serializes only **deltas**.
- **DuckDB-WASM** — newer, more query/analytics-optimized than SQLite; assess incremental-update semantics, Arrow interop, and bridge cost.
- **Perspective (FINOS)** — a framework-agnostic analytics/visualization component with an **in-browser WASM data engine** *and* an optional UI (`perspective-viewer` Web Component), with plugin renderers. Columnar, **streaming real-time updates**, built-in aggregations. **Purpose-built for financial dashboards** and likely already on our clients' radar. Evaluate both **headless** (engine only, feeding our grid) and **UI** modes. This is arguably the closest off-the-shelf fit to our use case — give it serious, hands-on attention.
- **FINOS ecosystem broadly** — standards and interop layers relevant to financial front-ends. We have historically been heads-down and under-aware of the surrounding ecosystem; part of this effort's value is **surfacing what exists**.
- **Web Workers** — solve threading, not memory; quantify the serialization bridge.
- **WebAssembly (general)** — compute wins vs. serialization tax; SharedArrayBuffer / zero-copy possibilities for columnar data.
- **Immer / structural-sharing libraries** — reduce *copying* via reference reuse; potential memory wins **without** a rearchitecture. Cheap to evaluate; possibly high near-term ROI.
- **TanStack Query** and similar server-state/differential-update patterns — not a data engine, but assess whether there's a pattern we're missing for managing streaming updates.
- **Backend aggregation (push work to `hoist-core` / Grails)** — pre-aggregate to the shape each widget needs and push **deltas**; trades backend compute and bandwidth for client memory/CPU. Bounded by the transport-control asymmetry (§5).
- **The unidentified "fast WASM grid"** the the lead client developer demoed — try to identify it (could be Perspective; could be something else) and evaluate it.

For each candidate, the most decision-relevant facts are usually: **(1)** the cost and shape of the JS↔engine data boundary for our *actual* result shapes (many leaf rows + aggregates, not tiny summaries); **(2)** whether/how it supports **incremental/differential updates** rather than full recompute+reserialize; **(3)** how it bridges to **MobX/React reactivity**; **(4)** memory footprint vs. our current cascade; **(5)** the calculated-column and dynamic-schema story; **(6)** licensing and maturity.

---

## 7. The strategic question (put on the consulting hat before plunging in)

This is **not only** a technical-architecture exercise. Before committing to "let's build our own engine," produce an honest strategic assessment:

- **Own-it-all vs. lean on AG Grid.** Our instinct is to build our own (full control, exactly what we want, we own it). But realistically assess **bridges that walk back our separation from AG Grid** — novel ways to use **more** of AG Grid's internals/APIs (now including its calculated columns, "show values as", aggregation editing, automatic column generation) **while preserving the spirit and value-add of Hoist** (the shared, grid-independent data substrate that charts and toolbars rely on). The point is to find approaches that **don't require ejecting from everything we've built**, and to compare them fairly against the build-our-own path.
- **Name the tradeoffs explicitly.** Where one path wins on calculated columns but loses on dynamic schema, or wins on raw speed but breaks the shared-store contract that non-grid components depend on, **say so**. There may be **no single solution that rules them all**; the deliverable should present the **tradeoff frontier**, not a forced consensus.
- **Be ambitious — because this domain is verifiable.** Unlike subjective UI design, data-layer behavior is **objectively testable**: does it handle N positions at M update rate under K memory with sub-L latency? Lean into that. Set quantitative targets and let the harness adjudicate. Ambition is warranted precisely because success is measurable.

---

## 8. Deliverables & success criteria

### 8.1 Artifacts (write to disk; GSD planning docs + repo-appropriate locations)

- **Current-state architecture document** — corrected model of Store/Cube/View/GridModel, the data flow, and the copy/reuse map, grounded in `hoist-react` + real usage in `jobsite`/`the client app`. Include diagrams (Mermaid, targeting IntelliJ/GitHub rendering).
- **Memory-attribution report** — heap broken down by layer (cube store records vs. grid store records vs. AG Grid internals vs. intermediate view results), with methodology.
- **Test harness** (see §9 Phase 2) — a reusable, configurable load/throughput generator with measurement and OTel instrumentation. This is a **standalone deliverable with intrinsic value**, independent of any rearchitecture.
- **Baseline performance envelope** — where the current stack's wall is, on memory and on processing, across dataset shapes and update cadences.
- **Toolbox technology demo** — a portfolio/real-time-flavored demo exposed in `toolbox` showing what the **current** stack can do at scale (a strong story we currently can't point to on demand). Prioritize landing this **sooner rather than later** — we are being asked *right now* what our limit is.
- **Calculated-columns + dynamic-schema feature spec** — the §4 taxonomy turned into a concrete, testable specification, with explicit AG Grid 36 parity mapping.
- **Technology comparison matrix** — every §6 candidate scored on the §8.2 rubric, with evidence and spike notes.
- **Prototype spikes** — for the top candidates, benchmarked against the baseline using the harness.
- **Strategy & roadmap synthesis** — the §7 assessment, a recommended path (or a small number of viable paths with tradeoffs), and a phased adoption plan consistent with the "Data 2.0 stands alongside, then absorbs high-volume cases" model.

### 8.2 Per-candidate evaluation rubric

Memory footprint vs. baseline · main-thread blocking / threading story · **JS↔engine serialization cost for our real result shapes** · **incremental/differential update support** · **MobX/React reactivity bridge** · calculated-column support (all three §4.1 flavors) · dynamic-schema support (§4.2, weighted as a factor not a gate) · transport compatibility incl. fixed-transport clients · licensing & maturity · fit with the shared-store contract that non-grid components depend on · migration cost / coexistence with the current stack.

### 8.3 Quantitative targets (set, then measure against)

Propose defensible targets for: max positions × fields held client-side; batch size and rate sustained without jank; end-to-end update→render latency at a defined batch; memory ceiling per tab on a reference (and a small-heap) machine. These become the harness's pass/fail criteria.

---

## 9. Phase plan (GSD milestones)

Phases may overlap where sensible; the spec phase and the AG-Grid-research portion inform each other. Use GSD sub-agents to parallelize within a phase.

- **Phase 1 — Current-state inventory.** Read `hoist-react` Store/Cube/View/GridModel and the AG Grid wrapping; read real usage in `jobsite` and `the client app`. Confirm/correct §2, especially the copy-vs-reuse map and the MobX reactivity paths. Produce the current-state architecture doc.
- **Phase 2 — Test harness + baseline (high near-term value).** Build the configurable harness: parameterize dataset **shape / size / field count**, update **pattern / breadth / throughput**, and the **change-delivery mechanism / transport**. Instrument with Hoist's existing OTel tooling (mind overhead — see §10). Add **heap attribution**. Measure the current envelope; identify the wall on both memory and CPU. Land the **Toolbox real-time demo** as the user-facing proof.
- **Phase 3 — Requirements & spec.** Interview-driven (lightly — most context is here). Nail the calculated-columns taxonomy (§4.1), the dynamic-schema factor (§4.2), and quantitative targets (§8.3). **Thoroughly research AG Grid 36's full relevant feature cluster** (calculated columns, show values as, automatic column generation, aggregation editing) as both competitive bar and spec input.
- **Phase 4 — Technology research.** Parallel scoped deep dives on every §6 candidate, each producing rubric scores + spike evidence (especially boundary cost, incremental updates, reactivity bridge). Output the comparison matrix.
- **Phase 5 — Prototyping & proof.** Spike the top candidate(s) against the harness and baseline. Validate the claims that matter most (bridge cost, incremental update throughput, memory, reactivity).
- **Phase 6 — Strategy synthesis & roadmap.** Own-it vs. AG-Grid-bridge assessment, honest tradeoff frontier, recommended path(s), and a phased Data-2.0-alongside adoption plan.

---

## 10. Cross-cutting requirements & ethos

- **Observability from the start.** We've just completed a large OTel upgrade with OTel tooling in Hoist. Instrument the harness and prototypes from day one so measurements **bubble into the same OTel infrastructure** — *but* be deliberate about **OTel overhead** in low-level hot paths; instrument at boundaries and aggregate, don't trace every micro-operation. Use Hoist's existing instrumentation primitives where they exist.
- **The test harness is first-class infrastructure,** not throwaway scaffolding. It is simultaneously: the **baseline** for today's stack, the **evaluation framework** for alternatives, and the basis for the **Toolbox demo**. Design it for reuse and longevity.
- **Verifiability over opinion.** Prefer claims backed by harness numbers. When you assert "X is faster / lighter," show the measurement and the conditions.
- **Honesty about tradeoffs.** Surface divergence between solutions; don't smooth it over. If the requirement set has no clean winner, present the frontier.
- **Constraints recap:** Chromium/Edge-first, desktop-first; MobX/React reactivity must be served; the shared-store contract (charts, toolbars, non-grid consumers) must be preserved or its loss explicitly justified; transport control is asymmetric.

---

## 11. Non-goals & scoping guards

- This phase is **R&D, baseline, and recommendation** — **not** a commitment to rewrite the data layer. Data 2.0 may stand alongside the current system and absorb high-volume cases over time.
- **Don't over-tailor** the spec into a corner. If dynamic schema (the 20% case) or some calculated-column flavor would eliminate every otherwise-strong candidate, **flag the conflict** rather than silently dropping good options.
- Don't break the existing stack. Coexistence is a design requirement, not an afterthought.
- Avoid premature lock-in to any single engine before the harness has spoken.

---

## 12. Seed list of clarifying questions (ask only if blocking)

Most context is above; default to documented assumptions. The questions genuinely worth surfacing if they block progress:

1. **Quantitative targets:** are the §8.3 targets we propose acceptable, or does the lead client have specific numbers (positions, update rate, latency, memory) we should anchor to?
2. **Licensing posture:** appetite for additional third-party dependencies (e.g. Perspective, DuckDB-WASM) vs. preference for own-built — does it differ by client (e.g. the lead client) for deployment/compliance reasons?
3. **Transport reality per client:** for the key deployments, which transports are fixed (their WebSocket/SignalR/HTTP) vs. ours to shape (Grails)? A short matrix would sharpen the transport research.
4. **AG Grid Enterprise scope:** are calculated columns / the relevant AG Grid 36 features within our current AG Grid Enterprise entitlement across clients, or would adopting them have licensing implications?
5. **Coexistence boundary:** is there a preferred first workload (app/widget) to pilot a Data 2.0 path against, drawn from `jobsite`/`the client app`/Toolbox?

---

*End of brief. Begin with Phase 1, but stand up the Phase 2 harness early — its baseline numbers and the Toolbox demo have the highest near-term business value and de-risk everything downstream.*
