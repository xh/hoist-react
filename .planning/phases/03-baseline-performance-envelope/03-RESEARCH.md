# Phase 3: Baseline Performance Envelope - Research

**Researched:** 2026-07-02
**Domain:** Client-side performance/memory measurement methodology; running an existing Hoist
measurement harness through a curated scenario sweep; deriving and wiring pass/fail targets.
**Confidence:** HIGH on harness capabilities and tooling; MEDIUM on small-heap emulation specifics
(needs one live-validation pass before it is trusted).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Envelope sweep design**
- **D-01 Sweep strategy - ladder + zoom.** A curated ladder of named, reproducible scenario
  profiles (escalating leaf-row counts x field counts) run first, then finer points added around
  wherever degradation appears. Named ViewManager profiles, not bespoke one-off runs.
- **D-02 Memory wall - tiered thresholds.** Report a graded envelope per shape: comfortable /
  degraded (GC pressure, sluggishness) / hard wall (OOM or renderer kill). The presentation gets a
  green/yellow/red story, not a single cliff number. Exact tier boundary values are Claude's
  discretion, proposed with evidence.
- **D-03 Jank wall - keep-up + frame budget.** The CPU wall is breached when EITHER (a) the
  pipeline can't keep up - median update->render time exceeds the batch arrival interval, so updates
  queue - or (b) the main thread blocks past a frame budget (p95 engine + grid-sync above ~100 ms =
  visible stutter). Both conditions measured under steady and burst cadences.
- **D-04 Headline sweep axes.** Memory envelope sweeps leaf-row count x field count; CPU/latency
  envelope sweeps batch size x update rate (steady + burst). Other knobs (cube dimensions, field
  type mix, breadth) held at documented realistic defaults. Four axes, two per chart family.

**Targets & pass/fail wiring (BASE-04)**
- **D-05 Targets home - typed config in harness core.** A `TargetsConfig` type in `data/measure`
  (framework-resident, serializable, same style as `ScenarioConfig`), with the adopted numbers as a
  named default export. The envelope doc references it as the source of truth.
- **D-06 Pass/fail UI - scorecard badges + comparison columns.** Each targeted metric renders an
  inline pass/fail (or tier color) badge in the Data Lab scorecard; the run-comparison table gains
  target columns. The presentation export inherits the same verdicts.
- **D-07 Target anchoring - hybrid floor + aspiration.** Two tiers per metric: a "must hold" floor
  derived from the measured baseline (no candidate may regress it) and an aspirational target
  derived from business need (~500 records x ~20 fields sub-second at trading-screen cadence;
  bounded per-tab memory on reference and small-heap machines). Phase 6+ candidates judged against both.
- **D-08 Adoption - review checkpoint.** The phase produces a proposal doc (each number + its
  measurement evidence + rationale) and a human-verify checkpoint where the user approves/adjusts
  each target BEFORE it is committed into `TargetsConfig` and the envelope report. Targets are not
  "adopted" until that checkpoint passes.

**Results capture & report**
- **D-09 Report home - BASELINE.md + checked-in stats.** `docs/planning/data2/BASELINE.md` is the
  canonical envelope report (walls, scaling curves, methodology, adopted targets), alongside a
  checked-in stats directory of exported run JSON. Open-repo rule applies: no private client names.

**Provisional decisions (adopt unless overridden - flag at next interaction)**
- **D-10 (PROVISIONAL) Chrome tooling - DevTools MCP + optional CDP driver.** Install
  `chrome-devtools-mcp` (Google's official MCP) for the sweep: performance traces (long tasks,
  dropped frames - direct evidence for D-03), CPU throttling emulation, Claude-driven runs. The
  planner MAY add a thin headed Puppeteer/Playwright CDP driver script as a plan item if sweep volume
  or heap-snapshot cross-validation of per-record sizing justifies it. NOT the deferred headless/CI
  item - it automates the existing interactive protocol in a visible window.
- **D-11 (PROVISIONAL) Run export/import in Data Lab.** Add download-as-JSON export (single run or
  all saved runs) and file import to the Data Lab UI. Runs from any machine (small-heap reference
  machine especially) become files in the stats dir; import enables cross-machine side-by-side
  comparison. Saved runs are localStorage-local today - this is the capture path.
- **D-12 (PROVISIONAL) Stats package - raw + distilled.** Check in raw run JSON exports AND a
  distilled envelope-stats JSON (scaling curves, wall/tier boundary points, per-stage latency
  breakdown at the ~500x20 batch, environment metadata) shaped for direct design-tool consumption.
- **D-13 (PROVISIONAL) Sweep execution - Claude-driven, no batch runner.** Claude drives the ladder
  through browser tooling (or the user runs manually); no in-harness batch-runner/run-queue code this
  phase. Coarse ladder first so the presentation package ships before zoom refinement.

### Claude's Discretion
- **Small-heap reference machine (BASE-01).** Research and propose: real older hardware vs.
  constrained-heap emulation on the dev machine; what specs define "small-heap" (past OOM crashes
  were on older small-heap Chrome machines - see PROJECT.md). Surface at a checkpoint; the machine
  must be NAMED in the envelope report per BASE-01.
- Ladder point values and zoom granularity; burst shape parameters; exact frame-budget ms and memory
  tier boundaries (propose with evidence per D-02/D-03).
- BASE-03 batch definition details beyond ~500 records x ~20 fields; iteration/warmup counts
  (existing `DEFAULT_PROTOCOL` is the starting point).
- Distilled stats schema design (D-12) and BASELINE.md structure.

### Deferred Ideas (OUT OF SCOPE)
- **In-harness batch runner / run queue** - a Data Lab run-queue that executes N scenarios
  sequentially and saves all results. Revisit if Claude-driven sweeps prove tedious or Phase 6
  candidate sweeps demand it.
- **Headless / CI automation** - remains deferred from Phase 2. The optional CDP driver (D-10) is
  headed automation of the interactive protocol, NOT this.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BASE-01 | Baseline memory envelope across dataset shapes; identify memory wall; measure on a NAMED small-heap reference machine | Harness memory pass (heap-by-layer + `totalHeapDelta`) already exists; sweep is a ladder of `leafRowCount x fieldCount` ViewManager profiles. Small-heap machine via constrained-heap Chrome emulation (`--js-flags="--max-old-space-size=N"`) cross-validated against real older hardware; `EnvMetadata` stamps the machine on every run. See Standard Stack + Small-Heap section. |
| BASE-02 | Baseline CPU / main-thread envelope across update cadences; jank wall (sustained + burst) | Harness performance pass measures `engine`/`genTxn`/`bridgeCall`/`render` median+p95 under `cadence: steady|burst`. Keep-up condition = median update->render vs batch interval (derivable from `ratePerSec`); frame-budget condition = p95 engine+grid-sync > ~100 ms. DevTools MCP performance traces supply long-task / dropped-frame corroboration. See D-03 mapping. |
| BASE-03 | Baseline end-to-end update->render latency at ~500 records x ~20 fields, broken down by pipeline stage | The scorecard's 4-stage split (`engine` -> `genTxn` -> `bridgeCall` -> `render`) already satisfies "broken down by pipeline stage" structurally. Batch = `batchSize: 500`, `fieldCount: 20`. Sum the stage medians for end-to-end. |
| BASE-04 | Defensible quantitative targets proposed + adopted as harness pass/fail criteria | New `TargetsConfig` type in `data/measure/types.ts` (auto-exported via `data/index.ts`); a pure verdict function over `Scorecard` + targets; scorecard badges + comparison target columns (D-06); human-verify adoption checkpoint (D-08); hybrid floor+aspiration structure (D-07). |
</phase_requirements>

## Summary

This is a **methodology-and-measurement phase, not a library-build phase**. The instrument -
the `data/measure` harness plus the Toolbox `Data Lab` app - already exists, is verified, and was
built expressly to be this phase's first consumer (HARN-01..06 complete). Phase 3 drives it through
a curated scenario ladder, reads the walls off the results, and codifies those walls as adopted
targets. The bulk of the work is running sweeps, interpreting numbers, and writing a report; the
code work is small and additive: a `TargetsConfig` type, a pure pass/fail verdict function, scorecard
badge/column UI, and run export/import.

Three things are genuinely new and warrant care. First, the **small-heap reference machine**
(BASE-01) - the recommendation is constrained-heap emulation on the dev machine via a V8 flag
(`--js-flags="--max-old-space-size=N"`) that caps the tab's old-space and lets you observe the
degraded->OOM transition (D-02's yellow->red), cross-validated against real older hardware if
available; it must be surfaced at a checkpoint and NAMED in the report. Second, **`chrome-devtools-mcp`**
(D-10, verified as Google's official MCP) supplies performance traces (long tasks, dropped frames)
that corroborate the harness's own numbers for the D-03 jank wall - but it is a corroborating
instrument, not a replacement for the harness's forced-GC/median-p95 protocol. Third, the **priority
presentation deliverable** front-loads a coarse ladder pass: the plan must sequence a coarse
sweep + stats export + narrative BEFORE the zoom refinement and target adoption, so the design-tool
package ships early (user directive).

**Primary recommendation:** Sequence the phase as (1) build the small additive harness pieces
(`TargetsConfig` scaffold, run export/import, distilled-stats export) and define the named ladder
profiles; (2) run a COARSE ladder pass on the reference machine, export raw + distilled stats, and
ship the presentation package; (3) run the small-heap machine pass and the zoom refinement; (4)
propose targets with evidence at a human-verify checkpoint, then commit adopted numbers into
`TargetsConfig` + `BASELINE.md`. Use `chrome-devtools-mcp` to corroborate D-03 jank findings and to
drive runs; keep the tab foregrounded per the harness operating note.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Scenario ladder definition | Data Lab app (ViewManager profiles) | Harness core (`ScenarioConfig` schema) | D-01: profiles are data, persisted as named JsonBlobs; the core only defines the schema |
| Running the sweep | Browser (flagged Chrome tab) driven by Claude via `chrome-devtools-mcp` | Data Lab UI run controls | D-13: Claude-driven interactive runs, no batch runner; the harness executes in-page |
| Memory attribution | Harness core (`HeapAttribution`) | — | HARN-04 already owns this; Phase 3 only consumes it |
| Stage-split timing | Harness core (`BoundaryInstrumentation`) | — | HARN-03/05 already own the engine/genTxn/bridge/render split |
| Targets definition + verdict | Harness core (`data/measure/types.ts` + pure fn) | Data Lab scorecard (badges) | D-05: framework-resident, serializable; verdict is a pure fn over `Scorecard` + targets |
| Pass/fail display | Data Lab app (`DataLabPanel`/`DataLabModel`) | — | D-06: badges + comparison target columns are app-layer UI |
| Run capture / cross-machine transfer | Data Lab app (export/import JSON) | filesystem stats dir | D-11: localStorage runs -> files; import enables cross-machine comparison |
| Envelope report + stats package | `docs/planning/data2/` (Markdown + JSON) | design tool (external) | D-09/D-12: checked-in canonical report + design-tool-shaped stats |
| Small-heap emulation | Chrome launch flags (V8 old-space cap) | real older hardware (cross-validate) | BASE-01: emulate on dev machine, validate against real hardware, NAME the machine |

## Standard Stack

This phase adds almost no new runtime dependencies. The "stack" is the existing harness plus one
external MCP tool and (optionally) a CDP driver.

### Core (already present - the instrument)
| Component | Location | Purpose | Why Standard |
|-----------|----------|---------|--------------|
| `MeasurementHarness` | `data/measure/MeasurementHarness.ts` | Runs a `ScenarioConfig` through an adapter, returns a `RunResult` | Built for this exact phase (HARN-06); one protocol for baseline + candidates |
| `ScenarioConfig` / `RunResult` / `Scorecard` | `data/measure/types.ts` | Serializable knob + output schema | Ladder profiles and stats exports build directly on these |
| `BaselineAdapter` | `data/measure/BaselineAdapter.ts` | `DataLayerAdapter` over the live Cube/View/Store/GridModel | The current-stack subject under test; builds a real treeMode large-leaf-plus-aggregate tree |
| `HeapAttribution` | `data/measure/HeapAttribution.ts` | Forced-GC + per-layer heap accounting; fixed empty-pipeline baseline; N=50000 median-of-5 sizing | Memory pass (BASE-01) |
| `BoundaryInstrumentation` | `data/measure/BoundaryInstrumentation.ts` | 4-stage split: `engine` -> `genTxn` -> `bridgeCall` -> `render` (+ `renderSuspect` guard) | Stage breakdown (BASE-03) already structurally satisfied |
| Data Lab app | `../toolbox/client-app/src/examples/datalab/` | Scenario editor, run controls (HTTP + WS), scorecard, comparison, localStorage `savedRuns` | Where sweeps run and where D-06/D-11 UI lands |
| Toolbox Grails test-data API | Toolbox `dataLab` namespace | Seeded shape generator + HTTP snapshot/diff + WS push | Drives all sweep transports |

### Supporting (external tooling for the sweep)
| Package / Tool | Version | Purpose | When to Use |
|----------------|---------|---------|-------------|
| `chrome-devtools-mcp` | 1.4.0 [VERIFIED: npm registry, ChromeDevTools org] | Performance traces (long tasks, dropped frames), CPU throttling emulation, Claude-driven browser control | D-10: corroborate the D-03 jank wall with trace evidence; drive ladder runs in a visible window |
| `filesize` | already a Toolbox dep | Byte formatting in scorecard/export | Already used in `DataLabModel.fmtBytes` |
| Puppeteer OR Playwright | puppeteer 25.3.0 / playwright 1.61.1 [VERIFIED: npm registry] | OPTIONAL thin headed CDP driver: flag-consistent launches, `HeapProfiler.collectGarbage`, precise metrics, heap-snapshot cross-validation of per-record sizing | Only if sweep volume or heap cross-validation justifies it (D-10). Not required for the coarse ladder. |

**Note on Puppeteer vs Playwright:** `chrome-devtools-mcp` is built on Puppeteer internally and is
Chrome-only, which matches this project's Chromium/Edge-first scope (see REQUIREMENTS "Out of Scope").
If a scripted driver is added, prefer **Puppeteer** for consistency with the MCP's own stack and the
simplest raw-CDP access (`HeapProfiler.collectGarbage`, `Memory` domain). Playwright offers no
advantage here given the single-browser target. [ASSUMED - preference, not a hard requirement]

**Installation (chrome-devtools-mcp, D-10):**
```bash
# Verify first, then add to the project MCP config (.mcp.json) rather than a global npx auto-run.
npm view chrome-devtools-mcp version   # confirm current before pinning
# Register in .mcp.json (project already uses .mcp.json for hoist-react/github/jetbrains servers):
#   "chrome-devtools": { "command": "npx", "args": ["-y", "chrome-devtools-mcp@<pinned>"] }
# Enable locally via .claude/settings.local.json enabledMcpjsonServers.
```
Pin the version explicitly; do not rely on floating `@latest`.

**Version verification performed:** `chrome-devtools-mcp@1.4.0`, published under the `ChromeDevTools`
GitHub org with Google maintainers (`google-wombot`, `orkon`/Alexei Rudenko, `mathias`/Mathias
Bynens). Repo `git+https://github.com/ChromeDevTools/chrome-devtools-mcp.git`. [VERIFIED: npm view]

## Package Legitimacy Audit

> slopcheck could not be installed in this session. Provenance was assessed manually against the
> authoritative source (npm maintainer list + GitHub org). All three packages are household-name,
> long-lived, and published by verifiable authoritative owners; they are treated as approved on that
> basis, but the planner SHOULD still gate the `chrome-devtools-mcp` install behind a
> `checkpoint:human-verify` task per the graceful-degradation rule.

| Package | Registry | Age | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-------------|-----------|-------------|
| chrome-devtools-mcp | npm | published 2025-05 (v1.4.0) | github.com/ChromeDevTools/chrome-devtools-mcp | unavailable | Approved (official Google/ChromeDevTools org); planner adds human-verify before install |
| puppeteer | npm | 25.3.0, ~8 yr project | github.com/puppeteer/puppeteer | unavailable | Approved (optional; only if CDP driver added) |
| playwright | npm | 1.61.1, mature | github.com/microsoft/playwright | unavailable | Approved (optional alternative to Puppeteer) |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

*slopcheck was unavailable at research time; per protocol the `chrome-devtools-mcp` install should be
gated behind a `checkpoint:human-verify` task even though provenance is authoritative.*

## Architecture Patterns

### System Architecture (sweep data flow)

```
                    Named ViewManager scenario profiles (the ladder, D-01)
                                        |
                                        v
   Claude (chrome-devtools-mcp)  --> Data Lab UI (run controls) --> DataLabModel.doRunAsync
   [drives runs, foregrounded]         |                                   |
                                        |                    pre-fetch snapshot (HTTP/WS)
                                        |                    + pre-load into BaselineAdapter
                                        v                                   |
                            MeasurementHarness.runScenarioAsync             |
                              |                     |                       |
                       MEMORY pass            PERFORMANCE pass              |
                    (heap-by-layer,          (engine/genTxn/               |
                     fixed baseline,          bridgeCall/render,           |
                     N=50k sizing)            median+p95, steady|burst)     |
                              \                     /                       |
                               v                   v                        |
                                   RunResult (Scorecard + EnvMetadata)      |
                                        |                                    |
              +-------------------------+-----------------------+           |
              v                         v                       v           v
      savedRuns (localStorage)   verdict fn (Scorecard    scorecard badges  chrome-devtools-mcp
              |                    x TargetsConfig)        + comparison      performance trace
              v                         |                  target cols       (long tasks / dropped
      Export JSON (D-11) --> stats dir  |                  (D-06)             frames -> D-03 corroboration)
              |                         v
              v                    adopted at human-verify checkpoint (D-08)
      distilled-stats JSON (D-12) ----> BASELINE.md (D-09) + design tool (presentation)
```

The harness/UI split is fixed: the core (`data/measure`) fetches nothing; the Data Lab app owns all
transport and the mounted grid. `TargetsConfig` and the verdict function belong in the core
(auto-exported via `data/index.ts` -> `data/measure`); badges/columns/export belong in the app.

### Pattern 1: The scenario ladder as named ViewManager profiles (D-01)
**What:** Each rung of the ladder is a saved `ScenarioConfig` JsonBlob (via the scenario
ViewManager), not a code literal. Memory-ladder rungs sweep `leafRowCount x fieldCount` with
`measure: {memory: true, performance: false}`; CPU-ladder rungs sweep `batchSize x ratePerSec`
under `cadence: steady` and `cadence: burst` with `measure: {memory: false, performance: true}`.
**Why:** D-04 splits the sweep into two chart families; the memory/performance pass split
(`ScenarioConfig.measure`) lets memory runs skip the 50k timing churn and perf runs skip heap work.
**When to use:** Always for this phase - reproducibility and the presentation both depend on named,
re-runnable profiles.

### Pattern 2: `TargetsConfig` mirrors `ScenarioConfig` (D-05)
**What:** A new serializable interface in `data/measure/types.ts`, hybrid floor + aspiration per
metric (D-07), with a named default export holding the adopted numbers.
**Example (illustrative shape - final fields are Claude's discretion):**
```typescript
// Source: pattern mirrors ScenarioConfig in data/measure/types.ts [CITED: data/measure/types.ts]
/** A single targeted metric: a "must-hold" floor and an aspirational goal. */
export interface MetricTarget {
    /** Baseline-derived floor - no candidate may regress past this (D-07). */
    floor: number;
    /** Business-need aspiration (e.g. sub-second at ~500x20 trading cadence). */
    aspiration: number;
    unit: 'ms' | 'bytes' | 'count';
}

export interface TargetsConfig {
    /** End-to-end update->render latency at the ~500x20 batch. */
    updateRenderLatencyMs: MetricTarget;
    /** Engine (cube+view) p95 under sustained cadence. */
    enginePcpu: MetricTarget;
    /** Per-tab retained heap ceiling - reference machine. */
    heapCeilingReference: MetricTarget;
    /** Per-tab retained heap ceiling - small-heap machine (BASE-01). */
    heapCeilingSmallHeap: MetricTarget;
    /** Max sustained batchSize x ratePerSec without breaching the jank wall. */
    sustainedThroughput: MetricTarget;
    // ...max records x fields client-side, etc.
}

/** Adopted numbers - populated ONLY after the D-08 human-verify checkpoint passes. */
export const DEFAULT_TARGETS: TargetsConfig = { /* filled at adoption */ };
```

### Pattern 3: Verdict as a pure function over `Scorecard` + `TargetsConfig` (D-05/D-06)
**What:** A pure, side-effect-free function that maps a `Scorecard` and `TargetsConfig` to
per-metric verdicts (pass/fail or green/yellow/red tier). The Data Lab scorecard and comparison
table both render off its output; the distilled stats export inherits the same verdicts.
**Why:** Keeping it pure and in the core (a) makes it the single source of truth for pass/fail
across the UI + export + presentation, (b) makes it the one genuinely unit-testable unit in the
phase, and (c) lets Phase 6 reuse it unchanged to score candidates.
**Example:**
```typescript
export type Verdict = 'pass' | 'fail';
export type Tier = 'comfortable' | 'degraded' | 'hardWall';

export interface MetricVerdict {
    metric: string;
    value: number;
    floor: number;
    aspiration: number;
    verdict: Verdict;   // value within floor
    meetsAspiration: boolean;
}

export function evaluateScorecard(sc: Scorecard, targets: TargetsConfig): MetricVerdict[] {
    // pure: derive end-to-end latency = engine + genTxn + bridgeCall + render medians, compare, etc.
}
```

### Pattern 4: Two-tier target anchoring (D-07)
**What:** Floor derived from the measured baseline (regression guard for Phase 6+ candidates);
aspiration derived from business need (the lead client's ~500 x ~20 sub-second trading cadence,
bounded per-tab memory on reference + small-heap machines).
**When to use:** Every targeted metric carries both tiers; candidates in later phases are judged
against both.

### Pattern 5: Coarse-first sequencing for the presentation (user directive, D-13)
**What:** Plan waves so a coarse ladder pass + stats export + narrative land BEFORE zoom refinement
and target adoption. The presentation package must not be gated on the full zoomed envelope or the
D-08 checkpoint.
**Why:** Explicit user forcing function - the design-tool infographic ships as soon as a reasonable
coarse exploration exists.

### Anti-Patterns to Avoid
- **Building a batch runner / run queue.** Explicitly deferred (D-13). Sweeps are Claude-driven or
  manual this phase.
- **Adding headless/CI automation.** Deferred from Phase 2. The optional CDP driver (D-10) is HEADED
  automation of the interactive protocol only.
- **Committing target numbers before the D-08 checkpoint.** `DEFAULT_TARGETS` stays unpopulated (or
  clearly provisional) until the user approves each number.
- **Trusting a single run per rung.** The protocol already does warmup + median/p95 over
  `measuredIterations`; do not read a wall off one iteration or one rung.
- **New measurement capability beyond what the sweep needs.** The phase RUNS measurements; the only
  additive code is targets wiring, run export, and distilled-stats output (per CONTEXT boundary).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Forced-GC / steady-state / median-p95 protocol | A new timing loop | `MeasurementProtocol.runProtocolAsync` (HARN-05) | Already handles warmup discard, forced GC between, nearest-rank p95 |
| Heap attribution by layer | Manual `performance.memory` reads | `HeapAttribution` (fixed empty-pipeline baseline, N=50k median-of-5 sizing) | The negative-delta and quantization traps are already solved here |
| Stage-split timing | Wrapping calls in `performance.now()` yourself | `BoundaryInstrumentation` (engine/genTxn/bridge/render + `renderSuspect`) | Backgrounded-tab rAF suspension guard already built in |
| Byte formatting | Custom KB/MB math | `filesize` (already a Toolbox dep) | Handles sign, rounding; used in `DataLabModel.fmtBytes` |
| Scenario persistence / sharing | A bespoke profile store | ViewManager JsonBlob profiles (D-01) | Named/shared/curated state is exactly ViewManager's job |
| Run history persistence | A custom localStorage layer | `@persist.with({localStorageKey})` on `savedRuns` (existing) | Auto-hydrates/clears; already wired |
| CPU throttling / long-task detection | A hand-rolled main-thread sampler | `chrome-devtools-mcp` performance traces + `emulate_cpu` | Google's official instrument; direct dropped-frame/long-task evidence for D-03 |

**Key insight:** The harness is the whole point of Phase 2 - Phase 3's job is to USE it, not to
re-instrument. The only new code is `TargetsConfig`, the pure verdict function, badge/column UI, and
export/import. Everything else is running scenarios and interpreting results.

## Common Pitfalls

### Pitfall 1: The N=50000 per-record sizing load OOMs the small-heap machine
**What goes wrong:** The memory pass sizes per-record bytes by loading N=50000 rows (10x the default
scenario) to clear the heap noise floor. On a constrained-heap emulation (e.g. 512 MB old-space) or
a real small-heap machine, that 50k sizing load itself can exceed the cap and crash the renderer
BEFORE the actual scenario heap is measured.
**Why it happens:** Sizing N is tuned for the dev machine's large heap; it is not scaled to the
constrained target.
**How to avoid:** For small-heap runs, either (a) reduce the sizing N (accepting a coarser per-layer
figure but a valid total), (b) run memory-only with a smaller ladder rung, or (c) treat the OOM
itself as the observed hard-wall data point (D-02 red tier) rather than a failed run. The planner
should decide and document which; surface at the small-heap checkpoint.
**Warning signs:** Renderer "Aw, Snap!" during "Measuring memory" before the scorecard renders.

### Pitfall 2: `--max-old-space-size` is a V8 flag - it must ride inside `--js-flags`
**What goes wrong:** Passing `--max-old-space-size=512` directly to the Chrome binary does nothing
(it is not a Chrome switch); the tab keeps its full default heap and the "small-heap" run is a lie.
**Why it happens:** `--max-old-space-size` is a V8 flag; Chrome only forwards V8 flags given via
`--js-flags`. It must also be combined with the existing required `--expose-gc` in ONE `--js-flags`.
**How to avoid:** Launch with `--js-flags="--expose-gc --max-old-space-size=512"
--enable-precise-memory-info`. Validate the cap actually took effect in a live run (load rows until
OOM and confirm it crashes near the cap, not near the machine's real limit) BEFORE trusting any
small-heap numbers. [MEDIUM confidence - validate in-session]

### Pitfall 3: Backgrounded tab silently inflates render and skews the jank wall
**What goes wrong:** Chrome suspends rAF for hidden tabs; a backgrounded measurement tab produced a
44.7 s render artifact in Phase 2. During a long ladder sweep it is tempting to switch away.
**Why it happens:** Long sweeps + human impatience.
**How to avoid:** Keep the tab FOREGROUNDED for the full run (harness operating note). The harness
flags such samples `renderSuspect` - discard any rung with `renderSuspect` set and re-run it visible.
When driving via `chrome-devtools-mcp`, ensure the controlled window stays foreground.

### Pitfall 4: `performance.memory` quantization masks small heap deltas
**What goes wrong:** Without `--enable-precise-memory-info`, `performance.memory.usedJSHeapSize` is
quantized to ~100 KB buckets, so small per-layer deltas read as 0 or jump in coarse steps.
**Why it happens:** Chrome's default anti-fingerprinting quantization.
**How to avoid:** Always launch with `--enable-precise-memory-info`; `EnvMetadata.preciseMemory`
records whether it appears active - reject runs where it is false. Prefer ladder rungs large enough
that deltas clearly exceed a bucket.

### Pitfall 5: chrome-devtools-mcp trace reports "CPU throttling: none" even when active
**What goes wrong:** A documented open issue (ChromeDevTools/chrome-devtools-mcp#1955): the trace
SUMMARY says "CPU throttling: none / Network throttling: none" even when `emulate_cpu` throttling is
actually applied and the page is measurably slower.
**Why it happens:** A reporting bug in the trace summary, not the throttling itself.
**How to avoid:** Do not trust the trace summary line for throttle state; confirm throttling took
effect by comparing actual timings (throttled vs unthrottled) or by the emulation call's own return.
Treat MCP traces as CORROBORATING evidence for D-03, with the harness's own median/p95 as the
authoritative number. [CITED: github.com/ChromeDevTools/chrome-devtools-mcp/issues/1955]

### Pitfall 6: Comparing runs across machines without honoring `EnvMetadata`
**What goes wrong:** Reference-machine and small-heap-machine numbers are put side by side as if
comparable, hiding that they were measured under different flags/heap methods/precision.
**Why it happens:** The comparison UI compares scorecard fields; the env context lives in
`EnvMetadata` and is easy to ignore.
**How to avoid:** Always surface `EnvMetadata` (userAgent, flags, heapMethod, machine name) alongside
cross-machine comparisons; the small-heap machine must be NAMED (BASE-01). The imported-run flow
(D-11) should carry `EnvMetadata` through so the origin machine is never lost.

### Pitfall 7: Confusing the webpack Node heap with the browser tab heap
**What goes wrong:** Toolbox's `startWithHoist` sets `NODE_OPTIONS=--max_old_space_size=3072` - that
caps the WEBPACK build process (Node), not the app's browser tab. Someone reading it may think the
tab is already heap-constrained.
**Why it happens:** Same flag name, different process.
**How to avoid:** The small-heap emulation must constrain the CHROME tab's V8 heap via
`--js-flags`, independent of the webpack Node option. Keep them mentally separate.

## Small-Heap Reference Machine (BASE-01, Claude's discretion)

**Recommendation (surface at a checkpoint, then NAME the machine in the report):**

1. **Primary: constrained-heap emulation on the dev machine.** Launch a dedicated Chrome instance
   with the tab's V8 old-space capped:
   `google-chrome --js-flags="--expose-gc --max-old-space-size=<N>" --enable-precise-memory-info`.
   Choosing N to represent a "small-heap" machine (candidate anchors: 512 MB or 1024 MB - propose
   with evidence; past OOM crashes were on older small-heap Chrome machines per PROJECT.md). This
   makes the degraded->OOM transition (D-02 yellow->red) observable on demand and reproducibly.
   [MEDIUM confidence - the flag caps the tab's old-space; validate live that OOM occurs near the cap
   before trusting the boundary as a wall.]
2. **Cross-validate against real older hardware** if any is available - a real small-heap Chrome
   machine gives a ground-truth OOM point to calibrate the emulated cap against. Capture that run via
   the D-11 export/import path so it lands in the stats dir with its own `EnvMetadata`.
3. **Consider `navigator.deviceMemory` / low-end-device mode** as secondary framing. V8 shrinks its
   default heap limit on devices it detects as low-memory; the emulated `--max-old-space-size` cap is
   the more direct and controllable lever for a defensible, reproducible number. [ASSUMED]
4. **Name the machine.** BASE-01 requires the small-heap reference to be NAMED in the envelope report
   (e.g. "Emulated 512 MB V8 old-space cap on <dev machine model/OS>", or the real machine's model +
   RAM + Chrome version). `EnvMetadata` stamps userAgent/flags automatically; the human-readable
   machine name/spec is a report-level field the plan should capture.

**Chrome DevTools Protocol alternatives (for the optional CDP driver, D-10):** the `Memory` domain
offers `Memory.simulatePressureNotification` / OOM intervention and `HeapProfiler.collectGarbage`
for deterministic GC; the `Emulation` domain covers CPU/network/device-metrics but NOT a heap cap -
the heap cap remains the `--js-flags` V8 lever. [CITED: chromedevtools.github.io/devtools-protocol Memory + Emulation domains]

## Code Examples

### Named ladder profile (memory rung) - a serialized `ScenarioConfig`
```typescript
// Source: shape from data/measure/types.ts + DataLabModel.defaultScenario [CITED: data/measure/types.ts]
{
    name: 'Mem ladder 50k x 20f',
    dataset: {
        leafRowCount: 50000, dimensions: ['dim0','dim1','dim2'], fieldCount: 20,
        fieldTypeMix: {number: 5, string: 3, date: 1, object: 1}, aggregators: [], seed: 0
    },
    update: { cadence: 'steady', updateMode: 'incremental', breadth: 1, batchSize: 10,
              ratePerSec: 10, transport: 'http', durationSec: 5 },
    protocol: { warmupIterations: 5, measuredIterations: 20, gcSettleMs: 50 },
    measure: { memory: true, performance: false },   // memory pass only - skips 50k timing churn
    grid: { useVirtualColumns: true }
}
```

### CPU rung at the BASE-03 anchor batch (~500 x ~20), burst cadence
```typescript
{
    name: 'CPU 500-batch 20f burst',
    dataset: { leafRowCount: 50000, dimensions: ['dim0','dim1','dim2'], fieldCount: 20,
               fieldTypeMix: {number:5,string:3,date:1,object:1}, aggregators: [], seed: 0 },
    update: { cadence: 'burst', updateMode: 'incremental', breadth: 20, batchSize: 500,
              ratePerSec: 4, transport: 'webSocket', durationSec: 10 },
    protocol: { warmupIterations: 5, measuredIterations: 20, gcSettleMs: 50 },
    measure: { memory: false, performance: true },   // performance pass only
    grid: { useVirtualColumns: true }
}
```

### Small-heap Chrome launch (BASE-01 emulation)
```bash
# V8 heap cap MUST ride inside --js-flags alongside --expose-gc (Pitfall 2).
google-chrome \
  --js-flags="--expose-gc --max-old-space-size=512" \
  --enable-precise-memory-info \
  --enable-benchmarking
```

### End-to-end latency = sum of stage medians (BASE-03)
```typescript
// The scorecard already provides the 4-stage split; end-to-end is their sum.
const sc = runResult.scorecard;
const endToEndMs =
    (sc.engine?.medianMs ?? 0) + (sc.genTxn?.medianMs ?? 0) +
    (sc.bridgeCall?.medianMs ?? 0) + (sc.render?.medianMs ?? 0);
```

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Manual DevTools Performance panel recording | `chrome-devtools-mcp` (Google official, v1.4.0) - agent-driven traces, Core Web Vitals, CPU/network emulation | D-10: Claude can drive runs and pull long-task/dropped-frame evidence programmatically |
| Single "memory wall" cliff number | Tiered green/yellow/red envelope per shape (D-02) | Legible presentation story; degraded state is distinct from hard OOM |
| Ad-hoc per-run timing | Existing forced-GC + median/p95 protocol (HARN-05) | Noise-controlled, reproducible numbers already available |

**Deprecated/not applicable:**
- COI `measureUserAgentSpecificMemory` heap path: deferred in Phase 2 (no Hoist-layer breakdown);
  the `performanceMemory` path is the default and what the sweep uses.
- Backend aggregation as a candidate: DESCOPED 2026-07-02 (not this phase, but context).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `--js-flags="--max-old-space-size=N"` reliably caps a Chrome tab's V8 old-space and triggers renderer OOM near the cap | Small-Heap / Pitfall 2 | If the flag does not cap a browser tab as it does Node, the emulated small-heap wall is invalid; MUST validate live before trusting. Real-hardware cross-validation mitigates. |
| A2 | Puppeteer preferred over Playwright for the optional CDP driver | Standard Stack | Low - either works; Playwright would also serve. Preference only. |
| A3 | N=50000 sizing load may OOM under a small-heap cap | Pitfall 1 | If sizing happens to fit, no harm; if it OOMs, the memory pass needs a scaled-down sizing N for small-heap runs. |
| A4 | `navigator.deviceMemory` / V8 low-end-device detection is secondary to the explicit heap cap | Small-Heap | Low - the explicit cap is the recommended lever regardless. |
| A5 | Frame-budget ~100 ms (p95 engine+grid-sync) as the jank threshold per D-03 | BASE-02 | This is the CONTEXT-stated starting figure; exact ms is Claude's discretion, proposed with evidence at the D-08 checkpoint. |

## Open Questions (RESOLVED)

> Each question below is a genuinely live-measurement-dependent call routed to a specific plan
> checkpoint; the recommendation is the resolution unless the checkpoint decides otherwise.

1. **Data Lab branch name.** CONTEXT/canonical-refs cite the Data Lab app on branch `data2-research`,
   but the local Toolbox checkout is currently on `data2`, and the files are present there.
   - What we know: the app exists and is current on `data2` locally.
   - What's unclear: whether `data2-research` is the intended integration branch for D-06/D-11 UI work.
   - Recommendation: confirm the target Toolbox branch with the user before landing UI changes.
   - **RESOLVED:** routed to 03-03 Task 1 (confirm Toolbox branch before UI work).

2. **Small-heap N (512 vs 1024 MB) and OOM-as-data-point policy.** The exact cap and whether a
   deliberate OOM counts as the red-tier data point (vs a discarded failed run) need a decision.
   - Recommendation: propose 512 MB with evidence, treat a clean OOM near the cap as the hard-wall
     point, surface at the small-heap checkpoint.
   - **RESOLVED:** routed to 03-05 Task 1 (decision checkpoint: small-heap cap + OOM-as-data policy).

3. **Does the memory-pass sizing churn need a small-heap-specific override?** (Pitfall 1/A3)
   - Recommendation: plan a quick live probe on the capped instance early; if it OOMs during sizing,
     add a scaled sizing N or a memory-only small-ladder variant.
   - **RESOLVED:** routed to 03-05 Task 1 (validate the heap cap) and Task 2 (small-heap pass with a scaled sizing N if the probe OOMs).

4. **Distilled-stats schema (D-12) shape for the design tool.** Claude's discretion.
   - Recommendation: design a flat, chart-ready JSON (scaling series per axis, tier-boundary points,
     the ~500x20 stage breakdown, env metadata) - avoid making the design tool parse verbose
     `RunResult` objects.
   - **RESOLVED:** Claude's discretion, exercised in 03-02 Task 1 (`exportDistilledStats` schema) and 03-04 Task 1 (`envelope-stats.json`), kept single-source between the two.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Google Chrome / Chrome for Testing | All sweep runs (flags) | assumed ✓ (dev machine) | — | Chrome for Testing pinned build |
| `--expose-gc` + `--enable-precise-memory-info` flags | Forced-GC + un-quantized heap | ✓ (launch flags) | — | degraded, noisier heap if absent |
| `chrome-devtools-mcp` | D-10 traces / driven runs | ✗ (install step) | 1.4.0 | manual DevTools Performance panel |
| Toolbox Grails test-data API (`:8080`) | Snapshot/diff/WS transport | must be launched | — | none - required for data |
| Toolbox webpack dev server (`:3000`, `startWithHoist`) | Serving Data Lab + inline hoist-react | must be launched | — | none |
| User logged into browser | Live runs (cannot enter creds programmatically) | interactive | — | none |
| Puppeteer/Playwright | OPTIONAL CDP driver | ✗ | 25.3.0 / 1.61.1 | not needed for coarse ladder |
| slopcheck | Package legitimacy audit | ✗ (could not install) | — | manual provenance check (done) |

**Missing dependencies with no fallback:**
- Toolbox Grails API + webpack dev server must both be up (poll `http://localhost:8080/ping` and
  `http://localhost:3000/datalab/` before driving). Note from Phase 2: Grails does NOT hot-reload
  `.groovy` here and a restart logs the user out - if the sweep needs server-side generator changes,
  plan the restart/re-login explicitly.

**Missing dependencies with fallback:**
- `chrome-devtools-mcp` (install + human-verify checkpoint); manual DevTools panel is the fallback.
- CDP driver (optional; skip for the coarse ladder).

## Validation Architecture

**Important context:** hoist-react has **no unit-test framework** (no jest/vitest/mocha in
`package.json`; scripts are `lint` + `tsc --build`). Toolbox likewise has no test runner (its
`lint:types` is `tsc`). This is consistent with all of Phase 2, where validation was `npx tsc
--noEmit` + `eslint` + **live flagged-Chrome measurement runs** at a human-verify checkpoint. There
is no automated Nyquist test suite to wire into; do not invent one for this R&D phase.

### "Test" Framework (adapted)
| Property | Value |
|----------|-------|
| Static checks | `npx tsc --noEmit` (hoist-react), `tsc` (Toolbox `lint:types`), `eslint` |
| Behavioral validation | Live measurement runs in flagged Chrome via the Data Lab app |
| Config file | none (no jest/vitest) |
| Quick check | `cd /Users/amcclain/dev/hoist-react && npx tsc --noEmit && yarn lint:code` |

### Phase Requirements -> Validation Map
| Req ID | Behavior | Validation Type | How |
|--------|----------|-----------------|-----|
| BASE-01 | Memory envelope + small-heap wall | manual (live) | Run memory ladder on reference + small-heap Chrome; read heap-by-layer; confirm OOM near cap |
| BASE-02 | CPU/jank wall (steady + burst) | manual (live) | Run CPU ladder both cadences; apply keep-up + frame-budget criteria; corroborate with MCP trace |
| BASE-03 | Stage-split latency at ~500x20 | manual (live) | Run the anchor batch; read engine/genTxn/bridge/render medians; sum for end-to-end |
| BASE-04 | Targets adopted + wired | static + manual | `tsc`/lint clean on `TargetsConfig` + verdict fn; badges render live; D-08 checkpoint approves numbers |

### The one unit-testable unit
The pure `evaluateScorecard(scorecard, targets)` verdict function (D-05) is genuinely unit-testable
(deterministic, no side effects). Since there is no test runner, the planner should NOT add one for
this phase; instead validate it via `tsc` types + a live scorecard render showing correct badges on
known runs. If the team later adopts a test runner, this function is the natural first unit test.

### Wave 0 Gaps
- None in the test-infrastructure sense (no framework by design). The real Wave-0 prerequisites are:
  launch the Grails API + webpack dev server, install/verify `chrome-devtools-mcp`, and define the
  named ladder ViewManager profiles before the coarse sweep.

## Security Domain

`security_enforcement` is not set in `.planning/config.json` (treat as enabled), but this is an
internal R&D measurement tool with no auth surface, no new network endpoints beyond the existing
Toolbox test API, and no user data. Most ASVS categories do not apply. The one genuinely relevant
control:

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V5 Input Validation | yes (D-11 file import) | Validate/parse imported run JSON against the `RunResult` schema before trusting it |
| V2 Auth / V3 Session / V4 Access Control | no | No auth surface in the Data Lab tool |
| V6 Cryptography | no | No crypto |

**Threat note for D-11 import:** importing a `RunResult` JSON file is parsing untrusted input. Guard
the import path - validate the parsed object has the expected `RunResult`/`Scorecard` shape and
numeric fields before adding it to `savedRuns` or rendering it, so a malformed file cannot crash the
comparison grid or poison the stats package. Never `eval`; use `JSON.parse` + shape validation.

**Open-repo constraint (from CLAUDE.local.md + STATE.md blockers):** no private client names anywhere
in `BASELINE.md`, the stats dir, or any committed file. Allowed names: Hoist, Toolbox, JobSite. The
lead-client trading-cadence anchor (D-07) must be described generically (e.g. "a real-time
trading-screen workload"), never by client name. A local PreToolUse guard blocks commits containing
forbidden names.

## Project Constraints (from CLAUDE.md)

- **Use the Hoist doc/type tools** before writing hoist-react code (MCP `hoist-*` tools or
  `npx hoist-docs` / `npx hoist-ts`); do not guess APIs. `TargetsConfig` + verdict fn land in
  `data/measure` and must follow the serializable, no-class-instance style of `ScenarioConfig`.
- **Element factories over JSX**; **Hoist input components** (`switchInput`, `select`, `numberInput`)
  not raw HTML - relevant to the D-06 badges / D-11 export-import controls in `DataLabPanel`.
- **Named exports only**; **`null` over `undefined`** (check `== null`); **lodash** for
  collection/object utilities.
- **No em dashes** in code comments (spaced hyphen) or any generated content (commit messages, PR
  text, `BASELINE.md`). Em dashes in `.md` prose are also to be avoided per the user's global note.
- **Async methods suffixed `Async`**; managed MobX subscriptions via `addReaction`/`addAutorun`;
  `@managed` for child `HoistBase` instances.
- **Git:** branching/committing/pushing require an explicit ask. This is a feature-branch effort
  (`data2` / `data2-research`); if orchestrated multi-agent work fans out, agents make discrete
  scoped commits as directed by the plan, but never push without an explicit ask.
- **Changelog:** if any user-facing hoist-react change lands (e.g. `TargetsConfig` export), read
  `docs/changelog-format.md` before editing `CHANGELOG.md`.
- **Project skills present** (`.claude/skills/`: `xh-update-doc-links`, `xh-update-docs`,
  `xh-upgrade-notes`) are documentation-maintenance skills - not relevant to this measurement phase
  unless doc-link updates are needed.

## Sources

### Primary (HIGH confidence)
- `data/measure/types.ts`, `README.md`, `MeasurementHarness.ts`, `BoundaryInstrumentation.ts`,
  `HeapAttribution.ts`, `MeasurementProtocol.ts`, `index.ts` - harness architecture, scorecard
  schema, protocol, Chrome flags, forced-GC/render-suspect guards (read in full/part this session)
- `../toolbox/client-app/src/examples/datalab/DataLabModel.ts` + `DataLabPanel.ts` - where D-06/D-11
  land; existing `savedRuns` localStorage persistence, comparison rows, scenario projection
- `.planning/phases/03-baseline-performance-envelope/03-CONTEXT.md` - locked + provisional decisions
- `.planning/phases/02-measurement-harness/SPEC-memory-perf-passes.md` + STATE.md decision log -
  memory/performance pass split, live-verified numbers, operational gotchas
- `.planning/REQUIREMENTS.md` - BASE-01..04 text; out-of-scope (Chromium-first, no HFT latency)
- npm registry (`npm view chrome-devtools-mcp / puppeteer / playwright`) - versions + maintainers

### Secondary (MEDIUM confidence)
- github.com/ChromeDevTools/chrome-devtools-mcp - official repo, tool set (traces, `emulate_cpu`)
- github.com/ChromeDevTools/chrome-devtools-mcp/issues/1955 - CPU-throttling-reporting bug (Pitfall 5)
- chromedevtools.github.io/devtools-protocol - Memory + Emulation domains (CDP driver options)
- v8.dev/blog/heap-size-limit - V8 heap-limit background (does not give exact default values)

### Tertiary (LOW confidence - validate)
- WebSearch results on `--max-old-space-size` capping a browser tab's heap (A1) - the mechanism is
  documented but must be validated live in a capped Chrome instance before the small-heap wall is trusted.

## Metadata

**Confidence breakdown:**
- Harness capabilities / what exists: HIGH - read the source and Phase 2 records directly.
- Sweep design / patterns / targets wiring: HIGH - follows locked CONTEXT decisions + existing schema.
- chrome-devtools-mcp legitimacy + tooling: HIGH - verified official Google/ChromeDevTools package.
- Small-heap emulation via V8 flag: MEDIUM - documented approach, needs one live validation pass.
- Pitfalls: HIGH - most are drawn from Phase 2's own recorded live evidence + a documented MCP bug.

**Research date:** 2026-07-02
**Valid until:** ~2026-08-02 (stable; `chrome-devtools-mcp` moves faster - re-check its version at plan time)
