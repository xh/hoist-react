---
phase: 02-measurement-harness
plan: 03
subsystem: data
tags: [measurement, harness, instrumentation, telemetry, performance-now, boundary-5, otel]

# Dependency graph
requires:
  - phase: 02-measurement-harness
    plan: 01
    provides: measure barrel + Scorecard compute/bridgeCall/render fields the timing components feed
provides:
  - measureBoundary() generic boundary timing helper (runner().span() structure + performance.now() number)
  - measureGridSync() Boundary-5 compute/bridge/deferred-render split (HARN-05)
  - measureOverhead() null-scenario median overhead probe (HARN-03 bounded/documented overhead)
  - GridSyncTiming result type (computeMs/bridgeCallMs/renderMs)
  - injected-callable contract (genTransaction + applyTransaction) decoupling the harness from GridModel
affects: [02-05, 02-06, measurement-orchestrator, toolbox-harness-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Spans for STRUCTURE, performance.now() for the NUMBER - Span duration is Date.now()/ms, too coarse for sub-ms compute (Pitfall 1)"
    - "Boundary-5 split: compute (genTransaction) / bridge (applyTransaction) / deferred render (one frame later)"
    - "Deferred-render capture via requestPostAnimationFrame with requestAnimationFrame fallback (Pitfall 4)"
    - "Injected callables (genTransaction/applyTransaction) keep instrumentation decoupled from GridModel internals"

key-files:
  created:
    - data/measure/BoundaryInstrumentation.ts
  modified:
    - data/measure/index.ts

key-decisions:
  - "Span timing tag carries the precise performance.now() elapsed; the span's own Date.now() duration is never read for results"
  - "Render captured by awaiting one frame after applyTransaction (requestPostAnimationFrame preferred, requestAnimationFrame fallback) so bridge cost is not undercounted"
  - "measureOverhead uses a simple no-library median (sort + middle) over null-iteration samples"
  - "genTransaction/applyTransaction injected - module does NOT import GridModel; orchestrator (02-05) supplies the live grid's genTransaction + agApi.applyTransaction"

requirements-completed: [HARN-03, HARN-05]

# Metrics
duration: 4min
completed: 2026-06-29
---

# Phase 2 Plan 03: Boundary Instrumentation Layer Summary

**Timing helpers that wrap the six Phase-1 boundaries in `runner().span()` for OTel trace structure while capturing the load-bearing elapsed numbers with `performance.now()`, plus the Boundary-5 compute/bridge/deferred-render split and a null-scenario overhead probe.**

## Performance

- **Duration:** ~4 min
- **Tasks:** 2
- **Files modified:** 2 (1 created, 1 barrel edit)

## Accomplishments
- `measureBoundary<T>(host, name, fn)` - opens an `xhDataLab.{name}` span via `host.runner().span().run()` for trace structure/correlation (bubbles into Hoist OTel/`TraceService` per HARN-03) while bracketing `fn()` with `performance.now()`; attaches the precise elapsed value as the `xhDataLab.elapsedMs` span tag and returns `{result, elapsedMs}`.
- `measureGridSync(host, {genTransaction, applyTransaction, rowCount})` - the HARN-05 split: times `computeMs` (genTransaction), `bridgeCallMs` (applyTransaction), and `renderMs` (deferred render captured by awaiting one frame), under a single `xhDataLab.gridSync` span; returns all three.
- `measureOverhead(host, iterations)` - runs the instrumentation path around an empty fn N times and returns the median per-iteration overhead in ms (HARN-03 "bounded, documented overhead").
- Documented the six Phase-1 boundaries and the spans-for-structure / `performance.now()`-for-the-number rule, with the Pitfall-1 rationale (Hoist `Span.duration` is `Date.now()`/ms).

## Confirmed Hoist runner/span API (grounded via hoist-react MCP/CLI tools)

- `host.runner(ctx?)` returns a `Runner` (HoistBase method); `runner` not deprecated `withSpan`.
- `Runner.span(name | SpanConfig)` is a chainable builder method; `.run(fn)` is the terminal.
- `run(fn: (ctx: CallContext) => Promise<T>)` - the callback receives a **`CallContext`**, NOT a raw `Span`. The span is `ctx.span` (`Span | null`; non-null even when tracing is disabled, just unsampled).
- `Span.setTag(key, value)` / `Span.setTags(obj)` confirmed; `Span.duration = endTime - startTime` is `Date.now()`-based (`core/Span.ts`), hence avoided for the measured number.
- Used `ctx.span?.setTag(...)` / `?.setTags(...)` for null-safety.

## Helper signatures (for orchestrator 02-05)

```ts
measureBoundary<T>(host: HoistBase, name: string, fn: () => Promise<T> | T): Promise<{result: T; elapsedMs: number}>
measureGridSync(host: HoistBase, args: {genTransaction: () => unknown; applyTransaction: (txn: unknown) => void; rowCount: number}): Promise<GridSyncTiming>
measureOverhead(host: HoistBase, iterations: number): Promise<number>
interface GridSyncTiming { computeMs: number; bridgeCallMs: number; renderMs: number }
```

## Injected-callable contract the orchestrator must satisfy

`measureGridSync` does NOT import `GridModel`. The orchestrator (02-05) supplies:
- `genTransaction: () => unknown` - the live grid's transaction builder (Hoist-side compute).
- `applyTransaction: (txn) => void` - bound to the live `agApi.applyTransaction` (the JS-to-AG-Grid bridge call).
- `rowCount: number` - for span tagging only.

The three returned values map directly onto the `Scorecard.compute` / `bridgeCall` / `render` `TimingStat` fields defined in 02-01.

## Task Commits

1. **Task 1: Generic boundary timing helper (HARN-03)** - `6ca2ccd61` (feat) - created `BoundaryInstrumentation.ts` with `measureBoundary`, `measureGridSync`, `measureOverhead`, six-boundary docs, span-vs-timer rationale.
2. **Task 2: Barrel export (HARN-05/HARN-03)** - `df20f7a47` (feat) - added `export * from './BoundaryInstrumentation'` to `data/measure/index.ts`.

## Deviations from Plan

None affecting scope or behavior. Two minor lint-driven adjustments while authoring (Rule 1, in-file only):
- Used `window.requestAnimationFrame(...)` rather than the bare global to satisfy the project's `no-undef` ESLint rule (matches the existing `ScrollerModel.ts` usage pattern). The `requestPostAnimationFrame` feature-detect fallback is preserved.
- Reworded three JSDoc `->` arrows to "to" and one `<=` to prose to clear `tsdoc/syntax` `>`-escape warnings (same wording convention 02-01 adopted).

## Out-of-Scope Observations (not touched)

- `yarn lint:code` flagged a pre-existing error in `data/measure/HeapAttribution.ts` (`'HeapAttribution' is defined but never used`) - that file belongs to the concurrent plan 02-04; left untouched per scope boundary. My files lint clean.

## Self-Check: PASSED

- `data/measure/BoundaryInstrumentation.ts` present (created).
- `data/measure/index.ts` contains the new `export * from './BoundaryInstrumentation';` (added without removing 02-04's `HeapAttribution` line).
- Commits `6ca2ccd61` and `df20f7a47` exist in git history.
- `npx tsc --noEmit` passes; `npx eslint data/measure/BoundaryInstrumentation.ts` clean.

---
*Phase: 02-measurement-harness*
*Completed: 2026-06-29*
