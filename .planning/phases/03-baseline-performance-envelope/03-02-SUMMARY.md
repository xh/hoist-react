---
phase: 03-baseline-performance-envelope
plan: 02
subsystem: ui
tags: [datalab, toolbox, measurement-harness, export, import, filechooser, downloadBlob, envelope-stats]

# Dependency graph
requires:
  - phase: 02-measurement-harness
    provides: DataLabModel/DataLabPanel, RunResult/Scorecard/EnvMetadata types, savedRuns localStorage history
provides:
  - Run export (single + all) as JSON via framework downloadBlob
  - Distilled, flat, chart-ready envelope-stats export (D-12) - the single source of the distilled schema
  - Validated run import (JSON.parse + RunResult shape guard) via a FileChooser, preserving EnvMetadata
affects: [03-03, 03-04, 03-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Framework downloadBlob for all file exports (no hand-rolled Blob/anchor dance)"
    - "Untrusted-input shape validation on JSON import before it enters app state"
    - "Distilled-stats schema defined as TypeScript interfaces in the exporter as the single source"

key-files:
  created: []
  modified:
    - ../toolbox/client-app/src/examples/datalab/DataLabModel.ts
    - ../toolbox/client-app/src/examples/datalab/DataLabPanel.ts

key-decisions:
  - "Export All emits an array of RunResult (not SavedRun) so Export All output round-trips through import"
  - "Distilled schema encoded as exported TS interfaces (DistilledStats etc.) in DataLabModel - the single source 03-04 saves verbatim"
  - "Memory tiers derived from provisional absolute heap thresholds (500 MB / 1.2 GB), labeled descriptive-not-target"
  - "referenceMachine sourced from EnvMetadata.userAgent (no dedicated machine-name field exists yet)"
  - "Per-run export wired to the Run A comparison selection; FileChooser lives on the model as a @managed property"

patterns-established:
  - "downloadJson helper: JSON.stringify(payload, null, 2) -> Blob -> downloadBlob"
  - "isValidRunResult / isValidStage / isValidHeap pure guards reject malformed import entries with a toast"

requirements-completed: [BASE-01, BASE-02, BASE-03]

# Metrics
duration: 20min
completed: 2026-07-02
---

# Phase 3 Plan 02: Data Lab Run Capture + Stats Package Summary

**Run export (single/all), a distilled chart-ready envelope-stats export matching the 03-04 schema, and a shape-validated run import via FileChooser - added to the Toolbox Data Lab app.**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-07-02
- **Tasks:** 2
- **Files modified:** 2 (both in the Toolbox repo)

## Accomplishments
- `exportRun` / `exportSelectedRun` / `exportAllRuns` download saved runs as JSON via the framework `downloadBlob` util.
- `exportDistilledStats` builds and downloads the flat, chart-ready envelope-stats package (D-12): `memorySeries` with descriptive tiers, `cpuSeries` with `batchIntervalMs` + `keepsUp`, an `anchorBatch` stage breakdown, and read-off `tierBoundaries` - encoded as exported TS interfaces that are the single source of the distilled schema 03-04 saves verbatim.
- `importRunsAsync` parses run JSON (JSON.parse in a try/catch, never eval), accepts a single RunResult or an Export-All array, shape-validates every entry against the RunResult contract before it enters `savedRuns`, and preserves `EnvMetadata` (Pitfall 6). Malformed entries are rejected with a toast so a bad file cannot crash the comparison grid.
- UI controls: Export All / Export Stats / per-run Export in the comparison toolbar; an Import Runs panel with a single-file `.json` `fileChooser` + Import button.

## Task Commits

Each task was committed atomically in the Toolbox repo (branch `data2`):

1. **Task 1: Run + distilled-stats export** - `1f4ab975` (feat)
2. **Task 2: Validated run import via FileChooser** - `7b78b416` (feat)

_The SUMMARY/state metadata commit lands in the hoist-react repo (this plan's code lives entirely in Toolbox)._

## Files Created/Modified
- `../toolbox/client-app/src/examples/datalab/DataLabModel.ts` - Added `downloadBlob` import, the `DistilledStats` schema interfaces + tier/anchor constants and helpers, export methods (`exportRun`/`exportSelectedRun`/`exportAllRuns`/`exportDistilledStats` + `buildDistilledStats`/`buildMemorySeries`/`buildCpuSeries`/`buildAnchorBatch`/`buildTierBoundaries`/`downloadJson`), the untrusted-input guards (`isValidRunResult`/`isValidStage`/`isValidHeap`), the import methods (`importRunsAsync`/`importSelectedFileAsync`/`addImportedRuns`), and a `@managed importChooserModel: FileChooserModel`.
- `../toolbox/client-app/src/examples/datalab/DataLabPanel.ts` - Added `fileChooser` import, Export All / Export Stats / per-run Export controls in the comparison toolbar, and an `importPanel` factory (fileChooser + Import button).

## Decisions Made
- **Export All emits `savedRuns.map(r => r.result)`** (an array of RunResult, not SavedRun) so the Export All file re-imports cleanly through the same validated path.
- **Distilled schema is code, not just a JSON doc:** the `DistilledStats` / `MemorySeriesRow` / `CpuSeriesRow` / `AnchorBatch` / `TierBoundary` interfaces in DataLabModel are the single source; 03-04 saves the exporter output verbatim.
- **Memory tiers** use provisional absolute thresholds (`comfortable < 500 MB`, `degraded < 1.2 GB`, else `hardWall`), documented in-code as descriptive of observed data, not adopted pass/fail targets (targets are proposed later in 03-06).
- **`referenceMachine`** is the most-recent run's `EnvMetadata.userAgent` - there is no dedicated machine-name field on EnvMetadata yet.
- **Per-run export** exports whichever run is selected as Run A (resolved by label), reusing the existing comparison selection UI.

## Deviations from Plan

None - plan executed exactly as written. Both tasks used only existing `@xh/hoist/data` and `@xh/hoist/utils/js` exports and the sanctioned `FileChooser`/`downloadBlob` surfaces; no new dependencies, no architectural changes.

## Issues Encountered
None. The Toolbox `tsconfig.json` `paths` block is enabled (maps `@xh/hoist/*` to the local `../../hoist-react` `data2` checkout), so `yarn lint:types` and the pre-commit `tsc` hook resolve `downloadBlob` and the measure types against local source - both commits passed the standard hooks (no `--no-verify`).

## Verification
- Toolbox `yarn lint:types` (tsc) exits 0 and `yarn lint:code` (eslint) exits 0 after each task.
- No raw HTML (`<button` / `document.createElement`) and no `eval(` in the edited files.
- No em dashes in the edited files.
- Acceptance greps confirm: `downloadBlob(` + all export/import methods present; distilled output carries `referenceMachine`, `tierBoundaries`, per-row `tier`, `batchIntervalMs`, `keepsUp`; `fileChooser` imported and used in the panel; Export All + Export Stats buttons wired to model methods.
- Live functional spot-check of the import-rejects-malformed-JSON path and an actual browser download is deferred to a running Toolbox instance (non-interactive env); the shape guard is exercised by the pure `isValidRunResult` logic.

## Next Phase Readiness
- The capture path is ready: 03-03's coarse sweep can export runs to files, and 03-04 can save `exportDistilledStats` output verbatim as `docs/planning/data2/stats/envelope-stats.json` against the schema defined here.
- Cross-machine (small-heap) comparison is unblocked - runs export as files and re-import with EnvMetadata preserved.

## Self-Check: PASSED
- FOUND: `../toolbox/client-app/src/examples/datalab/DataLabModel.ts` (modified, committed `1f4ab975` + `7b78b416`)
- FOUND: `../toolbox/client-app/src/examples/datalab/DataLabPanel.ts` (modified, committed `1f4ab975` + `7b78b416`)
- FOUND: commit `1f4ab975` in Toolbox `data2`
- FOUND: commit `7b78b416` in Toolbox `data2`

---
*Phase: 03-baseline-performance-envelope*
*Completed: 2026-07-02*
