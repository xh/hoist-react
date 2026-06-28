---
phase: 01-current-state-inventory
plan: 03
subsystem: data
tags: [transport, websocket, cube, store, ingest, signalr, polling, data-layer]

# Dependency graph
requires:
  - phase: 01-current-state-inventory
    provides: validation notes (KICKOFF-VALIDATION, C-real-usage) grounding transport patterns
provides:
  - Inventory of the five update-delivery transports/patterns the data layer must support
  - The invariant ingest contract (snapshot -> loadDataAsync / diff -> updateDataAsync) as the transport-agnostic seam
  - Explicit distinction between WebSocket data push and WebSocket-as-notification, source-grounded
  - The WebSocketService public surface and Cube/Store ingest entry points with file:line citations
affects: [01-04 architecture doc, 02 measurement harness (HARN-02 transport parameterization), 04 toolbox demo, 07 prototyping coexistence]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Transport adapter -> two fixed ingest entry points (loadDataAsync / updateDataAsync)"
    - "isPartial snapshot-vs-diff fork as the universal ingest decision point"

key-files:
  created:
    - docs/planning/data2/TRANSPORT-INVENTORY.md
  modified: []

key-decisions:
  - "Frame transport-agnosticism around the two-operation invariant ingest contract (snapshot vs diff), so transport is a clean experimental knob for HARN-02"
  - "Document WebSocket push as a first-class strategically-important pattern (not under-weighted to the local samples) and keep it distinct from WebSocket-as-notification"
  - "Note there is no Hoist-native SignalR client; SignalR is a client-owned transport bridged at the app/service layer to the same ingest contract"

patterns-established:
  - "Invariant ingest contract: every transport collapses to Cube.loadDataAsync (full snapshot) or Cube.updateDataAsync (incremental diff), each delegating to the Store equivalent and fanning out to connected Views"
  - "Asymmetric control framing: ours-to-shape (Hoist/Grails server) vs fixed (client-owned upstream); transport-specific optimizations labeled conditional"

requirements-completed: [INV-04]

# Metrics
duration: 2min
completed: 2026-06-28
---

# Phase 1 Plan 03: Transport / Pattern Inventory Summary

**A source-grounded inventory of the five update-delivery transports (HTTP snapshot/diff, WebSocket push, WebSocket-as-notification, SignalR, polling) showing each collapses to the invariant two-operation ingest contract - `Cube.loadDataAsync` for snapshots, `Cube.updateDataAsync` for diffs.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-06-28T00:39:06Z
- **Completed:** 2026-06-28T00:41:25Z
- **Tasks:** 2
- **Files modified:** 1 (created)

## Accomplishments
- Enumerated all five INV-04 transports/patterns, each with what it is, who controls it (asymmetric control), and exactly how data reaches the Cube/Store ingest entry points.
- Articulated the invariant ingest contract: regardless of transport, ingest collapses to a full snapshot (`loadDataAsync` -> `Store.loadData`) or an incremental diff (`updateDataAsync` -> `Store.updateData`), with the connected-view fan-out identical either way.
- Made the WebSocket push vs WebSocket-as-notification distinction explicit and correctly attributed: same `XH.webSocketService` transport, opposite data paths (payload feeds ingest directly vs metadata triggers an HTTP fetch).
- Cited the WebSocketService public API (`subscribe`/`unsubscribe`/`sendMessage`, `WebSocketSubscription`, `WebSocketMessage`) and Cube/Store ingest entry points with file:line references; named the public Toolbox portfolio example (`PositionSession`) for WS push.
- Tied the contract forward to Phase 2 (HARN-02 transport parameterization) and to any Data 2.0 path's coexistence requirement.

## Task Commits

1. **Task 1: Map the WebSocket service and Cube/Store ingest entry points** - intermediate task (no standalone artifact); its findings are realized in the Task 2 document.
2. **Task 2: Write the transport inventory mapping each pattern to its ingest adaptation** - `b1cf5bf9a` (docs)

**Plan metadata:** (see final docs commit)

## Files Created/Modified
- `docs/planning/data2/TRANSPORT-INVENTORY.md` - 341-line transport/pattern inventory: ingest substrate, WebSocketService surface, the five transports, summary table, and the invariant ingest contract synthesis.

## Decisions Made
- Framed the synthesis around the two-operation invariant contract so that transport becomes a clean, isolatable knob for the Phase 2 harness rather than a confound.
- Kept WebSocket push first-class and distinct from WebSocket-as-notification, correcting the earlier over-read of the local samples while still grounding the notification pattern in those samples.
- Stated explicitly that there is no Hoist-native SignalR client - SignalR is a fixed, client-owned transport adapted at the app/service layer - which is the strongest argument for the transport-agnostic contract.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None. The two source files for the Toolbox portfolio example (`PositionSession.ts`, `PortfolioService.ts`) were confirmed present in the local Toolbox checkout, and `PositionSession`'s use of `XH.webSocketService.subscribe` was verified directly before citing it.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- INV-04 satisfied. The transport inventory is ready to be referenced by the Phase 1 authoritative architecture doc (01-04) and by the Phase 2 harness when parameterizing change-delivery transport (HARN-02).
- The invariant ingest contract is the transport-agnostic seam that the Toolbox demo (Phase 4) and any Data 2.0 prototype (Phase 7) must preserve.

## Self-Check: PASSED

- FOUND: docs/planning/data2/TRANSPORT-INVENTORY.md
- FOUND commit: b1cf5bf9a
- Verification: 341 lines (> 110 min); all five patterns present; `loadDataAsync` and `updateDataAsync` both referenced (18x each); key_links patterns satisfied (WebSocketService/webSocketService 18x, Cube.ts/loadDataAsync/updateDataAsync 30x); zero em dashes; client-name guard reports no forbidden names.

---
*Phase: 01-current-state-inventory*
*Completed: 2026-06-28*
