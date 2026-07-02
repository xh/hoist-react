# Hoist Data Layer - Baseline Performance Envelope

## Status: coarse pass; zoom + adopted targets pending

This is the canonical envelope report for the current (Data Layer 1.0) hoist-react data stack,
drafted from the Phase 03 COARSE ladder pass. Numbers below are real measurements from the named
reference machine (see Methodology). Tier labels (comfortable / degraded / hard wall) are
descriptive of observed data - adopted pass/fail targets come later (03-06), after zoom
refinement and a small-heap machine pass (03-05).

Companion data: [`stats/envelope-stats.json`](./stats/envelope-stats.json) (flat, chart-ready
distilled package) and [`stats/`](./stats/README.md) (raw per-run JSON + manifest).

## Current Stack

The measured pipeline is the standard Hoist data layer (see
[`ARCHITECTURE.md`](./ARCHITECTURE.md) for the full reference):

- **Store / StoreRecord** - client-side record storage with field typing and transactions.
- **Cube** - dimensional aggregation engine; ingests record diffs (`updateDataAsync`) and
  re-aggregates connected views.
- **View / ViewResult** - a query over the Cube producing hierarchical row data.
- **GridModel + AG Grid** - the rendered grid; view rows sync to the grid via generated
  transactions (`genTransaction` -> `applyTransaction` -> deferred render/paint).

An update batch flows: **transport (HTTP poll or WebSocket push) -> Cube ingest +
re-aggregation ("engine") -> grid transaction build (genTxn) -> JS-to-AG-Grid bridge call ->
render/paint**. The harness times each stage separately.

## Methodology

- **Harness:** the framework-resident `data/measure` package (Phase 02) drives scripted
  scenarios against the Data Lab Toolbox example app - synthetic datasets with a controlled
  shape (dimensions `dim0-dim2`, mixed field types, seed 0), incremental update streams, and
  a live AG Grid.
- **Protocol:** 5 warmup + 20 measured iterations per run; medians and p95s reported; forced
  GC (`window.gc()`) with a 50 ms settle between memory samples.
- **Heap attribution:** owned-object accounting by layer (cube records, grid records, view
  rows) plus whole-heap `performance.memory` deltas (`heapMethod: performanceMemory`).
- **Environment:** Chrome launched with `--js-flags="--expose-gc" --enable-precise-memory-info`;
  measured tab foregrounded for every run (background tabs suspend rAF and poison render
  timings - such samples are flagged and the run discarded). Every checked-in run records
  `exposeGc: true` and `preciseMemory: true`.
- **Reference machine:** MacBook Pro (`Mac15,11`), Apple M3 Max, 36 GB RAM, macOS 26.5.2,
  Chrome 149.0.7827.201. A deliberately strong developer machine - the small-heap pass
  (03-05) will bound the other end.

## Memory Envelope

Retained heap after load, by dataset shape (total heap delta; per-layer attribution in the
distilled package):

| Shape (rows x fields) | Retained heap | Tier |
|-----------------------|---------------|------|
| 50,000 x 10f | 61 MB | comfortable |
| 25,000 x 20f | 277 MB | comfortable |
| 5,000 x 20f | 278 MB | comfortable |
| 50,000 x 20f | 335 MB | comfortable |
| 100,000 x 20f | 514 MB | degraded |
| 50,000 x 40f | 665 MB | degraded |
| 200,000 x 20f | 872 MB | degraded |

Readings from the coarse pass:

- **Field count is the stronger axis.** At 50k rows, going 10f -> 20f -> 40f multiplies
  retained heap ~5.5x then ~2x (61 -> 335 -> 665 MB). Row count at fixed 20f scales more
  gently (335 MB at 50k -> 872 MB at 200k).
- **There is a fixed floor.** 5k and 25k rows at 20f both retain ~277 MB - grid
  infrastructure (AG Grid internals dominate the attribution at small shapes) sets a
  baseline cost before data size matters.
- **Session accumulation is real.** Running many heavy scenarios in one long-lived page
  crashed the Chrome renderer (OOM, "Aw, Snap") after ~13 runs, though every individual
  scenario passes on a fresh page. Long-lived tabs that repeatedly load large datasets
  accumulate toward the wall - a first-class finding for Data Layer 2.0 lifecycle design.
- **Provisional tier boundary:** comfortable -> degraded observed crossing ~500 MB retained
  (first crossed at 100k x 20f and 50k x 40f). The hard wall was not reached by any single
  coarse rung on the 36 GB reference machine; the small-heap pass will locate it.

## CPU / Main-Thread Envelope

Steady and burst update streams at 50,000 rows x 20 fields, HTTP poll transport, incremental
mode. The keep-up condition: median update-to-render (engine + genTxn + bridge + render) must
fit inside the batch interval (1000 / ratePerSec).

| Batch x rate (cadence) | End-to-end median | Interval | Keeps up? |
|------------------------|-------------------|----------|-----------|
| 100b @ 2/s (steady) | 440 ms | 500 ms | yes |
| 100b @ 2/s (burst) | 483 ms | 500 ms | yes |
| 500b @ 2/s (steady/burst) | 480 / 398 ms | 500 ms | yes |
| 2000b @ 2/s (steady/burst) | 402 / 383 ms | 500 ms | yes |
| 100b @ 10/s (steady/burst) | 482 / 484 ms | 100 ms | **no** |
| 500b @ 10/s (steady) | 428 ms | 100 ms | **no** |
| 500b @ 10/s (burst) | 432 ms | 100 ms | **no** |
| 2000b @ 10/s (steady/burst) | 396 / 383 ms | 100 ms | **no** |

Readings:

- **Per-tick cost is flat, not proportional to batch size.** 100-row and 2000-row batches
  cost the same ~380-480 ms end-to-end over HTTP. The cost is dominated by fixed per-update
  work (cube ingest + whole-view re-aggregation), not by the number of changed rows. This is
  the single most consequential finding for Data Layer 2.0: small frequent updates are
  currently as expensive as large ones.
- **2/s cadences keep up; 10/s cadences do not (over HTTP poll).** At a 100 ms interval the
  ~400 ms pipeline falls behind ~4x. The engine stage is essentially all of the cost -
  genTxn ~4-5 ms, bridge and render medians near zero at these shapes.
- **Transport-coupled anomaly (open item):** the WebSocket-push anchor at the SAME batch size
  and dataset (500 rows, 50k x 20f) measured an engine median of ~89 ms vs ~423 ms for the
  equivalent HTTP rung - despite touching 20x more fields per record (breadth 20 vs 1). The
  HTTP-poll diff shape appears to trigger much broader re-aggregation than the push-stream
  diff shape. This must be understood before targets are adopted (routed to 03-05/03-06).

## Update -> Render Latency: the ~500 x 20 Anchor (BASE-03)

The anchor scenario models a real-time trading-screen workload: ~500 rows per tick, ~20
fields touched per updated record, steady 10/s cadence, WebSocket push, incremental mode.

| Stage | Median |
|-------|--------|
| Engine (cube ingest + re-aggregation) | 88.9 ms |
| genTransaction | 3.8 ms |
| Bridge (applyTransaction) | ~0 ms |
| Render/paint | ~0.1 ms |
| **End-to-end** | **92.9 ms** |

The anchor **keeps up** at 10 ticks/s (92.9 ms < 100 ms interval) - but with essentially no
headroom, and its engine p95 (451 ms) shows periodic spikes well past the frame budget. The
median meets the bar; the tail does not.

## For IT Decision-Makers

- **Per-tab memory:** a screen holding a 50k-row x 20-field aggregated dataset retains
  ~335 MB of browser heap; 200k rows retains ~870 MB. Machines fielding multiple such tabs
  need RAM budgeted accordingly, and long-lived tabs that reload large datasets repeatedly
  can accumulate toward browser OOM.
- **Update throughput:** dashboards updating 1-2 times per second stay responsive at any
  measured batch size. Streams ticking ~10 times per second currently exceed what the
  pipeline sustains over HTTP polling at these dataset sizes; push transport fares far
  better on the representative trading-screen shape (with a caveat on spikes).
- **These are current-stack (1.0) numbers** on a strong reference machine. They are the
  baseline Data Layer 2.0 is being designed to beat; a small-heap machine pass will bound
  behavior on constrained hardware.

## Open Items

- **Zoom refinement (03-05):** finer rungs around the observed boundaries (memory
  ~500 MB crossing; CPU keep-up between 2/s and 10/s), plus the named small-heap reference
  machine pass and the OOM-as-data-point policy.
- **HTTP vs push engine-cost anomaly (03-05/03-06):** explain the ~4-5x engine gap between
  transports at identical shape before adopting targets.
- **Target adoption (03-06):** convert this envelope into quantitative green/yellow/red
  targets (`TargetsConfig`) with stakeholder sign-off; verdicts then surface in the Data
  Lab UI (03-07).
