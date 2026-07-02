# Data Layer 2.0 - Baseline Performance Envelope: Raw Run Data

Checked-in raw `RunResult` JSON from the Phase 03 COARSE ladder pass, captured live via the
Data Lab Toolbox example app (Claude-driven, human-verified - D-13). Each file is one complete
measured run exported through the Data Lab's run-export path (03-02): the input `ScenarioConfig`
plus its `Scorecard`, `EnvMetadata`, and harness overhead. Files are re-importable into the Data
Lab via its Import Runs control for cross-machine side-by-side comparison.

## Reference machine

All runs in this directory were produced on the named reference machine:

- **Machine:** MacBook Pro (`Mac15,11`), Apple M3 Max, 36 GB RAM
- **OS:** macOS 26.5.2
- **Browser:** Chrome 149.0.7827.201, launched with `--js-flags="--expose-gc" --enable-precise-memory-info`
- **Env check:** every run's `EnvMetadata` records `exposeGc: true`, `preciseMemory: true`,
  `heapMethod: performanceMemory`; the measured tab was kept foregrounded (no run in this set
  carries a `renderSuspect` sample - tainted runs were discarded and re-run)
- **App stack:** Toolbox Data Lab (`data2` branch) with hoist-react `data2` inlined via
  `startWithHoist`; Grails test-data API on `:8080`, webpack dev server on `:3000`
- **Captured:** 2026-07-02 (times in filenames are local, US/Eastern offset -04:00)

## Protocol and shared knobs

All runs used `DEFAULT_PROTOCOL` (5 warmup iterations, 20 measured iterations, 50 ms GC settle)
and the shared dataset shape: dimensions `['dim0','dim1','dim2']`, field-type mix
`{number: 5, string: 3, date: 1, object: 1}`, seed 0, `grid.useVirtualColumns: true`.
Memory rungs measure `{memory: true, performance: false}`; CPU rungs and the anchor measure
`{memory: false, performance: true}`.

## Files

### Memory ladder (row-count arm, 20 fields)

| File | Scenario |
|------|----------|
| `datalab-run-mem-5000-x-20f-*.json` | 5,000 leaf rows x 20 fields |
| `datalab-run-mem-25000-x-20f-*.json` | 25,000 leaf rows x 20 fields |
| `datalab-run-mem-50000-x-20f-*.json` | 50,000 leaf rows x 20 fields |
| `datalab-run-mem-100000-x-20f-*.json` | 100,000 leaf rows x 20 fields |
| `datalab-run-mem-200000-x-20f-*.json` | 200,000 leaf rows x 20 fields |

### Memory ladder (field-count arm, 50,000 rows)

| File | Scenario |
|------|----------|
| `datalab-run-mem-50000-x-10f-*.json` | 50,000 leaf rows x 10 fields |
| `datalab-run-mem-50000-x-40f-*.json` | 50,000 leaf rows x 40 fields |

### CPU ladder (50,000 rows x 20 fields, HTTP transport, incremental updates)

`CPU <batchSize>b <ratePerSec>/s <cadence>` - batch size x update rate x cadence grid:

| File | Batch | Rate | Cadence |
|------|-------|------|---------|
| `datalab-run-cpu-100b-2-s-steady-*.json` | 100 | 2/s | steady |
| `datalab-run-cpu-100b-2-s-burst-*.json` | 100 | 2/s | burst |
| `datalab-run-cpu-100b-10-s-steady-*.json` | 100 | 10/s | steady |
| `datalab-run-cpu-100b-10-s-burst-*.json` | 100 | 10/s | burst |
| `datalab-run-cpu-500b-2-s-steady-*.json` | 500 | 2/s | steady |
| `datalab-run-cpu-500b-2-s-burst-*.json` | 500 | 2/s | burst |
| `datalab-run-cpu-500b-10-s-steady-*.json` | 500 | 10/s | steady |
| `datalab-run-cpu-500b-10-s-burst-*.json` | 500 | 10/s | burst |
| `datalab-run-cpu-2000b-2-s-steady-*.json` | 2000 | 2/s | steady |
| `datalab-run-cpu-2000b-2-s-burst-*.json` | 2000 | 2/s | burst |
| `datalab-run-cpu-2000b-10-s-steady-*.json` | 2000 | 10/s | steady |
| `datalab-run-cpu-2000b-10-s-burst-*.json` | 2000 | 10/s | burst |

### BASE-03 anchor

| File | Scenario |
|------|----------|
| `datalab-run-anchor-500x20-steady-*.json` | 500-row batches x breadth 20 x 20 fields, steady, webSocket transport, incremental |

### Distilled package

`envelope-stats.json` - the flat, chart-ready envelope-stats package (D-12) distilled from
exactly the 20 runs above via the Data Lab's Export Stats path. Single source for design-tool
consumption; 03-04 saves this output verbatim.

## Capture notes

- **Renderer crash as envelope data:** running the full ladder in a single page session crashed
  the Chrome renderer ("Aw, Snap") partway through the CPU ladder (during `CPU 500b 2/s burst`),
  after 12 completed runs. The same rung completed cleanly on a fresh page, so the crash reflects
  cross-run heap accumulation in a long-lived session, not a single-scenario wall. Remaining CPU
  rungs were captured one-per-fresh-page-load to isolate per-run heap.
- **WebSocket stream starvation (fixed):** the anchor rung initially hung because the server-side
  push stream runs a fixed `durationSec` window per `streamStart`, and the anchor's heavy shape
  under-delivered diffs within it. The Data Lab's `WebSocketIngestAdapter` now re-issues
  `streamStart` when starved (capped top-up); see the Toolbox `data2` commit trail for 03-03.
- **Anchor discard/re-run:** one anchor run carried a single capped (>= 1000 ms) render sample
  and was discarded per the renderSuspect rule; the checked-in re-run is clean.
