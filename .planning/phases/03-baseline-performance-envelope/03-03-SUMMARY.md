---
phase: 03-baseline-performance-envelope
plan: 03
subsystem: testing
tags: [measurement, chrome-devtools-mcp, viewmanager, websocket, performance, heap]

requires:
  - phase: 03-baseline-performance-envelope (plan 03-02)
    provides: Data Lab run export path (exportRun / exportDistilledStats)
  - phase: 02-measurement-harness
    provides: MeasurementHarness, ingest adapters, Data Lab app
provides:
  - chrome-devtools-mcp@1.4.0 registered (pinned) in .mcp.json, enabled locally
  - 20 named ladder scenario profiles saved as ViewManager views (7 memory, 12 CPU, 1 anchor)
  - Coarse ladder pass on the named reference machine - 20 clean raw run JSONs checked in
  - docs/planning/data2/stats/ manifest README naming the reference machine
  - envelope-stats.json distilled package staged on disk (committed by 03-04)
affects: [03-04, 03-05, 03-06, baseline, targets]

tech-stack:
  added: [chrome-devtools-mcp@1.4.0 (MCP registration only)]
  patterns: ["one measurement run per fresh page load for heavy scenarios", "WS push stream starvation top-up (re-issue streamStart while waiting)"]

key-files:
  created:
    - docs/planning/data2/stats/README.md
    - docs/planning/data2/stats/datalab-run-*.json (20 files)
  modified:
    - .mcp.json
    - ../toolbox/client-app/src/examples/datalab/DataLabModel.ts
    - ../toolbox/client-app/src/examples/datalab/DataLabPanel.ts
    - ../toolbox/client-app/src/examples/datalab/ingest/WebSocketIngestAdapter.ts

key-decisions:
  - "Toolbox branch confirmed as data2 (renamed from data2-research); stale refs updated across planning docs"
  - "chrome-devtools-mcp@1.4.0 approved at human gate; tools load on next session restart - sweep driven via claude-in-chrome instead (DevTools traces are corroborating-only)"
  - "Exposed ratePerSec as an editable scenario knob (was pinned at default) - required to express the CPU ladder's 2/s arm"
  - "Ran heavy CPU rungs one-per-fresh-page-load after a renderer crash from cross-run heap accumulation"

patterns-established:
  - "Ladder profiles authored programmatically via ViewManagerModel.saveAsAsync with {formValues} payloads"
  - "renderSuspect discard rule enforced: tainted runs discarded and re-run (1 anchor re-run)"

requirements-completed: [BASE-01, BASE-02, BASE-03]

duration: ~150min (interactive, includes 20 live measurement runs)
completed: 2026-07-02
---

# Plan 03-03 Summary

**Sweep environment stood up (MCP + servers + flagged Chrome) and the full 20-rung coarse ladder captured clean on the named reference machine, with raw runs + manifest checked in.**

## Accomplishments
- chrome-devtools-mcp@1.4.0 registered (pinned, human-verified provenance: official ChromeDevTools org) and enabled locally; Toolbox branch confirmed `data2` and stale `data2-research` refs updated.
- 20 named ladder profiles saved via scenario ViewManager (memory row-count arm 5k-200k @ 20f, field-count arm 10f/40f @ 50k, CPU batch x rate x cadence grid, BASE-03 anchor).
- Full coarse pass captured with zero renderSuspect samples: EnvMetadata `exposeGc: true` / `preciseMemory: true` on every run. All raw JSONs exported via the 03-02 path and committed with a manifest naming the reference machine (MacBook Pro Mac15,11, M3 Max, 36GB, macOS 26.5.2, Chrome 149).

## Task Commits
1. **Task 1: MCP registration + branch confirm** - `62f588289` (chore, hoist-react)
2. **Task 2 deviation: ratePerSec scenario knob** - `9fa6b9b2` (feat, toolbox)
3. **Task 3 deviation: WS stream starvation top-up** - `88a571f5` (fix, toolbox)
4. **Task 3: raw run data + manifest** - (docs, hoist-react - commit following this summary)

## Deviations
- **ratePerSec knob (toolbox `9fa6b9b2`):** the CPU ladder varies update rate but `ratePerSec` was pinned to the scenario default in the projection - added form field + panel input.
- **WS starvation top-up (toolbox `88a571f5`):** the server push stream runs a fixed `durationSec` window per `streamStart`; the anchor's heavy shape under-delivered diffs and hung the harness at iteration 3 (reproduced twice). Client adapter now re-issues `streamStart` while starved (capped at 10).
- **Renderer crash mid-sweep:** one-page-session sweep crashed Chrome's renderer after 12 runs (during `CPU 500b 2/s burst`); the rung passed solo. Remaining heavy rungs run one-per-fresh-page-load. Recorded as envelope data in the stats README.
- **Profile-save race:** rapid `saveAsAsync` calls surfaced server-side optimistic-lock errors while all blobs were actually created ("Unable to create scenario" was phantom); resolved by refresh + verify, no code change.

## Observations for 03-04/03-05 analysis
- Memory floor: `Mem 5000` and `Mem 25000` both show ~277MB total delta (fixed overhead dominates small datasets); 50k x 20f = 335MB, 200k x 20f = 872MB; field count is the stronger driver (10f = 61MB, 40f = 665MB @ 50k).
- CPU engine medians are strikingly flat (~380-480ms) across ALL HTTP batch/rate combos - consistent with whole-cube re-aggregation dominating per-batch cost; the webSocket anchor's engine median is far lower (88.9ms). Worth interrogating before targets are set.

## Environment notes
- chrome-devtools-mcp tools require a Claude Code session restart to load; not needed for this plan (claude-in-chrome drove the sweep; DevTools traces are corroborating-only per plan).
- Grails API + webpack dev server left running in background for 03-04/03-05.
