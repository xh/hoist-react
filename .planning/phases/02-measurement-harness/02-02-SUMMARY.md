---
phase: 02-measurement-harness
plan: 02
subsystem: api
tags: [grails, groovy, toolbox, websocket, datalab, seeded-generation, hoist-core]

# Dependency graph
requires:
  - phase: 01-current-state-inventory
    provides: "Invariant two-op ingest contract (snapshot -> Cube.loadDataAsync, diff -> Cube.updateDataAsync); transport-agnostic seam; WebSocket push as first-class transport"
provides:
  - "Server-side, out-of-process test-data API in Toolbox's Grails layer (new `datalab` namespace)"
  - "Seeded, shape-parameterized snapshot generator (HARN-01): leaf count, field count, field-type mix incl. object-valued fields, dimension cardinality"
  - "Deterministic update-batch generator (HARN-02): pattern, breadth, batch size, iteration cursor"
  - "HTTP snapshot/diff endpoints + WebSocket push stream, both carrying an identical batch shape"
  - "Documented endpoint URLs, request params, WS topic, start/stop API, batch JSON shape, and determinism guarantee for the 02-05 client ingest adapter"
affects: [02-05-client-ingest-adapter, 03-baseline-measurement, candidate-evaluation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Seeded pure-function server generation: data is a deterministic function of (seed, shape params)"
    - "Per-connection WS push streams with explicit start/stop control + single base timer ticking active streams at per-stream rate"
    - "Transport-parity: HTTP diff and WS push emit the identical batch shape, resolving to one client ingest contract"

key-files:
  created:
    - "../toolbox/grails-app/services/io/xh/toolbox/datalab/DataLabService.groovy"
    - "../toolbox/grails-app/services/io/xh/toolbox/datalab/DataLabPushService.groovy"
    - "../toolbox/grails-app/controllers/io/xh/toolbox/datalab/DataLabController.groovy"
  modified: []

key-decisions:
  - "Toolbox has no UrlMappings.groovy; routes are wired via Grails default `/$controller/$action` convention, matching every existing Toolbox controller. No new routing mechanism introduced."
  - "DataLabPushService.MILLISECONDS does not exist in hoist-core DateTimeUtils; timer interval passed in ms with the default intervalUnits=1."
  - "Added streamStart/streamStop control actions on DataLabController so the browser harness can drive the WS push lifecycle (mirrors MockUpdatesController subscribe/unsubscribe)."

patterns-established:
  - "Seeded deterministic generator as a Grails service decoupled from the portfolio demo (isolated namespace, no shared mutable state)"
  - "WS push lifecycle via channelKey-keyed streams + culling of closed channels (extends MockUpdatesService precedent)"

requirements-completed: [HARN-01, HARN-02]

# Metrics
duration: 18min
completed: 2026-06-29
---

# Phase 2 Plan 02: Server-side DataLab Test-Data API Summary

**Seeded, shape-parameterized Grails test-data API (new Toolbox `datalab` namespace) serving deterministic dataset snapshots and update batches over both HTTP diff and WebSocket push, against the invariant Cube/Store ingest contract.**

## Performance

- **Duration:** ~18 min
- **Started:** 2026-06-29
- **Completed:** 2026-06-29
- **Tasks:** 3
- **Files modified:** 3 created (Toolbox repo)

## Accomplishments
- `DataLabService` generates seeded leaf-row snapshots whose leaf count, field count, field-type mix (number / string / date / **object-valued**), and dimension cardinality are all driven by request params - a pure function of (seed, params) for byte-identical reproducibility (HARN-01).
- `DataLabService.generateBatch` produces deterministic per-iteration update batches honoring all four update patterns, with configurable breadth and batch size (HARN-02).
- `DataLabController` exposes HTTP `snapshot` and `diff` endpoints plus `streamStart`/`streamStop` control actions.
- `DataLabPushService` streams update batches over `webSocketService` to a dedicated harness topic with explicit per-connection start/stop, auto-rate, auto-expiry, and closed-channel culling (HARN-02 WS transport).
- HTTP diff and WS push emit the **identical** batch shape, so the 02-05 client ingest adapter resolves either to one ingest contract.

## Task Commits

Committed atomically in the **Toolbox** repo (`/Users/amcclain/dev/toolbox`, branch `data2` (renamed from `data2`)):

1. **Task 1: Seeded shape-parameterized generator (HARN-01)** - `16073bbf` (feat)
2. **Task 2: HTTP snapshot/diff controller (HARN-02 HTTP)** - `667cab3a` (feat)
3. **Task 3: WebSocket push service + stream control actions (HARN-02 WS)** - `68c19c81` (feat)

Plan/doc metadata committed separately in the **hoist-react** repo.

## Files Created
- `../toolbox/.../datalab/DataLabService.groovy` - Seeded snapshot + update-batch generator, pure function of (seed, params).
- `../toolbox/.../datalab/DataLabController.groovy` - HTTP `snapshot`/`diff` endpoints + `streamStart`/`streamStop` controls.
- `../toolbox/.../datalab/DataLabPushService.groovy` - WS push of update batches per scenario knobs to a dedicated topic.

## API Contract (for the 02-05 client ingest adapter)

### HTTP endpoints (Grails convention routing)
- `GET /dataLab/snapshot` - returns a JSON **array** of leaf-row objects.
- `GET /dataLab/diff` - returns one update **batch** object (see shape below).
- `POST/GET /dataLab/streamStart` - begins a WS push stream for the caller's `channelKey`; returns `{success: true}`.
- `POST/GET /dataLab/streamStop` - stops the caller's stream; returns `{success: true}`.

### Request params

Shape params (snapshot + diff + stream):
- `leafRowCount` (int, default 1000) - number of leaf rows.
- `fieldCount` (int, default 10) - number of value fields per row (excludes `id` + dimensions).
- `fieldTypeMix` (map of weights: `number`/`string`/`date`/`object`, default `[number:5, string:3, date:1, object:1]`) - relative type distribution; any positive-weight type is guaranteed at least one field, so object-valued fields are never dropped.
- `dimensions` (int, default 3) - number of categorical dimension fields (bounded cardinality).
- `dimCardinality` (int, default 8) - cardinality per dimension.
- `seed` (long, default 0) - RNG seed.

Update params (diff + stream, in addition to shape params):
- `pattern` (string, default `steadyTrickle`) - `steadyTrickle` | `periodicBurst` | `broadReplace` | `targetedNarrow`.
- `breadth` (int, default 1) - value fields changed per updated row.
- `batchSize` (int, default 10) - base rows changed per batch.
- `iteration` (int, default 0) - monotonic cursor; successive polls return successive deterministic batches.

Stream-only params (streamStart):
- `channelKey` (string, required) - the caller's WebSocket connection key.
- `ratePerSec` (number, default 10) - batches pushed per second.
- `durationSec` (int, default 0) - auto-stop after N seconds; `<=0` runs until `streamStop`.

### Leaf-row shape (snapshot array element)
```json
{
  "id": "leaf-0",
  "dim0": "Alpha-3", "dim1": "Echo-1", "dim2": "Mike-7",
  "field0": 1234.56,
  "field1": "lorem ipsum",
  "field2": "2024-05-13",
  "field3": {"code": "Bravo-2", "score": 88.41, "flag": true}
}
```
- `id` is `"leaf-{index}"`, stable across regeneration - the diff key.
- Dimension fields are `dim0..dimN`; value fields are `field0..fieldM`. Object-valued fields are nested maps.

### Update-batch shape (diff response and each WS push payload)
```json
{ "op": "update", "iteration": 3, "rows": [ {"id": "leaf-27", "field5": 91.2, "field6": "dolor"} ] }
```
- `op`: `"update"` -> client applies a diff via `Cube.updateDataAsync`. `"replace"` (only for `broadReplace`) -> client reloads a full snapshot via `Cube.loadDataAsync`; `rows` is empty.
- `rows`: each carries `id` plus only the changed value fields (count = effective `breadth`).
- WS pushes use the **same** object as the HTTP `diff` response body.

### WebSocket details
- **Topic:** `xhDataLab/updates` (`DataLabPushService.TOPIC`) - distinct from the portfolio demo.
- Client obtains its `channelKey` from `XH.webSocketService`, subscribes to the topic, then calls `streamStart` with knobs; server pushes batches to that channelKey on the topic until `streamStop`, `durationSec` expiry, or channel close (auto-culled).
- Base timer ticks every 100ms (`TICK_MS`); each stream pushes at its own `ratePerSec`.

### Determinism guarantee
- `generateSnapshot`: identical `(seed, shape params)` regenerates byte-identical rows (verified - JSON-equal across two calls; differing seed differs).
- `generateBatch`: each batch is seeded from `(seed, iteration)`, so the same `(seed, params, iteration)` yields the same batch on both HTTP and WS paths (verified).

## Decisions Made
- See `key-decisions` frontmatter. Principal call: rely on Grails convention routing rather than introducing a UrlMappings file the app doesn't use.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] UrlMappings.groovy does not exist in Toolbox**
- **Found during:** Task 2 (HTTP controller + URL mappings)
- **Issue:** The plan listed `../toolbox/grails-app/controllers/io/xh/toolbox/UrlMappings.groovy` as a file to modify, but Toolbox has no UrlMappings file anywhere. Every existing Toolbox controller (PortfolioController, MockUpdatesController, etc.) is reachable purely via Grails default `/$controller/$action` convention routing.
- **Fix:** Did not create a UrlMappings file (introducing one could conflict with the default mapping all other controllers depend on). `DataLabController` follows the existing convention, so `/dataLab/snapshot` and `/dataLab/diff` are automatically wired. Documented the convention in the controller and this summary.
- **Files modified:** `../toolbox/.../datalab/DataLabController.groovy` (no UrlMappings file)
- **Verification:** Confirmed no UrlMappings config in `grails-app/conf`; confirmed peer controllers map by convention; snapshot/diff response contracts validated via standalone Groovy runs.
- **Committed in:** `667cab3a` (Task 2 commit)

**2. [Rule 3 - Blocking] DateTimeUtils.MILLISECONDS does not exist in hoist-core**
- **Found during:** Task 3 (WebSocket push service)
- **Issue:** Initial push-service timer used `import static io.xh.hoist.util.DateTimeUtils.MILLISECONDS`, but hoist-core `DateTimeUtils` only defines `SECONDS`/`MINUTES`/`HOURS`/`DAYS` (no `MILLISECONDS`).
- **Fix:** Removed the import; the timer's `intervalUnits` defaults to `1` (interval interpreted in milliseconds), so `interval: TICK_MS` ticks every 100ms as intended.
- **Files modified:** `../toolbox/.../datalab/DataLabPushService.groovy`
- **Verification:** AST syntax check passed; behavioral test drove ticks and confirmed rate-gated pushes.
- **Committed in:** `68c19c81` (Task 3 commit)

**3. [Rule 2 - Missing Critical] Added streamStart/streamStop HTTP control actions**
- **Found during:** Task 3 (WebSocket push service)
- **Issue:** The push service needs a browser-reachable way to begin/end a stream for a measurement iteration; the plan specified start/stop methods on the service but no client-facing trigger.
- **Fix:** Added `streamStart`/`streamStop` actions on `DataLabController` (mirroring the MockUpdatesController subscribe/unsubscribe precedent), passing `channelKey` + scenario knobs through to the service.
- **Files modified:** `../toolbox/.../datalab/DataLabController.groovy`
- **Verification:** AST syntax check passed; service start/stop behavior verified by behavioral test.
- **Committed in:** `68c19c81` (Task 3 commit)

---

**Total deviations:** 3 auto-fixed (2 blocking, 1 missing critical)
**Impact on plan:** All three were necessary to match Toolbox/hoist-core reality and to make the WS lifecycle drivable from the browser. No scope creep; the `datalab` namespace, generator, HTTP transport, and WS transport are exactly as planned.

## Issues Encountered
- Full Grails compilation is heavyweight and was not run; per the plan's verify guidance, validation used AST syntax checks plus standalone Groovy execution of the generation/stream logic with minimal stubs (BaseService, a fake webSocketService). All determinism, shape, pattern, rate-gating, culling, and stop assertions passed. A live-server smoke test of the HTTP routes and WS push remains a useful follow-up once Toolbox is run.

## User Setup Required
None - no external service configuration required. Code lives in the Toolbox repo on branch `data2` (renamed from `data2`).

## Next Phase Readiness
- The 02-05 client ingest adapter has a complete, documented server contract (endpoints, params, batch shape, WS topic, start/stop, determinism) to build against.
- Recommended follow-up: run Toolbox locally and smoke-test `/dataLab/snapshot`, `/dataLab/diff`, and a WS stream end to end (the only validation not performed here without a running server).

## Self-Check: PASSED

- All 3 created Toolbox files present on disk.
- SUMMARY.md present.
- All 3 task commits (`16073bbf`, `667cab3a`, `68c19c81`) present in the Toolbox repo.

---
*Phase: 02-measurement-harness*
*Completed: 2026-06-29*
