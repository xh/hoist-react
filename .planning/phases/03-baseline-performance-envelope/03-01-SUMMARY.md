---
phase: 03-baseline-performance-envelope
plan: 01
subsystem: data/measure
tags: [measurement, targets, pass-fail, base-04, pure-functions]
requires:
  - "data/measure/types.ts (Scorecard, TimingStat, HeapAttribution)"
provides:
  - "TargetsConfig (all four BASE-04 families) + MetricTarget + MetricVerdict + Verdict + Tier + EnvelopeSummary types"
  - "Provisional DEFAULT_TARGETS + PROVISIONAL_TARGET sentinel"
  - "Pure evaluateScorecard (per-scorecard) + evaluateEnvelope (envelope-level) verdict functions"
  - "computeMetricVerdict + sumStageMedians pure helpers"
affects:
  - "data/measure/index.ts (barrel export)"
tech-stack:
  added: []
  patterns:
    - "Pure, framework-free scoring module (imports only ./types) - reusable by app + Phase 6"
    - "Hybrid floor + aspiration target model (D-05/D-07) with higherIsBetter direction flip"
key-files:
  created:
    - data/measure/ScorecardVerdict.ts
  modified:
    - data/measure/types.ts
    - data/measure/index.ts
decisions:
  - "DEFAULT_TARGETS left provisional via a PROVISIONAL_TARGET (-1) sentinel; real numbers deferred to the D-08 checkpoint in plan 03-06 (no adopted numbers committed pre-checkpoint)"
  - "Small-heap ceiling (heapCeilingSmallHeapBytes) is scored per run by the caller passing that target as the heap ceiling, rather than emitting a second heap verdict from evaluateScorecard"
metrics:
  duration: ~15m
  completed: 2026-07-02
  tasks: 2
  files: 3
---

# Phase 3 Plan 01: BASE-04 Pass/Fail Scaffolding Summary

Added the BASE-04 pass/fail scaffolding to the framework-resident measurement core: a serializable
`TargetsConfig` hybrid floor+aspiration target model covering all four BASE-04 families, the
supporting verdict/tier/envelope types, a provisional (unpopulated) `DEFAULT_TARGETS`, and two pure
scoring functions - `evaluateScorecard` (per-run, per-scorecard metrics) and `evaluateEnvelope`
(ladder-level max-shape + sustained throughput).

## What Was Built

### Task 1 - Targets & verdict types (`data/measure/types.ts`)
- `Verdict` ('pass'|'fail') and `Tier` ('comfortable'|'degraded'|'hardWall', D-02 green/yellow/red).
- `MetricTarget` - hybrid `floor` (regression guard) + `aspiration` (business goal), `unit`
  ('ms'|'bytes'|'count'), and optional `higherIsBetter` to flip pass/tier direction.
- `TargetsConfig` - all six targets across the four BASE-04 families, all REQUIRED:
  - PER-SCORECARD (lower-is-better): `updateRenderLatencyMs`, `enginePcpuMs`,
    `heapCeilingReferenceBytes`, `heapCeilingSmallHeapBytes`.
  - ENVELOPE-LEVEL (higherIsBetter): `maxRecordsXFields`, `sustainedThroughput`.
- `MetricVerdict` (metric/value/floor/aspiration/verdict/meetsAspiration/tier) and `EnvelopeSummary`
  (`maxComfortableRecordsXFields`, `maxSustainedThroughput`) whole-ladder boundary facts.
- `PROVISIONAL_TARGET` (-1) sentinel + provisional `DEFAULT_TARGETS`, JSDoc-marked "not adopted -
  real numbers adopted at the D-08 checkpoint in 03-06."

### Task 2 - Verdict functions (`data/measure/ScorecardVerdict.ts` + barrel)
- `evaluateScorecard(sc, targets)` - per-scorecard path, emits verdicts only for the four
  per-scorecard metrics (skips a metric when its backing Scorecard stat is null); never emits the
  envelope-level metrics.
- `evaluateEnvelope(summary, targets)` - envelope-level path, emits exactly the two higher-is-better
  verdicts against whole-ladder boundary facts.
- Shared pure helpers `computeMetricVerdict` (honors `higherIsBetter` direction) and
  `sumStageMedians` (end-to-end update->render latency = sum of the four stage medians).
- Module imports only from `./types` (no `@xh/hoist` / MobX / fetch); barrel-exported from
  `data/measure/index.ts` for app (03-02/03-07) and Phase 6 reuse.

## Verification

- `npx tsc --noEmit` - exits 0.
- `yarn lint:code` - exits 0 (0 errors). Remaining tsdoc `<`/`>` operator-in-prose warnings match
  the pre-existing pattern already tolerated across the `data/measure` module.
- Purity: `grep` confirms `ScorecardVerdict.ts` imports only from `./types`.
- `TargetsConfig` covers all four BASE-04 families; `evaluateEnvelope` covers the two envelope-level
  metrics; `evaluateScorecard` covers only the four per-scorecard metrics.

## Deviations from Plan

### Environment fix (Rule 3 - blocking issue)

**1. [Rule 3 - Blocking] Symlinked parent repo `node_modules` into the worktree**
- **Found during:** Task 1 commit - the husky `pre-commit` hook failed with
  "Command lint-staged not found" because the git worktree had no local `node_modules`.
- **Cause:** Node module resolution walks up to the parent repo's `node_modules` (so `tsc`/`eslint`
  ran fine), but yarn's binary lookup for the husky hook only checks the local
  `node_modules/.bin`, which did not exist in the worktree.
- **Fix:** Created a symlink `node_modules -> /Users/amcclain/dev/hoist-react/node_modules` (same
  repo, same lockfile, identical deps). This is a worktree environment gap, not a
  referenced-package install, so it is not subject to the package-legitimacy checkpoint. Hooks then
  ran normally (no `--no-verify` used). The symlink is removed before returning; it is a local dev
  convenience only and was never staged (files are staged individually, never `git add .`).

No other deviations - the plan executed as written. No architectural changes; no auth gates.

## Known Stubs

`DEFAULT_TARGETS` is an intentional, documented stub: every `floor`/`aspiration` is the
`PROVISIONAL_TARGET` (-1) sentinel. This is by design per the plan - real target numbers are adopted
at the D-08 checkpoint in plan 03-06. Not to be treated as final.

## Threat Flags

None. Pure additive framework types + two pure functions; no I/O, network, untrusted input, or new
endpoints. The provisional `DEFAULT_TARGETS` commits no client-derived numbers and contains no
private client names (open-repo rule respected).

## Self-Check: PASSED

- Files present: `data/measure/types.ts`, `data/measure/ScorecardVerdict.ts`, `data/measure/index.ts`.
- Commits present: `a51347784` (Task 1), `41ed71af0` (Task 2).
- Content assertions passed: `TargetsConfig`, `EnvelopeSummary`, `evaluateScorecard`,
  `evaluateEnvelope`, and the `ScorecardVerdict` barrel export all confirmed present.
