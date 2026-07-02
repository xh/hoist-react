# Phase 3: Baseline Performance Envelope - Context

**Gathered:** 2026-07-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Run the current Cube/View/Store/GridModel stack through the Phase 2 measurement harness to map
exactly where its walls are - the memory envelope across dataset shapes (BASE-01), the CPU /
main-thread jank envelope across update cadences (BASE-02), and end-to-end update->render latency
at a defined ~500 records x ~20 fields batch, broken down by pipeline stage (BASE-03) - then
convert those findings into defensible quantitative targets, adopted via a review checkpoint and
wired into the harness as pass/fail criteria for all later candidate evaluation (BASE-04).

This phase RUNS measurements and adopts targets; it does not build new measurement capability
beyond what the sweep itself requires (run export, targets wiring, distilled stats output). It
does not score candidates (Phase 6) or prototype anything (Phase 7).

**Priority side deliverable (user directive, 2026-07-02):** an early, shippable stats + narrative
package - a document plus exported harness stats - handed to the Claude design tool to build an
interactive, infographic-heavy presentation for the team: current stack outline, where the walls
are, and how performance/memory scale across a few dimensions. Audience is technical software
devs first, with IT decision-maker concerns (memory ceilings, machine specs, scaling headroom)
addressed. This must land as soon as a reasonable coarse exploration exists - do NOT hold it for
full phase completion. Plan sequencing should front-load a coarse ladder pass to feed it.

</domain>

<decisions>
## Implementation Decisions

### Envelope sweep design
- **D-01 Sweep strategy - ladder + zoom.** A curated ladder of named, reproducible scenario
  profiles (e.g. escalating leaf-row counts x field counts) run first, then finer points added
  around wherever degradation appears. Named ViewManager profiles, not bespoke one-off runs.
- **D-02 Memory wall - tiered thresholds.** Report a graded envelope per shape: comfortable /
  degraded (GC pressure, sluggishness) / hard wall (OOM or renderer kill). The presentation gets a
  green/yellow/red story, not a single cliff number. Exact tier boundary values are Claude's
  discretion, proposed with evidence.
- **D-03 Jank wall - keep-up + frame budget.** The CPU wall is breached when EITHER (a) the
  pipeline can't keep up - median update->render time exceeds the batch arrival interval, so
  updates queue - or (b) the main thread blocks past a frame budget (p95 engine + grid-sync above
  ~100 ms = visible stutter). Both conditions measured under steady and burst cadences.
- **D-04 Headline sweep axes.** Memory envelope sweeps leaf-row count x field count; CPU/latency
  envelope sweeps batch size x update rate (steady + burst). Other knobs (cube dimensions, field
  type mix, breadth) held at documented realistic defaults. Four axes, two per chart family -
  designed to yield clean scaling infographics.

### Targets & pass/fail wiring (BASE-04)
- **D-05 Targets home - typed config in harness core.** A `TargetsConfig` type in `data/measure`
  (framework-resident, serializable, same style as `ScenarioConfig`), with the adopted numbers as
  a named default export. The envelope doc references it as the source of truth.
- **D-06 Pass/fail UI - scorecard badges + comparison columns.** Each targeted metric renders an
  inline pass/fail (or tier color) badge in the Data Lab scorecard; the run-comparison table gains
  target columns. The presentation export inherits the same verdicts.
- **D-07 Target anchoring - hybrid floor + aspiration.** Two tiers per metric: a "must hold"
  floor derived from the measured baseline (no candidate may regress it) and an aspirational
  target derived from business need (~500 records x ~20 fields sub-second at trading-screen
  cadence; bounded per-tab memory on reference and small-heap machines). Phase 6+ candidates are
  judged against both.
- **D-08 Adoption - review checkpoint.** The phase produces a proposal doc (each number + its
  measurement evidence + rationale) and a human-verify checkpoint where the user approves/adjusts
  each target BEFORE it is committed into `TargetsConfig` and the envelope report. Targets are not
  "adopted" until that checkpoint passes.

### Results capture & report
- **D-09 Report home - BASELINE.md + checked-in stats.** `docs/planning/data2/BASELINE.md` is the
  canonical envelope report (walls, scaling curves, methodology, adopted targets), alongside a
  checked-in stats directory of exported run JSON - the same package the design tool consumes.
  Open-repo rule applies: no private client names anywhere in it.

### Provisional decisions (user was AFK at ask - adopt unless overridden)
> These four adopted the recommended option after AskUserQuestion timeouts. Flag them at the next
> interaction; treat as decided for planning unless the user overrides.
- **D-10 (PROVISIONAL) Chrome tooling - DevTools MCP + optional CDP driver.** Install
  `chrome-devtools-mcp` (Google's official MCP) for the sweep: performance traces (long tasks,
  dropped frames - direct evidence for D-03), CPU throttling emulation, and Claude-driven runs.
  The planner MAY add a thin headed Puppeteer/Playwright CDP driver script as a plan item if
  sweep volume or heap-snapshot cross-validation of per-record sizing justifies it (flag-consistent
  launches, `HeapProfiler.collectGarbage`, precise metrics without flags). This is NOT the
  deferred headless/CI item - it automates the existing interactive protocol in a visible window.
- **D-11 (PROVISIONAL) Run export/import in Data Lab.** Add download-as-JSON export (single run
  or all saved runs) and file import to the Data Lab UI. Runs from any machine (small-heap
  reference machine especially) become files in the stats dir; import enables cross-machine
  side-by-side comparison. Saved runs are localStorage-local today - this is the capture path.
- **D-12 (PROVISIONAL) Stats package - raw + distilled.** Check in raw run JSON exports AND a
  distilled envelope-stats JSON (scaling curves, wall/tier boundary points, per-stage latency
  breakdown at the ~500x20 batch, environment metadata) shaped for direct design-tool consumption
  without parsing verbose RunResults.
- **D-13 (PROVISIONAL) Sweep execution - Claude-driven, no batch runner.** Claude drives the
  ladder through browser tooling (or the user runs manually); no in-harness batch-runner/run-queue
  code this phase. Coarse ladder first so the presentation package ships before zoom refinement.

### Claude's Discretion
- **Small-heap reference machine (BASE-01).** User did not select this for discussion. Research
  and propose: real older hardware vs. constrained-heap emulation on the dev machine (e.g.
  `--max-old-space-size`, DevTools CPU throttling per D-10), and what specs define "small-heap"
  (past OOM crashes were on older small-heap Chrome machines - see PROJECT.md). Surface the
  recommendation at a checkpoint; the machine must be NAMED in the envelope report per BASE-01.
- Ladder point values and zoom granularity; burst shape parameters; exact frame-budget ms and
  memory tier boundaries (propose with evidence per D-02/D-03).
- BASE-03 batch definition details beyond ~500 records x ~20 fields; iteration/warmup counts
  (existing `DEFAULT_PROTOCOL` is the starting point).
- Distilled stats schema design (D-12) and BASELINE.md structure.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase requirements & roadmap
- `.planning/ROADMAP.md` - Phase 3 goal and success criteria (BASE-01..04 mapping)
- `.planning/REQUIREMENTS.md` - BASE-01..BASE-04 requirement text

### Harness (the instrument this phase runs)
- `data/measure/README.md` - harness architecture, knob taxonomy, scorecard semantics, required
  Chrome launch flags, forced-GC protocol, foregrounded-tab operating note, candidate-reuse recipe
- `data/measure/types.ts` - `ScenarioConfig` / `RunResult` / `Scorecard` schemas the sweep
  profiles and stats exports build on
- `.planning/phases/02-measurement-harness/02-CONTEXT.md` - Phase 2 decisions carried forward
  (interactive-only runs, no-COI heap protocol, ViewManager profiles, localStorage runs,
  memory/performance pass split)

### Current-state grounding (for the presentation's "current stack" narrative)
- `docs/planning/data2/ARCHITECTURE.md` - authoritative current-state architecture doc with
  Mermaid diagrams (the presentation's stack-outline source material)

### Runnable UI (where sweep runs execute)
- `../toolbox/client-app/src/examples/datalab/` (branch `data2` (renamed from `data2`)) - Data Lab app:
  scenario editor, run controls, scorecard, comparison; D-06/D-11 UI work lands here

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Measurement harness (`data/measure/`)**: complete and verified (HARN-01..06). Phase 3 is its
  first real consumer - no new measurement capability needed for the core sweep.
- **Data Lab app (Toolbox, `data2` (renamed from `data2`) branch)**: scenario profiles (ViewManager JsonBlobs),
  run controls over HTTP + WebSocket, scorecard, saved-run comparison (localStorage). The ladder
  becomes a set of named scenario profiles here.
- **Toolbox Grails test-data API**: seeded shape generator + HTTP snapshot/diff + WebSocket push -
  drives all sweep transports.
- **Scorecard stage breakdown**: engine (cube + view) -> genTxn -> bridgeCall -> render timing
  split already satisfies BASE-03's "broken down by pipeline stage" requirement structurally.

### Established Patterns
- Runs require flagged Chrome (`--js-flags="--expose-gc"`, `--enable-precise-memory-info`) and a
  foregrounded tab (rAF suspension inflates render samples otherwise - `renderSuspect` flag).
- Memory and performance are independent passes (`ScenarioConfig.measure`); memory-only runs skip
  the 50k per-record sizing churn. The sweep should exploit this: memory ladder runs and
  performance cadence runs are separate run families.
- `EnvMetadata` stamps every run (userAgent, flags, heap method) - the cross-machine comparison
  key for the small-heap machine work.

### Integration Points
- `TargetsConfig` (D-05) joins `ScenarioConfig`/`RunResult` in `data/measure/types.ts`; verdict
  evaluation is a pure function over `Scorecard` + targets.
- Scorecard badges + comparison target columns (D-06) land in `DataLabPanel.ts`.
- Run export/import (D-11) extends `DataLabModel`'s localStorage-persisted `savedRuns`.
- Envelope report + stats: new `docs/planning/data2/BASELINE.md` + stats dir (D-09, D-12).

</code_context>

<specifics>
## Specific Ideas

- **The presentation deliverable is the near-term forcing function.** The user wants to walk XH's
  team through the current stack and its envelope with engaging infographics ("where our walls
  are", "how performance and memory scale in a few dimensions") built by the Claude design tool
  from this phase's stats package. Ship it from the coarse ladder pass - do not gate it on the
  full zoomed envelope or adopted targets.
- Dual audience for the report/stats: technical devs (stage breakdowns, scaling curves,
  methodology) plus IT decision makers (per-tab memory ceilings, machine specs, headroom).
- The green/yellow/red tiered framing (D-02) exists specifically to make the envelope legible in
  that presentation.
- Business anchor for aspiration targets (D-07): the lead client's real-time push - trading-screen
  cadence, ~500 position updates x ~20 fields per batch, recompute + render before the next batch,
  no jank, bounded memory (from PROJECT.md forcing functions).

</specifics>

<deferred>
## Deferred Ideas

- **In-harness batch runner / run queue** (from D-13) - a Data Lab run-queue that executes N
  scenarios sequentially and saves all results. Revisit if Claude-driven sweeps prove tedious in
  this phase or Phase 6 candidate sweeps demand it.
- **Headless / CI automation** - remains deferred from Phase 2. The optional CDP driver (D-10) is
  headed automation of the interactive protocol, not this.

</deferred>

---

*Phase: 03-baseline-performance-envelope*
*Context gathered: 2026-07-02*
