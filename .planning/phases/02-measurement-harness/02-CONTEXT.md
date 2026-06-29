# Phase 2: Measurement Harness - Context

**Gathered:** 2026-06-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the reusable, config-driven, OTel-instrumented harness that becomes the sole adjudicator of
every later "faster/lighter" claim in the Data 2.0 effort. It parameterizes result shape (HARN-01)
and update pattern / change-delivery transport (HARN-02), instruments the six boundaries Phase 1
named via Hoist's existing tracing (`core/Span.ts` / `TraceService` / `runner().span()`) (HARN-03),
attributes heap by layer with a non-cross-origin-isolation fallback (HARN-04), separates compute
cost from JS<->engine bridge cost and reports median + p95 under a forced-GC / steady-state protocol
(HARN-05), and is durable infrastructure reusable for BOTH baseline measurement and candidate
evaluation (HARN-06).

This phase builds the harness, not the measurements. Running the actual baseline envelope, scoring
specific candidates, and analyzing server-API transport impact are later phases that consume this
infrastructure.
</domain>

<decisions>
## Implementation Decisions

### Harness home & invocation

- **Split architecture: reusable measurement core in hoist-react + runnable UI in Toolbox.** The
  measurement/instrumentation core ships with the framework so any app can measure its own data
  layer; the interactive UI that exercises it lives as a Toolbox example app (public, demonstrable).
- **Both UI and programmatic.** A programmatic, config-driven core that can run standalone, wrapped
  by an interactive UI for picking scenarios and viewing results. The UI sits on top of the core.
- **Interactive browser only for now.** Manual, human-driven runs. Heap/GC APIs and AG Grid all
  require a real browser anyway. Headless/CI automation is explicitly out of scope for this phase
  (see Deferred Ideas).
- **Out-of-process data generation via a server-side test API.** Synthetic data generation must NOT
  run in the same browser JS thread as the measured pipeline - an in-thread generator would compete
  for the main thread and pollute results. The decided approach is a **test API built into Toolbox's
  Grails (Hoist Core) server layer**, capable of emitting different data shapes and serving updates
  over different delivery mechanisms including HTTP and WebSocket subscriptions. This was preferred
  over a standalone test API in another technology because it additionally yields reusable
  server-side Hoist patterns as a byproduct of this effort. (Reconsider only if a strong, specific
  benefit of another technology surfaces during research.)

### Scenario library & defaults (HARN-01 / HARN-02)

- **Flexible parametric API first.** Expose all the tuning knobs we need as a clean API rather than
  a fixed menu of hardcoded shapes.
- **Named profiles via Hoist persistence, not hardcoded.** Leverage a Hoist `ViewManager` +
  persistence in the UI harness layer so scenario configurations are saved, named, shared, and
  managed as serializable JSON blobs. Profiles and update patterns are data, not code.
- **Update patterns: research-and-propose, then persist.** The goal is a curated spread of realistic
  patterns (e.g. steady trickle, periodic bursts, broad re-snapshot/replace, targeted narrow-field
  updates), but the planning/research step should first interview and work through the actual
  testing knobs the harness must support; the real-world scenario permutations then fall out of
  those knobs and are captured/evolved as persisted JSON-blob configs rather than baked in.
- **Transport: build the Toolbox/Grails test API to drive ingest realistically over HTTP and
  WebSocket.** Driving the Cube/Store ingest contract is the invariant seam (Phase 1 finding), but
  delivery comes from the out-of-process test API rather than an in-browser generator, both for
  measurement cleanliness and to set up later server-API transport-impact analysis. WebSocket push
  is a first-class Data 2.0 transport and must be exercisable.
- **Data realism: mixed field types including object-valued fields, seeded/deterministic.** Generate
  a realistic mix (numbers, strings, dates, object-valued fields) so the harness can probe the
  object-valued-field heap question Phase 1 flagged. Generation is seeded for reproducibility.
- **Start with a seeded, curated set; data-composition-as-config is a likely follow-on phase.** The
  composition of generated data (field count, field data types, percentage of nulls, and similar
  shape concerns) should eventually become configurable, persisted parameters so regenerated data
  conforms to the same general real-world shape. For Phase 2, start with a fully seeded curated set
  and defer full composition-as-config (see Deferred Ideas).

### Results output & comparison

- **On-screen + persisted, with OTel via TraceService.** Spans bubble into Hoist's existing
  OTel/`TraceService` tooling (HARN-03); a result summary renders on-screen in the harness; and each
  run is persisted via Hoist persistence for later comparison. In-harness analysis is self-contained
  and does not depend on an external collector.
- **Comparison is a first-class harness feature, driven from saved runs.** Load two or more persisted
  runs and show them side-by-side (deltas, percent change) inside the harness UI - the mechanism for
  baseline-vs-candidate and run-over-run regression.
- **Full scorecard per run.** Report compute time AND bridge time, each as median + p95 (HARN-05);
  peak/resident heap attributed by layer - cube store records, grid store records, intermediate
  view-result rows, AG Grid internals (HARN-04); plus row counts and the full scenario config.
  ("Compute" = Hoist-side JS measured directly, e.g. `genTransaction`; "bridge" = the opaque cost of
  crossing into AG Grid / a worker / WASM, measured indirectly. The split generalizes to any
  JS<->engine boundary, not just AG Grid.)
- **Capture environment metadata with every run.** Stamp each persisted run with machine, browser
  version, enabled Chrome flags, and cross-origin-isolation status so saved runs remain meaningful
  when compared across machines (matters for the later small-heap reference-machine work).

### Run rigor & measurement protocol

- **Rigorous, flag-documented forced-GC / steady-state protocol.** Use real forced GC (Chrome
  `--expose-gc` or DevTools) between iterations, with warmup discards and a documented steady-state
  settle. The required flags must be documented. Acceptable since runs are interactive/manual.
- **Median + p95 over warmup + measured iterations** (HARN-05). Iteration/warmup counts and their
  exact model are Claude's discretion (see below), but must be reproducible and persisted with the
  run.

### Claude's Discretion

- **Candidate plug-in seam (HARN-06).** Design how a candidate implementation plugs in for evaluation
  against the actual Cube/Store/View/Grid contracts mapped in Phase 1, so the harness can measure
  baseline and candidate apples-to-apples. Lean toward a common-interface/swap approach if it fits
  the real contracts.
- **Iteration & warmup model.** Pick the iteration/warmup counts and defaults; just preserve median +
  p95 and reproducibility, and persist the settings with the run.
- **Heap attribution technique for owned layers.** Choose how to attribute heap for the layers Hoist
  owns (owned-object accounting vs heap-snapshot diffing), treating AG Grid internals as the opaque
  remainder. Use the Phase 1 allocation map.
- **Headless decision tie-breaks** and anything else that keeps Phase 2 focused on the measurement
  core.
</decisions>

<specifics>
## Specific Ideas

- Use a Hoist `ViewManager` + persistence as the management layer for scenario/profile configs -
  reuse the existing Hoist pattern for saving, naming, sharing, and managing arbitrary serializable
  JSON rather than inventing bespoke storage.
- Build the test data API into Toolbox's Grails / Hoist Core server layer specifically so the effort
  also produces reusable server-side Hoist patterns (data-shape emission, WebSocket subscription
  variants), not just a throwaway generator.
- Generated data should mirror how real-world data behaves - same general shape on regeneration -
  which is why composition is seeded now and intended to become persisted config later.
- "Compute vs bridge" is the load-bearing timing distinction: a candidate that shaves only compute
  but still floods the engine bridge will not actually feel faster, so the scorecard must separate
  them.

## Explicit Constraint: keep heap attribution simple

The precise, cross-origin-isolation heap path (`measureUserAgentSpecificMemory()`) is a
**nice-to-have, not a driver**. Favor the no-COI path (owned-object accounting + `performance.memory`)
as the default so there is zero setup. Support precise COI measurement only if it stays simple; be
judicious and **skip it entirely if it threatens an explosion of complexity**. HARN-04's "fallback
that does not require cross-origin isolation" is the primary path here, by intent. Whichever method a
run used must be recorded in that run's environment metadata.
</specifics>

<deferred>
## Deferred Ideas

- **Data-composition-as-config** - making field count, field data types, percentage of nulls, and
  related shape concerns into configurable, persisted parameters (so regenerated data keeps a
  consistent real-world shape). Phase 2 starts with a seeded curated set; this is a candidate
  follow-on phase.
- **Headless / CI automation** - scriptable runs for automated regression tracking. Phase 2 is
  interactive-browser-only; revisit as a later phase if needed.
- **Server-API transport-impact analysis** - measuring how the server API and its delivery affect
  overall performance. Phase 2 builds the Toolbox/Grails test API as the delivery substrate, but the
  dedicated analysis of server-side transport impact is later work.
- **Precise COI heap measurement** - may be implemented in Phase 2 only if simple; otherwise
  deferred. Not a required deliverable.

</deferred>

---

*Phase: 02-measurement-harness*
*Context gathered: 2026-06-29*
