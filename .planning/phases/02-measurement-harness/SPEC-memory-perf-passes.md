# Spec: Split the Data Lab harness into two optional measurement passes (Memory / Performance)

Status: APPROVED design, ready to implement. Post-close refinement of Phase 2 (does NOT affect the
5/5 goal verification - the observable truths are about the harness existing and measuring, not about
pass-optionality). Author handoff written 2026-06-30 because the originating session's context filled.

## Why

A scenario run currently does memory work and performance work entangled, under misleading stage names.
"Calibration" reads as *prep* but is actually a **memory measurement** (per-record byte sizing). And heap
attribution is computed *inside* the timing loop, so you can't measure one concern without the other.

Reframe the run as **two independent measurement concerns**, each optional:
- **Memory** - how much heap the loaded dataset retains, attributed by layer.
- **Performance** - how fast updates flow (pipeline + grid-sync), at steady state. Covers incremental
  diffs, full reloads, steady + burst - hence "performance", not "updates".

User decisions (final):
- Stage names: **"Measuring memory"** and **"Measuring performance"** (+ keep "Warming up").
- **Fully decouple**: when performance is requested but memory is not, do NO baseline/calibration/heap;
  when memory is requested but performance is not, do NO warmup/measured timing.

## Target run shapes (runScenarioAsync)

Config picks which passes run; default both on; at least one required.

- **Memory only**: clear -> capture empty baseline -> calibrate per-record bytes (50k x5) -> reload
  scenario -> forced GC -> read total heap + counts -> attributeHeap. Scorecard has heap + rowCounts;
  timings null. NO warmup/measured (fast, and no grid churn beyond the calibration loads).
- **Performance only**: scenario is already loaded by the caller (pre-load at setup). Warmup + measured
  iterations time pipeline + grid-sync; median+p95; overhead probe. Scorecard has timings + rowCounts;
  heap null. **No baseline, no calibration -> no 50k churn** (this is the visible win).
- **Both**: run Memory first (it ends with the scenario loaded), then Performance on that loaded state.

Memory-pass internal order (clean): clear -> captureEmptyBaselineHeap (reference R) -> calibrate (load
50k x5, ends empty) -> reloadSnapshot (scenario loaded) -> forceGcAndSettle -> attributeHeap(R, counts,
calibration). After this the scenario is loaded for a following Performance pass.

## Stage messages (harness onProgress)

- Memory pass: `{stage:'Measuring memory'}` (optionally two sub-emits: 'Measuring memory - empty
  baseline' then 'Measuring memory - per-record sizing'). Keep simple; one 'Measuring memory' is fine.
- Performance pass (in runProtocolAsync): `'Warming up'` (x/y) then rename the measured stage literal
  `'Measuring'` -> `'Measuring performance'` (x/y). Keep `'Finalizing'` for the overhead probe.
- DELETE the old `'Capturing baseline'` and `'Calibrating'` emits.

## File-by-file changes

### hoist-react `data/measure/types.ts`
- Add `export interface MeasureConfig { memory: boolean; performance: boolean }` and
  `measure: MeasureConfig` on `ScenarioConfig` (default both true; brand-new schema, dev-local profiles
  only, no migration). (Alternative considered: a separate run-option, not the scenario - rejected so it
  persists with the profile and binds to the form. If it feels wrong on ScenarioConfig, a sibling
  `RunOptions` is acceptable, but keep it simple.)
- Make `Scorecard` timing + heap fields nullable so a skipped pass reads null:
  `pipeline/compute/bridgeCall/render: TimingStat | null` and `heap: HeapAttribution | null`.
  `rowCounts` stays required (scenario is always loaded). 
- `RunResult.overheadMs: number | null` (null when performance not measured).

### hoist-react `data/measure/MeasurementHarness.ts`
- `runScenarioAsync`: read `const {memory, performance} = scenario.measure ?? {memory:true, performance:true}`;
  throw if neither. Restructure into the two-pass shape above:
  - Memory block (guarded by `memory`): the existing clear/capture/calibrate/reload, then ONE
    `attributeHeap(...)` after the reload + forced GC. Produces the `heap` + the counts.
  - Performance block (guarded by `performance`): the existing `runProtocolAsync(...)` + `measureOverhead`.
    Produces the timing stats + overheadMs.
  - Assemble `Scorecard` from whichever ran (null the rest). `rowCounts` from the adapter accessors
    (scenario loaded in all paths).
  - Pass `fullReplace` into the perf iterations as today.
- `runIterationAsync`: **remove heap attribution** (the `attributeHeap` step + counts). Return just
  `{pipeline, timing}`. The fullReplace branch is otherwise unchanged.
- `IterationSample`: drop `heap` -> `{pipeline, timing}`.
- `reduceScorecard`: reduce only timings (pipeline/compute/bridgeCall/render) from samples; heap now comes
  from the memory pass, not the last iteration. Adjust signature accordingly.
- `calibrateAsync`: unchanged (memory pass calls it).
- Keep the "calibration shares the measured adapter" reality; the dedicated-calibration-pipeline cleanup
  is a SEPARATE follow-on (see Known follow-ons). Do not bundle it here.

### hoist-react `data/measure/MeasurementProtocol.ts`
- In `runProtocolAsync`, change the measured-loop progress emit from `stage:'Measuring'` to
  `stage:'Measuring performance'`. Warmup stays `'Warming up'`. (These literals are harness-internal.)

### toolbox `client-app/src/examples/datalab/DataLabModel.ts`
- `defaultScenario`: add `measure: {memory: true, performance: true}`.
- `scenarioForm`: add boolean fields `measureMemory`, `measurePerformance` (initialValue from default).
  Add a cross-field rule (or a guard in `runAsync`) requiring at least one true.
- `scenario` getter: project `measure: {memory: v.measureMemory, performance: v.measurePerformance}`.
- `comparisonRows`: NULL-GUARD every `scorecard.pipeline/compute/bridgeCall/render/heap.*` read - a run
  may now have null timings or null heap. Skip rows whose underlying stat is null (compare only the
  metrics both runs measured).

### toolbox `client-app/src/examples/datalab/DataLabPanel.ts`
- Add two toggles near the top of the form (use Hoist `switchInput` - prefer Hoist inputs, not raw HTML):
  "Measure memory" (`measureMemory`) and "Measure performance" (`measurePerformance`), each with a short
  info note.
- Scorecard factory: render the **Timings** block only if `sc.pipeline` is non-null; render the **Heap by
  layer** block only if `sc.heap` is non-null; the overhead row only if `overheadMs != null`. Row counts +
  environment always render. (When a pass is skipped its section is simply absent.)
- The progress mask already shows the harness messages; nothing to change there beyond the new stage
  names flowing through.

### NO server change
The pass split is entirely client + harness. The Grails endpoints (snapshot/diff/stream) are untouched.
=> **No Grails restart needed for this work** => **no logout churn**. Webpack hot-rebuild only.

## Verification (live, in Chrome - user must be logged in)

Dev servers are currently DOWN. Relaunch both (see Operational gotchas), then:
1. **Both** (default): "Measuring memory" then "Warming up"/"Measuring performance"; scorecard shows BOTH
   heap and timings. Sanity: incremental+steady pipeline ~57ms, fullReplace ~33ms (unchanged), heap
   positive (~78MB / 5000-5587 rows).
2. **Performance only** (toggle memory off): NO 50k calibration churn in the grid, faster run, only
   "Warming up"/"Measuring performance" stages, scorecard shows timings only, NO heap section.
3. **Memory only** (toggle performance off): only "Measuring memory", scorecard shows heap only, NO
   timings, no warmup/measured.
4. Compare two runs in the Compare panel incl. a memory-only vs a both run -> no crash from null fields
   (the comparisonRows null-guard).

## Commit plan (feature branch data2, squash-merged later, so small commits are fine)
- hoist-react: `feat(02): split harness into optional memory + performance measurement passes`
  (types + MeasurementHarness + MeasurementProtocol).
- toolbox: `feat: Data Lab - memory/performance measurement toggles + sectioned scorecard`
  (DataLabModel + DataLabPanel).
- hoist-react: `docs(02): record memory/performance pass split` (STATE.md decision entry: the two-concern
  reframe, "Measuring memory"/"Measuring performance" names, full decouple - heap no longer attributed in
  the timing loop, both passes optional; note no goal-verification impact).

## Operational gotchas (learned this session)
- Relaunch dev servers (both currently down):
  - Grails: `/Users/amcclain/dev/toolbox/gradlew -p /Users/amcclain/dev/toolbox bootRun` (run_in_background)
  - Webpack: `yarn --cwd /Users/amcclain/dev/toolbox/client-app startWithHoist` (run_in_background)
  - Poll `http://localhost:8080/ping` (success json) + `http://localhost:3000/datalab/` (200) before driving.
- Grails does NOT hot-reload .groovy here; a restart resets the in-memory session = LOGOUT. This work
  needs no server change, so once Grails is up it stays up (no logout). If you ever must kill :8080, use
  `lsof -ti tcp:8080 -sTCP:LISTEN | xargs kill` (LISTEN-only - a bare `lsof -ti tcp:8080` also matches
  webpack's proxy connection and kills the 3000 server too).
- Live verification needs the user logged into the browser (cannot enter credentials programmatically).
- hoist-react inline build: webpack `startWithHoist` builds from `../../hoist-react` source, so hoist-react
  edits are picked up on save (tsc-clean first: `npx tsc --noEmit` in hoist-react).
- Conventions: no em dashes in code comments (spaced hyphen); Hoist input components (switchInput) not raw
  HTML; named exports; `null` over `undefined`; keep comments free of aging peer-code pointers.

## Known follow-ons (do NOT bundle here unless asked)
- Dedicated calibration pipeline: calibration still loads 50k rows into the MOUNTED adapter, churning the
  grid under "Measuring memory". A dedicated throwaway pipeline for calibration would keep the watched grid
  clean and remove the reload-after-calibration coupling. Separate change.
- Full-replace grid re-render is not captured by the incremental Boundary-5 instrumentation (the pipeline
  reload cost is the meaningful full-replace number). Documented limitation.
- Open question from the prior session (unresolved): during "Measuring performance" the grid shows little
  visible change - confirm whether that's mere subtlety (10/5000 cells) or a real grid-update gap. Quick
  check: run with a large batchSize/breadth and watch the grid during the measured phase.
