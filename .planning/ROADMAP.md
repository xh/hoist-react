# Roadmap: Hoist Data Layer 2.0

## Overview

This is an R&D, baseline-measurement, and strategy milestone - not a rewrite commitment. The
journey runs from understanding the current Store / Cube / View / GridModel stack precisely, to
building a reusable measurement harness that can settle "where is our wall" and "which engine wins"
with real numbers, to scoring every technology candidate against that harness, to prototyping the
top candidate(s) behind the `View.result -> Store` seam, and finally to an honest, evidence-backed
strategy recommendation with a phased coexistence-adoption plan. Verifiability over opinion: every
performance claim ends up backed by a measurement and its conditions. The harness, the baseline
envelope, the Toolbox demo, and the strategy recommendation are the must-survive deliverables if
everything else is cut.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Current-State Inventory** - Authoritative architecture doc, copy-vs-reuse map, MobX granularity, and transport inventory (complete 2026-06-28)
- [ ] **Phase 2: Measurement Harness** - Reusable, config-driven load/throughput/heap-attribution harness, OTel-instrumented at boundaries
- [ ] **Phase 3: Baseline Performance Envelope** - The current stack's memory and CPU walls and end-to-end latency, plus adopted quantitative targets
- [ ] **Phase 4: Toolbox Technology Demo** - A live, shareable portfolio demo proving current-stack capability and limits at scale
- [ ] **Phase 5: Feature Spec & AG Grid 36 Parity** - CC-1/CC-2/CC-3 + dynamic-schema spec, gate-vs-factor classification, and AG Grid 36 parity/entitlement map
- [ ] **Phase 6: Technology Candidate Evaluation** - Every candidate scored on the common rubric with evidence and spike notes at real result shapes
- [ ] **Phase 7: Prototyping & Proof** - Top candidate(s) prototyped behind the View seam and benchmarked against baseline, reactivity + coexistence validated
- [ ] **Phase 8: Strategy & Roadmap Synthesis** - Honest tradeoff frontier, recommended path(s), and a phased coexistence-adoption plan with a first pilot

## Phase Details

### Phase 1: Current-State Inventory
**Goal**: Produce the authoritative, source-grounded understanding of the current data layer that
every later measurement and comparison depends on - resolving the two explicit unknowns (copy-vs-reuse
map and MobX reaction granularity) and consolidating the prior validation notes into one document.
**Depends on**: Nothing (first phase). Substantially de-risked by the committed validation notes in
`docs/planning/data2/validation/` and `KICKOFF-VALIDATION.md` - this phase consolidates and deepens
them, not starts cold.
**Requirements**: INV-01, INV-02, INV-03, INV-04
**Success Criteria** (what must be TRUE):
  1. An architecture document exists covering Store / Cube / View / GridModel and the end-to-end data
     flow with Mermaid diagrams, grounded in `hoist-react` source and real app usage, that supersedes
     and absorbs the prior validation notes (INV-01).
  2. A copy-vs-reuse map identifies, at every pipeline transition (raw object -> StoreRecord ->
     ViewResult rows -> grid store records -> AG Grid nodes), where data is copied vs. referenced
     (INV-02).
  3. The MobX reaction granularity of the `View.result -> Store -> GridModel -> AG Grid` path is
     documented as record-level vs. batch-level, including where synchronous `applyTransaction` is
     driven and the mounted-component reaction lifecycle (INV-03).
  4. A transport/pattern inventory lists what the layer must support (HTTP snapshot/diff, WebSocket
     push via `XH.webSocketService`, WebSocket-as-notification, SignalR, polling) and how Cube/Store
     ingest adapts to each (INV-04).
  5. The document names the concrete instrumentation points the Phase 2 harness will hook (boundaries
     where heap and timing are attributable).
**Plans**: 4 plans
- [ ] 01-01-PLAN.md - Copy-vs-reuse map across the data pipeline (INV-02)
- [ ] 01-02-PLAN.md - MobX reaction-granularity trace of the update path (INV-03)
- [ ] 01-03-PLAN.md - Transport/pattern inventory and Cube/Store ingest adaptation (INV-04)
- [ ] 01-04-PLAN.md - Authoritative architecture doc with Mermaid + Phase 2 instrumentation points (INV-01)

### Phase 2: Measurement Harness
**Goal**: Build the reusable, configurable, OTel-instrumented harness that is the sole adjudicator of
every later "faster/lighter" claim - parameterizing result shape, update pattern, and transport;
separating compute cost from bridge cost; and attributing heap by layer with a non-isolated fallback.
This is durable infrastructure, not throwaway scaffolding, and must exist before any candidate is scored.
**Depends on**: Phase 1 (instrumentation points and pipeline understanding)
**Requirements**: HARN-01, HARN-02, HARN-03, HARN-04, HARN-05, HARN-06
**Success Criteria** (what must be TRUE):
  1. A dataset generator parameterizes result shape - leaf-row count, aggregate-row count, field count -
     and reproduces realistic large-leaf-plus-aggregate shapes (HARN-01).
  2. An update generator parameterizes update pattern, breadth (fields per record), throughput (batch
     size and rate), and change-delivery transport (HARN-02).
  3. Heap is attributed by layer (cube store records, grid store records, AG Grid internals,
     intermediate view results) with a fallback method that does not require cross-origin isolation
     (HARN-04).
  4. The harness reports compute cost separately from JS<->engine bridge cost, with median + p95 under
     a documented forced-GC / steady-state protocol, and OTel instrumentation lives at boundaries
     (not per-micro-op) with bounded, documented overhead (HARN-03, HARN-05).
  5. The harness is config-driven, documented, and demonstrably reusable for BOTH baseline measurement
     and candidate evaluation (HARN-06).
**Plans**: 6 plans
- [ ] 02-01-PLAN.md - Measurement-core type schema: ScenarioConfig knobs + Scorecard/RunResult + CandidateAdapter seam (HARN-01/02/06)
- [ ] 02-02-PLAN.md - Toolbox Grails test-data API: seeded shape generator + HTTP snapshot/diff + WebSocket push (HARN-01/02)
- [ ] 02-03-PLAN.md - Boundary instrumentation via runner().span() + performance.now(); compute/bridge/render split + overhead probe (HARN-03/05)
- [ ] 02-04-PLAN.md - No-COI heap attribution: performance.memory + per-record calibration + AG Grid remainder (HARN-04)
- [ ] 02-05-PLAN.md - MeasurementHarness orchestrator + BaselineAdapter + forced-GC/median+p95 protocol (HARN-05/06)
- [ ] 02-06-PLAN.md - Toolbox harness UI: ViewManager-persisted scenarios/runs, scorecard, comparison + README (HARN-06)

### Phase 3: Baseline Performance Envelope
**Goal**: Run the current stack through the harness to map exactly where its walls are - on memory,
on CPU/main-thread, and on end-to-end update->render latency - and convert those findings into
defensible quantitative targets adopted as the harness pass/fail criteria for all candidates.
**Depends on**: Phase 2 (the harness)
**Requirements**: BASE-01, BASE-02, BASE-03, BASE-04
**Success Criteria** (what must be TRUE):
  1. A baseline memory envelope across dataset shapes identifies the current stack's memory wall,
     including measurement on a named small-heap reference machine (BASE-01).
  2. A baseline CPU / main-thread envelope across update cadences identifies the jank wall under both
     sustained-load and burst conditions (BASE-02).
  3. A baseline end-to-end update->render latency is measured at a defined batch (e.g. ~500 records x
     ~20 fields) and broken down by pipeline stage (BASE-03).
  4. Defensible quantitative targets (max records x fields client-side; sustained batch size/rate
     without jank; update->render latency; per-tab memory ceiling on reference and small-heap machines)
     are proposed, adopted, and wired into the harness as pass/fail criteria (BASE-04).
**Plans**: TBD

### Phase 4: Toolbox Technology Demo
**Goal**: Land the highest near-term business-value deliverable - a portfolio / real-time-flavored
demo in `toolbox` that exercises the current stack at scale over a live WebSocket feed - giving XH a
shareable, on-demand proof of current-stack capability and its limits to answer the "where's our
ceiling" question being asked right now. Independent of the harness; can run in parallel with Phases 2-3.
**Depends on**: Phase 1 (current-state understanding). Can proceed in parallel with Phases 2 and 3.
**Requirements**: DEMO-01, DEMO-02, DEMO-03
**Success Criteria** (what must be TRUE):
  1. A portfolio / real-time-flavored demo exists in `toolbox` exercising the current stack at scale
     (DEMO-01).
  2. The demo drives a live update feed via WebSocket push, showing real-time aggregation and rendering
     at a defensible trading-screen cadence (DEMO-02).
  3. The demo runs on demand and is shareable as a proof of current-stack capability and its limits -
     usable in front of engineering leadership and clients (DEMO-03).
**Plans**: TBD

### Phase 5: Feature Spec & AG Grid 36 Parity
**Goal**: Lock and classify the feature surface before engines are scored against it - turning the
CC-1/CC-2/CC-3 calculated-columns taxonomy and the dynamic-schema ask into a concrete, testable spec,
classifying every requirement gate-vs-factor with a survivor check, and mapping AG Grid 36's feature
cluster against a data-layer-resident approach and the shared-store contract. Independent of the harness;
can run in parallel with Phases 2-4.
**Depends on**: Phase 1 (shared-store contract and seam understanding). Can run in parallel with
Phases 2-4.
**Requirements**: SPEC-01, SPEC-02, SPEC-03, SPEC-04, SPEC-05, SPEC-06, SPEC-07
**Success Criteria** (what must be TRUE):
  1. CC-1 (simple per-row derived columns), CC-2 (runtime user-chosen aggregation incl.
     weighted-average as a custom-`Aggregator` extension point), and CC-3 (dependency chains with
     topological recompute and cycle prevention) each have a testable spec covering data-layer
     residency, grouping interaction, incremental-update survival, and evaluation policy (SPEC-01,
     SPEC-02, SPEC-03).
  2. Dynamic / soft-defined schema (runtime non-derived field addition without redeploy) is captured
     and explicitly framed as a weighted factor, not a gate (SPEC-04).
  3. An AG Grid 36 parity map covers calculated columns, formulas, "show values as," automatic column
     generation, and aggregation editing - mapped against a data-layer-resident approach and the
     shared-store contract (SPEC-05).
  4. AG Grid Enterprise entitlement for the relevant AG Grid 36 features is confirmed per client before
     any spec item is allowed to depend on them (SPEC-06).
  5. Every requirement is classified gate-vs-factor and passes a survivor check - no requirement
     combination silently eliminates every otherwise-strong candidate; conflicts are surfaced as
     findings (SPEC-07).
**Plans**: TBD

### Phase 6: Technology Candidate Evaluation
**Goal**: With harness, baseline targets, and feature spec in hand, score every candidate on a common
rubric at real result shapes - running the cheapest experiments (structural sharing, backend
aggregation) early, measuring the bridge/transpose tax and reactivity bridge as first-class line items,
and producing an evidence-backed comparison matrix with spike notes. No premature lock-in: candidates
stay live into prototyping.
**Depends on**: Phase 3 (baseline + adopted targets) and Phase 5 (feature spec + gate/factor rubric)
**Requirements**: TECH-01, TECH-02, TECH-03, TECH-04, TECH-05, TECH-06, TECH-07, TECH-08
**Success Criteria** (what must be TRUE):
  1. A per-candidate rubric scores memory vs. baseline, threading story, JS<->engine bridge cost at
     real result shapes, incremental-update support, MobX/React reactivity bridge, CC-1/2/3 support,
     dynamic-schema support (as a factor), transport compatibility incl. fixed transport, licensing/
     maturity, shared-store-contract fit, and migration/coexistence cost - with explicit "transpose tax"
     and "reactivity bridge" columns (TECH-01).
  2. A comparison matrix scores every candidate (Arrow JS, SQLite-WASM, DuckDB-WASM, Perspective/FINOS,
     Web Workers, WASM, structural-sharing, server-state patterns, backend aggregation, and any
     newly-surfaced engine) with evidence and spike notes (TECH-02).
  3. The two cheapest experiments are measured early: a structural-sharing spike (Immer / Mutative) on
     the existing record cascade, and a backend-aggregation spike (server-side pre-shaping + delta push
     on the controllable transport) (TECH-03, TECH-04).
  4. Boundary-cost measurements isolate the column->row transpose tax (Arrow JS) as the bridge-cost
     floor, and a Perspective headless spike measures bridge cost, delta granularity under fan-out
     breadth, and the reactivity bridge at real result shapes (TECH-05, TECH-06).
  5. DuckDB-WASM is assessed in its narrowed batch/storage role (not as the real-time engine), and an
     attempt is made to identify and evaluate the externally-cited "fast WASM grid" on the rubric
     (TECH-07, TECH-08).
**Plans**: TBD

### Phase 7: Prototyping & Proof
**Goal**: Take the top candidate(s) from Phase 6 and build full prototypes behind the
`View.result -> Store` seam, benchmarked against the baseline on the harness - proving (or disproving)
incremental-update throughput, the fine-grained reactivity bridge, memory footprint, and coexistence
without regressing the existing stack or breaking the shared-store contract.
**Depends on**: Phase 6 (the comparison matrix determines which candidate(s) get prototyped)
**Requirements**: PROTO-01, PROTO-02, PROTO-03, PROTO-04, PROTO-05
**Success Criteria** (what must be TRUE):
  1. The top candidate(s) are prototyped behind the `View.result -> Store` seam and benchmarked against
     the baseline on the harness (PROTO-01).
  2. Incremental/differential update throughput is validated at target batch sizes - batch-in to
     render-out before the next batch (PROTO-02).
  3. The MobX/React reactivity bridge is validated with a demonstrated fine-grained (single-cell) update
     flowing engine -> MobX observable -> AG Grid transaction -> single-cell DOM update, not a rubric
     checkbox (PROTO-03).
  4. Memory footprint vs. baseline is validated at target dataset shapes (PROTO-04).
  5. Coexistence is validated - the prototyped path does not regress the existing stack or break the
     shared-store contract (PROTO-05).
**Plans**: TBD

### Phase 8: Strategy & Roadmap Synthesis
**Goal**: Synthesize everything into the milestone's core deliverable - an honest, evidence-backed
answer to whether and how to build Data 2.0: an own-it-all vs. lean-on-AG-Grid assessment, a tradeoff
frontier that does not force a single answer where the evidence does not support one, a recommended
path (or small set of viable paths), and a phased "Data 2.0 alongside, then absorbs high-volume cases"
adoption plan with a recommended first pilot.
**Depends on**: Phase 7 (prototype evidence) - draws on all prior phases
**Requirements**: STRAT-01, STRAT-02, STRAT-03, STRAT-04, STRAT-05
**Success Criteria** (what must be TRUE):
  1. An own-it-all vs. lean-on-AG-Grid strategic assessment evaluates bridges that use more of AG Grid
     while preserving the shared-store contract (STRAT-01).
  2. An honest tradeoff frontier is presented, with no forced single answer where the evidence does not
     support one (STRAT-02).
  3. A recommended path (or small set of viable paths) is grounded in harness evidence (STRAT-03).
  4. A phased "Data 2.0 alongside, then absorbs high-volume cases" adoption plan is produced, consistent
     with the coexistence model and the adaptability principle - any transport- or pattern-specific
     unlock labeled conditional, not default (STRAT-04).
  5. A first coexistence pilot workload is recommended, chosen by seam cleanliness and a representative
     (non-trivial) result set (STRAT-05).
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8. Phases 4 and 5 are independent of the
harness and may run in parallel with Phases 2-3 (parallelization enabled).

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Current-State Inventory | 4/4 | Complete | 2026-06-28 |
| 2. Measurement Harness | 2/6 | In Progress | - |
| 3. Baseline Performance Envelope | 0/TBD | Not started | - |
| 4. Toolbox Technology Demo | 0/TBD | Not started | - |
| 5. Feature Spec & AG Grid 36 Parity | 0/TBD | Not started | - |
| 6. Technology Candidate Evaluation | 0/TBD | Not started | - |
| 7. Prototyping & Proof | 0/TBD | Not started | - |
| 8. Strategy & Roadmap Synthesis | 0/TBD | Not started | - |
