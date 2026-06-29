# Requirements: Hoist Data Layer 2.0

**Defined:** 2026-06-27
**Core Value:** An evidence-based answer - backed by a reusable measurement harness and real
heap/throughput numbers - to whether and how to build a Data 2.0 layer for `hoist-react`.

> This is an R&D, baseline, and recommendation milestone (not a commitment to rewrite). "Requirements"
> are the deliverables and decisions the effort must produce. Each is testable: the artifact exists,
> meets its stated quality bar, and (where applicable) is backed by harness measurement. Open repo -
> no private client names anywhere.

## v1 Requirements

### Current-State Inventory (INV)

- [x] **INV-01**: A corrected current-state architecture document covers Store / Cube / View /
  GridModel and the end-to-end data flow, with Mermaid diagrams, grounded in `hoist-react` source and
  real app usage. Supersedes/absorbs the validation notes already produced.
- [x] **INV-02**: A copy-vs-reuse map identifies, at each pipeline transition (raw object -> StoreRecord
  -> ViewResult rows -> grid store records -> AG Grid nodes), where data is copied vs. referenced.
- [x] **INV-03**: The MobX reaction-granularity of the `View.result -> Store -> GridModel -> AG Grid`
  path is documented (record-level vs. batch-level), including where synchronous `applyTransaction`
  is driven and the mounted-component reaction lifecycle.
- [x] **INV-04**: An inventory of update-delivery transports/patterns the layer must support (HTTP
  snapshot/diff, WebSocket push via `XH.webSocketService`, WebSocket-as-notification, SignalR,
  polling) and how `Cube`/`Store` ingest adapts to each.

### Test Harness (HARN)

- [x] **HARN-01**: A configurable dataset generator parameterizes result shape (leaf-row count,
  aggregate-row count, field count) to reproduce realistic large-leaf-plus-aggregate shapes.
- [x] **HARN-02**: A configurable update generator parameterizes update pattern, breadth (fields per
  record), throughput (batch size and rate), and the change-delivery transport.
- [x] **HARN-03**: Instrumentation bubbles into Hoist's existing OTel tooling, measured at boundaries
  (not per-micro-op), with documented and bounded overhead.
- [x] **HARN-04**: The harness attributes heap by layer (cube store records, grid store records, AG
  Grid internals, intermediate view results), with a fallback method that does not require
  cross-origin isolation.
- [x] **HARN-05**: The harness separates compute cost from JS<->engine bridge cost and reports
  median + p95 with a forced-GC / steady-state protocol to control noise.
- [x] **HARN-06**: The harness is reusable, config-driven, documented infrastructure usable for BOTH
  baseline measurement and candidate evaluation (not throwaway scaffolding).

### Baseline Envelope (BASE)

- [ ] **BASE-01**: A baseline memory envelope across dataset shapes identifies the current stack's
  memory wall, including a small-heap reference machine.
- [ ] **BASE-02**: A baseline CPU / main-thread envelope across update cadences identifies the jank
  wall (sustained-load and burst).
- [ ] **BASE-03**: A baseline end-to-end update->render latency is measured at a defined batch
  (e.g. ~500 records x ~20 fields), broken down by pipeline stage.
- [ ] **BASE-04**: Defensible quantitative targets (max records x fields client-side; sustained batch
  size/rate without jank; update->render latency; per-tab memory ceiling on reference and small-heap
  machines) are proposed and adopted as harness pass/fail criteria.

### Toolbox Demo (DEMO)

- [ ] **DEMO-01**: A portfolio / real-time-flavored demo in `toolbox` exercises the *current* stack at
  scale and is landed early (highest near-term business value).
- [ ] **DEMO-02**: The demo drives a live update feed (WebSocket push) showing real-time aggregation
  and rendering at a defensible trading-screen cadence.
- [ ] **DEMO-03**: The demo is a shareable, on-demand proof of current-stack capability and its limits.

### Feature Spec (SPEC)

- [ ] **SPEC-01**: A spec for CC-1 (simple per-row derived columns, `C = A + B`) defines testable
  behavior: data-layer residency (reaches the Store), grouping interaction, incremental-update
  survival, and lazy-vs-materialized evaluation.
- [ ] **SPEC-02**: A spec for CC-2 (runtime user-chosen aggregation variants: sum, avg, and
  weighted-average-by-another-field) defines runtime selection of active aggregations, treating
  weighted-average as a custom-`Aggregator` extension point (not a built-in).
- [ ] **SPEC-03**: A spec for CC-3 (dependency chains: a calc column derived from another) defines the
  dependency graph, topological recompute, and cycle prevention; documents whether/how AG Grid
  supports multi-level derivation.
- [ ] **SPEC-04**: A spec for dynamic / soft-defined schema (adding non-derived fields at runtime -
  type, display name, aggregation rule, renderer - without redeploy) is captured and explicitly
  framed as a weighted factor, not a gate.
- [ ] **SPEC-05**: An AG Grid 36 parity map covers calculated columns, formulas, "show values as,"
  automatic column generation, and aggregation editing - mapped against a data-layer-resident
  approach and the shared-store contract.
- [ ] **SPEC-06**: AG Grid Enterprise entitlement for the relevant AG Grid 36 features is confirmed
  (per client) before any spec item depends on them.
- [ ] **SPEC-07**: Requirements are classified gate-vs-factor and pass a survivor check (no requirement
  combination eliminates every otherwise-strong candidate; conflicts are surfaced, not hidden).

### Technology Evaluation (TECH)

- [ ] **TECH-01**: A per-candidate evaluation rubric scores: memory vs. baseline; main-thread/threading
  story; JS<->engine bridge cost at real result shapes; incremental/differential update support;
  MobX/React reactivity bridge; calculated-column support (CC-1/2/3); dynamic-schema support (as a
  factor); transport compatibility incl. fixed-transport; licensing/maturity; shared-store-contract
  fit; migration/coexistence cost. Includes explicit "transpose tax" and "reactivity bridge" columns.
- [ ] **TECH-02**: A technology comparison matrix scores every candidate (Arrow JS, SQLite-WASM,
  DuckDB-WASM, Perspective/FINOS, Web Workers, WASM, structural-sharing, server-state patterns,
  backend aggregation, and any newly-surfaced engine) with evidence and spike notes.
- [ ] **TECH-03**: A structural-sharing spike (Immer / Mutative) measures memory reduction in the
  existing record cascade - an early, cheap experiment runnable alongside the baseline.
- [ ] **TECH-04**: A backend-aggregation spike (server-side pre-shaping + delta push on the
  controllable transport) measures the lowest-client-memory path; engine-independent.
- [ ] **TECH-05**: A Perspective (FINOS) headless spike measures bridge cost, delta granularity under
  fan-out breadth, and the reactivity bridge at real result shapes.
- [ ] **TECH-06**: An Arrow JS boundary-cost measurement isolates the column->row transpose tax to
  StoreRecord as the bridge-cost floor for any engine-feeds-our-grid path.
- [ ] **TECH-07**: DuckDB-WASM is assessed in a narrowed batch/storage role (not the real-time engine),
  with Arrow interop and isolation/deployability noted.
- [ ] **TECH-08**: An attempt is made to identify the externally-cited "fast WASM grid" and evaluate it
  on the rubric (as a candidate, not a target to match).

### Prototyping & Proof (PROTO)

- [ ] **PROTO-01**: The top candidate(s) are prototyped behind the `View.result -> Store` seam and
  benchmarked against the baseline on the harness.
- [ ] **PROTO-02**: Incremental/differential update throughput is validated at target batch sizes
  (batch-in to render-out before the next batch).
- [ ] **PROTO-03**: The MobX/React reactivity bridge is validated with a demonstrated fine-grained
  (single-cell) update spike - not a rubric checkbox.
- [ ] **PROTO-04**: Memory footprint vs. baseline is validated at target dataset shapes.
- [ ] **PROTO-05**: Coexistence is validated - the prototyped path does not regress the existing stack
  or break the shared-store contract.

### Strategy & Roadmap (STRAT)

- [ ] **STRAT-01**: An own-it-all vs. lean-on-AG-Grid strategic assessment evaluates bridges that use
  more of AG Grid while preserving the shared-store contract.
- [ ] **STRAT-02**: An honest tradeoff frontier is presented (no forced single answer where the
  evidence does not support one).
- [ ] **STRAT-03**: A recommended path (or small set of viable paths) is grounded in harness evidence.
- [ ] **STRAT-04**: A phased "Data 2.0 alongside, then absorbs high-volume cases" adoption plan is
  produced, consistent with the coexistence model and the adaptability principle.
- [ ] **STRAT-05**: A first coexistence pilot workload is recommended, chosen by seam cleanliness and a
  representative (non-trivial) result set.

## v2 Requirements

Deferred - depend on this milestone's recommendation; not in the current roadmap.

### Data 2.0 Build & Adoption

- **BUILD-01**: Implement the recommended Data 2.0 path (engine integration or AG-Grid-bridge).
- **BUILD-02**: Productionize the chosen calculated-columns flavors in the data layer.
- **BUILD-03**: Roll the path out to the first pilot workload behind the View/Store seam.
- **BUILD-04**: Implement a streaming push transport option if the strategy recommends one.
- **BUILD-05**: Dynamic / soft-defined schema support, if prioritized post-recommendation.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Committing to a full data-layer rewrite | This milestone is R&D + recommendation; Data 2.0 may coexist and absorb high-volume cases incrementally |
| Breaking or regressing the existing stack | Coexistence is a design requirement |
| Premature lock-in to one engine before the harness has spoken | Verifiability over opinion; keep candidates live into prototyping |
| HFT-grade per-tick latency | Target is human-perceptible trading-screen cadence (coalesced batches, sub-second render) |
| First-class mobile / Firefox / Safari optimization | Chromium / Edge-first, desktop-first |
| Hard dependence on one transport or ingest pattern | The layer must stay adaptive across client patterns; transport-specific unlocks are conditional, not default |

## Traceability

Each v1 requirement maps to exactly one phase (see `.planning/ROADMAP.md`).

| Requirement | Phase | Status |
|-------------|-------|--------|
| INV-01 | Phase 1 | Complete |
| INV-02 | Phase 1 | Complete |
| INV-03 | Phase 1 | Complete |
| INV-04 | Phase 1 | Complete |
| HARN-01 | Phase 2 | Complete |
| HARN-02 | Phase 2 | Complete |
| HARN-03 | Phase 2 | Complete |
| HARN-04 | Phase 2 | Complete |
| HARN-05 | Phase 2 | Complete |
| HARN-06 | Phase 2 | Complete |
| BASE-01 | Phase 3 | Pending |
| BASE-02 | Phase 3 | Pending |
| BASE-03 | Phase 3 | Pending |
| BASE-04 | Phase 3 | Pending |
| DEMO-01 | Phase 4 | Pending |
| DEMO-02 | Phase 4 | Pending |
| DEMO-03 | Phase 4 | Pending |
| SPEC-01 | Phase 5 | Pending |
| SPEC-02 | Phase 5 | Pending |
| SPEC-03 | Phase 5 | Pending |
| SPEC-04 | Phase 5 | Pending |
| SPEC-05 | Phase 5 | Pending |
| SPEC-06 | Phase 5 | Pending |
| SPEC-07 | Phase 5 | Pending |
| TECH-01 | Phase 6 | Pending |
| TECH-02 | Phase 6 | Pending |
| TECH-03 | Phase 6 | Pending |
| TECH-04 | Phase 6 | Pending |
| TECH-05 | Phase 6 | Pending |
| TECH-06 | Phase 6 | Pending |
| TECH-07 | Phase 6 | Pending |
| TECH-08 | Phase 6 | Pending |
| PROTO-01 | Phase 7 | Pending |
| PROTO-02 | Phase 7 | Pending |
| PROTO-03 | Phase 7 | Pending |
| PROTO-04 | Phase 7 | Pending |
| PROTO-05 | Phase 7 | Pending |
| STRAT-01 | Phase 8 | Pending |
| STRAT-02 | Phase 8 | Pending |
| STRAT-03 | Phase 8 | Pending |
| STRAT-04 | Phase 8 | Pending |
| STRAT-05 | Phase 8 | Pending |

**Coverage:**
- v1 requirements: 42 total (INV 4, HARN 6, BASE 4, DEMO 3, SPEC 7, TECH 8, PROTO 5, STRAT 5)
- Mapped to phases: 42 ✓
- Unmapped: 0 ✓
- Orphaned (no requirement) phases: none - every phase carries at least one requirement

---
*Requirements defined: 2026-06-27*
*Last updated: 2026-06-27 after roadmap creation (traceability populated, 42/42 mapped)*
